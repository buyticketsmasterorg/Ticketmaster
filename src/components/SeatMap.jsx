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
    { id: 'stage', name: 'STAGE', color: '#026cdf', price: regularPrice, dots: 20, path: 'M 200,50 L 600,50 L 600,120 Q 400,140 200,120 Z' },
    { id: 'floor-a', name: 'FLOOR A (VIP)', color: '#db2777', price: globalSettings.floorAPrice || vipPrice, dots: 30, path: 'M 320,160 L 320,280 L 480,280 L 480,160 Z' },
    { id: 'floor-b', name: 'FLOOR B', color: '#2563eb', price: globalSettings.floorBPrice || regularPrice * 1.5, dots: 30, path: 'M 180,160 L 180,280 L 300,280 L 300,160 Z' },
    { id: 'floor-c', name: 'FLOOR C', color: '#2563eb', price: globalSettings.floorCPrice || regularPrice, dots: 30, path: 'M 500,160 L 500,280 L 620,280 L 620,160 Z' },
    { id: 'sec101', name: 'SEC 101', color: '#4f46e5', price: regularPrice, dots: 10, path: 'M 150,160 L 100,150 L 100,450 L 150,440 Z' },
    { id: 'sec202', name: 'SEC 202', color: '#64748b', price: regularPrice, dots: 10, path: 'M 400,580 L 80,480 L 40,490 L 400,600 Z' } // Example for sec202
  ];

  return (
    <div className="animate-fadeIn pb-32 bg-[#0a0e14]"> {/* Black bg for blending */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex items
