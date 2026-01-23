import React, { useState, useEffect } from 'react';
import {
  Search, CheckCircle, MessageSquare, Send, X, Bell, ChevronLeft,
  AlertOctagon, Trash2
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  onSnapshot
} from 'firebase/firestore';

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

const t = {
  EN: {
    heroTitle: "The World's Biggest Stage.",
    verified: "Verified Only",
    holdTitle: "Verifying Identity...",
    holdSub: "Please hold while the Host reviews your request.",
    deniedTitle: "ACCESS DENIED",
    deniedSub: "Identity Unverified.",
    queueTitle: "Fans Ahead of You"
  }
};

const INITIAL_EVENTS = [
  {
    id: 1,
    artist: "Taylor Swift | The Eras Tour",
    venue: "Wembley Stadium, London",
    date: "Sat • Aug 17 • 7:00 PM",
    image: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&q=80&w=1000",
    badge: "High Demand"
  }
];

export default function UserApp() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('auth');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [cart, setCart] = useState([]);
  const [eventsList, setEventsList] = useState(INITIAL_EVENTS);
  const [currentSessionId, setCurrentSessionId] = useState(null);

  const [queuePosition, setQueuePosition] = useState(2431);
  const [queueProgress, setQueueProgress] = useState(0);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [hasUnread, setHasUnread] = useState(false);

  const txt = t.EN;

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setCurrentPage('auth');
        setIsLoading(false);
      } else {
        setUser(u);
        setCurrentPage('home');
        setIsLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    if (currentPage === 'queue') {
      const interval = setInterval(() => {
        setQueuePosition(prev => {
          const drop = Math.floor(Math.random() * 50) + 10;
          const next = prev - drop;
          setQueueProgress(((2431 - next) / 2431) * 100);
          if (next <= 0) {
            clearInterval(interval);
            setCurrentPage('seatmap');
            return 0;
          }
          return next;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [currentPage]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0e14] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#026cdf] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e14] text-gray-100">

      <main className="pt-20 pb-24 px-4 max-w-7xl mx-auto">

        {currentPage === 'queue' && (
          <div className="min-h-[70vh] flex flex-col items-center justify-center text-center space-y-12 animate-fadeIn">

            <div className="bg-white/5 p-6 rounded-3xl border border-white/10 w-full max-w-lg">
              <h3 className="text-xl font-black italic uppercase tracking-tighter">
                {selectedEvent?.artist}
              </h3>
              <p className="text-xs font-bold text-[#026cdf] uppercase tracking-widest">
                {selectedEvent?.venue}
              </p>
            </div>

            <div className="flex gap-4 items-center justify-center w-full max-w-2xl">
              {['Lobby', 'Queue', 'Waiting Room', 'Pick Seat'].map((step, i) => {
                const isActive =
                  (queueProgress < 33 && i === 0) ||
                  (queueProgress >= 33 && queueProgress < 66 && i === 1) ||
                  (queueProgress >= 66 && queueProgress < 100 && i === 2) ||
                  (queueProgress >= 100 && i === 3);

                return (
                  <div
                    key={i}
                    className={`flex flex-col items-center gap-2 ${isActive ? 'scale-110' : 'opacity-30'}`}
                  >
                    <div className={`w-4 h-4 rounded-full ${isActive ? 'bg-[#22c55e] animate-pulse' : 'bg-gray-600'}`} />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-[#22c55e]' : 'text-gray-500'}`}>
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="space-y-4">
              <h2 className="text-6xl lg:text-9xl font-black italic tracking-tighter">
                {queuePosition}
              </h2>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                {txt.queueTitle}
              </p>
            </div>

            <div className="w-full max-w-md bg-white/5 h-4 rounded-full overflow-hidden border border-white/10">
              <div
                className="h-full bg-[#026cdf] transition-all duration-1000"
                style={{ width: `${queueProgress}%` }}
              />
            </div>

          </div>
        )}

        {currentPage === 'seatmap' && (
          <SeatMap
            event={selectedEvent}
            cart={cart}
            setCart={setCart}
            onCheckout={() => setCurrentPage('checkout')}
          />
        )}

        {currentPage === 'checkout' && (
          <Checkout
            cart={cart}
            onBack={() => setCurrentPage('seatmap')}
            onSuccess={() => setCurrentPage('success')}
          />
        )}

        {currentPage === 'success' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8">
            <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-4xl font-black italic uppercase">Order Complete!</h2>
          </div>
        )}

      </main>

      {user && (
        <div className="fixed right-6 bottom-6 z-[200]">
          <button
            onClick={() => {
              setIsChatOpen(!isChatOpen);
              if (!isChatOpen) setHasUnread(false);
            }}
            className="bg-[#026cdf] w-14 h-14 rounded-full flex items-center justify-center shadow-2xl"
          >
            {isChatOpen ? <X className="w-6 h-6 text-white" /> : <MessageSquare className="w-6 h-6 text-white" />}
            {hasUnread && !isChatOpen && (
              <div className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full" />
            )}
          </button>
        </div>
      )}

    </div>
  );
}
