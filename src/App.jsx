import React, { useState, useEffect } from 'react';
import { Search, User, CheckCircle, MessageSquare, Send, X, Info } from 'lucide-react';
import { onSnapshot, collection, addDoc, updateDoc, doc, setDoc, getDoc } from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { auth, db, appId } from './firebase';

import SeatMap from './components/SeatMap.jsx';
import Checkout from './components/Checkout.jsx';

const INITIAL_EVENTS = [
  { 
    id: 1, 
    artist: "Taylor Swift | The Eras Tour", 
    venue: "Wembley Stadium, London", 
    date: "Sat • Aug 17 • 7:00 PM", 
    image: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&q=80&w=1000", 
    bgImage: "https://images.unsplash.com/photo-1459749411177-287ce35e8b4f?auto=format&fit=crop&q=80&w=2000", 
    status: "low_inventory" 
  },
  { 
    id: 2, 
    artist: "Drake: It's All A Blur", 
    venue: "O2 Arena, London", 
    date: "Fri • Sep 22 • 8:00 PM", 
    image: "https://images.unsplash.com/photo-1514525253440-b393452e8d26?auto=format&fit=crop&q=80&w=1000", 
    bgImage: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=2000", 
    status: "available" 
  }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('home'); 
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [cart, setCart] = useState([]); 
  const [sessions, setSessions] = useState([]); 
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [globalSettings, setGlobalSettings] = useState({ price: 250, bgImage: '' });
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  // Auth Listener
  useEffect(() => {
    signInAnonymously(auth);
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // Settings Listener
  useEffect(() => {
    if (!user) return;
    const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'config', 'global_settings');
    const unsubscribe = onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) {
        setGlobalSettings(docSnap.data());
      } else {
        setDoc(configRef, { price: 250, bgImage: '' });
      }
    }, (err) => console.error("Settings error:", err));
    return () => unsubscribe();
  }, [user]);

  // Session Initialization
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
         chatHistory: [{ sender: 'system', text: 'Welcome to Support. How can we help?', timestamp: new Date().toISOString() }]
       });
       setCurrentSessionId(newSessionRef.id);
    };
    setupSession();
  }, [user]);

  // Sync Current Session Data
  useEffect(() => {
    if (!currentSessionId) return;
    const sessionRef = doc(db, 'artifacts', appId, 'public', 'data', 'sessions', currentSessionId);
    const unsubscribe = onSnapshot(sessionRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.chatHistory) setChatMessages(data.chatHistory);
      }
    }, (err) => console.error("Session sync error:", err));
    return () => unsubscribe();
  }, [currentSessionId]);

  // Admin View Sessions Listener
  useEffect(() => {
    if (!user || !isAdminLoggedIn) return;
    const sessionsRef = collection(db, 'artifacts', appId, 'public', 'data', 'sessions');
    const unsubscribe = onSnapshot(sessionsRef, (snapshot) => {
      const allSessions = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      allSessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setSessions(allSessions);
    }, (err) => console.error("Admin listener error:", err));
    return () => unsubscribe();
  }, [user, isAdminLoggedIn]);

  const updateSession = async (sid, updates) => {
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', sid), updates);
  };

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
      <header className="fixed top-0 w-full z-50 bg-[#1f262d] text-white h-16 flex items-center px-4 justify-between border-b border-gray-700 shadow-lg">
        <div className="flex items-center gap-1 cursor-pointer" onClick={() => setCurrentPage('home')}>
          <span className="font-bold text-2xl tracking-tighter">ticketmaster</span>
          <div className="bg-[#026cdf] rounded-full w-5 h-5 flex items-center justify-center">
            <CheckCircle className="w-3.5 h-3.5 text-white stroke-[3]" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <User className="w-5 h-5 cursor-pointer hover:text-[#026cdf] transition-colors" />
        </div>
      </header>

      <main className="pt-16 min-h-screen">
        {currentPage === 'home' && (
          <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {INITIAL_EVENTS.map(ev => (
              <div 
                key={ev.id} 
                onClick={() => {setSelectedEvent(ev); setCurrentPage('seatmap'); updateSession(currentSessionId, { status: 'viewing_event', event: ev.artist });}} 
                className="cursor-pointer border rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all group"
              >
                <div className="relative h-56 overflow-hidden">
                  <img src={ev.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={ev.artist} />
                  <div className="absolute top-2 right-2 bg-white/90 px-2 py-1 rounded text-[10px] font-bold text-[#026cdf]">SELLING FAST</div>
                </div>
                <div className="p-5 bg-white">
                  <h3 className="font-bold text-lg mb-1">{ev.artist}</h3>
                  <p className="text-gray-500 text-sm">{ev.venue}</p>
                  <p className="text-gray-400 text-xs mt-1">{ev.date}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {currentPage === 'seatmap' && (
          <SeatMap 
            event={selectedEvent} 
            cart={cart} 
            setCart={setCart} 
            globalPrice={globalSettings.price} 
            onCheckout={() => {
              updateSession(currentSessionId, { status: 'payment_pending', cart, total: cart.reduce((a,b)=>a+b.price, 0) });
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
            onSuccess={() => setCurrentPage('ticket')} 
            onBack={() => setCurrentPage('seatmap')} 
          />
        )}

        {currentPage === 'ticket' && (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="bg-white border rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center space-y-6">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold">You're going to {selectedEvent?.artist}!</h2>
              <p className="text-gray-600">Your tickets have been confirmed. Check your email for details.</p>
              <button 
                onClick={() => setCurrentPage('home')} 
                className="w-full bg-[#026cdf] text-white py-3 rounded-lg font-bold"
              >
                Return Home
              </button>
            </div>
          </div>
        )}
      </main>

      <button 
        onClick={() => setIsChatOpen(!isChatOpen)} 
        className="fixed bottom-6 right-6 bg-[#026cdf] text-white p-4 rounded-full shadow-2xl z-50 hover:scale-110 transition-transform"
      >
        <MessageSquare />
      </button>

      {isChatOpen && (
        <div className="fixed bottom-24 right-6 w-80 h-[450px] bg-white border shadow-2xl rounded-2xl z-50 flex flex-col overflow-hidden animate-slideUp">
          <div className="bg-[#1f262d] text-white p-4 flex justify-between items-center">
            <span className="font-bold">Fan Support</span>
            <X className="cursor-pointer w-5 h-5" onClick={() => setIsChatOpen(false)} />
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {chatMessages.map((m, i) => (
              <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-2 rounded-lg text-sm shadow-sm ${m.sender === 'user' ? 'bg-[#026cdf] text-white rounded-br-none' : 'bg-white border rounded-bl-none text-gray-800'}`}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 border-t bg-white flex gap-2">
            <input 
              placeholder="Type your message..."
              className="flex-1 border border-gray-200 p-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#026cdf]" 
              onKeyDown={(e) => {
                if(e.key === 'Enter' && e.target.value.trim()){
                  sendChatMessage(currentSessionId, e.target.value, 'user'); 
                  e.target.value = '';
                }
              }} 
            />
            <button className="bg-[#026cdf] text-white p-2 rounded-lg"><Send className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {currentPage === 'home' && (
        <footer className="bg-[#1f262d] text-white py-12 px-4 mt-20">
          <div className="max-w-7xl mx-auto flex flex-col items-center">
            <p className="text-gray-500 text-xs mb-4">© 1999-2024 Ticketmaster. All rights reserved.</p>
            <button 
              onClick={() => setCurrentPage('admin')} 
              className="text-gray-700 hover:text-gray-500 text-[10px] uppercase tracking-widest"
            >
              System Access
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}

