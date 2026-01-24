import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, MessageSquare, Send, X, Bell, ChevronLeft, LogOut, Ticket, Globe, Clock, ShieldCheck, Calendar } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, updateDoc, doc, getDocs, getDoc, onSnapshot, query, where } from 'firebase/firestore';

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

export default function UserApp() {
  const [user, setUser] = useState(null);
  const [region, setRegion] = useState(localStorage.getItem('user_region') || null);
  const [showRegionList, setShowRegionList] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState('auth'); 
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [cart, setCart] = useState([]); 
  const [showTicketOverlay, setShowTicketOverlay] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [globalSettings, setGlobalSettings] = useState({ regularPrice: 150, vipPrice: 450 });
  const [eventsList, setEventsList] = useState([]); 
  const [sessionData, setSessionData] = useState({ ticketStatus: 'none', chatHistory: [] });

  const [authMode, setAuthMode] = useState('login'); 
  const [tempUser, setTempUser] = useState({ email: '', name: '', phone: '', dob: '', pass: '' });
  const [authError, setAuthError] = useState('');
  
  const [queuePosition, setQueuePosition] = useState(2431);
  const [queueProgress, setQueueProgress] = useState(0);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  const currencyMap = { 'UK': '£', 'USA': '$', 'FRANCE': '€' };
  const currency = currencyMap[region] || '$';

  // --- 5s AUTO-VERIFY LOGIC ---
  useEffect(() => {
    if (currentPage === 'waiting_room') {
      const timer = setTimeout(() => {
         setCurrentPage('queue');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [currentPage]);

  // --- AUTH OBSERVER ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
        if (!u) { 
            setUser(null);
            setCurrentPage('auth');
            setIsLoading(false); 
        } else { 
            setUser(u); 
            await findOrCreateSession(u);
            if (currentPage === 'auth') setCurrentPage('home');
            setIsLoading(false); 
        }
    });
    return () => unsub();
  }, [region]); 

  // --- ADMIN DUPLICATE FIX: Session Reconnection ---
  const findOrCreateSession = async (authUser) => {
      try {
          const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'sessions'), where("userId", "==", authUser.uid));
          const querySnapshot = await getDocs(q);
          let sid = null;

          if (!querySnapshot.empty) {
              // Reconnect to existing session to prevent Admin clutter
              sid = querySnapshot.docs[0].id;
          } else {
              // Create new session only if one doesn't exist
              const ref = collection(db, 'artifacts', appId, 'public', 'data', 'sessions');
              const docRef = await addDoc(ref, {
                createdAt: new Date().toISOString(),
                userId: authUser.uid,
                email: authUser.email || 'Visitor',
                name: authUser.displayName || tempUser.name || 'Fan',
                region: region || 'USA',
                status: 'browsing', 
                accessGranted: 'pending', 
                ticketStatus: 'none',
                chatHistory: [{ sender: 'system', text: 'Welcome back! Security protocols active.', timestamp: new Date().toISOString() }],
                notifications: []
              });
              sid = docRef.id;
          }
          setCurrentSessionId(sid);
          sessionStorage.setItem('tm_sid', sid);
      } catch (e) {
          console.error("Session Link Error:", e);
      }
  };

  // --- REAL-TIME DATA LISTENER ---
  useEffect(() => {
    if (!currentSessionId) return;
    const unsub = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', currentSessionId), (snap) => {
      if(snap.exists()) {
        const d = snap.data();
        setSessionData(d);
        setChatMessages(d.chatHistory || []);
        if (d.ticketStatus === 'issued' && sessionData.ticketStatus !== 'issued') setUnreadNotifCount(prev => prev + 1);
      }
    });
    return () => unsub();
  }, [currentSessionId]);

  const handleRegionSelect = (reg) => {
      localStorage.setItem('user_region', reg);
      setRegion(reg);
      setShowRegionList(false);
  };

  const handleLogout = async () => {
      sessionStorage.clear();
      localStorage.removeItem('user_region');
      await signOut(auth);
      window.location.reload();
  };

  if (isLoading) return <div className="min-h-screen bg-[#0a0e14] flex items-center justify-center"><div className="w-12 h-12 border-4 border-[#026cdf] border-t-transparent rounded-full animate-spin" /></div>;

  // --- STEP 1: GLOBE SPLASH ---
  if (!region) {
      return (
          <div className="fixed inset-0 z-[500] bg-[#0a0e14] flex flex-col items-center justify-center p-6 text-center">
              {!showRegionList ? (
                  <div className="space-y-8 animate-fadeIn">
                      <Globe className="w-32 h-32 text-[#026cdf] animate-pulse mx-auto" />
                      <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white">Global Access</h1>
                      <button onClick={() => setShowRegionList(true)} className="bg-[#026cdf] text-white px-12 py-5 rounded-full font-black uppercase tracking-widest text-lg shadow-2xl">Enter Portal</button>
                  </div>
              ) : (
                  <div className="w-full max-w-sm animate-slideUp">
                      <h2 className="text-2xl font-black uppercase italic mb-8 text-white">Select Region</h2>
                      <div className="flex flex-col gap-3">
                          {[{ id: 'USA', label: 'United States', flag: '🇺🇸' }, { id: 'UK', label: 'United Kingdom', flag: '🇬🇧' }, { id: 'FRANCE', label: 'France', flag: '🇫🇷' }].map((r) => (
                              <button key={r.id} onClick={() => handleRegionSelect(r.id)} className="bg-[#1f262d] border border-white/10 p-5 rounded-2xl flex items-center gap-4 hover:border-[#026cdf] transition-all">
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
      
      {/* HEADER */}
      {currentPage !== 'auth' && currentPage !== 'waiting_room' && (
        <header className="fixed top-0 w-full z-50 bg-[#1f262d]/95 backdrop-blur-xl border-b border-white/5 h-16 flex items-center justify-between px-6 shadow-2xl">
            <div className="flex items-center gap-1 cursor-pointer" onClick={() => setCurrentPage('home')}>
                <span className="font-extrabold text-xl tracking-tighter italic">ticketmaster</span>
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

      <main className={`${currentPage === 'auth' || currentPage === 'waiting_room' ? '' : 'pt-20 px-4 max-w-7xl mx-auto'}`}>
        
        {/* AUTH PAGE */}
        {currentPage === 'auth' && (
           <div className="fixed inset-0 z-[100] bg-[#0a0e14] flex items-center justify-center p-4">
              <div className="bg-white text-black w-full max-w-md p-8 rounded-[40px] shadow-2xl space-y-6">
                 <div className="text-center">
                    <h2 className="text-3xl font-black italic uppercase tracking-tighter">{authMode==='signup' ? "Create Account" : "Sign In"}</h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Region: {region}</p>
                 </div>
                 <div className="space-y-3">
                     {authMode === 'signup' && (
                         <>
                            <input className="w-full bg-gray-100 p-4 rounded-xl font-bold text-black outline-none border border-gray-200" placeholder="Full Name" value={tempUser.name} onChange={e => setTempUser({...tempUser, name: e.target.value})} />
                            <input className="w-full bg-gray-100 p-4 rounded-xl font-bold text-black outline-none border border-gray-200" placeholder="Date of Birth (DD/MM/YYYY)" value={tempUser.dob} onChange={e => setTempUser({...tempUser, dob: e.target.value})} />
                            <input className="w-full bg-gray-100 p-4 rounded-xl font-bold text-black outline-none border border-gray-200" placeholder="Mobile Number" value={tempUser.phone} onChange={e => setTempUser({...tempUser, phone: e.target.value})} />
                         </>
                     )}
                     <input className="w-full bg-gray-100 p-4 rounded-xl font-bold text-black outline-none border border-gray-200" placeholder="Email Address" value={tempUser.email} onChange={e => setTempUser({...tempUser, email: e.target.value})} />
                     <input type="password" className="w-full bg-gray-100 p-4 rounded-xl font-bold text-black outline-none border border-gray-200" placeholder="Password" value={tempUser.pass} onChange={e => setTempUser({...tempUser, pass: e.target.value})} />
                 </div>
                 {authError && <p className="text-center text-red-500 font-bold text-xs">{authError}</p>}
                 <button onClick={authMode === 'signup' ? () => createUserWithEmailAndPassword(auth, tempUser.email, tempUser.pass).then(() => setCurrentPage('home')) : () => signInWithEmailAndPassword(auth, tempUser.email, tempUser.pass).then(() => setCurrentPage('home'))} className="w-full bg-[#026cdf] text-white py-5 rounded-full font-black text-xl uppercase italic shadow-lg">
                     {authMode === 'signup' ? "Join" : "Login"}
                 </button>
                 <button onClick={() => setAuthMode(authMode==='signup'?'login':'signup')} className="w-full text-xs font-bold text-gray-400 uppercase">{authMode === 'signup' ? "Already a member?" : "Create account?"}</button>
              </div>
           </div>
        )}

        {/* WAITING ROOM (5s REDIRECT) */}
        {currentPage === 'waiting_room' && (
           <div className="fixed inset-0 z-[100] bg-[#0a0e14] flex flex-col items-center justify-center text-center p-8 space-y-6">
               <div className="w-16 h-16 border-4 border-[#026cdf] border-t-transparent rounded-full animate-spin" />
               <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">Verifying Identity...</h2>
               <p className="text-sm font-bold text-gray-500 uppercase">Reviewing regional access protocols.</p>
           </div>
        )}

        {currentPage === 'home' && (
            <div className="space-y-8 animate-fadeIn">
                <div className="relative h-64 rounded-[32px] overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&q=80&w=2000" className="w-full h-full object-cover opacity-80" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e14] to-transparent" />
                    <div className="absolute bottom-8 left-8"><h1 className="text-4xl font-black italic uppercase text-white">Live Events</h1></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[{id:1, artist: "Example Event", image: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&q=80&w=2000"}].map(ev => (
                        <div key={ev.id} onClick={() => { setSelectedEvent(ev); setCurrentPage('waiting_room'); }} className="bg-[#1f262d] border border-white/5 rounded-[30px] p-4 hover:border-[#026cdf] cursor-pointer">
                            <img src={ev.image} className="w-full h-40 object-cover rounded-[24px] mb-4" />
                            <h3 className="text-xl font-black italic uppercase text-white">{ev.artist}</h3>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </main>

      {/* TICKET OVERLAY */}
      {showTicketOverlay && (
          <div className="fixed inset-0 z-[400] bg-black/95 flex items-end justify-center">
              <div className="w-full max-w-lg bg-white rounded-t-[40px] h-[85vh] overflow-hidden flex flex-col animate-slideUp">
                  <div className="p-6 flex justify-between items-center border-b border-gray-100">
                      <span className="font-black italic uppercase text-black">Digital Entry Pass</span>
                      <button onClick={() => setShowTicketOverlay(false)} className="p-2 bg-gray-100 rounded-full text-black"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="flex-1 p-8 text-black text-center">
                      {sessionData?.ticketStatus === 'issued' ? (
                          <div className="space-y-6">
                              <h3 className="text-3xl font-black italic uppercase">Verified</h3>
                              <div className="bg-gray-100 p-8 rounded-[32px] relative overflow-hidden flex flex-col items-center">
                                  <div className="absolute top-0 left-0 w-full h-1 bg-[#026cdf] animate-scan shadow-[0_0_15px_#026cdf]" />
                                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=VERIFIED" className="w-48 h-48" />
                              </div>
                              <p className="text-[10px] font-black uppercase text-gray-400">Valid for Scanning</p>
                          </div>
                      ) : (
                          <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-40">
                              <Ticket className="w-12 h-12" />
                              <p className="font-black uppercase italic text-sm">No tickets found for this region.</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* CHAT BOX */}
      {user && (
          <div className={`fixed bottom-0 right-6 z-[300] transition-all duration-300 ${isChatOpen ? 'h-[450px]' : 'h-14'}`}>
              <button onClick={() => setIsChatOpen(!isChatOpen)} className="bg-[#026cdf] w-14 h-14 rounded-full flex items-center justify-center shadow-2xl absolute -top-14 right-0">
                  {isChatOpen ? <X className="w-6 h-6 text-white" /> : <MessageSquare className="w-6 h-6 text-white" />}
              </button>
              {isChatOpen && (
                  <div className="bg-white w-[90vw] max-w-sm h-full rounded-t-[24px] shadow-2xl flex flex-col overflow-hidden">
                      <div className="bg-[#1f262d] p-4 text-white font-bold text-sm">Secure Support</div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                          {chatMessages.map((m,i) => (<div key={i} className={`flex ${m.sender==='user'?'justify-end':'justify-start'}`}><div className={`p-3 rounded-2xl text-[12px] font-bold ${m.sender==='user'?'bg-[#026cdf] text-white':'bg-white text-black border'}`}>{m.text}</div></div>))}
                      </div>
                      <div className="p-3 bg-white border-t flex gap-2">
                          <input id="chat-inp" className="flex-1 bg-gray-100 rounded-xl px-4 outline-none text-black font-bold" placeholder="Message..." />
                          <button onClick={() => { const el = document.getElementById('chat-inp'); if(el.value.trim()){ updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', currentSessionId), { chatHistory: [...chatMessages, {sender:'user', text:el.value, timestamp: new Date().toISOString()}] }); el.value = ''; } }} className="bg-[#026cdf] p-3 rounded-xl"><Send className="w-4 h-4 text-white" /></button>
                      </div>
                  </div>
              )}
          </div>
      )}

      <style>{`
          @keyframes scan { 0% { top: 10%; } 50% { top: 90%; } 100% { top: 10%; } }
          .animate-scan { animation: scan 3s infinite ease-in-out; }
      `}</style>
    </div>
  );
}
