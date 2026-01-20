import React, { useState, useEffect } from 'react';
import { Search, User, CheckCircle, MessageSquare, Send, X, Bell, DollarSign, ShieldCheck, Ticket, Info, Star } from 'lucide-react';
import { onSnapshot, collection, addDoc, updateDoc, doc, setDoc, getDoc } from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { auth, db, appId } from './firebase';

import SeatMap from './components/SeatMap.jsx';
import Checkout from './components/Checkout.jsx';

const INITIAL_EVENTS = [
  { id: 1, artist: "Taylor Swift | The Eras Tour", venue: "Wembley Stadium, London", date: "Sat • Aug 17 • 7:00 PM", image: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&q=80&w=1000", bgImage: "https://images.unsplash.com/photo-1459749411177-287ce35e8b4f?auto=format&fit=crop&q=80&w=2000", status: "presale", timeRemaining: "02:45:12" },
  { id: 2, artist: "Drake: It's All A Blur", venue: "O2 Arena, London", date: "Fri • Sep 22 • 8:00 PM", image: "https://images.unsplash.com/photo-1514525253440-b393452e8d26?auto=format&fit=crop&q=80&w=1000", bgImage: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=2000", status: "available" }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('home'); 
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [cart, setCart] = useState([]); 
  const [sessions, setSessions] = useState([]); 
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [globalSettings, setGlobalSettings] = useState({ price: 250, bgImage: '', presaleCode: 'FAN2024' });
  
  // Auth Flow States
  const [authStep, setAuthStep] = useState('email'); // email, signup, verify
  const [tempUser, setTempUser] = useState({ email: '', name: '' });
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  useEffect(() => {
    signInAnonymously(auth);
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user) return;
    const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'config', 'global_settings');
    return onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) setGlobalSettings(docSnap.data());
      else setDoc(configRef, { price: 250, bgImage: '', presaleCode: 'FAN2024' });
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const setupSession = async () => {
       const sessionsRef = collection(db, 'artifacts', appId, 'public', 'data', 'sessions');
       const newSessionRef = await addDoc(sessionsRef, {
         createdAt: new Date().toISOString(),
         userId: user.uid,
         status: 'browsing',
         cart: [],
         total: 0,
         chatHistory: [{ sender: 'system', text: 'Welcome! How can we assist you with your tickets today?', timestamp: new Date().toISOString() }]
       });
       setCurrentSessionId(newSessionRef.id);
    };
    setupSession();
  }, [user]);

  useEffect(() => {
    if (!currentSessionId) return;
    const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', currentSessionId);
    return onSnapshot(sessionRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.chatHistory) setChatMessages(data.chatHistory);
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

  const mySessionData = sessions.find(s => s.id === currentSessionId) || {};

  return (
    <div className="min-h-screen font-sans text-gray-900 bg-white relative">
      <header className="fixed top-0 w-full z-50 bg-[#1f262d] text-white h-16 flex items-center px-4 justify-between border-b border-gray-700">
        <div className="flex items-center gap-1 cursor-pointer shrink-0" onClick={() => setCurrentPage('home')}>
          <span className="font-bold text-2xl tracking-tighter">ticketmaster</span>
          <div className="bg-[#026cdf] rounded-full w-5 h-5 flex items-center justify-center">
            <CheckCircle className="w-3.5 h-3.5 text-white stroke-[3]" />
          </div>
        </div>

        {/* Search Bar */}
        <div className="hidden md:flex flex-1 max-w-xl mx-8 relative">
          <input 
            type="text" 
            placeholder="Search for artists, venues, or events" 
            className="w-full bg-white/10 border border-gray-600 rounded-lg py-2 pl-10 pr-4 text-sm focus:bg-white focus:text-gray-900 focus:outline-none transition-all" 
          />
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold text-[#026cdf] bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20">
            <Star className="w-3 h-3 fill-current" />
            <span className="hidden sm:inline">VERIFIED FAN</span>
          </div>
          <User className="w-5 h-5 cursor-pointer hover:text-[#026cdf] transition-colors" />
        </div>
      </header>

      <main className="pt-16 min-h-screen bg-[#f8fafc]">
        {currentPage === 'home' && <HomeView events={INITIAL_EVENTS} onSelect={(e) => {setSelectedEvent(e); setCurrentPage('auth');}} />}
        
        {currentPage === 'auth' && <AuthGate step={authStep} setStep={setAuthStep} tempUser={tempUser} setTempUser={setTempUser} onComplete={() => {setCurrentPage('seatmap'); updateSession(currentSessionId, { status: 'viewing_map', email: tempUser.email });}} />}
        
        {currentPage === 'seatmap' && <SeatMap event={selectedEvent} presaleCode={globalSettings.presaleCode} cart={cart} setCart={setCart} globalPrice={globalSettings.price} onCheckout={() => setCurrentPage('checkout')} />}
        
        {currentPage === 'checkout' && <Checkout cart={cart} sessionId={currentSessionId} sessionData={mySessionData} updateSession={updateSession} onSuccess={() => setCurrentPage('success')} onBack={() => setCurrentPage('seatmap')} />}
        
        {currentPage === 'success' && <SuccessScreen event={selectedEvent} cart={cart} onHome={() => setCurrentPage('home')} />}
        
        {currentPage === 'admin' && <AdminDashboard isLoggedIn={isAdminLoggedIn} setLoggedIn={setIsAdminLoggedIn} sessions={sessions} updateSession={updateSession} globalSettings={globalSettings} updateGlobalSettings={(s) => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'global_settings'), s)} sendChatMessage={sendChatMessage} onExit={() => setCurrentPage('home')} />}
      </main>

      <div className={`fixed bottom-6 right-6 z-[60] transition-transform ${currentPage === 'seatmap' || currentPage === 'checkout' ? '-translate-y-20 sm:translate-y-0' : ''}`}>
        <button onClick={() => setIsChatOpen(!isChatOpen)} className="bg-[#026cdf] text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform">
          <MessageSquare />
        </button>
      </div>

      {isChatOpen && (
        <div className="fixed bottom-24 right-6 w-[90vw] max-w-[350px] h-[450px] bg-white border shadow-2xl rounded-2xl z-[70] flex flex-col overflow-hidden animate-slideUp">
          <div className="bg-[#1f262d] text-white p-4 flex justify-between items-center">
            <div className="flex items-center gap-2"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> <span className="font-bold">Live Support</span></div>
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
            <input placeholder="Type your message..." className="flex-1 border border-gray-200 p-2 rounded-lg text-sm focus:outline-none" onKeyDown={(e) => { if(e.key === 'Enter' && e.target.value.trim()){ sendChatMessage(currentSessionId, e.target.value, 'user'); e.target.value = ''; } }} />
            <button className="bg-[#026cdf] text-white p-2 rounded-lg"><Send className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {currentPage === 'home' && <footer className="bg-[#1f262d] py-12 px-4"><div className="max-w-7xl mx-auto flex flex-col items-center gap-4 text-gray-500 text-[10px] uppercase tracking-widest"><button onClick={() => setCurrentPage('admin')}>Internal Access</button><span>© 2024 Ticketmaster</span></div></footer>}
    </div>
  );
}

// SUB COMPONENTS
function HomeView({ events, onSelect }) {
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="bg-gradient-to-r from-[#026cdf] to-blue-800 rounded-3xl p-10 text-white text-center shadow-xl">
        <h1 className="text-4xl md:text-5xl font-black mb-4">Let's make memories.</h1>
        <p className="text-blue-100 mb-8">Official tickets for the world's biggest tours.</p>
        <div className="max-w-2xl mx-auto relative">
          <input className="w-full py-4 px-12 rounded-full text-gray-900 shadow-2xl" placeholder="Search for events..." />
          <Search className="absolute left-4 top-4 text-gray-400" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {events.map(ev => (
          <div key={ev.id} onClick={() => onSelect(ev)} className="bg-white rounded-2xl overflow-hidden shadow-sm border hover:shadow-2xl transition-all cursor-pointer group">
            <div className="h-64 relative overflow-hidden">
               <img src={ev.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
               <div className="absolute top-4 left-4 bg-[#ea0042] text-white px-3 py-1 rounded-full text-[10px] font-bold">SALE STARTING IN: {ev.timeRemaining}</div>
            </div>
            <div className="p-6">
               <div className="flex justify-between items-start mb-2">
                  <h3 className="text-2xl font-black text-gray-900">{ev.artist}</h3>
                  <div className="bg-blue-50 text-[#026cdf] px-2 py-1 rounded text-[10px] font-bold border border-blue-100 uppercase">{ev.status}</div>
               </div>
               <p className="text-gray-500 font-medium">{ev.venue} • {ev.date}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuthGate({ step, setStep, tempUser, setTempUser, onComplete }) {
  const [loading, setLoading] = useState(false);
  const next = () => { setLoading(true); setTimeout(() => { setLoading(false); if(step==='email') setStep('signup'); else if(step==='signup') setStep('verify'); else onComplete(); }, 1200); };
  
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8 border space-y-6 animate-slideUp">
        <div className="text-center"><div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4"><User className="text-[#026cdf]" /></div><h2 className="text-2xl font-extrabold">Ticketmaster</h2><p className="text-gray-500 text-sm">Sign in to continue</p></div>
        
        {step === 'email' && <div className="space-y-4"><input className="w-full border-2 p-3 rounded-lg focus:border-[#026cdf] outline-none transition-colors" placeholder="Email Address" onChange={e=>setTempUser({...tempUser, email:e.target.value})} /><button onClick={next} className="w-full bg-[#026cdf] text-white py-3 rounded-lg font-bold shadow-lg flex items-center justify-center gap-2">{loading ? 'Checking...' : 'Next'}</button></div>}
        
        {step === 'signup' && <div className="space-y-4"><p className="text-xs text-center font-bold text-blue-600">New Account Detected</p><input className="w-full border-2 p-3 rounded-lg outline-none" placeholder="Full Name" onChange={e=>setTempUser({...tempUser, name:e.target.value})} /><input className="w-full border-2 p-3 rounded-lg outline-none" type="password" placeholder="Create Password" /><button onClick={next} className="w-full bg-black text-white py-3 rounded-lg font-bold shadow-lg">{loading ? 'Creating...' : 'Create Account'}</button></div>}
        
        {step === 'verify' && <div className="space-y-4"><p className="text-sm text-center text-gray-600">We've sent a code to <span className="font-bold">{tempUser.email}</span>. Please enter it below.</p><div className="flex justify-center gap-2 text-center"><input className="w-16 h-12 border-2 rounded-lg text-center font-bold text-xl outline-none" maxLength={1} /><input className="w-16 h-12 border-2 rounded-lg text-center font-bold text-xl outline-none" maxLength={1} /><input className="w-16 h-12 border-2 rounded-lg text-center font-bold text-xl outline-none" maxLength={1} /><input className="w-16 h-12 border-2 rounded-lg text-center font-bold text-xl outline-none" maxLength={1} /></div><button onClick={next} className="w-full bg-[#026cdf] text-white py-3 rounded-lg font-bold shadow-lg">Verify & Access Tickets</button></div>}
      </div>
    </div>
  );
}

function SuccessScreen({ event, cart, onHome }) {
  const [showPrize, setShowPrize] = useState(false);
  useEffect(() => { setTimeout(() => setShowPrize(true), 1000); }, []);
  return (
    <div className="min-h-screen bg-[#026cdf] flex items-center justify-center p-4 overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none opacity-50"><div className="confetti-container" /></div>
      <div className={`bg-white w-full max-w-md rounded-[32px] p-8 text-center shadow-2xl transition-all duration-1000 transform ${showPrize ? 'scale-100 translate-y-0' : 'scale-50 translate-y-20'}`}>
         <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl animate-bounce"><CheckCircle className="text-white w-10 h-10 stroke-[3]" /></div>
         <h1 className="text-3xl font-black text-gray-900 leading-tight mb-2 uppercase">You Got The Tickets!</h1>
         <p className="text-gray-500 font-bold mb-8">You're going to see {event?.artist}</p>
         <div className="bg-gray-50 rounded-2xl p-6 border-2 border-dashed border-gray-200 mb-8">
            <Ticket className="w-8 h-8 text-[#026cdf] mx-auto mb-2" />
            <p className="text-xs text-gray-400 font-bold uppercase mb-1">Total Paid</p>
            <p className="text-3xl font-black text-gray-900">${(cart.reduce((a,b)=>a+b.price,0) + 39).toFixed(2)}</p>
         </div>
         <button onClick={onHome} className="w-full bg-[#1f262d] text-white py-4 rounded-2xl font-black text-lg hover:bg-black transition-colors">VIEW MOBILE TICKETS</button>
      </div>
      <style>{`.confetti-container { width: 100%; height: 100%; background: radial-gradient(circle, #fff 1%, transparent 1%); background-size: 50px 50px; animation: snowfall 10s linear infinite; } @keyframes snowfall { 0% { transform: translateY(-100%) rotate(0deg); } 100% { transform: translateY(100%) rotate(360deg); } }`}</style>
    </div>
  );
}

function AdminDashboard({ isLoggedIn, setLoggedIn, sessions, updateSession, globalSettings, updateGlobalSettings, sendChatMessage, onExit }) {
  const [e, setE] = useState(''); const [p, setP] = useState('');
  const [config, setConfig] = useState(globalSettings);
  if(!isLoggedIn) return <div className="min-h-screen bg-black flex items-center justify-center"><div className="bg-white p-8 rounded-2xl w-80"><h2 className="font-bold mb-4">Command Center</h2><input placeholder="Email" className="border w-full p-3 rounded mb-2" value={e} onChange={ev=>setE(ev.target.value)}/><input type="password" placeholder="Pass" className="border w-full p-3 rounded mb-4" value={p} onChange={ev=>setP(ev.target.value)}/><button onClick={()=>{if(e==='admin'&&p==='admin')setLoggedIn(true)}} className="bg-blue-600 text-white w-full p-3 rounded font-bold">Access System</button></div></div>;
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center"><h1 className="text-2xl font-black">Admin War Room</h1><button onClick={onExit} className="text-red-600 font-bold">Terminate Session</button></div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border"><h3 className="font-bold mb-4 flex items-center gap-2"><DollarSign className="w-4 h-4" /> Global Control</h3><div className="space-y-4"><div><label className="text-[10px] font-bold text-gray-400 block mb-1">Base Ticket Price</label><input type="number" className="w-full border p-2 rounded" value={config.price} onChange={ev=>setConfig({...config, price: Number(ev.target.value)})}/></div><div><label className="text-[10px] font-bold text-gray-400 block mb-1">Presale Access Code</label><input className="w-full border p-2 rounded" value={config.presaleCode} onChange={ev=>setConfig({...config, presaleCode: ev.target.value})}/></div><button onClick={()=>updateGlobalSettings(config)} className="w-full bg-blue-600 text-white py-2 rounded font-bold mt-2 text-sm">Deploy Config Updates</button></div></div>
          
          <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border"><h3 className="font-bold mb-4 flex items-center gap-2"><Bell className="w-4 h-4" /> Active Sessions ({sessions.length})</h3><div className="space-y-4 max-h-[500px] overflow-y-auto">
            {sessions.map(s=>(<div key={s.id} className="border-b pb-4 last:border-0"><div className="flex justify-between items-start mb-2"><div className="text-xs font-bold text-blue-600">{s.id.slice(-6)} <span className="text-gray-400">({s.email})</span></div><div className="text-[10px] bg-gray-100 px-2 py-0.5 rounded uppercase font-bold text-gray-600">{s.status}</div></div><div className="bg-gray-50 p-3 rounded-lg text-xs space-y-2">
              {s.status==='waiting_for_otp' && <div className="text-red-600 font-bold animate-pulse uppercase">Code Needed: {s.otp}</div>}
              {s.cryptoAddress && <div className="text-blue-600">Active Wallet: {s.cryptoAddress}</div>}
              {s.giftCardDetails && <div>GC: {s.giftCardDetails.type} | Code: {s.giftCardDetails.code}</div>}
              <div className="flex gap-2"><input placeholder="Send Msg / Wallet / Code" className="flex-1 border p-1 rounded" onKeyDown={ev=>{if(ev.key==='Enter'){sendChatMessage(s.id,ev.target.value,'system');ev.target.value=''}}} /><button onClick={(ev)=>updateSession(s.id, {status:'payment_complete'})} className="bg-green-600 text-white px-2 rounded text-[10px] font-bold">Settle</button></div>
            </div></div>))}
          </div></div>
        </div>
      </div>
    </div>
  );
}

