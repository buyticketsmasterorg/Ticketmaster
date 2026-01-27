import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Info, ShoppingCart, AlertTriangle, Monitor, X } from 'lucide-react';
import { doc, onSnapshot, arrayUnion, updateDoc, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from '../firebase'; // Adjust path if your firebase config is in a different location (e.g., './firebase.js' or '../config/firebase.js')

export default function SeatMap({ event, regularPrice, vipPrice, cart, setCart, onCheckout }) {
  const [view, setView] = useState('overview'); // overview (main img), underlay (zoom img), svg-arena (SVG sections), section (dots on SVG path)
  const [selectedSection, setSelectedSection] = useState(null); // e.g., 'floor-a', 'stage'
  const [panicState, setPanicState] = useState('idle');
  const [failCount, setFailCount] = useState(0);
  const [flashMsg, setFlashMsg] = useState('');

  // Cloudinary URLs
  const overviewImage = 'https://res.cloudinary.com/dwqvtrd8p/image/upload/v1769468237/06ba05b2-10a5-4e4c-a1ac-cc3bf5884155_mgbnri.jpg';
  const zoomImage = 'https://res.cloudinary.com/dwqvtrd8p/image/upload/v1769468283/db62554d-ec34-4190-a3cc-d5aa4908fc9d_mzkjsq.jpg';

  const [showCartOverlay, setShowCartOverlay] = useState(false);

  const [soldSeats, setSoldSeats] = useState([]); // Firebase sync for unique seats
  const [globalSettings, setGlobalSettings] = useState({ regularPrice, vipPrice, floorAPrice: vipPrice, floorBPrice: regularPrice * 1.5, floorCPrice: regularPrice }); // From props + admin

  // Firebase for unique sold seats (per event)
  useEffect(() => {
    if (!event?.id) return;
    const soldDocRef = doc(db, 'events', event.id);
    const unsub = onSnapshot(soldDocRef, (snap) => {
      if (snap.exists()) {
        setSoldSeats(snap.data().soldSeats || []);
      }
    });
    return () => unsub();
  }, [event?.id]);

  // Fetch globalSettings for section pricing from admin
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'global_settings'), (snap) => {
      if (snap.exists()) {
        setGlobalSettings(snap.data());
      }
    });
    return () => unsub();
  }, []);

  const handleSeatClick = async (seatLabel, price) => {
    if (soldSeats.includes(seatLabel)) {
      setFlashMsg("Seat not available");
      setTimeout(() => setFlashMsg(''), 2000);
      return;
    }

    const exists = cart.find(c => c.label === seatLabel);
    if (exists) {
      setCart(cart.filter(c => c.id !== exists.id));
      await updateDoc(doc(db, 'events', event.id), { soldSeats: arrayRemove(seatLabel) });
      return;
    }

    if (failCount < 5) {
      setFlashMsg("Seat not available");
      setTimeout(() => setFlashMsg(''), 2000);
      setFailCount(prev => prev + 1);
      return;
    }

    if (cart.length >= 2) {
      setFlashMsg("More seat will be available soon check back");
      setTimeout(() => setFlashMsg(''), 3000);
      return;
    }

    // Direct pick after 5 rejections
    setCart([...cart, { id: Date.now(), label: seatLabel, price }]);
    await updateDoc(doc(db, 'events', event.id), { soldSeats: arrayUnion(seatLabel) });
  };

  const removeFromCart = async (label) => {
    setCart(cart.filter(c => c.label !== label));
    await updateDoc(doc(db, 'events', event.id), { soldSeats: arrayRemove(label) });
  };

  // Section configs (dots per section, price)
  const sections = [
    { id: 'stage', name: 'STAGE', color: '#026cdf', price: regularPrice, dots: 20 },
    { id: 'floor-a', name: 'FLOOR A (VIP)', color: '#db2777', price: globalSettings.floorAPrice || vipPrice, dots: 30 },
    { id: 'floor-b', name: 'FLOOR B', color: '#2563eb', price: globalSettings.floorBPrice || regularPrice * 1.5, dots: 30 },
    { id: 'floor-c', name: 'FLOOR C', color: '#2563eb', price: globalSettings.floorCPrice || regularPrice, dots: 30 },
    { id: 'sec101', name: 'SEC 101', color: '#4f46e5', price: regularPrice, dots: 10 },
    { id: 'sec202', name: 'SEC 202', color: '#64748b', price: regularPrice, dots: 10 }
  ];

  return (
    <div className="animate-fadeIn pb-32 bg-[#0a0e14]"> {/* Black bg for blending */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex items-center justify-between">
            <div><h2 className="text-2xl lg:text-4xl font-black italic uppercase tracking-tighter text-white">Select Seats</h2><p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{event?.venue}</p></div>
            <button onClick={() => setShowCartOverlay(true)} className="bg-[#026cdf] px-4 py-2 rounded-full flex items-center gap-2 shadow-lg"><ShoppingCart className="w-4 h-4 text-white" /><span className="font-black text-white">{cart.length}</span></button>
        </div>
        <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-white/5 p-3 rounded-xl w-fit">
           <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-[#026cdf]" /> Regular</div>
           <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-pink-500" /> VIP</div>
           <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-gray-600" /> Sold</div>
           <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-green-500" /> Your Seat</div>
        </div>
      </div>

      {view === 'overview' && (
        <div className="max-w-4xl mx-auto space-y-4 py-10">
            <img 
                src={overviewImage} 
                alt="Stadium Overview" 
                className="w-full h-auto object-cover cursor-pointer rounded-lg shadow-2xl hover:opacity-90 transition-opacity"
                onClick={() => setView('underlay')}
            />
            <p className="text-center text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-4">Tap anywhere to zoom</p>
        </div>
      )}

      {view === 'underlay' && (
        <div className="animate-slideUp relative">
           <button onClick={() => setView('overview')} className="mb-6 flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-white transition-colors"><ChevronLeft className="w-4 h-4" /> Back to Overview</button>
           <img 
               src={zoomImage} 
               alt="Stadium Zoom" 
               className="w-full h-auto object-cover cursor-pointer rounded-lg shadow-2xl hover:opacity-90 transition-opacity"
               onClick={() => setView('svg-arena')}
           />
           <p className="text-center text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-4">Tap anywhere to select seats</p>
        </div>
      )}

      {view === 'svg-arena' && (
        <div className="animate-slideUp relative">
           <button onClick={() => setView('underlay')} className="mb-6 flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-white transition-colors"><ChevronLeft className="w-4 h-4" /> Back to Zoom View</button>
           <div className="map-container">
               <svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto" onClick={(e) => {
                 const target = e.target.closest('.section');
                 if (target) {
                   const sectionId = target.classList[1]; // e.g., 'stage', 'floor-a'
                   setSelectedSection(sectionId);
                   setView('section');
                 }
               }}>
                   {/* STAGE AREA (Top) */}
                   <path className="section stage" d="M 200,50 L 600,50 L 600,120 Q 400,140 200,120 Z" fill="#1e293b" stroke="#334155" strokeWidth="2" />
                   <text x="400" y="90" className="stage-text" fill="white" fontWeight="900" textAnchor="middle" dominantBaseline="middle" fontSize="16" letterSpacing="4">STAGE</text>

                   {/* FLOOR SECTIONS (Middle) */}
                   {/* Floor A (VIP - Center) */}
                   <rect className="section floor-vip" x="320" y="160" width="160" height="120" rx="10" ry="10" fill="#db2777" stroke="#be185d" strokeWidth="2" />
                   <text x="400" y="220" className="vip-text" fill="#fce7f3" fontWeight="900" textAnchor="middle" dominantBaseline="middle" fontSize="12" letterSpacing="1">FLOOR A (VIP)</text>

                   {/* Floor B (Left) */}
                   <rect className="section floor-general" x="180" y="160" width="120" height="120" rx="10" ry="10" fill="#2563eb" stroke="#1d4ed8" strokeWidth="2" />
                   <text x="240" y="220" fill="white" fontWeight="900" textAnchor="middle" dominantBaseline="middle" fontSize="12" letterSpacing="1">FLOOR B</text>

                   {/* Floor C (Right) */}
                   <rect className="section floor-general" x="500" y="160" width="120" height="120" rx="10" ry="10" fill="#2563eb" stroke="#1d4ed8" strokeWidth="2" />
                   <text x="560" y="220" fill="white" fontWeight="900" textAnchor="middle" dominantBaseline="middle" fontSize="12" letterSpacing="1">FLOOR C</text>

                   {/* LOWER BOWL (U-Shape around floor) */}
                   {/* Left Side */}
                   <path className="section lower-bowl" d="M 150,160 L 100,150 L 100,450 L 150,440 Z" fill="#4f46e5" stroke="#4338ca" strokeWidth="2" />
                   <text x="125" y="300" transform="rotate(-90 125 300)" fill="white" fontWeight="900" textAnchor="middle" dominantBaseline="middle" fontSize="12" letterSpacing="1">SEC 101</text>

                   <path className="section lower-bowl" d="M 150,450 L 100,460 L 250,550 L 280,500 Z" fill="#4f46e5" stroke="#4338ca" strokeWidth="2" />
                   <text x="180" y="500" transform="rotate(-45 180 500)" fill="white" fontWeight="900" textAnchor="middle" dominantBaseline="middle" fontSize="12" letterSpacing="1">SEC 102</text>

                   {/* Bottom Center */}
                   <path className="section lower-bowl" d="M 290,510 L 260,560 L 540,560 L 510,510 Z" fill="#4f46e5" stroke="#4338ca" strokeWidth="2" />
                   <text x="400" y="535" fill="white" fontWeight="900" textAnchor="middle" dominantBaseline="middle" fontSize="12" letterSpacing="1">SEC 103</text>

                   {/* Right Side */}
                   <path className="section lower-bowl" d="M 520,500 L 550,550 L 700,460 L 650,450 Z" fill="#4f46e5" stroke="#4338ca" strokeWidth="2" />
                   <text x="620" y="500" transform="rotate(45 620 500)" fill="white" fontWeight="900" textAnchor="middle" dominantBaseline="middle" fontSize="12" letterSpacing="1">SEC 104</text>

                   <path className="section lower-bowl" d="M 650,440 L 700,450 L 700,150 L 650,160 Z" fill="#4f46e5" stroke="#4338ca" strokeWidth="2" />
                   <text x="675" y="300" transform="rotate(90 675 300)" fill="white" fontWeight="900" textAnchor="middle" dominantBaseline="middle" fontSize="12" letterSpacing="1">SEC 105</text>

                   {/* UPPER BOWL (Outer Ring) */}
                   {/* Left Wing */}
                   <path className="section upper-bowl" d="M 80,140 L 40,130 L 40,480 L 80,470 Z" fill="#64748b" stroke="#475569" strokeWidth="2" />
                   <text x="60" y="300" transform="rotate(-90 60 300)" fill="white" fontWeight="900" textAnchor="middle" dominantBaseline="middle" fontSize="12" letterSpacing="1">SEC 201</text>
                   
                   {/* Bottom Curve */}
                   <path className="section upper-bowl" d="M 80,480 L 40,490 L 400,600 L 760,490 L 720,480 Q 400,580 80,480 Z" fill="#64748b" stroke="#475569" strokeWidth="2" />
                   <text x="400" y="580" fill="white" fontWeight="900" textAnchor="middle" dominantBaseline="middle" fontSize="12" letterSpacing="1">SEC 202</text>

                   {/* Right Wing */}
                   <path className="section upper-bowl" d="M 720,470 L 760,480 L 760,130 L 720,140 Z" fill="#64748b" stroke="#475569" strokeWidth="2" />
                   <text x="740" y="300" transform="rotate(90 740 300)" fill="white" fontWeight="900" textAnchor="middle" dominantBaseline="middle" fontSize="12" letterSpacing="1">SEC 203</text>

               </svg>
           </div>
        </div>
      )}

      {view === 'section' && selectedSection && (
        <div className="animate-slideUp relative bg-[#0a0e14]"> {/* Black bg, no header */}
           {flashMsg && <div className="absolute top-0 left-0 w-full z-50 bg-[#ea0042] text-white p-4 rounded-xl font-bold uppercase tracking-widest text-center animate-bounce shadow-2xl"><AlertTriangle className="w-5 h-5 inline-block mr-2" />{flashMsg}</div>}
           <button onClick={() => setView('svg-arena')} className="mb-6 flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-white transition-colors"><ChevronLeft className="w-4 h-4" /> Back to Arena View</button>
           <div className="min-h-[500px] bg-[#0a0e14]"> {/* Black bg for blending */}
               {/* Re-render SVG with selected section highlighted and dots on path */}
               <svg viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
                   {/* Copy Gemini paths, highlight selected */}
                   {/* Example for Floor A VIP */}
                   {sections.map((section, idx) => (
                       <g key={idx}>
                           {section.id === selectedSection && (
                               <>
                                   {/* Highlight path */}
                                   <path className={`${section.id} section`} d={/* path d for section */} fill={section.color} stroke="white" strokeWidth="3" />
                                   {/* Dots on path */}
                                   <path id={`path-${section.id}`} d={/* path d */} fill="none" stroke="transparent" />
                                   {Array.from({length: section.dots}).map((_, i) => {
                                       const length = document.getElementById(`path-${section.id}`)?.getTotalLength() || 100;
                                       const point = document.getElementById(`path-${section.id}`)?.getPointAtLength(i * length / section.dots);
                                       const label = `${section.name}-${i + 1}`;
                                       const isSelected = cart.find(c => c.label === label);
                                       const isSold = soldSeats.includes(label);
                                       return (
                                           <circle
                                               key={i}
                                               cx={point?.x || 0}
                                               cy={point?.y || 0}
                                               r="4"
                                               fill={isSelected || isSold ? '#64748b' : 'white'}
                                               stroke={isSelected || isSold ? '#475569' : section.color}
                                               strokeWidth="2"
                                               className="cursor-pointer hover:scale-110 transition-transform"
                                               onClick={() => handleSeatClick(label, section.price)}
                                           />
                                       );
                                   })}
                               </>
                           )}
                           {/* Non-selected paths */}
                           <path className={`${section.id} section`} d={/* path d */} fill={section.color} stroke="#334155" strokeWidth="2" />
                           <text x={/* x */} y={/* y */} className="section-text" fill="white" fontWeight="900" textAnchor="middle" dominantBaseline="middle" fontSize="12" letterSpacing="1">{section.name}</text>
                       </g>
                   ))}
               </svg>
           </div>
           {/* Proceed to Payment Button */}
           {cart.length > 0 && (
               <button 
                   onClick={onCheckout} 
                   className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#026cdf] text-white py-4 px-12 rounded-full font-black uppercase italic tracking-widest shadow-xl hover:bg-[#014bb4] transition-all z-50"
               >
                   Proceed to Payment ({cart.length} seats)
               </button>
           )}
        </div>
      )}

      {/* CART OVERLAY */}
      {showCartOverlay && (
          <div className="fixed inset-0 z-[400] bg-black/95 flex items-end justify-center animate-fadeIn">
              <div className="w-full max-w-lg bg-white
