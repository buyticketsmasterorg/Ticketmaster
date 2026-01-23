import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, MessageSquare, Send, X, Bell, ChevronLeft, User, Menu, LogIn, Check, Ban, AlertOctagon, Info, Settings, Calendar, Trash2, Clock } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, onAuthStateChanged, signInAnonymously, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, updateDoc, doc, setDoc, getDoc, onSnapshot, query, where, orderBy, deleteDoc } from 'firebase/firestore';

import SeatMap from './components/SeatMap.jsx';
import Checkout from './components/Checkout.jsx';

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

// --- TRANSLATIONS ---
const t = {
  EN: { heroTitle: "The World's Biggest Stage.", verified: "Verified Only", btnJoin: "Verify & Join", btnLogin: "Log In", holdTitle: "Verifying Identity...", holdSub: "Please hold while the Host reviews your request.", deniedTitle: "ACCESS DENIED", deniedSub: "Identity Unverified.", queueTitle: "Fans Ahead of You", presaleTitle: "Early Access", unlock: "Unlock", name: "Full Name", phone: "Mobile Number", email: "Email Address", pass: "Password", agree: "I agree to Terms", haveAcc: "Have Account?", noAcc: "Create Account" },
  ES: { heroTitle: "El Escenario Más Grande.", verified: "Solo Verificados", btnJoin: "Unirse", btnLogin: "Entrar", holdTitle: "Verificando...", holdSub: "Espere por favor.", deniedTitle: "DENEGADO", deniedSub: "No verificado.", queueTitle: "Fans Delante", presaleTitle: "Acceso Anticipado", unlock: "Desbloquear", name: "Nombre", phone: "Móvil", email: "Correo", pass: "Contraseña", agree: "Acepto", haveAcc: "¿Cuenta?", noAcc: "¿Crear?" },
  DE: { heroTitle: "Die Größte Bühne.", verified: "Nur Verifiziert", btnJoin: "Beitreten", btnLogin: "Anmelden", holdTitle: "Überprüfung...", holdSub: "Bitte warten Sie auf den Host.", deniedTitle: "VERWEIGERT", deniedSub: "Zugriff abgelehnt.", queueTitle: "Fans vor Ihnen", presaleTitle: "Früher Zugang", unlock: "Freischalten", name: "Name", phone: "Handy", email: "E-Mail", pass: "Passwort", agree: "Zustimmen", haveAcc: "Konto?", noAcc: "Kein Konto?" },
  FR: { heroTitle: "La Plus Grande Scène.", verified: "Vérifié", btnJoin: "Rejoindre", btnLogin: "Connexion", holdTitle: "Vérification...", holdSub: "Veuillez patienter.", deniedTitle: "REFUSÉ", deniedSub: "Identité non vérifiée.", queueTitle: "Fans devant vous", presaleTitle: "Accès Anticipé", unlock: "Ouvrir", name: "Nom", phone: "Mobile", email: "E-mail", pass: "Mot de passe", agree: "Accepter", haveAcc: "Compte ?", noAcc: "Pas de compte ?" }
};

const INITIAL_EVENTS = [
  { id: 1, artist: "Taylor Swift | The Eras Tour", venue: "Wembley Stadium, London", date: "Sat • Aug 17 • 7:00 PM", image: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&q=80&w=1000", badge: "High Demand", timer: "02:45:12" },
  { id: 2, artist: "Drake: It's All A Blur", venue: "O2 Arena, London", date: "Fri • Sep 22 • 8:00 PM", image: "https://images.unsplash.com/photo-1514525253440-b393452e8d26?auto=format&fit=crop&q=80&w=1000", badge: "Selling Fast", timer: "" }
];

export default function UserApp() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState('auth'); 
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [cart, setCart] = useState([]); 
  const [showCart, setShowCart] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [globalSettings, setGlobalSettings] = useState({ regularPrice: 150, vipPrice: 450 });
  const [eventsList, setEventsList] = useState([]); 
  const [sessionData, setSessionData] = useState({});

  const [searchTerm, setSearchTerm] = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [lang, setLang] = useState('EN'); 
  const [showLangMenu, setShowLangMenu] = useState(false);

  const [authMode, setAuthMode] = useState('login'); 
  const [tempUser, setTempUser] = useState({ email: '', name: '', phone: '', dob: '', pass: '', agreed: false });
  const [authError, setAuthError] = useState('');
  
  const [queuePosition, setQueuePosition] = useState(2431);
  const [queueProgress, setQueueProgress] = useState(0);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [hasUnread, setHasUnread] = useState(false); 
  const [activeNotification, setActiveNotification] = useState(null);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [userNotifications, setUserNotifications] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  // Define txt early to prevent crashes
  const txt = t[lang] || t.EN;
  const flags = { 'EN': '🇬🇧', 'ES': '🇪🇸', 'DE': '🇩🇪', 'FR': '🇫🇷' };

  // --- RESTORE SELECTED EVENT ON REFRESH ---
  useEffect(() => {
    const savedId = sessionStorage.getItem('selectedEventId');
    if (savedId && eventsList.length > 0 && !selectedEvent) {
        const ev = eventsList.find(e => String(e.id) === savedId) || INITIAL_EVENTS.find(e => String(e.id) === savedId);
        if (ev) setSelectedEvent(ev);
    }
  }, [eventsList]);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
        if (!u) { 
            setCurrentPage('auth');
            setIsLoading(false); 
        } else { 
            setUser(u); 
            // If logged in, check session state but default to home
            if(currentPage === 'auth') {
                await findOrCreateSession(u);
                setCurrentPage('home');
            } else {
                await findOrCreateSession(u);
            }
            setIsLoading(false); 
        }
    });
  }, []); 

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
          else if (d.accessGranted === 'allowed' && currentPage === 'home') setCurrentPage('home'); 
          else if (d.status === 'waiting_approval' && currentPage === 'home') setCurrentPage('waiting_room');
      }
  };

  // --- AUTO-VERIFY (5 Seconds) ---
  useEffect(() => {
    if (currentPage === 'waiting_room' && currentSessionId) {
      const timer = setTimeout(async () => {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', currentSessionId), {
           accessGranted: 'allowed',
           status: 'in_queue'
        });
        setCurrentPage('queue'); // Force move to Queue immediately
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [currentPage, currentSessionId]);

  // --- DATA SYNC ---
  useEffect(() => {
    if (!currentSessionId) return;
    return onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', currentSessionId), (snap) => {
      if(snap.exists()) {
        const d = snap.data();
        setSessionData(d);
        const msgs = d.chatHistory || [];
        setChatMessages(msgs);
        if (msgs.length > 1 && msgs[msgs.length - 1].sender === 'system' && !isChatOpen) {
            setHasUnread(true);
        }
        
        const notifs = d.notifications || [];
        setUserNotifications(notifs);
        if(notifs.length > 0 && (!activeNotification || notifs[notifs.length-1].timestamp !== activeNotification?.timestamp)) {
            setActiveNotification(notifs[notifs.length-1]);
            setUnreadNotifCount(prev => prev + 1);
        }
        
        if (d.accessGranted === 'denied') setCurrentPage('denied');
        else if (d.accessGranted === 'allowed' && currentPage === 'waiting_room') setCurrentPage('queue');
      }
    });
  }, [currentSessionId, currentPage, isChatOpen, activeNotification]);

  useEffect(() => {
    if(!user) return;
    const unsubSettings = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'global_settings'), (snap) => {
        if(snap.exists()) setGlobalSettings(snap.data());
    });
    const unsubEvents = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'events'), (snap) => {
        if (!snap.empty) setEventsList(snap.docs.map(d => ({id: d.id, ...d.data()})));
        else {
            const seed = INITIAL_EVENTS; 
            if(eventsList.length === 0) setEventsList(seed);
        }
    });
    return () => { unsubSettings(); unsubEvents(); };
  }, [user]);

  // --- QUEUE ---
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

  const handleRealSignup = async () => {
      setAuthError(''); if (!tempUser.email || !tempUser.pass) return setAuthError('Missing fields');
      setAuthLoading(true);
      try { const cred = await createUserWithEmailAndPassword(auth, tempUser.email, tempUser.pass); await updateProfile(cred.user, { displayName: tempUser.name }); await findOrCreateSession(cred.user, 'waiting_approval'); setCurrentPage('waiting_room'); } catch (err) { setAuthError(err.message.replace('Firebase: ', '')); }
      setAuthLoading(false);
  };

  const handleRealLogin = async () => {
      setAuthError(''); if (!tempUser.email || !tempUser.pass) return setAuthError('Missing fields');
      setAuthLoading(true);
      try { 
        const cred = await signInWithEmailAndPassword(auth, tempUser.email, tempUser.pass); 
        await findOrCreateSession(cred.user); 
        setCurrentPage('home'); 
      } catch (err) { setAuthError("Invalid Login: " + err.message); }
      setAuthLoading(false);
  };

  const handleExitDenied = async () => { sessionStorage.clear(); await signOut(auth); window.location.reload(); };
  
  const updateSession = (updates) => { if(currentSessionId) updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', currentSessionId), updates); };
  
  const filteredEvents = eventsList.filter(e => e.artist.toLowerCase().includes(searchTerm.toLowerCase()));
  
  // Header Logic
  const hideHeader = currentPage === 'auth' || currentPage === 'waiting_room';

  if (isLoading) return <div className="min-h-screen bg-[#0a0e14] flex items-center justify-center"><div className="w-12 h-12 border-4 border-[#026cdf] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#0a0e14] text-gray-100 font-sans overflow-x-hidden selection:bg-[#026cdf] selection:text-white">
      
      {!hideHeader && (
        <header className="fixed top-0 w-full z-50 bg-[#1f262d]/90 backdrop-blur-xl border-b border-white/5 h-16 flex items-center justify-between px-4 lg:px-8 shadow-2xl">
            <div className="flex items-center gap-3 z-20">
                {currentPage !== 'home' && <button onClick={() => setCurrentPage('home')} className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition-all"><ChevronLeft className="w-5 h-5" /></button>}
                <div className="flex items-center gap-1 cursor-pointer" onClick={() => setCurrentPage('home')}><span className="font-extrabold text-xl tracking-tighter italic">ticketmaster</span><CheckCircle className="w-4 h-4 text-[#026cdf] fill-current" /></div>
            </div>
            <div className="flex items-center gap-4 z-20">
                <div className="relative">
                    <button onClick={() => { setShowNotifPanel(!showNotifPanel); setUnreadNotifCount(0); }} className="p-2 hover:bg-white/10 rounded-full relative">
                        <Bell className={`w-5 h-5 ${unreadNotifCount > 0 ? 'text-red-500 animate-pulse' : 'text-gray-400'}`} />
                        {unreadNotifCount > 0 && <div className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full text-[9px] flex items-center justify-center font-bold text-white border border-[#1f262d]">{unreadNotifCount}</div>}
                    </button>
                    {showNotifPanel && (
                        <div className="absolute top-12 right-4 w-72 bg-[#1f262d] border border-white/10 rounded-2xl shadow-2xl p-4 animate-slideDown max-h-60 overflow-y-auto z-50">
                            <h4 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4">Priority Alerts</h4>
                            {userNotifications.length === 0 ? <p className="text-xs text-gray-500 text-center">No alerts yet</p> : userNotifications.map((n, i) => (<div key={i} className="mb-3 pb-3 border-b border-white/5 last:border-0"><p className="text-xs font-bold text-white">{n.text}</p><p className="text-[10px] text-gray-500 mt-1">{new Date(n.timestamp).toLocaleTimeString()}</p></div>))}
                        </div>
                    )}
                </div>
                {currentPage === 'home' && (<><button onClick={() => setShowMobileSearch(!showMobileSearch)} className="lg:hidden p-2 text-gray-400 hover:text-white"><Search className="w-5 h-5" /></button><div className="hidden lg:flex relative group"><input className="bg-white/10 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm w-48 focus:w-64 transition-all outline-none focus:bg-white focus:text-black" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /><Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 group-focus-within:text-[#026cdf]" /></div></>)}
                <div className="relative"><button onClick={() => setShowLangMenu(!showLangMenu)} className="flex items-center gap-1 text-sm font-bold bg-white/10 px-3 py-1.5 rounded-full hover:bg-white/20 transition-all"><span>{flags?.[lang]}</span><span>{lang}</span></button>{showLangMenu && <div className="absolute top-10 right-0 bg-[#1f262d] border border-white/10 rounded-xl p-2 shadow-xl flex flex-col gap-1 w-24 animate-slideDown">{Object.keys(flags).map(l => (<button key={l} onClick={() => {setLang(l); setShowLangMenu(false);}} className="text-left px-3 py-2 hover:bg-white/10 rounded-lg text-xs font-bold">{flags[l]} {l}</button>))}</div>}</div>
            </div>
            {showMobileSearch && currentPage === 'home' && <div className="absolute top-16 left-0 w-full bg-[#1f262d] p-4 border-b border-white/10 animate-slideDown lg:hidden z-10"><input autoFocus className="w-full bg-black/20 border border-white/10 rounded-xl py-3 px-4 text-sm text-white outline-none" placeholder="Search events..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>}
        </header>
      )}

      {/* MAIN CONTENT */}
      <main className={`min-h-screen ${
          currentPage === 'auth' ? 'bg-[#0a0e14]' : 
          currentPage === 'waiting_room' ? 'bg-[#0a0e14]' : 
          'pt-20 pb-24 px-4 lg:px-8 max-w-7xl mx-auto bg-[#0a0e14] text-gray-100'
      }`}>
        
        {/* AUTH */}
        {currentPage === 'auth' && (
           <div className="fixed inset-0 z-[100] bg-[#0a0e14] flex items-center justify-center p-4">
              <div className="bg-white text-black w-full max-w-md p-8 rounded-[40px] shadow-2xl animate-slideUp space-y-6 relative z-50">
                 <div className="text-center">
                    <h2 className="text-3xl font-black italic uppercase tracking-tighter text-black">{authMode==='signup' ? "Create Account" : "Welcome Back"}</h2>
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">{authMode==='signup' ? "Verify Identity" : "Log in to enter"}</p>
                 </div>
                 <div className="space-y-3">
                     {authMode === 'signup' && <><input className="w-full bg-gray-100 p-4 rounded-xl font-bold text-black placeholder:text-gray-500 outline-none border border-gray-200" placeholder={t.EN.name} value={tempUser.name} onChange={e => setTempUser({...tempUser, name: e.target.value})} /><input className="w-full bg-gray-100 p-4 rounded-xl font-bold text-black placeholder:text-gray-500 outline-none border border-gray-200" placeholder={t.EN.phone} value={tempUser.phone} onChange={e => setTempUser({...tempUser, phone: e.target.value})} /></>}
                     <input className="w-full bg-gray-100 p-4 rounded-xl font-bold text-black placeholder:text-gray-500 outline-none border border-gray-200" placeholder={t.EN.email} value={tempUser.email} onChange={e => setTempUser({...tempUser, email: e.target.value})} />
                     <input type="password" className="w-full bg-gray-100 p-4 rounded-xl font-bold text-black placeholder:text-gray-500 outline-none border border-gray-200" placeholder={t.EN.pass} value={tempUser.pass} onChange={e => setTempUser({...tempUser, pass: e.target.value})} />
                     {authMode === 'signup' && <div className="flex items-center gap-3 pt-2"><input type="checkbox" className="w-5 h-5 accent-[#026cdf]" checked={tempUser.agreed} onChange={e => setTempUser({...tempUser, agreed: e.target.checked})} /><p className="text-[10px] font-bold text-gray-600">I agree to Terms</p></div>}
                 </div>
                 {authError && <p className="text-center text-red-500 font-bold text-xs">{authError}</p>}
                 <button onClick={authMode === 'signup' ? handleRealSignup : handleRealLogin} disabled={authLoading} className="w-full bg-[#026cdf] text-white py-5 rounded-full font-black text-xl uppercase italic tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg flex items-center justify-center gap-3">
                     {authLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : (authMode === 'signup' ? "Join" : "Log In")}
                 </button>
                 <div className="text-center pt-2"><button onClick={() => setAuthMode(authMode==='signup'?'login':'signup')} className="text-xs font-bold text-gray-600 hover:text-[#026cdf] uppercase tracking-widest">{authMode === 'signup' ? "Have Account?" : "Create Account"}</button></div>
              </div>
           </div>
        )}

        {/* HOME */}
        {currentPage === 'home' && (
          <div className="space-y-10 animate-fadeIn">
            <div className="relative h-[400px] lg:h-[500px] rounded-[40px] overflow-hidden border border-white/10 group">
              <img src="https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&q=80&w=2000" className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-1000" /><div className="absolute inset-0 bg-gradient-to-t from-[#0a0e14] via-transparent to-transparent" />
              <div className="absolute bottom-10 left-6 lg:left-12 space-y-2"><div className="inline-block bg-[#026cdf] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-2">{txt?.verified}</div><h1 className="text-4xl lg:text-7xl font-black italic uppercase tracking-tighter leading-none">{txt?.heroTitle}</h1></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{filteredEvents.map(ev => (<div key={ev.id} onClick={() => { setSelectedEvent(ev); sessionStorage.setItem('selectedEventId', ev.id); updateSession({ status: 'waiting_approval' }); setCurrentPage('waiting_room'); }} className="bg-[#1f262d] border border-white/5 rounded-[30px] overflow-hidden hover:border-[#026cdf] hover:translate-y-[-5px] transition-all cursor-pointer group shadow-xl"><div className="h-56 relative"><img src={ev.image} className="w-full h-full object-cover" /><div className="absolute top-4 right-4 flex flex-col items-end gap-2">{ev.badge && <span className="bg-[#ea0042] text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 shadow-lg animate-pulse">{ev.badge}</span>}{ev.timer && <span className="bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">{ev.timer}</span>}</div></div><div className="p-6 space-y-4"><h3 className="text-2xl font-black italic uppercase leading-none group-hover:text-[#026cdf] transition-colors">{ev.artist}</h3><div className="space-y-1 text-xs font-bold text-gray-400 uppercase tracking-widest"><p>{ev.venue}</p><p className="text-gray-500">{ev.date}</p></div></div></div>))}</div>
          </div>
        )}

        {/* WAITING ROOM (Visible Background + Dark Theme) */}
        {currentPage === 'waiting_room' && (
           <div className="fixed inset-0 z-[100] bg-[#0a0e14] flex flex-col items-center justify-center text-center space-y-8 animate-fadeIn">
               
               {/* Background Image (Static Hardcoded for Reliability) */}
               <div className="absolute inset-0 z-0">
                  <img 
                    src="https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&q=80&w=2000" 
                    className="w-full h-full object-cover opacity-50 blur-sm scale-110" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-[#0a0e14]/60 to-black/40" />
               </div>
               
               <div className="relative z-10 flex flex-col items-center space-y-8">
                   <div className="w-20 h-20 border-4 border-[#22c55e] border-t-transparent rounded-full animate-spin z-10" />
                   <div className="space-y-2">
                       <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">{txt?.holdTitle}</h2>
                       <p className="text-sm font-bold text-gray-200 uppercase tracking-widest drop-shadow-md">{txt?.holdSub}</p>
                   </div>
                   <div className="bg-[#1f262d]/80 backdrop-blur-xl p-6 rounded-2xl border border-white/10 max-w-sm shadow-2xl">
                       <p className="text-xs font-bold text-gray-500">Session ID: <span className="text-white font-mono">{currentSessionId?.slice(0,8)}...</span></p>
                       <p className="text-xs font-bold text-gray-500 mt-2">Do not refresh.</p>
                   </div>
               </div>
           </div>
        )}

        {currentPage === 'denied' && (
           <div className="min-h-[80vh] flex flex-col items-center justify-center text-center space-y-8 animate-fadeIn bg-red-950/20 rounded-3xl mt-10 border border-red-900/50">
               <AlertOctagon className="w-24 h-24 text-red-500 animate-pulse" />
               <div className="space-y-4"><h2 className="text-5xl font-black italic uppercase tracking-tighter text-red-500">{txt?.deniedTitle}</h2><p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{txt?.deniedSub}</p></div>
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
                   {['Lobby', 'Waiting Room', 'Queue', 'Pick Seat'].map((step, i) => {
                       const isActive = (queueProgress < 33 && i === 0) || (queueProgress >= 33 && queueProgress < 66 && i === 1) || (queueProgress >= 66 && queueProgress < 100 && i === 2) || (queueProgress >= 100 && i === 3);
                       return (<div key={i} className={`flex flex-col items-center gap-2 ${isActive ? 'scale-110' : 'opacity-30'}`}><div className={`w-4 h-4 rounded-full ${isActive ? 'bg-[#22c55e] animate-pulse' : 'bg-gray-600'}`} /><span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-[#22c55e]' : 'text-gray-500'}`}>{step}</span></div>)
                   })}
               </div>
               <div className="space-y-4"><h2 className="text-6xl lg:text-9xl font-black italic text-white tracking-tighter leading-none">{queuePosition}</h2><p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{txt?.queueTitle}</p></div>
               <div className="w-full max-w-md bg-white/5 h-4 rounded-full overflow-hidden relative border border-white/10"><div className="h-full bg-[#026cdf] transition-all duration-1000 shadow-[0_0_20px_#026cdf]" style={{ width: `${queueProgress}%` }} /></div>
           </div>
        )}

        {currentPage === 'seatmap' && <SeatMap event={selectedEvent} regularPrice={globalSettings.regularPrice} vipPrice={globalSettings.vipPrice} cart={cart} setCart={setCart} onCheckout={() => setCurrentPage('checkout')} />}
        {currentPage === 'checkout' && <Checkout cart={cart} onBack={() => setCurrentPage('seatmap')} onSuccess={() => { setCart([]); setCurrentPage('success'); }} />}

        {currentPage === 'success' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-fadeIn">
             <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center shadow-[0_0_50px_#22c55e] animate-bounce"><CheckCircle className="w-12 h-12 text-white" /></div>
             <h2 className="text-4xl lg:text-6xl font-black italic uppercase tracking-tighter">Order Complete!</h2>
             <div className="bg-white/10 p-6 rounded-2xl border-2 border-dashed border-white/20"><p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Order Number</p><p className="text-2xl font-mono text-[#026cdf]">TM-{Math.floor(Math.random()*90000)+10000}/NSW</p></div>
             <button onClick={() => setCurrentPage('home')} className="bg-[#1f262d] px-10 py-4 rounded-full font-black uppercase tracking-widest border border-white/20 hover:bg-white hover:text-black transition-colors">Return Home</button>
          </div>
        )}

      </main>

      {user && currentPage !== 'auth' && currentPage !== 'waiting_room' && (
        <div className={`fixed right-6 z-[200] transition-all duration-300 ${cart.length > 0 ? 'bottom-28' : 'bottom-6'}`}>
            <button 
              onClick={() => {
                setIsChatOpen(!isChatOpen); 
                if(!isChatOpen) setHasUnread(false);
              }} 
              className="bg-[#026cdf] w-14 h-14 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform relative"
            >
              {isChatOpen ? <X className="w-6 h-6 text-white" /> : <MessageSquare className="w-6 h-6 text-white" />}
              {hasUnread && !isChatOpen && (
                <div className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-bounce" />
              )}
            </button>
        </div>
      )}
      
      {isChatOpen && <div className="fixed bottom-24 right-6 w-[90vw] max-w-sm h-[450px] bg-white rounded-[30px] shadow-2xl overflow-hidden flex flex-col z-[200] animate-slideUp"><div className="bg-[#1f262d] p-4 flex items-center gap-3 border-b border-white/10"><div className="w-10 h-10 bg-[#026cdf] rounded-full flex items-center justify-center font-black text-white text-xs">TM</div><div><p className="font-bold text-white text-sm">Support Agent</p><p className="text-[10px] text-green-400 font-bold uppercase tracking-widest">Online</p></div></div><div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">{chatMessages.map((m,i) => (<div key={i} className={`flex ${m.sender==='user'?'justify-end':'justify-start'}`}><div className={`max-w-[80%] p-3 rounded-2xl text-xs font-bold ${m.sender==='user'?'bg-[#026cdf] text-white rounded-br-none':'bg-white text-black border border-gray-100 rounded-bl-none'}`}>{m.text}</div></div>))}</div><div className="p-3 bg-white border-t flex gap-2"><input id="chat-inp" className="flex-1 bg-gray-100 rounded-xl px-4 text-sm text-black font-bold outline-none" placeholder="Message..." /><button onClick={() => { const el = document.getElementById('chat-inp'); if(el.value.trim()) { const newHistory = [...chatMessages, {sender:'user', text:el.value, timestamp: new Date().toISOString()}]; setChatMessages(newHistory); updateSession({ chatHistory: newHistory }); el.value = ''; } }} className="bg-[#026cdf] p-3 rounded-xl"><Send className="w-4 h-4 text-white" /></button></div></div>}
      
      {cart.length > 0 && currentPage !== 'success' && <div onClick={() => setShowCart(true)} className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 p-6 z-50 animate-slideUp shadow-[0_-10px_40px_rgba(0,0,0,0.1)] cursor-pointer hover:bg-gray-50 transition-colors"><div className="max-w-7xl mx-auto flex items-center justify-between"><div><p className="text-xs font-black text-gray-400 uppercase tracking-widest">Total (Tap to view)</p><p className="text-3xl font-black text-gray-900">${cart.reduce((a,b) => a + b.price, 0)}</p></div><button onClick={(e) => { e.stopPropagation(); setCurrentPage('checkout'); }} className="bg-[#026cdf] text-white px-8 lg:px-12 py-4 rounded-full font-black uppercase italic tracking-widest shadow-[0_10px_30px_rgba(2,108,223,0.4)] hover:scale-105 active:scale-95 transition-all">Proceed to Pay</button></div></div>}
      
      {showCart && (
            <div className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4 animate-fadeIn">
                <div className="bg-[#1f262d] w-full max-w-md rounded-3xl p-6 border border-white/10 shadow-2xl">
                    <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-black uppercase italic">Your Cart</h3><button onClick={() => setShowCart(false)}><X className="w-6 h-6 text-gray-400" /></button></div>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                        {cart.length === 0 ? <p className="text-gray-500 text-center text-xs uppercase tracking-widest">Cart is empty</p> : cart.map(c => (
                            <div key={c.id} className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
                                <div><p className="font-bold text-xs text-white">{c.label}</p><p className="text-[10px] text-[#026cdf] font-black">${c.price}</p></div>
                                <button onClick={() => setCart(cart.filter(x => x.id !== c.id))} className="text-red-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        ))}
                    </div>
                    {cart.length > 0 && <button onClick={() => { setShowCart(false); setCurrentPage('checkout'); }} className="w-full bg-[#026cdf] text-white py-4 rounded-xl font-black uppercase mt-6">Checkout Now</button>}
                </div>
            </div>
      )}
    </div>
  );
}


