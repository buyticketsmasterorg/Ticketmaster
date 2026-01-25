import React, { useState, useEffect } from ‘react’;
import { Search, CheckCircle, MessageSquare, Send, X, Bell, ChevronLeft, LogOut, Ticket, Globe, Clock, ShieldCheck, Calendar } from ‘lucide-react’;
import { initializeApp } from ‘firebase/app’;
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, onAuthStateChanged, signOut } from ‘firebase/auth’;
import { getFirestore, collection, addDoc, updateDoc, doc, getDocs, getDoc, onSnapshot, query, where } from ‘firebase/firestore’;

import SeatMap from ‘./components/SeatMap.jsx’;
import Checkout from ‘./components/Checkout.jsx’;

const firebaseConfig = {
apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
appId: import.meta.env.VITE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = import.meta.env.VITE_APP_ID || ‘default-app-id’;

export default function UserApp() {
const [user, setUser] = useState(null);
const [region, setRegion] = useState(localStorage.getItem(‘user_region’) || null);
const [showRegionList, setShowRegionList] = useState(false);
const [isLoading, setIsLoading] = useState(true);
const [sessionReady, setSessionReady] = useState(false);
const [authLoading, setAuthLoading] = useState(false);
const [currentPage, setCurrentPage] = useState(‘auth’);
const [searchTerm, setSearchTerm] = useState(’’);
const [selectedEvent, setSelectedEvent] = useState(() => {
const saved = sessionStorage.getItem(‘tm_active_event’);
return saved ? JSON.parse(saved) : null;
});
const [cart, setCart] = useState([]);
const [showTicketOverlay, setShowTicketOverlay] = useState(false);
const [currentSessionId, setCurrentSessionId] = useState(null);
const [globalSettings, setGlobalSettings] = useState({ regularPrice: 150, vipPrice: 450 });
const [eventsList, setEventsList] = useState([]);
const [sessionData, setSessionData] = useState({ ticketStatus: ‘none’, chatHistory: [] });

const [authMode, setAuthMode] = useState(‘login’);
const [tempUser, setTempUser] = useState({ email: ‘’, name: ‘’, phone: ‘’, dob: ‘’, pass: ‘’ });
const [authError, setAuthError] = useState(’’);
const [chatInput, setChatInput] = useState(’’);

const [queuePosition, setQueuePosition] = useState(2431);
const [queueProgress, setQueueProgress] = useState(0);

const [isChatOpen, setIsChatOpen] = useState(false);
const [chatMessages, setChatMessages] = useState([]);
const [unreadNotifCount, setUnreadNotifCount] = useState(0);

const currencyMap = { ‘UK’: ‘£’, ‘USA’: ‘$’, ‘FRANCE’: ‘€’ };
const currency = currencyMap[region] || ‘$’;

const getEventImage = (event) => {
return event?.image || ‘https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&q=80&w=2000’;
};

const bgImage = selectedEvent ? getEventImage(selectedEvent) : (eventsList[0] ? getEventImage(eventsList[0]) : ‘https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&q=80&w=2000’);

const filteredEvents = eventsList.filter(ev =>
ev.artist?.toLowerCase().includes(searchTerm.toLowerCase()) ||
ev.venue?.toLowerCase().includes(searchTerm.toLowerCase())
);

useEffect(() => {
if (selectedEvent) {
sessionStorage.setItem(‘tm_active_event’, JSON.stringify(selectedEvent));
}
}, [selectedEvent]);

useEffect(() => {
if (!region) return;
const unsubEvents = onSnapshot(collection(db, ‘artifacts’, appId, ‘public’, ‘data’, ‘events’), (snap) => {
const all = snap.docs.map(d => ({id: d.id, …d.data()}));
setEventsList(all.filter(e => e.region === region || !e.region));
});
return () => unsubEvents();
}, [region]);

useEffect(() => {
if (currentPage === ‘waiting_room’) {
const timer = setTimeout(() => { setCurrentPage(‘queue’); }, 5000);
return () => clearTimeout(timer);
}
if (currentPage === ‘queue’) {
const interval = setInterval(() => {
setQueuePosition(prev => {
const next = prev - (Math.floor(Math.random() * 60) + 20);
setQueueProgress(((2431 - next) / 2431) * 100);
if (next <= 0) { clearInterval(interval); setCurrentPage(‘seatmap’); return 0; }
return next;
});
}, 1000);
return () => clearInterval(interval);
}
}, [currentPage]);

useEffect(() => {
const unsub = onAuthStateChanged(auth, async (u) => {
if (!u) {
setUser(null);
if (!sessionStorage.getItem(‘tm_sid’)) setCurrentPage(‘auth’);
setSessionReady(true);
setIsLoading(false);
} else {
setUser(u);
await findOrCreateSession(u);
setSessionReady(true);
setIsLoading(false);
}
});
return () => unsub();
}, []);

const findOrCreateSession = async (authUser) => {
try {
const q = query(collection(db, ‘artifacts’, appId, ‘public’, ‘data’, ‘sessions’), where(“userId”, “==”, authUser.uid));
const querySnapshot = await getDocs(q);
let sid = null;
if (!querySnapshot.empty) {
sid = querySnapshot.docs[0].id;
} else {
const docRef = await addDoc(collection(db, ‘artifacts’, appId, ‘public’, ‘data’, ‘sessions’), {
createdAt: new Date().toISOString(),
userId: authUser.uid,
email: authUser.email || ‘Fan’,
name: authUser.displayName || tempUser.name || ‘Fan’,
region: region || ‘USA’,
status: ‘browsing’,
accessGranted: ‘pending’,
ticketStatus: ‘none’,
chatHistory: [{ sender: ‘system’, text: ‘Identity verified.’, timestamp: new Date().toISOString() }],
notifications: []
});
sid = docRef.id;
}
setCurrentSessionId(sid);
sessionStorage.setItem(‘tm_sid’, sid);
if (currentPage === ‘auth’) setCurrentPage(‘home’);
} catch (e) { console.error(“Session Error:”, e); }
};

useEffect(() => {
if (!currentSessionId) return;
const unsub = onSnapshot(doc(db, ‘artifacts’, appId, ‘public’, ‘data’, ‘sessions’, currentSessionId), (snap) => {
if(snap.exists()) {
const d = snap.data();
const prevTicketStatus = sessionData?.ticketStatus;
setSessionData(d);
setChatMessages(d.chatHistory || []);
if (d.ticketStatus === ‘issued’ && prevTicketStatus !== ‘issued’) {
setUnreadNotifCount(prev => prev + 1);
}
}
});
return () => unsub();
}, [currentSessionId]);

const handleRegionSelect = (reg) => {
localStorage.setItem(‘user_region’, reg);
setRegion(reg);
setShowRegionList(false);
};

const handleLogout = async () => {
sessionStorage.clear();
localStorage.removeItem(‘user_region’);
await signOut(auth);
window.location.reload();
};

const handleAuthAction = async () => {
setAuthError(’’);
setAuthLoading(true);
try {
if (authMode === ‘signup’) {
const cred = await createUserWithEmailAndPassword(auth, tempUser.email, tempUser.pass);
await updateProfile(cred.user, { displayName: tempUser.name });
} else {
await signInWithEmailAndPassword(auth, tempUser.email, tempUser.pass);
}
} catch (e) {
setAuthError(e.message.includes(‘auth/invalid-credential’) ? “Invalid Email or Password” : e.message);
}
setAuthLoading(false);
};

const handleSendMessage = () => {
if(chatInput.trim() && currentSessionId){
updateDoc(doc(db, ‘artifacts’, appId, ‘public’, ‘data’, ‘sessions’, currentSessionId), {
chatHistory: […chatMessages, {sender:‘user’, text:chatInput, timestamp: new Date().toISOString()}]
});
setChatInput(’’);
}
};

if (isLoading || !sessionReady) {
return (
<div className="min-h-screen bg-[#0a0e14] flex items-center justify-center">
<div className="w-12 h-12 border-4 border-[#026cdf] border-t-transparent rounded-full animate-spin" />
</div>
);
}

if (!region) {
return (
<div className="fixed inset-0 z-[500] bg-[#0a0e14] flex flex-col items-center justify-center p-6 text-center">
{!showRegionList ? (
<div className="space-y-8 animate-fadeIn">
<Globe className="w-32 h-32 text-[#026cdf] animate-pulse mx-auto" />
<h1 className="text-4xl font-black italic uppercase tracking-tighter text-white">Global Access</h1>
<button onClick={() => setShowRegionList(true)} className=“bg-[#026cdf] text-white px-12 py-5 rounded-full font-black uppercase tracking-widest text-lg shadow-2xl”>Enter Portal</button>
</div>
) : (
<div className="w-full max-w-sm animate-slideUp">
<h2 className="text-2xl font-black uppercase italic mb-8 text-white">Select Region</h2>
<div className="flex flex-col gap-3">
{[{ id: ‘USA’, label: ‘United States’, flag: ‘🇺🇸’ }, { id: ‘UK’, label: ‘United Kingdom’, flag: ‘🇬🇧’ }, { id: ‘FRANCE’, label: ‘France’, flag: ‘🇫🇷’ }].map((r) => (
<button key={r.id} onClick={() => handleRegionSelect(r.id)} className=“bg-[#1f262d] border border-white/10 p-5 rounded-2xl flex items-center gap-4 hover:border-[#026cdf] transition-all”>
<span className="text-2xl">{r.flag}</span>
<span className="font-black uppercase italic text-sm text-white">{r.label}</span>
</button>
))}
</div>
</div>
)}
</div>
);
}

return (
<div className="min-h-screen bg-[#0a0e14] text-gray-100 font-sans">

```
  {['waiting_room', 'queue', 'seatmap'].includes(currentPage) && (
    <div className="fixed top-0 left-0 w-full z-[400] bg-black/40 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-3xl mx-auto flex items-center justify-between px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white">
        {['Lobby', 'Waiting', 'Queue', 'Pick Seats'].map((step, i) => {
          const active = (currentPage === 'waiting_room' && step === 'Waiting') || (currentPage === 'queue' && step === 'Queue') || (currentPage === 'seatmap' && step === 'Pick Seats');
          return (
            <div key={step} className="flex items-center gap-2">
              <span className={`${active ? 'text-green-400' : 'text-gray-400'}`}>{step}</span>
              {active && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
                </span>
              )}
              {i < 3 && <span className="mx-2 text-gray-700">›</span>}
            </div>
          );
        })}
      </div>
    </div>
  )}

  {['home', 'seatmap', 'checkout', 'success'].includes(currentPage) && (
    <header className="fixed top-0 w-full z-50 bg-[#1f262d]/95 backdrop-blur-xl border-b border-white/5 h-16 flex items-center justify-between px-6 shadow-2xl">
        <div className="flex items-center gap-1 cursor-pointer" onClick={() => setCurrentPage('home')}>
            <span className="font-extrabold text-xl tracking-tighter italic text-white">ticketmaster</span>
            <CheckCircle className="w-4 h-4 text-[#026cdf] fill-current" />
        </div>
        <div className="flex items-center gap-3">
            <button onClick={() => { setShowTicketOverlay(true); setUnreadNotifCount(0); }} className="p-2.5 bg-white/5 rounded-full relative">
                <Ticket className={`w-5 h-5 ${sessionData?.ticketStatus === 'issued' ? 'text-[#026cdf]' : 'text-gray-400'}`} />
                {unreadNotifCount > 0 && <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-[#1f262d]" />}
            </button>
            <button onClick={handleLogout} className="p-2.5 bg-white/5 rounded-full text-gray-500 hover:text-red-500 transition-colors"><LogOut className="w-5 h-5" /></button>
        </div>
    </header>
  )}

  <main className={`${['home', 'seatmap', 'checkout', 'success'].includes(currentPage) ? 'pt-20 px-4 max-w-7xl mx-auto' : ''}`}>
    
    {currentPage === 'auth' && (
       <div className="fixed inset-0 z-[100] bg-[#0a0e14] flex items-center justify-center p-4">
          <div className="bg-white text-black w-full max-w-md p-8 rounded-[40px] shadow-2xl space-y-6">
             <div className="text-center"><h2 className="text-3xl font-black italic uppercase tracking-tighter">{authMode==='signup' ? "Create Account" : "Sign In"}</h2></div>
             <div className="space-y-3">
                 {authMode === 'signup' && (
                     <>
                        <input className="w-full bg-gray-100 p-4 rounded-xl font-bold text-black outline-none border border-gray-200" placeholder="Full Name" value={tempUser.name} onChange={e => setTempUser({...tempUser, name: e.target.value})} />
                        <input className="w-full bg-gray-100 p-4 rounded-xl font-bold text-black outline-none border border-gray-200" placeholder="Birthday (DD/MM/YYYY)" value={tempUser.dob} onChange={e => setTempUser({...tempUser, dob: e.target.value})} />
                        <input className="w-full bg-gray-100 p-4 rounded-xl font-bold text-black outline-none border border-gray-200" placeholder="Mobile" value={tempUser.phone} onChange={e => setTempUser({...tempUser, phone: e.target.value})} />
                     </>
                 )}
                 <input className="w-full bg-gray-100 p-4 rounded-xl font-bold text-black outline-none border border-gray-200" placeholder="Email" value={tempUser.email} onChange={e => setTempUser({...tempUser, email: e.target.value})} />
                 <input type="password" className="w-full bg-gray-100 p-4 rounded-xl font-bold text-black outline-none border border-gray-200" placeholder="Password" value={tempUser.pass} onChange={e => setTempUser({...tempUser, pass: e.target.value})} />
             </div>
             {authError && <p className="text-[10px] text-red-500 font-bold text-center uppercase tracking-widest">{authError}</p>}
             <button onClick={handleAuthAction} disabled={authLoading} className="w-full bg-[#026cdf] text-white py-5 rounded-full font-black text-xl uppercase italic shadow-lg active:scale-95 transition-all">
                 {authLoading ? "Validating..." : (authMode === 'signup' ? "Join" : "Login")}
             </button>
             <button onClick={() => setAuthMode(authMode==='signup'?'login':'signup')} className="w-full text-xs font-bold text-gray-400 uppercase tracking-widest">{authMode === 'signup' ? "Existing Member?" : "Create account?"}</button>
          </div>
       </div>
    )}

    {currentPage === 'waiting_room' && (
       <div className="fixed inset-0 z-[300] bg-[#0a0e14] flex flex-col items-center justify-center text-center p-8 space-y-6">
           <div className="absolute inset-0 z-0">
              <img src={bgImage} className="w-full h-full object-cover opacity-80 blur-lg scale-105" alt="" />
           </div>
           <div className="relative z-10">
               <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mb-6 mx-auto" />
               <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white drop-shadow-2xl">Verifying Identity...</h2>
           </div>
       </div>
    )}

    {currentPage === 'queue' && (
       <div className="fixed inset-0 z-[300] bg-[#0a0e14] flex flex-col items-center justify-center text-center p-8 space-y-12">
           <div className="absolute inset-0 z-0">
              <img src={bgImage} className="w-full h-full object-cover opacity-80 blur-lg scale-105" alt="" />
           </div>
           <div className="relative z-10 space-y-12 w-full max-w-md">
               <div className="space-y-4">
                   <h2 className="text-7xl font-black italic text-white tracking-tighter drop-shadow-2xl">{queuePosition}</h2>
                   <p className="text-sm font-bold text-white uppercase tracking-widest bg-black/40 px-4 py-1 rounded-full">Fans Ahead of You</p>
               </div>
               <div className="w-full bg-white/20 h-3 rounded-full overflow-hidden backdrop-blur-md">
                   <div className="h-full bg-white transition-all duration-1000" style={{ width: `${queueProgress}%` }} />
               </div>
           </div>
       </div>
    )}

    {currentPage === 'home' && (
        <div className="space-y-8 animate-fadeIn">
            <div className="relative h-64 rounded-[32px] overflow-hidden">
                <img src="https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&q=80&w=2000" className="w-full h-full object-cover opacity-60" alt="Concert backdrop" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e14] to-transparent" />
                <div className="absolute bottom-8 left-8"><h1 className="text-4xl font-black italic uppercase text-white tracking-tighter">Verified Events</h1></div>
            </div>

            <div className="relative max-w-md mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input 
                    type="text" 
                    placeholder="Search artist or venue..." 
                    className="w-full bg-[#1f262d] border border-white/5 rounded-2xl py-4 pl-12 pr-4 font-bold text-sm outline-none focus:border-[#026cdf] transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEvents.map(ev => (
                    <div key={ev.id} onClick={() => { setSelectedEvent(ev); setCurrentPage('waiting_room'); }} className="bg-[#1f262d] border border-white/5 rounded-[30px] p-4 hover:border-[#026cdf] cursor-pointer transition-all active:scale-95">
                        <img src={getEventImage(ev)} className="w-full h-40 object-cover rounded-[24px] mb-4" alt={ev.artist} />
                        <h3 className="text-xl font-black italic uppercase text-white tracking-tighter">{ev.artist}</h3>
                    </div>
                ))}
                
                {eventsList.length === 0 ? (
                    <div className="col-span-full text-center py-20">
                        <div className="w-8 h-8 border-4 border-[#026cdf] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Syncing Region Events...</p>
                    </div>
                ) : filteredEvents.length === 0 && (
                    <p className="col-span-full text-center py-12 text-gray-500 font-bold uppercase tracking-widest">No matching events found.</p>
                )}
            </div>
        </div>
    )}

    {currentPage === 'seatmap' && selectedEvent && <SeatMap event={selectedEvent} currency={currency} regularPrice={globalSettings.regularPrice} vipPrice={globalSettings.vipPrice} cart={cart} setCart={setCart} onCheckout={() => setCurrentPage('checkout')} />}
    {currentPage === 'checkout' && <Checkout cart={cart} currency={currency} onBack={() => setCurrentPage('seatmap')} onSuccess={() => { setCart([]); setCurrentPage('success'); }} />}
    
    {currentPage === 'success' && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-fadeIn">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center"><CheckCircle className="w-10 h-10 text-white" /></div>
            <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white">Payment Received</h2>
            <button onClick={() => setShowTicketOverlay(true)} className="bg-[#026cdf] text-white py-4 px-12 rounded-full font-black uppercase italic tracking-widest shadow-xl">View My Progress</button>
        </div>
    )}
  </main>

  {showTicketOverlay && (
      <div className="fixed inset-0 z-[400] bg-black/95 flex items-end justify-center animate-fadeIn">
          <div className="w-full max-w-lg bg-white rounded-t-[40px] h-[85vh] overflow-hidden flex flex-col animate-slideUp">
              <div className="p-6 flex justify-between items-center border-b border-gray-100">
                  <span className="font-black italic uppercase text-black">Digital Pass</span>
                  <button onClick={() => setShowTicketOverlay(false)} className="p-2 bg-gray-100 rounded-full text-black"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 p-8 text-black text-center">
                  {sessionData?.ticketStatus === 'issued' ? (
                      <div className="space-y-6">
                          <h3 className="text-3xl font-black italic uppercase leading-none">Verified</h3>
                          <div className="bg-gray-100 p-8 rounded-[32px] relative overflow-hidden flex flex-col items-center">
                              <div className="absolute top-0 left-0 w-full h-1 bg-[#026cdf] animate-scan shadow-[0_0_15px_#026cdf]" />
                              <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=VERIFIED" className="w-48 h-48" alt="Verified QR" />
                          </div>
                          <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Active Pass</p>
                      </div>
                  ) : (
                      <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-40">
                          <Ticket className="w-12 h-12 text-gray-400" />
                          <p className="font-black uppercase italic text-sm text-gray-500">No active tickets found.</p>
                      </div>
                  )}
              </div>
          </div>
      </div>
  )}

  {user && currentSessionId && (
      <div className={`fixed bottom-0 right-6 z-[300] transition-all duration-300 ${isChatOpen ? 'h-[450px]' : 'h-14'}`}>
          <button onClick={() => setIsChatOpen(!isChatOpen)} className="bg-[#026cdf] w-14 h-14 rounded-full flex items-center justify-center shadow-2xl absolute -top-14 right-0">
              {isChatOpen ? <X className="w-6 h-6 text-white" /> : <MessageSquare className="w-6 h-6 text-white" />}
          </button>
          {isChatOpen && (
              <div className="bg-white w-[90vw] max-w-sm h-full rounded-t-[24px] shadow-2xl flex flex-col overflow-hidden animate-slideUp">
                  <div className="bg-[#1f262d] p-4 text-white font-bold text-sm">Secure Support</div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                      {chatMessages.map((m,i) => (
                        <div key={i} className={`flex ${m.sender==='user'?'justify-end':'justify-start'}`}>
                          <div className={`p-3 rounded-2xl text-[12px] font-bold ${m.sender==='user'?'bg-[#026cdf] text-white':'bg-white text-black border'}`}>
                            {m.text}
                          </div>
                        </div>
                      ))}
                  </div>
                  <div className="p-3 bg-white border-t flex gap-2">
                      <input 
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyPress={(e) => {
                          if(e.key === 'Enter') {
                            handleSendMessage();
                          }
                        }}
                        className="flex-1 bg-gray-100 rounded-xl px-4 outline-none text-black font-bold" 
                        placeholder="Message..." 
                      />
                      <button 
                        onClick={handleSendMessage}
                        className="bg-[#026cdf] p-3 rounded-xl active:scale-95 transition-all"
                      >
                        <Send className="w-4 h-4 text-white" />
                      </button>
                  </div>
              </div>
          )}
      </div>
  )}

  <style>{`
      @keyframes scan { 0% { top: 10%; } 50% { top: 90%; } 100% { top: 10%; } }
      .animate-scan { animation: scan 3s infinite ease-in-out; }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      .animate-fadeIn { animation: fadeIn 0.3s ease-in; }
      @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      .animate-slideUp { animation: slideUp 0.3s ease-out; }
  `}</style>
</div>
```

);
}
