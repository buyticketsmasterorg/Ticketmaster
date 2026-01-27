import React, { useState, useEffect } from 'react';
import { ChevronLeft, ShoppingCart, AlertTriangle, X } from 'lucide-react';
import { doc, onSnapshot, arrayUnion, updateDoc, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';

export default function SeatMap({ event, regularPrice, vipPrice, cart, setCart, onCheckout }) {
  const [view, setView] = useState('overview');
  const [selectedSection, setSelectedSection] = useState(null);
  const [failCount, setFailCount] = useState(0);
  const [flashMsg, setFlashMsg] = useState('');
  const [showCartOverlay, setShowCartOverlay] = useState(false);
  const [soldSeats, setSoldSeats] = useState([]);
  const [globalSettings, setGlobalSettings] = useState({
    floorAPrice: vipPrice,
    floorBPrice: regularPrice * 1.5,
    floorCPrice: regularPrice
  });

  const overviewImage = 'https://res.cloudinary.com/dwqvtrd8p/image/upload/v1769468237/06ba05b2-10a5-4e4c-a1ac-cc3bf5884155_mgbnri.jpg';
  const zoomImage = 'https://res.cloudinary.com/dwqvtrd8p/image/upload/v1769468283/db62554d-ec34-4190-a3cc-d5aa4908fc9d_mzkjsq.jpg';

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

    setCart([...cart, { id: Date.now(), label: seatLabel, price }]);
    await updateDoc(doc(db, 'events', event.id), { soldSeats: arrayUnion(seatLabel) });
  };

  const removeFromCart = async (item) => {
    setCart(cart.filter(c => c.id !== item.id));
    await updateDoc(doc(db, 'events', event.id), { soldSeats: arrayRemove(item.label) });
  };

  const sections = [
    {
      id: 'stage',
      name: 'STAGE',
      color: '#026cdf',
      price: regularPrice,
      dots: 15,
      path: 'M 200,50 Q 400,70 600,50 L 600,120 Q 400,140 200,120 Z',
      textX: 400,
      textY: 85
    },
    {
      id: 'floor-a',
      name: 'FLOOR A (VIP)',
      color: '#db2777',
      price: globalSettings.floorAPrice,
      dots: 20,
      path: 'M 320,160 L 480,160 L 480,280 L 320,280 Z',
      textX: 400,
      textY: 220
    },
    {
      id: 'floor-b',
      name: 'FLOOR B',
      color: '#2563eb',
      price: globalSettings.floorBPrice,
      dots: 15,
      path: 'M 180,160 L 300,160 L 300,280 L 180,280 Z',
      textX: 240,
      textY: 220
    },
    {
      id: 'floor-c',
      name: 'FLOOR C',
      color: '#2563eb',
      price: globalSettings.floorCPrice,
      dots: 15,
      path: 'M 500,160 L 620,160 L 620,280 L 500,280 Z',
      textX: 560,
      textY: 220
    },
    {
      id: 'sec101',
      name: 'SEC 101',
      color: '#4f46e5',
      price: regularPrice,
      dots: 15,
      path: 'M 150,160 L 100,150 L 100,450 L 150,440 Z',
      textX: 125,
      textY: 305,
      rotate: -90
    },
    {
      id: 'sec102',
      name: 'SEC 102',
      color: '#4f46e5',
      price: regularPrice,
      dots: 10,
      path: 'M 150,450 L 100,460 L 250,550 L 280,500 Z',
      textX: 180,
      textY: 500,
      rotate: -45
    },
    {
      id: 'sec103',
      name: 'SEC 103',
      color: '#4f46e5',
      price: regularPrice,
      dots: 10,
      path: 'M 290,510 L 260,560 L 540,560 L 510,510 Z',
      textX: 400,
      textY: 535
    },
    {
      id: 'sec104',
      name: 'SEC 104',
      color: '#4f46e5',
      price: regularPrice,
      dots: 10,
      path: 'M 520,500 L 550,550 L 700,460 L 650,450 Z',
      textX: 620,
      textY: 500,
      rotate: 45
    },
    {
      id: 'sec105',
      name: 'SEC 105',
      color: '#4f46e5',
      price: regularPrice,
      dots: 15,
      path: 'M 650,440 L 700,450 L 700,150 L 650,160 Z',
      textX: 675,
      textY: 305,
      rotate: 90
    },
    {
      id: 'sec201',
      name: 'SEC 201',
      color: '#64748b',
      price: regularPrice,
      dots: 10,
      path: 'M 80,140 L 40,130 L 40,480 L 80,470 Z',
      textX: 60,
      textY: 305,
      rotate: -90
    },
    {
      id: 'sec202',
      name: 'SEC 202',
      color: '#64748b',
      price: regularPrice,
      dots: 15,
      path: 'M 80,480 Q 400,590 720,480',
      textX: 400,
      textY: 540
    },
    {
      id: 'sec203',
      name: 'SEC 203',
      color: '#64748b',
      price: regularPrice,
      dots: 10,
      path: 'M 720,470 L 760,480 L 760,130 L 720,140 Z',
      textX: 740,
      textY: 305,
      rotate: 90
    }
  ];

  const getPointsAlongPath = (pathString, numPoints) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathString);
    svg.appendChild(path);
    document.body.appendChild(svg);

    const length = path.getTotalLength();
    const points = [];
    for (let i = 0; i < numPoints; i++) {
      const point = path.getPointAtLength((i * length) / (numPoints - 1));
      points.push({ x: point.x, y: point.y });
    }

    document.body.removeChild(svg);
    return points;
  };

  return (
    <div className="min-h-screen pb-20 bg-[#0a0e14]">
      {flashMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[500] bg-[#ea0042] text-white px-6 py-4 rounded-xl font-bold uppercase tracking-widest text-center animate-bounce shadow-2xl flex items-center gap-2 max-w-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{flashMsg}</span>
        </div>
      )}

      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl lg:text-4xl font-black italic uppercase tracking-tighter text-white">
              Select Seats
            </h2>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              {event?.venue || 'Stadium Arena'}
            </p>
          </div>
          <button
            onClick={() => setShowCartOverlay(true)}
            className="bg-[#026cdf] px-4 py-2 rounded-full flex items-center gap-2 shadow-lg hover:bg-[#0257c4] transition-colors"
          >
            <ShoppingCart className="w-4 h-4 text-white" />
            <span className="font-black text-white">{cart.length}</span>
          </button>
        </div>

        <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-white/5 p-3 rounded-xl w-fit flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-[#026cdf]" />
            <span>Regular</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-pink-500" />
            <span>VIP</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-gray-600" />
            <span>Sold</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-green-500" />
            <span>Your Seat</span>
          </div>
        </div>
      </div>

      {view === 'overview' && (
        <div className="max-w-4xl mx-auto px-4 py-10">
          <img
            src={overviewImage}
            alt="Stadium Overview"
            className="w-full h-auto object-cover cursor-pointer rounded-lg shadow-2xl hover:opacity-90 transition-opacity"
            onClick={() => setView('underlay')}
          />
          <p className="text-center text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-4">
            Tap anywhere to zoom
          </p>
        </div>
      )}

      {view === 'underlay' && (
        <div className="px-4 animate-slideUp">
          <button
            onClick={() => setView('overview')}
            className="mb-6 flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Overview
          </button>
          <img
            src={zoomImage}
            alt="Stadium Zoom"
            className="w-full h-auto object-cover cursor-pointer rounded-lg shadow-2xl hover:opacity-90 transition-opacity"
            onClick={() => setView('svg-arena')}
          />
          <p className="text-center text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-4">
            Tap anywhere to select seats
          </p>
        </div>
      )}

      {view === 'svg-arena' && (
        <div className="px-4 animate-slideUp">
          <button
            onClick={() => setView('underlay')}
            className="mb-6 flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Zoom View
          </button>
          <div className="w-full">
            <svg
              viewBox="0 0 800 600"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-auto"
            >
              {sections.map((section) => (
                <g
                  key={section.id}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => {
                    setSelectedSection(section.id);
                    setView('section');
                  }}
                >
                  <path
                    d={section.path}
                    fill={section.color}
                    stroke="#334155"
                    strokeWidth="2"
                  />
                  <text
                    x={section.textX}
                    y={section.textY}
                    fill="white"
                    fontWeight="900"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="12"
                    letterSpacing="1"
                    transform={
                      section.rotate
                        ? `rotate(${section.rotate} ${section.textX} ${section.textY})`
                        : undefined
                    }
                  >
                    {section.name}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>
      )}

      {view === 'section' && selectedSection && (
        <div className="px-4 animate-slideUp min-h-screen bg-[#0a0e14]">
          <button
            onClick={() => {
              setView('svg-arena');
              setSelectedSection(null);
            }}
            className="mb-6 flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Arena View
          </button>

          <div className="w-full mb-20">
            <svg
              viewBox="0 0 800 600"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-auto"
            >
              {sections.map((section) => {
                const isSelected = section.id === selectedSection;
                const points = isSelected ? getPointsAlongPath(section.path, section.dots) : [];

                return (
                  <g key={section.id}>
                    <path
                      d={section.path}
                      fill={section.color}
                      stroke={isSelected ? 'white' : '#334155'}
                      strokeWidth={isSelected ? '3' : '2'}
                      opacity={isSelected ? '1' : '0.3'}
                    />
                    <text
                      x={section.textX}
                      y={section.textY}
                      fill="white"
                      fontWeight="900"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize="12"
                      letterSpacing="1"
                      opacity={isSelected ? '1' : '0.3'}
                      transform={
                        section.rotate
                          ? `rotate(${section.rotate} ${section.textX} ${section.textY})`
                          : undefined
                      }
                    >
                      {section.name}
                    </text>

                    {isSelected &&
                      points.map((point, i) => {
                        const seatLabel = `${section.name}-${i + 1}`;
                        const isInCart = cart.find((c) => c.label === seatLabel);
                        const isSold = soldSeats.includes(seatLabel);

                        return (
                          <circle
                            key={i}
                            cx={point.x}
                            cy={point.y}
                            r="4"
                            fill={isInCart ? '#22c55e' : isSold ? '#64748b' : 'white'}
                            stroke={isInCart ? '#16a34a' : isSold ? '#475569' : section.color}
                            strokeWidth="2"
                            className={`${
                              isSold ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-125'
                            } transition-transform`}
                            onClick={() => handleSeatClick(seatLabel, section.price)}
                          />
                        );
                      })}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {showCartOverlay && (
        <div className="fixed inset-0 z-[400] bg-black/95 flex items-end justify-center animate-fadeIn">
          <div className="w-full max-w-lg bg-[#0a0e14] rounded-t-3xl shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h3 className="text-2xl font-black text-white uppercase tracking-tight">
                Your Cart ({cart.length})
              </h3>
              <button
                onClick={() => setShowCartOverlay(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {cart.length === 0 ? (
                <p className="text-center text-gray-500 py-12">Your cart is empty</p>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between bg-white/5 p-4 rounded-lg"
                    >
                      <div>
                        <p className="font-bold text-white">{item.label}</p>
                        <p className="text-sm text-gray-400">${item.price.toFixed(2)}</p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item)}
                        className="text-red-500 hover:text-red-400 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-6 border-t border-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-bold text-white">Total</span>
                  <span className="text-2xl font-black text-white">
                    ${cart.reduce((sum, item) => sum + item.price, 0).toFixed(2)}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setShowCartOverlay(false);
                    onCheckout();
                  }}
                  className="w-full bg-[#026cdf] text-white py-4 rounded-full font-black uppercase tracking-widest hover:bg-[#0257c4] transition-colors"
                >
                  Proceed to Payment
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {cart.length > 0 && view === 'section' && !showCartOverlay && (
        <button
          onClick={onCheckout}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#026cdf] text-white py-4 px-12 rounded-full font-black uppercase italic tracking-widest shadow-xl hover:bg-[#0257c4] transition-all z-50"
        >
          Proceed to Payment ({cart.length} seat{cart.length > 1 ? 's' : ''})
        </button>
      )}
    </div>
  );
}
