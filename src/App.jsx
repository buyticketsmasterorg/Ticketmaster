import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, MessageSquare, Send, X, Bell, ChevronLeft, User, Clock, Globe, Menu, LogIn, UserPlus, Check, Ban, AlertOctagon, Info, Settings, DollarSign, Calendar, Image as ImageIcon } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, onAuthStateChanged, signInAnonymously, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, updateDoc, doc, setDoc, getDoc, onSnapshot, query, where, orderBy } from 'firebase/firestore';

import SeatMap from './components/SeatMap.jsx';
import Checkout from './components/Checkout.jsx';

// --- FIREBASE CONFIG ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = import.meta.env.VITE_APP_ID || 'default-app-id';

// --- ADMIN CREDENTIALS ---
const ADMIN_ID = "buyticketsmaster.org@gmail.com"; 
const ADMIN_PASS = "Ifeoluwapo@1!";

// --- TRANSLATIONS ---
const t = {
  EN: { heroTitle: "The World's Biggest Stage.", verified: "Verified Only", btnJoin: "Verify & Join", btnLogin: "Log In", holdTitle: "Verifying Identity...", holdSub: "Please hold while the Host reviews your request.", deniedTitle: "ACCESS DENIED", deniedSub: "Identity Unverified.", queueTitle: "Fans Ahead of You" },
  ES: { heroTitle: "El Escenario Más Grande.", verified: "Solo Verificados", btnJoin: "Unirse", btnLogin: "Entrar", holdTitle: "Verificando...", holdSub: "Espere por favor.", deniedTitle: "DENEGADO", deniedSub: "No verificado.", queueTitle: "Fans Delante" }
};

const INITIAL_EVENTS = [
  { id: 1, artist: "Taylor Swift | The Eras Tour", venue: "Wembley Stadium, London", date: "Sat • Aug 17 • 7:00 PM", image: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&q=80&w=1000", bgImage: "https://images.unsplash.com/photo-1459749411177-287ce35e8b4f?auto=format&fit=crop&q=80&w=2000" },
  { id: 2, artist: "Drake: It's All A Blur", venue: "O2 Arena, London", date: "Fri • Sep 22 • 8:00 PM", image: "https://images.unsplash.com/photo-1514525253440-b393452e8d26?auto=format&fit=crop&q=80&w=1000", bgImage: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=2000" },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('home'); 
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [cart, setCart] = useState([]); 
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [globalSettings, setGlobalSettings] = useState({ regularPrice: 150, vipPrice: 450 });
  const [sessionData, setSessionData] = useState({});

  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [lang, setLang] = useState('EN'); 
  const [showLangMenu, setShowLangMenu] = useState(false);

  // Auth State
  const [authMode, setAuthMode] = useState('login'); 
  const [tempUser, setTempUser] = useState({ email: '', name: '', phone: '', dob: '', pass: '', agreed: false });
  const [authError, setAuthError] = useState('');
  
  // Queue State
  const [queuePosition, setQueuePosition] = useState(2431);
  const [queueProgress, setQueueProgress] = useState(0);

  // Admin & Chat
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [hasUnread, setHasUnread] = useState(false); // Red Dot State
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [activeNotification, setActiveNotification] = useState(null);
  const [adminUserInp, setAdminUserInp] = useState('');
  const [adminPassInp, setAdminPassInp] = useState('');
  
  // Admin Dashboard
  const [adminTab, setAdminTab] = useState('requests'); 
  const [allSessions, setAllSessions] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null); // For Split Screen
  const [adminMsg, setAdminMsg] = useState('');

  // --- MESSENGER LINK ---
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('messenger') === '123' || p.get('messenger') === 'true') {
      setIsAdminLoggedIn(true);
      setCurrentPage('admin');
      window.history.replaceState({}, document.title, "/");
    }
  }, []);

  // --- AUTH OBSERVER ---
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
        if (!u) { await signInAnonymously(auth); } 
        else { setUser(u); if (!u.isAnonymous && (currentPage === 'auth' || currentPage === 'home')) await findOrCreateSession(u); }
    });
  }, [currentPage]);

  // --- SESSION LOGIC ---
  const findOrCreateSession = async (authUser, defaultStatus) => {
      let sid = sessionStorage.getItem('tm_sid');
      if (!sid) {
          const ref = collection(db, 'artifacts', appId, 'public', 'data', 'sessions');
          const docRef = await addDoc(ref, {
            createdAt: new Date().toISOString(),
            userId: authUser.uid,
            email: authUser.email || 'Visitor',
            name: authUser.displayName || tempUser.name || 'Fan',
            status: defaultStatus || 'browsing', 
            accessGranted: 'pending', 
            chatHistory: [{ sender: 'system', text: 'Welcome! How can we help?', timestamp: new Date().toISOString() }],
            notifications: []
          });
          sid = docRef.id;
          sessionStorage.setItem('tm_sid', sid);
      }
      setCurrentSessionId(sid);
      if (defaultStatus) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', sid), { status: defaultStatus });
      
      const snap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', sid));
      if (snap.exists()) {
          const d = snap.data();
          if (d.accessGranted === 'denied') setCurrentPage('denied');
          else if (d.accessGranted === 'allowed' && currentPage === 'auth') setCurrentPage('queue');
          else if (d.status === 'waiting_approval' && currentPage === 'auth') setCurrentPage('waiting_room');
      }
  };

  // --- USER LISTENER (Notifications & Chat) ---
  useEffect(() => {
    if (!currentSessionId) return;
    return onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', currentSessionId), (snap) => {
      if(snap.exists()) {
        const d = snap.data();
        setSessionData(d);
        
        // Chat Logic
        const msgs = d.chatHistory || [];
        setChatMessages(msgs);
        // If last message is from system and chat is closed, show red dot
        if (msgs.length > 0 && msgs[msgs.length - 1].sender === 'system' && !isChatOpen) {
            setHasUnread(true);
        }

        // Notification Logic
        if(d.notifications?.length > 0) setActiveNotification(d.notifications[d.notifications.length-1]);
        
        // Routing Logic
        if (d.accessGranted === 'denied') setCurrentPage('denied');
        else if (d.accessGranted === 'allowed' && currentPage === 'waiting_room') setCurrentPage('queue');
      }
    });
  }, [currentSessionId, currentPage, isChatOpen]);

  // --- SYNC SETTINGS ---
  useEffect(() => {
    if(!user) return;
    return onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'global_settings'), (snap) => {
        if(snap.exists()) setGlobalSettings(snap.data());
    });
  }, [user]);

  // --- ADMIN LISTENER ---
  useEffect(() => {
    if (!isAdminLoggedIn) return;
    return onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'sessions'), orderBy('createdAt', 'desc')), (snap) => {
        setAllSessions(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });
  }, [isAdminLoggedIn]);

  // --- QUEUE LOGIC ---
  useEffect(() => {
      if (currentPage === 'queue') {
          const interval = setInterval(() => {
              setQueuePosition(prev => {
                  const drop = Math.floor(Math.random() * 50) + 10;
                  const newPos = prev - drop;
                  setQueueProgress(((2431 - newPos) / 2431) * 100);
                  if (newPos <= 0) { clearInterval(interval); setCurrentPage('seatmap'); return 0; }
                  return newPos;
              });
          }, 1000);
          return () => clearInterval(interval);
      }
  }, [currentPage]);

  // --- ACTIONS ---
  const handleRealSignup = async () => {
      setAuthError(''); if (!tempUser.email || !tempUser.pass) return setAuthError('Missing fields');
      try { const cred = await createUserWithEmailAndPassword(auth, tempUser.email, tempUser.pass); await updateProfile(cred.user, { displayName: tempUser.name }); await findOrCreateSession(cred.user, 'waiting_approval'); setCurrentPage('waiting_room'); } catch (err) { setAuthError(err.message.replace('Firebase: ', '')); }
  };

  const handleRealLogin = async () => {
      setAuthError(''); if (!tempUser.email || !tempUser.pass) return setAuthError('Missing fields');
      try { const cred = await signInWithEmailAndPassword(auth, tempUser.email, tempUser.pass); await findOrCreateSession(cred.user); } catch (err) { setAuthError("Invalid Login"); }
  };

  const handleExitDenied = async () => { sessionStorage.clear(); await signOut(auth); window.location.reload(); };
  
  const handleAdminAuth = () => {
    if(adminUserInp.toLowerCase() === ADMIN_ID.toLowerCase() && adminPassInp === ADMIN_PASS) {
      setIsAdminLoggedIn(true);
      setAdminUserInp(''); setAdminPassInp('');
    } else { alert("Invalid credentials."); }
  };

  // --- ADMIN FUNCTIONS ---
  const updateSessionStatus = async (sid, status) => {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', sid), { accessGranted: status, status: status === 'allowed' ? 'in_queue' : 'blocked' });
  };

  const updateGlobalPrice = async (type, val) => {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'global_settings'), { [type]: Number(val) });
  };

  const sendAdminMessage = async () => {
      if(!selectedUser || !adminMsg.trim()) return;
      const newHistory = [...(selectedUser.chatHistory || []), { sender: 'system', text: adminMsg, timestamp: new Date().toISOString() }];
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', selectedUser.id), { chatHistory: newHistory });
      setAdminMsg('');
  };

  const sendAdminPing = async () => {
      if(!selectedUser || !adminMsg.trim()) return;
      const newNotifs = [...(selectedUser.notifications || []), { text: adminMsg, timestamp: new Date().toISOString() }];
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', selectedUser.id), { notifications: newNotifs });
      setAdminMsg('');
  };

  const updateSession = (updates) => { if(currentSessionId) updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', currentSessionId), updates); };
  
  const filteredEvents = INITIAL_EVENTS.filter(e => e.artist.toLowerCase().includes(searchTerm.toLowerCase()));
  const flags = { 'EN': '🇬🇧', 'ES': '🇪🇸' };
  const txt = t[lang] || t['EN'];

  return (
    <div className="min-h-screen bg-[#0a0e14] text-gray-100 font-sans overflow-x-hidden selection:bg-[#026cdf] selection:text-white">
      
      {/* HEADER */}
      {!isAdminLoggedIn && (
        <header className="fixed top-0 w-full z-50 bg-[#1f262d]/90 backdrop-blur-xl border-b border-white/5 h-16 flex items-center justify-between px-4 lg:px-8 shadow-2xl">
            <div className="flex items-center gap-3 z-20">
                {currentPage !== 'home' && <button onClick={() => setCurrentPage('home')} className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition-all"><ChevronLeft className="w-5 h-5" /></button>}
                <div className="flex items-center gap-1 cursor-pointer" onClick={() => setCurrentPage('home')}><span className="font-extrabold text-xl tracking-tighter italic">ticketmaster</span><CheckCircle className="w-4 h-4 text-[#026cdf] fill-current" /></div>
            </div>
            <div className="flex items-center gap-4 z-20">
                {/* User Notification Bell */}
                <div className="relative">
                    <Bell className="w-5 h-5 text-gray-400 hover:text-white transition-colors" />
                    {activeNotification && <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border border-[#1f262d]" />}
                </div>

                {currentPage === 'home' && (<><button onClick={() => setShowMobileSearch(!showMobileSearch)} className="lg:hidden p-2 text-gray-400 hover:text-white"><Search className="w-5 h-5" /></button><div className="hidden lg:flex relative group"><input className="bg-white/10 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm w-48 focus:w-64 transition-all outline-none focus:bg-white focus:text-black" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /><Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 group-focus-within:text-[#026cdf]" /></div></>)}
                <div className="relative"><button onClick={() => setShowLangMenu(!showLangMenu)} className="flex items-center gap-1 text-sm font-bold bg-white/10 px-3 py-1.5 rounded-full hover:bg-white/20 transition-all"><span>{flags[lang]}</span><span>{lang}</span></button>{showLangMenu && <div className="absolute top-10 right-0 bg-[#1f262d] border border-white/10 rounded-xl p-2 shadow-xl flex flex-col gap-1 w-24 animate-slideDown">{Object.keys(flags).map(l => (<button key={l} onClick={() => {setLang(l); setShowLangMenu(false);}} className="text-left px-3 py-2 hover:bg-white/10 rounded-lg text-xs font-bold">{flags[l]} {l}</button>))}</div>}</div>
                <button onClick={() => setCurrentPage('admin')}><User className="w-5 h-5 text-gray-400 hover:text-white transition-colors" /></button>
            </div>
            {showMobileSearch && currentPage === 'home' && <div className="absolute top-16 left-0 w-full bg-[#1f262d] p-4 border-b border-white/10 animate-slideDown lg:hidden z-10"><input autoFocus className="w-full bg-black/20 border border-white/10 rounded-xl py-3 px-4 text-sm text-white outline-none" placeholder="Search events..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>}
        </header>
      )}

      <main className={`min-h-screen ${!isAdminLoggedIn ? 'pt-20 pb-24 px-4 lg:px-8 max-w-7xl mx-auto' : 'bg-[#f1f5f9] text-gray-900'}`}>
        {currentPage === 'home' && (
          <div className="space-y-10 animate-fadeIn">
            <div className="relative h-[400px] lg:h-[500px] rounded-[40px] overflow-hidden border border-white/10 group">
              <img src="https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&q=80&w=2000" className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-1000" /><div className="absolute inset-0 bg-gradient-to-t from-[#0a0e14] via-transparent to-transparent" />
              <div className="absolute bottom-10 left-6 lg:left-12 space-y-2"><div className="inline-block bg-[#026cdf] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-2">{txt.verified}</div><h1 className="text-4xl lg:text-7xl font-black italic uppercase tracking-tighter leading-none">{txt.heroTitle}</h1></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{filteredEvents.map(ev => (<div key={ev.id} onClick={() => { setSelectedEvent(ev); setCurrentPage('auth'); }} className="bg-[#1f262d] border border-white/5 rounded-[30px] overflow-hidden hover:border-[#026cdf] hover:translate-y-[-5px] transition-all cursor-pointer group shadow-xl"><div className="h-56 relative"><img src={ev.image} className="w-full h-full object-cover" /><div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">{ev.status}</div></div><div className="p-6 space-y-4"><h3 className="text-2xl font-black italic uppercase leading-none group-hover:text-[#026cdf] transition-colors">{ev.artist}</h3><div className="space-y-1 text-xs font-bold text-gray-400 uppercase tracking-widest"><p>{ev.venue}</p><p className="text-gray-500">{ev.date}</p></div></div></div>))}</div>
          </div>
        )}

        {currentPage === 'auth' && (
           <div className="min-h-[70vh] flex items-center justify-center p-4">
              <div className="bg-white text-gray-900 w-full max-w-md p-8 rounded-[40px] shadow-2xl animate-slideUp space-y-6">
                 <div className="text-center"><h2 className="text-3xl font-black italic uppercase tracking-tighter">{authMode==='signup'?txt.verifyTitle:txt.loginTitle}</h2><p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{authMode==='signup'?txt.verifySub:txt.loginSub}</p></div>
                 <div className="space-y-3">
                     {authMode === 'signup' && <><input className="w-full bg-gray-100 p-4 rounded-xl font-bold outline-none" placeholder={txt.name} value={tempUser.name} onChange={e => setTempUser({...tempUser, name: e.target.value})} /><input className="w-full bg-gray-100 p-4 rounded-xl font-bold outline-none" placeholder={txt.phone} value={tempUser.phone} onChange={e => setTempUser({...tempUser, phone: e.target.value})} /></>}
                     <input className="w-full bg-gray-100 p-4 rounded-xl font-bold outline-none" placeholder={txt.email} value={tempUser.email} onChange={e => setTempUser({...tempUser, email: e.target.value})} />
                     <input type="password" className="w-full bg-gray-100 p-4 rounded-xl font-bold outline-none" placeholder={txt.pass} value={tempUser.pass} onChange={e => setTempUser({...tempUser, pass: e.target.value})} />
                     {authMode === 'signup' && <div className="flex items-center gap-3 pt-2"><input type="checkbox" className="w-5 h-5 accent-[#026cdf]" checked={tempUser.agreed} onChange={e => setTempUser({...tempUser, agreed: e.target.checked})} /><p className="text-[10px] font-bold text-gray-500">{txt.agree}</p></div>}
                 </div>
                 {authError && <p className="text-center text-red-500 font-bold text-xs">{authError}</p>}
                 <button onClick={authMode === 'signup' ? handleRealSignup : handleRealLogin} className="w-full bg-[#026cdf] text-white py-5 rounded-full font-black text-xl uppercase italic tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg">{authMode === 'signup' ? txt.btnJoin : txt.btnLogin}</button>
                 <div className="text-center pt-2"><button onClick={() => setAuthMode(authMode==='signup'?'login':'signup')} className="text-xs font-bold text-gray-400 hover:text-[#026cdf] uppercase tracking-widest">{authMode === 'signup' ? txt.haveAcc : txt.noAcc}</button></div>
              </div>
           </div>
        )}

        {currentPage === 'waiting_room' && (
           <div className="min-h-[70vh] flex flex-col items-center justify-center text-center space-y-8 animate-fadeIn">
               <div className="w-20 h-20 border-4 border-[#026cdf] border-t-transparent rounded-full animate-spin" />
               <div className="space-y-2"><h2 className="text-3xl font-black italic uppercase tracking-tighter">{txt.holdTitle}</h2><p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{txt.holdSub}</p></div>
               <div className="bg-[#1f262d] p-6 rounded-2xl border border-white/10 max-w-sm"><p className="text-xs font-bold text-gray-500">Session ID: <span className="text-white font-mono">{currentSessionId?.slice(0,8)}...</span></p><p className="text-xs font-bold text-gray-500 mt-2">Do not refresh.</p></div>
           </div>
        )}

        {currentPage === 'denied' && (
           <div className="min-h-[80vh] flex flex-col items-center justify-center text-center space-y-8 animate-fadeIn bg-red-950/20 rounded-3xl mt-10 border border-red-900/50">
               <AlertOctagon className="w-24 h-24 text-red-500 animate-pulse" />
               <div className="space-y-4"><h2 className="text-5xl font-black italic uppercase tracking-tighter text-red-500">{txt.deniedTitle}</h2><p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{txt.deniedSub}</p></div>
               <button onClick={handleExitDenied} className="px-8 py-3 bg-red-900/50 text-red-200 rounded-full font-bold uppercase hover:bg-red-900 transition-all">Exit</button>
           </div>
        )}

        {currentPage === 'queue' && (
           <div className="min-h-[70vh] flex flex-col items-center justify-center text-center space-y-12 animate-fadeIn">
               <div className="bg-white/5 p-6 rounded-3xl border border-white/10 w-full max-w-lg mb-4">
                   <h3 className="text-xl font-black italic uppercase tracking-tighter">{selectedEvent?.artist}</h3>
                   <p className="text-xs font-bold text-[#026cdf] uppercase tracking-widest">{selectedEvent?.venue}</p>
               </div>
               <div className="flex gap-4 lg:gap-8 items-center justify-center w-full max-w-2xl px-4">
                   {['Lobby Area', 'Queue Arena', 'Your Turn'].map((step, i) => {
                       const isActive = (queueProgress < 50 && i === 0) || (queueProgress >= 50 && queueProgress < 100 && i === 1) || (queueProgress >= 100 && i === 2);
                       return (<div key={i} className={`flex flex-col items-center gap-2 ${isActive ? 'scale-110' : 'opacity-30'}`}><div className={`w-4 h-4 rounded-full ${isActive ? 'bg-[#026cdf] animate-pulse' : 'bg-gray-600'}`} /><span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-[#026cdf]' : 'text-gray-500'}`}>{step}</span></div>)
                   })}
               </div>
               <div className="space-y-4"><h2 className="text-6xl lg:text-9xl font-black italic text-white tracking-tighter leading-none">{queuePosition}</h2><p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{txt.queueTitle}</p></div>
               <div className="w-full max-w-md bg-white/5 h-4 rounded-full overflow-hidden relative border border-white/10"><div className="h-full bg-[#026cdf] transition-all duration-1000 shadow-[0_0_20px_#026cdf]" style={{ width: `${queueProgress}%` }} /></div>
           </div>
        )}

        {currentPage === 'seatmap' && <SeatMap event={selectedEvent} regularPrice={globalSettings.regularPrice} vipPrice={globalSettings.vipPrice} cart={cart} setCart={setCart} onCheckout={() => setCurrentPage('checkout')} />}
        {currentPage === 'checkout' && <Checkout cart={cart} onBack={() => setCurrentPage('seatmap')} onSuccess={() => setCurrentPage('success')} />}

        {currentPage === 'success' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-fadeIn">
             <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center shadow-[0_0_50px_#22c55e] animate-bounce"><CheckCircle className="w-12 h-12 text-white" /></div>
             <h2 className="text-4xl lg:text-6xl font-black italic uppercase tracking-tighter">Order Complete!</h2>
             <div className="bg-white/10 p-6 rounded-2xl border-2 border-dashed border-white/20"><p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Order Number</p><p className="text-2xl font-mono text-[#026cdf]">TM-{Math.floor(Math.random()*90000)+10000}/NSW</p></div>
             <button onClick={() => setCurrentPage('home')} className="bg-[#1f262d] px-10 py-4 rounded-full font-black uppercase tracking-widest border border-white/20 hover:bg-white hover:text-black transition-colors">Return Home</button>
          </div>
        )}

        {/* --- ADMIN DASHBOARD (WHATSAPP STYLE) --- */}
        {currentPage === 'admin' && isAdminLoggedIn && (
           <div className="min-h-screen bg-[#f1f5f9] text-gray-900 pb-20 flex">
              
              {/* SIDEBAR (USER LIST) */}
              <div className={`w-full md:w-1/3 border-r border-gray-200 bg-white flex flex-col ${selectedUser ? 'hidden md:flex' : 'flex'}`}>
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#f8fafc]">
                      <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" /><h2 className="font-black text-sm uppercase italic">Live Sessions</h2></div>
                      <div className="flex gap-2">
                          <button onClick={() => setAdminTab('requests')} className={`p-2 rounded-full ${adminTab==='requests'?'bg-orange-100 text-orange-600':'text-gray-400'}`}><UserPlus className="w-4 h-4" /></button>
                          <button onClick={() => setAdminTab('active')} className={`p-2 rounded-full ${adminTab==='active'?'bg-blue-100 text-blue-600':'text-gray-400'}`}><CheckCircle className="w-4 h-4" /></button>
                          <button onClick={() => setAdminTab('settings')} className={`p-2 rounded-full ${adminTab==='settings'?'bg-gray-200 text-gray-700':'text-gray-400'}`}><Settings className="w-4 h-4" /></button>
                      </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                      {adminTab === 'settings' ? (
                          <div className="p-4 space-y-6">
                              <h3 className="font-black text-sm uppercase tracking-widest text-gray-400">Pricing Control</h3>
                              <div className="space-y-2">
                                  <label className="text-xs font-bold">Regular Price</label>
                                  <input type="number" className="w-full bg-gray-100 p-3 rounded-lg font-mono text-sm" value={globalSettings.regularPrice} onChange={e => setGlobalSettings({...globalSettings, regularPrice: e.target.value})} />
                                  <button onClick={() => updateGlobalPrice('regularPrice', globalSettings.regularPrice)} className="w-full bg-[#026cdf] text-white py-2 rounded-lg text-xs font-bold uppercase">Update Regular</button>
                              </div>
                              <div className="space-y-2">
                                  <label className="text-xs font-bold">VIP Price</label>
                                  <input type="number" className="w-full bg-gray-100 p-3 rounded-lg font-mono text-sm" value={globalSettings.vipPrice} onChange={e => setGlobalSettings({...globalSettings, vipPrice: e.target.value})} />
                                  <button onClick={() => updateGlobalPrice('vipPrice', globalSettings.vipPrice)} className="w-full bg-pink-500 text-white py-2 rounded-lg text-xs font-bold uppercase">Update VIP</button>
                              </div>
                          </div>
                      ) : (
                          allSessions.filter(s => adminTab==='requests' ? s.status==='waiting_approval' : s.status!=='waiting_approval').map(s => (
                              <div key={s.id} onClick={() => setSelectedUser(s)} className={`p-4 rounded-xl cursor-pointer hover:bg-gray-50 transition-all border ${selectedUser?.id === s.id ? 'border-[#026cdf] bg-blue-50' : 'border-transparent'}`}>
                                  <div className="flex justify-between items-center mb-1">
                                      <h4 className="font-bold text-sm truncate">{s.name}</h4>
                                      {s.status==='waiting_approval' && <span className="bg-orange-100 text-orange-600 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">Wait</span>}
                                  </div>
                                  <p className="text-xs text-gray-400 truncate">{s.email}</p>
                              </div>
                          ))
                      )}
                  </div>
              </div>

              {/* MAIN CHAT AREA */}
              <div className={`w-full md:w-2/3 bg-[#f1f5f9] flex flex-col ${!selectedUser ? 'hidden md:flex' : 'flex'}`}>
                  {selectedUser ? (
                      <>
                          {/* Chat Header */}
                          <div className="bg-white p-4 border-b border-gray-200 flex justify-between items-center shadow-sm">
                              <div className="flex items-center gap-3">
                                  <button onClick={() => setSelectedUser(null)} className="md:hidden p-2 hover:bg-gray-100 rounded-full"><ChevronLeft className="w-5 h-5" /></button>
                                  <div><h3 className="font-bold text-sm">{selectedUser.name}</h3><p className="text-xs text-gray-400">{selectedUser.email}</p></div>
                              </div>
                              <div className="flex gap-2">
                                  {selectedUser.status === 'waiting_approval' ? (
                                      <>
                                          <button onClick={() => updateSessionStatus(selectedUser.id, 'allowed')} className="bg-green-500 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-green-600 transition-all flex items-center gap-1"><Check className="w-3 h-3" /> Approve</button>
                                          <button onClick={() => updateSessionStatus(selectedUser.id, 'denied')} className="bg-red-100 text-red-500 px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-red-200 transition-all flex items-center gap-1"><Ban className="w-3 h-3" /> Deny</button>
                                      </>
                                  ) : (
                                      <div className="bg-gray-100 px-3 py-1 rounded-full text-xs font-bold text-gray-500 uppercase">{selectedUser.status}</div>
                                  )}
                              </div>
                          </div>

                          {/* Chat Messages */}
                          <div className="flex-1 overflow-y-auto p-4 space-y-3">
                              {(selectedUser.chatHistory || []).map((m, i) => (
                                  <div key={i} className={`flex ${m.sender==='system'?'justify-end':'justify-start'}`}>
                                      <div className={`max-w-[70%] p-3 rounded-xl text-xs font-medium ${m.sender==='system'?'bg-[#026cdf] text-white':'bg-white text-gray-800 shadow-sm'}`}>{m.text}</div>
                                  </div>
                              ))}
                          </div>

                          {/* Chat Input */}
                          <div className="p-4 bg-white border-t border-gray-200">
                              <div className="flex gap-2 mb-2">
                                  <input className="flex-1 bg-gray-100 rounded-lg px-4 py-3 text-sm outline-none" placeholder="Reply to user..." value={adminMsg} onChange={e => setAdminMsg(e.target.value)} />
                                  <button onClick={sendAdminMessage} className="bg-[#026cdf] p-3 rounded-lg text-white hover:bg-blue-700 transition-all"><Send className="w-4 h-4" /></button>
                              </div>
                              <div className="flex gap-2">
                                  <button onClick={() => { setAdminMsg("Access Granted. Welcome!"); setTimeout(sendAdminMessage, 100); }} className="bg-gray-100 px-3 py-1 rounded-md text-[10px] font-bold text-gray-500 hover:bg-gray-200">Quick Welcome</button>
                                  <button onClick={() => { setAdminMsg("Please check your email for payment confirmation."); setTimeout(sendAdminMessage, 100); }} className="bg-gray-100 px-3 py-1 rounded-md text-[10px] font-bold text-gray-500 hover:bg-gray-200">Confirm Payment</button>
                                  <button onClick={sendAdminPing} className="ml-auto flex items-center gap-1 text-[10px] font-black text-red-500 uppercase hover:text-red-600"><Bell className="w-3 h-3" /> Ping User</button>
                              </div>
                          </div>
                      </>
                  ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
                          <MessageSquare className="w-16 h-16 mb-4" />
                          <p className="font-bold text-sm uppercase tracking-widest">Select a Session</p>
                      </div>
                  )}
              </div>
           </div>
        )}
      </main>

      {/* --- LIVE CHAT WIDGET --- */}
      {!isAdminLoggedIn && (
        <>
            <div className="fixed bottom-6 right-6 z-[200]">
                <button onClick={() => setIsChatOpen(!isChatOpen)} className="bg-[#026cdf] w-14 h-14 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform relative">
                    {isChatOpen ? <X className="w-6 h-6 text-white" /> : <MessageSquare className="w-6 h-6 text-white" />}
                    {hasUnread && !isChatOpen && <div className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-bounce" />}
                </button>
            </div>

            {isChatOpen && (
                <div className="fixed bottom-24 right-6 w-[90vw] max-w-sm h-[450px] bg-white rounded-[30px] shadow-2xl overflow-hidden flex flex-col z-[200] animate-slideUp">
                <div className="bg-[#1f262d] p-4 flex items-center gap-3 border-b border-white/10">
                    <div className="w-10 h-10 bg-[#026cdf] rounded-full flex items-center justify-center font-black text-white text-xs">TM</div>
                    <div><p className="font-bold text-white text-sm">Support Agent</p><p className="text-[10px] text-green-400 font-bold uppercase tracking-widest">Online</p></div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                    {chatMessages.map((m,i) => (
                        <div key={i} className={`flex ${m.sender==='user'?'justify-end':'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-2xl text-xs font-bold ${m.sender==='user'?'bg-[#026cdf] text-white rounded-br-none':'bg-white text-black border border-gray-100 rounded-bl-none'}`}>{m.text}</div>
                        </div>
                    ))}
                </div>
                <div className="p-3 bg-white border-t flex gap-2">
                    <input id="chat-inp" className="flex-1 bg-gray-100 rounded-xl px-4 text-sm text-black font-bold outline-none" placeholder="Message..." />
                    <button onClick={() => {
                        const el = document.getElementById('chat-inp');
                        if(el.value.trim()) {
                            const newHistory = [...chatMessages, {sender:'user', text:el.value, timestamp: new Date().toISOString()}];
                            setChatMessages(newHistory);
                            updateSession({ chatHistory: newHistory });
                            el.value = '';
                        }
                    }} className="bg-[#026cdf] p-3 rounded-xl"><Send className="w-4 h-4 text-white" /></button>
                </div>
                </div>
            )}
        </>
      )}

      {/* --- USER NOTIFICATION TOAST --- */}
      {activeNotification && (
        <div className="fixed top-20 left-4 right-4 z-[100] bg-[#ea0042] text-white p-4 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex items-start gap-4 animate-bounce">
          <Bell className="w-5 h-5 shrink-0" />
          <div className="flex-1 text-sm font-bold">{activeNotification.text}</div>
          <button onClick={() => setActiveNotification(null)}><X className="w-5 h-5" /></button>
        </div>
      )}

    </div>
  );
}


