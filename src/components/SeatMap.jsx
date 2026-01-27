import React, { useState } from 'react';
import { ChevronLeft, Info, ShoppingCart, AlertTriangle, Monitor } from 'lucide-react';

export default function SeatMap({ event, regularPrice, vipPrice, cart, setCart, onCheckout }) {
  const [view, setView] = useState('overview'); // overview (main img), underlay (zoom img), section (zoom + dots)
  const [selectedSection, setSelectedSection] = useState(null);
  
  const [panicState, setPanicState] = useState('idle');
  const [flashMsg, setFlashMsg] = useState('');

  // Cloudinary URLs (new cropped ones)
  const overviewImage = 'https://res.cloudinary.com/dwqvtrd8p/image/upload/v1769468237/06ba05b2-10a5-4e4c-a1ac-cc3bf5884155_mgbnri.jpg';
  const zoomImage = 'https://res.cloudinary.com/dwqvtrd8p/image/upload/v1769468283/db62554d-ec34-4190-a3cc-d5aa4908fc9d_mzkjsq.jpg';

  const [showCartOverlay, setShowCartOverlay] = useState(false);

  const handleSeatClick = (seatLabel, price) => {
    // 1. Unpick Logic (Remove if already selected)
    const exists = cart.find(c => c.label === seatLabel);
    if (exists) {
        setCart(cart.filter(c => c.id !== exists.id));
        return;
    }

    if (panicState !== 'idle') return;

    if (cart.length >= 5) {
      setFlashMsg("More seat will be available soon check back");
      setTimeout(() => setFlashMsg(''), 3000);
      return;
    }

    // No panic - direct add and turn grey
    setCart([...cart, { id: Date.now(), label: seatLabel, price }]);
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(c => c.id !== id));
  };

  return (
    <div className="animate-fadeIn pb-32 bg-[#0a0e14]"> {/* Black bg for blending, no header */}
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
               onClick={() => setView('section')}
           />
           <p className="text-center text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-4">Tap anywhere to select seats</p>
        </div>
      )}

      {view === 'section' && (
        <div className="animate-slideUp relative bg-[#0a0e14]"> {/* Black bg, no header framing */}
           {flashMsg && <div className="absolute top-0 left-0 w-full z-50 bg-[#ea0042] text-white p-4 rounded-xl font-bold uppercase tracking-widest text-center animate-bounce shadow-2xl"><AlertTriangle className="w-5 h-5 inline-block mr-2" />{flashMsg}</div>}
           <button onClick={() => setView('underlay')} className="mb-6 flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-white transition-colors"><ChevronLeft className="w-4 h-4" /> Back to Zoom View</button>
           <div className="relative overflow-hidden min-h-[500px] bg-[#0a0e14]"> {/* Black bg for blending */}
               <img 
                   src={zoomImage} 
                   alt="Stadium Zoom with Seats" 
                   className="w-full h-auto object-cover rounded-lg opacity-90 hidden" // Hidden for "go" - dots on black
               />
               <div className="absolute inset-0 overflow-x-auto pb-4">
                   <div className="min-w-[300px] grid grid-cols-10 gap-1 justify-center"> {/* 10 cols, gap-1 for more/smaller */}
                       {[...Array(120)].map((_, i) => { // 120 dots
                           const row = String.fromCharCode(65 + Math.floor(i / 10));
                           const num = (i % 10) + 1;
                           const label = `Row ${row}-${num}`;
                           const isSelected = cart.find(c => c.label === label);
                           let isVisualGrey = false;
                           if (panicState === 'all-grey') isVisualGrey = true;
                           else if (panicState === 'partial-grey') { if (i % 3 !== 0) isVisualGrey = true; }
                           return (
                               <button 
                                   key={i} 
                                   disabled={isVisualGrey} 
                                   onClick={() => handleSeatClick(label, regularPrice)} // Using regularPrice; adjust if VIP added
                                   className={`w-4 h-4 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[6px] sm:text-[8px] font-black transition-all border ${isVisualGrey ? 'bg-gray-400 border-gray-400 text-transparent scale-90 cursor-not-allowed duration-300' : isSelected ? 'bg-gray-500 border-gray-500 text-white' : 'bg-white border-[#026cdf] text-[#026cdf] hover:bg-[#026cdf] hover:text-white hover:scale-110 shadow-sm'}`}
                               >
                                   {!isVisualGrey && (isSelected ? <span className="group-hover:hidden">✓</span> : num)}
                               </button>
                           );
                       })}
                   </div>
               </div>
           </div>
           {/* Proceed to Payment Button */}
           {cart.length > 0 && (
               <button 
                   onClick={onCheckout} 
                   className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#026cdf] text-white py-4 px-12 rounded-full font-black uppercase italic tracking-widest shadow-xl hover:bg-[#014bb4] transition-all z-50 pb-20" // z-50 and pb for no overlap
               >
                   Proceed to Payment ({cart.length} seats)
               </button>
           )}
        </div>
      )}

      {/* CART OVERLAY */}
      {showCartOverlay && (
          <div className="fixed inset-0 z-[400] bg-black/95 flex items-end justify-center animate-fadeIn">
              <div className="w-full max-w-lg bg-white rounded-t-[40px] h-[85vh] overflow-hidden flex flex-col animate-slideUp">
                  <div className="p-6 flex justify-between items-center border-b border-gray-100">
                      <span className="font-black italic uppercase text-black">My Cart</span>
                      <button onClick={() => setShowCartOverlay(false)} className="p-2 bg-gray-100 rounded-full text-black"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="flex-1 p-8 text-black overflow-y-auto space-y-4">
                      {cart.length > 0 ? (
                          cart.map((item) => (
                              <div key={item.id} className="bg-gray-100 p-4 rounded-xl flex justify-between items-center">
                                  <div>
                                      <p className="text-sm font-bold">{item.label}</p>
                                      <p className="text-xs text-gray-500">${item.price}</p>
                                  </div>
                                  <button onClick={() => removeFromCart(item.id)} className="text-red-500">Delete</button>
                              </div>
                          ))
                      ) : (
                          <p className="text-center text-gray-500 font-bold">No seats in cart</p>
                      )}
                  </div>
              </div>
          </div>
      )}

    </div>
  );
}
