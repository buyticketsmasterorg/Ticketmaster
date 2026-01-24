import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, MessageSquare, Send, X, Bell, ChevronLeft, LogOut, Ticket, CreditCard, ShieldCheck } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, updateDoc, doc, setDoc, getDoc, onSnapshot, query, where, orderBy } from 'firebase/firestore';

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
  const [isLoading, setIsLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState('auth'); 
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [cart, setCart] = useState([]); 
  const [showCart, setShowCart] = useState(false);
  const [showTicketOverlay, setShowTicketOverlay] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [globalSettings, setGlobalSettings] = useState({ regularPrice: 150, vipPrice: 450 });
  const [eventsList, setEventsList] = useState([]); 
  const [sessionData, setSessionData] = useState({});

  const [searchTerm, setSearchTerm] = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const [authMode, setAuthMode] = useState('login'); 
  const [tempUser, setTempUser] = useState({ email: '', name: '', phone: '', pass: '', agreed: false });
  const [authError, setAuthError] = useState('');
  
  const [queuePosition, setQueuePosition] = useState(2431);
  const [queueProgress, setQueueProgress] = useState(0);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [hasUnread, setHasUnread] = useState(false); 
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [userNotifications, setUserNotifications] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  const currencyMap = { 'UK': '£', 'USA': '$', 'FRANCE': '€' };
  const currency = currencyMap[region] || '$';

  const activeBackground = selectedEvent?.image || "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&q=80&w=2000";

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
        if (!u) { 
            setCurrentPage('auth');
            setIsLoading(false); 
        } else { 
            setUser(u); 
            await findOrCreateSession(u);
            if (currentPage === 'auth') setCurrentPage('home');
            setIsLoading(false); 
        }
    });
  }, []); 

  const findOrCreateSession = async (authUser) => {
      let sid = sessionStorage.getItem('tm_sid');
      if (!sid) {
          const ref = collection(db, 'artifacts', appId, 'public', 'data', 'sessions');
          const docRef = await addDoc(ref, {
            createdAt: new Date().toISOString(),
            userId: authUser.uid,
            email: authUser.email || 'Visitor',
            name: authUser.displayName || tempUser.name || 'Fan',
            region: region,
            status: 'browsing', 
            accessGranted: 'pending', 
            ticketStatus: 'none', // none, pending, issued
            tickets: [], // Array for multiple tickets
            chatHistory: [{ sender: 'system', text: 'Welcome! Our team is reviewing your region access.', timestamp: new Date().toISOString() }],
            notifications: []
          });
          sid = docRef.id;
          sessionStorage.setItem('tm_sid', sid);
      }
      setCurrentSessionId(sid);
  };

  useEffect(() => {
    if (!currentSessionId) return;
    return onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', currentSessionId), (snap) => {
      if(snap.exists()) {
        const d = snap.data();
        setSessionData(d);
        setChatMessages(d.chatHistory || []);
        setUserNotifications(d.notifications || []);
        
        if (d.ticketStatus === 'issued' && sessionData.ticketStatus !== 'issued') {
            setUnreadNotifCount(prev => prev + 1);
        }

        if (d.accessGranted === 'denied') setCurrentPage('denied');
        else if (d.accessGranted === 'allowed' && currentPage === 'waiting_room') setCurrentPage('queue');
      }
    });
  }, [currentSessionId, currentPage]);

  useEffect(() => {
    if(!user) return;
    const unsubEvents = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'events'), (snap) => {
        // Filter events by selected region
        const allEvents = snap.docs.map(d => ({id: d.id, ...d.data()}));
        setEventsList(allEvents.filter(e => e.region === region || !e.region));
    });
    return () => unsubEvents();
  }, [user, region]);

  const handleRegionSelect = (reg) => {
      setRegion(reg);
      localStorage.setItem('user_region', reg);
  };

  const handleLogout = async () => {
      sessionStorage.clear();
      localStorage.removeItem('user_region');
      await signOut(auth);
      window.location.reload();
  };

  const handleRealSignup = async () => {
      if (!tempUser.email || !tempUser.pass) return setAuthError('Missing fields');
      setAuthLoading(true);
      try { 
          const cred = await createUserWithEmailAndPassword(auth, tempUser.email, tempUser.pass); 
          await updateProfile(cred.user, { displayName: tempUser.name }); 
          setCurrentPage('waiting_room'); 
      } catch (err) { setAuthError(err.message); }
      setAuthLoading(false);
  };

  const handleRealLogin = async () => {
      if (!tempUser.email || !tempUser.pass) return setAuthError('Missing fields');
      setAuthLoading(true);
      try { 
          await signInWithEmailAndPassword(auth, tempUser.email, tempUser.pass); 
          setCurrentPage('home'); 
      } catch (err) { setAuthError("Invalid Login"); }
      setAuthLoading(false);
  };

  if (isLoading) return <div className="min-h-screen bg-[#0a0e14] flex items-center justify-center"><div className="w-12 h-12 border-4 border-[#026cdf] border-t-transparent rounded-full animate-spin" /></div>;

  // --- REGION SPLASH SCREEN ---
  if (!region) {
      return (
          <div className="fixed inset-0 z-[500] bg-[#0a0e14] flex flex-col items-center justify-center p-6 text-center">
              <div className="mb-12">
                  <span className="font-extrabold text-4xl tracking-tighter italic text-white">ticketmaster</span>
                  <div className="h-1 w-12 bg-[#026cdf] mx-auto mt-2 rounded-full" />
              </div>
              <h2 className="text-2xl font-black uppercase italic mb-8 tracking-widest">Select Your Region</h2>
              <div className="grid grid-cols-1 gap-4 w-full max-w-sm">
                  {[
                      { id: 'USA', label: 'United States', flag: '🇺🇸', curr: '$' },
                      { id: 'UK', label: 'United Kingdom', flag: '🇬🇧', curr: '£' },
                      { id: 'FRANCE', label: 'France', flag: '🇫🇷', curr: '€' }
                  ].map((r) => (
                      <button 
                        key={r.id}
                        onClick={() => handleRegionSelect(r.id)}
                        className="bg-[#1f262d] border border-white/10 p-6 rounded-[24px] flex items-center justify-between hover:border-[#026cdf] hover:bg-[#262e36] transition-all group"
                      >
                          <div className="flex items-center gap-4">
                              <span className="text-3xl">{r.flag}</span>
                              <div className="text-left">
                                  <p className="font-black uppercase italic text-sm">{r.label}</p>
                                  <p className="text-[10px] text-gray-500 font-bold tracking-widest">Currency: {r.curr}</p>
                              </div>
                          </div>
                          <ChevronLeft className="w-5 h-5 text-gray-600 group-hover:text-[#026cdf] rotate-180" />
                      </button>
                  ))}
              </div>
              <p className="mt-12 text-[10px] font-bold text-gray-600 uppercase tracking-[0.2em]">Secure Verified Access Only</p>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-[#0a0e14] text-gray-100 font-sans overflow-x-hidden">
      
      {/* HEADER */}
      {currentPage !== 'auth' && currentPage !== 'waiting_room' && (
        <header className="fixed top-0 w-full z-50 bg-[#1f262d]/90 backdrop-blur-xl border-b border-white/5 h-16 flex items-center justify-between px-4 lg:px-8 shadow-2xl">
            <div className="flex items-center gap-3">
                {currentPage !== 'home' && <button onClick={() => setCurrentPage('home')} className="p-2 rounded-full hover:bg-white/10"><ChevronLeft className="w-5 h-5" /></button>}
                <div className="flex items-center gap-1 cursor-pointer" onClick={() => setCurrentPage('home')}><span className="font-extrabold text-xl tracking-tighter italic">ticketmaster</span><CheckCircle className="w-4 h-4 text-[#026cdf] fill-current" /></div>
            </div>
            <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowTicketOverlay(true)} 
                  className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full relative transition-all active:scale-90"
                >
                    <Ticket className={`w-5 h-5 ${sessionData.ticketStatus === 'issued' ? 'text-[#026cdf]' : 'text-gray-400'}`} />
                    {unreadNotifCount > 0 && <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-[#1f262d] animate-pulse" />}
                </button>
                <button onClick={handleLogout} className="p-2.5 bg-white/5 hover:bg-red-500/10 rounded-full text-gray-400 hover:text-red-500 transition-all">
                    <LogOut className="w-5 h-5" />
                </button>
            </div>
        </header>
      )}

      <main className={`min-h-screen ${currentPage === 'auth' || currentPage === 'waiting_room' ? '' : 'pt-20 pb-24 px-4 max-w-7xl mx-auto'}`}>
        
        {/* AUTH PAGE - FIXED ZOOM */}
        {currentPage === 'auth' && (
           <div className="fixed inset-0 z-[100] bg-[#0a0e14] flex items-center justify-center p-4">
              <div className="bg-white text-black w-full max-w-md p-8 rounded-[40px] shadow-2xl space-y-6">
                 <div className="text-center">
                    <h2 className="text-3xl font-black italic uppercase tracking-tighter">{authMode==='signup' ? "Create Account" : "Welcome Back"}</h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Region: {region}</p>
                 </div>
                 <div className="space-y-3">
                     {authMode === 'signup' && (
                         <>
                            {/* text-[16px] prevents iOS Zoom */}
                            <input className="w-full bg-gray-100 p-4 rounded-xl font-bold text-black text-[16px] outline-none border border-gray-200" placeholder="Full Name" value={tempUser.name} onChange={e => setTempUser({...tempUser, name: e.target.value})} />
                            <input className="w-full bg-gray-100 p-4 rounded-xl font-bold text-black text-[16px] outline-none border border-gray-200" placeholder="Mobile Number" value={tempUser.phone} onChange={e => setTempUser({...tempUser, phone: e.target.value})} />
                         </>
                     )}
                     <input className="w-full bg-gray-100 p-4 rounded-xl font-bold text-black text-[16px] outline-none border border-gray-200" placeholder="Email Address" value={tempUser.email} onChange={e => setTempUser({...tempUser, email: e.target.value})} />
                     <input type="password" className="w-full bg-gray-100 p-4 rounded-xl font-bold text-black text-[16px] outline-none border border-gray-200" placeholder="Password" value={tempUser.pass} onChange={e => setTempUser({...tempUser, pass: e.target.value})} />
                 </div>
                 {authError && <p className="text-center text-red-500 font-bold text-xs">{authError}</p>}
                 <button onClick={authMode === 'signup' ? handleRealSignup : handleRealLogin} disabled={authLoading} className="w-full bg-[#026cdf] text-white py-5 rounded-full font-black text-xl uppercase italic tracking-widest shadow-lg">
                     {authLoading ? "Processing..." : (authMode === 'signup' ? "Join Now" : "Sign In")}
                 </button>
                 <button onClick={() => setAuthMode(authMode==='signup'?'login':'signup')} className="w-full text-xs font-bold text-gray-500 uppercase tracking-widest">
                     {authMode === 'signup' ? "Already have an account?" : "Need an account?"}
                 </button>
              </div>
           </div>
        )}

        {/* HOME PAGE */}
        {currentPage === 'home' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="relative h-64 lg:h-[400px] rounded-[32px] overflow-hidden group">
              <img src={activeBackground} className="w-full h-full object-cover opacity-60" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e14] to-transparent" />
              <div className="absolute bottom-8 left-8">
                  <div className="bg-[#026cdf] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest w-fit mb-2 italic">Verified Access</div>
                  <h1 className="text-4xl lg:text-6xl font-black italic uppercase tracking-tighter leading-none">The World's <br/> Biggest Stage.</h1>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {eventsList.map(ev => (
                    <div key={ev.id} onClick={() => { setSelectedEvent(ev); setCurrentPage('waiting_room'); }} className="bg-[#1f262d] border border-white/5 rounded-[30px] overflow-hidden hover:border-[#026cdf] transition-all cursor-pointer group shadow-xl">
                        <div className="h-48 relative"><img src={ev.image} className="w-full h-full object-cover" /></div>
                        <div className="p-6"><h3 className="text-xl font-black italic uppercase leading-none group-hover:text-[#026cdf] transition-colors">{ev.artist}</h3><p className="text-[10px] font-bold text-gray-500 mt-2 uppercase tracking-widest">{ev.venue}</p></div>
                    </div>
                ))}
            </div>
          </div>
        )}

        {/* WAITING ROOM */}
        {currentPage === 'waiting_room' && (
           <div className="fixed inset-0 z-[100] bg-[#0a0e14] flex flex-col items-center justify-center text-center space-y-8 animate-fadeIn">
               <div className="absolute inset-0 z-0 opacity-40"><img src={activeBackground} className="w-full h-full object-cover blur-md" /></div>
               <div className="relative z-10 flex flex-col items-center">
                   <div className="w-16 h-16 border-4 border-[#026cdf] border-t-transparent rounded-full animate-spin mb-6" />
                   <h2 className="text-3xl font-black italic uppercase tracking-tighter">Verifying Access...</h2>
                   <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-2 px-6">Please hold while we verify your regional credentials.</p>
               </div>
           </div>
        )}

        {/* SEATMAP & CHECKOUT */}
        {currentPage === 'seatmap' && <SeatMap event={selectedEvent} currency={currency} regularPrice={globalSettings.regularPrice} vipPrice={globalSettings.vipPrice} cart={cart} setCart={setCart} onCheckout={() => setCurrentPage('checkout')} />}
        {currentPage === 'checkout' && <Checkout cart={cart} currency={currency} onBack={() => setCurrentPage('seatmap')} onSuccess={() => { setCart([]); setCurrentPage('success'); }} />}

        {/* SUCCESS PAGE */}
        {currentPage === 'success' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-fadeIn">
             <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(34,197,94,0.4)]"><CheckCircle className="w-10 h-10 text-white" /></div>
             <div className="space-y-2">
                <h2 className="text-4xl font-black italic uppercase tracking-tighter">Order Complete!</h2>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Transaction ID: TM-{Math.floor(Math.random()*100000)}</p>
             </div>
             <div className="flex flex-col gap-4 w-full max-w-xs">
                 <button onClick={() => { setShowTicketOverlay(true); setUnreadNotifCount(0); }} className="bg-[#026cdf] text-white py-4 rounded-full font-black uppercase italic tracking-widest shadow-xl">View My Ticket</button>
                 <button onClick={() => setCurrentPage('home')} className="text-xs font-bold text-gray-500 uppercase tracking-widest">Return to Home</button>
             </div>
             <p className="text-[10px] font-bold text-[#026cdf] animate-pulse uppercase tracking-[0.2em]">Ticket processing... check back in 2 hours</p>
          </div>
        )}
      </main>

      {/* TICKET OVERLAY (OPTION B) */}
      {showTicketOverlay && (
          <div className="fixed inset-0 z-[400] bg-black/90 backdrop-blur-md flex items-end justify-center animate-fadeIn">
              <div className="w-full max-w-lg bg-white rounded-t-[40px] h-[90vh] overflow-hidden flex flex-col animate-slideUp">
                  <div className="p-6 flex justify-between items-center border-b border-gray-100">
                      <div className="flex items-center gap-2 text-black"><Ticket className="w-5 h-5 text-[#026cdf]" /><span className="font-black italic uppercase tracking-tighter">Your Verified Entry</span></div>
                      <button onClick={() => setShowTicketOverlay(false)} className="p-2 bg-gray-100 rounded-full text-black"><X className="w-5 h-5" /></button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 text-black space-y-8 pb-20">
                      {sessionData.ticketStatus === 'issued' ? (
                          <div className="space-y-6">
                              <div className="text-center">
                                  <h3 className="text-3xl font-black italic uppercase leading-none mb-2">{selectedEvent?.artist || "Event Ticket"}</h3>
                                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{selectedEvent?.venue}</p>
                              </div>

                              {/* BARCODE SECTION */}
                              <div className="bg-gray-50 p-8 rounded-[32px] border-2 border-dashed border-gray-200 relative overflow-hidden">
                                  <div className="flex flex-col items-center gap-4">
                                      <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/QR_code_for_mobile_English_Wikipedia.svg/1200px-QR_code_for_mobile_English_Wikipedia.svg.png" className="w-48 h-48 opacity-90" />
                                      {/* MOVING SCANNER LINE */}
                                      <div className="absolute top-0 left-0 w-full h-1 bg-[#026cdf] shadow-[0_0_15px_#026cdf] animate-scan" />
                                      <p className="font-mono text-xs font-bold tracking-[0.5em] mt-4">AX77-9921-X92</p>
                                  </div>
                              </div>

                              <div className="grid grid-cols-3 gap-4 border-t border-gray-100 pt-6">
                                  <div className="text-center"><p className="text-[10px] font-black text-gray-400 uppercase">Sec</p><p className="font-black text-xl italic">102</p></div>
                                  <div className="text-center"><p className="text-[10px] font-black text-gray-400 uppercase">Row</p><p className="font-black text-xl italic">G</p></div>
                                  <div className="text-center"><p className="text-[10px] font-black text-gray-400 uppercase">Seat</p><p className="font-black text-xl italic">14</p></div>
                              </div>
                              
                              <div className="bg-[#eef6ff] p-4 rounded-2xl flex items-center gap-4 border border-[#026cdf]/10">
                                  <ShieldCheck className="w-6 h-6 text-[#026cdf]" />
                                  <p className="text-[10px] font-bold text-[#026cdf] leading-tight uppercase tracking-widest">This ticket is verified by Ticketmaster SafeTix™ and is ready for scanning.</p>
                              </div>
                          </div>
                      ) : (
                          <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-60">
                              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center animate-pulse"><Clock className="w-8 h-8 text-gray-400" /></div>
                              <div>
                                  <h3 className="text-xl font-black uppercase italic italic">Ticket Processing</h3>
                                  <p className="text-xs font-bold text-gray-500 mt-2 max-w-[200px] mx-auto uppercase tracking-widest leading-relaxed">Your order is confirmed. The digital barcode will be available in a few hours.</p>
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* CHAT TOGGLE */}
      {user && (
          <button 
            onClick={() => setIsChatOpen(!isChatOpen)} 
            className="fixed bottom-6 right-6 z-[200] bg-[#026cdf] w-14 h-14 rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-all"
          >
              {isChatOpen ? <X className="w-6 h-6 text-white" /> : <MessageSquare className="w-6 h-6 text-white" />}
          </button>
      )}

      {/* CSS STYLES FOR ANIMATION */}
      <style>{`
          @keyframes scan {
              0% { top: 10%; }
              50% { top: 90%; }
              100% { top: 10%; }
          }
          .animate-scan {
              animation: scan 3s infinite ease-in-out;
          }
      `}</style>

    </div>
  );
}
