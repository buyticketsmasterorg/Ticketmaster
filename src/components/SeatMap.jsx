import React, { useState } from 'react';
import { ChevronLeft, Info, ShoppingCart, AlertTriangle, Monitor } from 'lucide-react';

export default function SeatMap({ event, regularPrice, vipPrice, cart, setCart, onCheckout }) {
  const [view, setView] = useState('overview'); // overview (main img), underlay (zoom img), section (zoom + dots)
  const [selectedSection, setSelectedSection] = useState(null);
  
  const [panicState, setPanicState] = useState('idle');
  const [failCount, setFailCount] = useState(0);
  const [flashMsg, setFlashMsg] = useState('');

  // Cloudinary URLs (new cropped versions)
  const overviewImage = 'https://res.cloudinary.com/dwqvtrd8p/image/upload/v1769468237/06ba05b2-10a5-4e4c-a1ac-cc3bf5884155_mgbnri.jpg';
  const zoomImage = 'https://res.cloudinary.com/dwqvtrd8p/image/upload/v1769468283/db62554d-ec34-4190-a3cc-d5aa4908fc9d_mzkjsq.jpg';

  const handleSeatClick = (seatLabel, price, isVip) => {
    // 1. Unpick Logic (Remove if already selected)
    const exists = cart.find(c => c.label === seatLabel);
    if (exists) {
        setCart(cart.filter(c => c.id !== exists.id));
        return;
    }

    if (panicState !== 'idle') return;

    if (cart.length >= 5) {
      setFlashMsg("Seat will be available as fans release seat check back later");
      setTimeout(() => setFlashMsg(''), 3000);
      return;
    }

    // 2. Panic Logic (Reduced rejections: 0-1 random)
    setPanicState('all-grey');
    setTimeout(() => {
        setPanicState('partial-grey'); 
        setTimeout(() => {
            setPanicState('idle');
            const randomReject = Math.random() > 0.5 ? 0 : 1; // 50% chance of 1 rejection
            if (failCount < randomReject) {
                setFailCount(prev => prev + 1);
                setFlashMsg("Sorry! Another fan beat you to this seat.");
                setTimeout(() => setFlashMsg(''), 2000);
            } else {
                setCart([...cart, { id: Date.now(), label: seatLabel, price, isVip }]);
                setFailCount(0); // Reset for next pick
            }
        }, 800);
    }, 1500);
  };

  return (
    <div className="animate-fadeIn pb-32 bg-[#0a0e14]"> {/* Black bg for blending */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex items-center justify-between">
            <div><h2 className="text-2xl lg:text-4xl font-black italic uppercase tracking-tighter text-white">Select Seats</h2><p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{event?.venue}</p></div>
            <div className="bg-[#026cdf] px-4 py-2 rounded-full flex items-center gap-2 shadow-lg"><ShoppingCart className="w-4 h-4 text-white" /><span className="font-black text-white">{cart.length}</span></div>
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
               onClick={() => setView('section')}
           />
           <p className="text-center text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-4">Tap anywhere to select seats</p>
        </div>
      )}

      {view === 'section' && (
        <div className="animate-slideUp relative">
           {flashMsg && <div className="absolute top-0 left-0 w-full z-50 bg-[#ea0042] text-white p-4 rounded-xl font-bold uppercase tracking-widest text-center animate-bounce shadow-2xl"><AlertTriangle className="w-5 h-5 inline-block mr-2" />{flashMsg}</div>}
           <button onClick={() => setView('underlay')} className="mb-6 flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-white transition-colors"><ChevronLeft className="w-4 h-4" /> Back to Zoom View</button>
           <div className="bg-white text-gray-900 rounded-[40px] p-6 lg:p-10 shadow-2xl relative overflow-hidden min-h-[500px]">
              <div className="flex justify-between items-end mb-8 border-b border-gray-100 pb-4 relative z-10"><div><h3 className={`text-3xl font-black italic uppercase tracking-tighter ${selectedSection?.isVip ? 'text-pink-600' : 'text-gray-900'}`}>{selectedSection?.name || 'Stadium Seats'}</h3><p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Standard Admission</p></div><div className="text-right"><p className="text-3xl font-black text-[#026cdf]">${selectedSection?.price || regularPrice}</p><p className="text-[10px] font-bold text-gray-400 uppercase">Per Ticket</p></div></div>
              <div className="relative bg-[#0a0e14]"> {/* Black bg for blending */}
                  <div className="overflow-x-auto pb-4 relative z-10">
                      <div className="min-w-[300px] grid grid-cols-10 gap-1 justify-center"> {/* Increased to 10 cols, gap-1 for more/smaller */}
                          {[...Array(120)].map((_, i) => { // Increased to 120 dots (10x12)
                              const row = String.fromCharCode(65 + Math.floor(i / 10));
                              const num = (i % 10) + 1;
                              const label = `Row ${row}-${num}`;
                              const isMiddleVip = Math.floor(i / 10) >= 3 && Math.floor(i / 10) <= 6; // Rows D-G (middle)
                              const color = isMiddleVip ? 'pink-500' : '026cdf'; // Pink for VIP, blue for regular
                              const price = isMiddleVip ? vipPrice : regularPrice;
                              const isSelected = cart.find(c => c.label === label);
                              let isVisualGrey = false;
                              if (panicState === 'all-grey') isVisualGrey = true;
                              else if (panicState === 'partial-grey') { if (i % 3 !== 0) isVisualGrey = true; }
                              return (
                                  <button 
                                      key={i} 
                                      disabled={isVisualGrey || isSelected} 
                                      onClick={() => handleSeatClick(label, price, isMiddleVip)} 
                                      className={`w-4 h-4 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[6px] sm:text-[8px] font-black transition-all border ${isVisualGrey ? 'bg-gray-400 border-gray-400 text-transparent scale-90 cursor-not-allowed duration-300' : isSelected ? 'bg-gray-500 border-gray-500 text-white cursor-not-allowed' : `bg-white border-[${color}] text-[${color}] hover:bg-[${color}] hover:text-white hover:scale-110 shadow-sm`}`}
                                  >
                                      {!isVisualGrey && (isSelected ? <span className="group-hover:hidden">✓</span> : num)}
                                  </button>
                              );
                          })}
                      </div>
                  </div>
              </div>
           </div>
           {/* Proceed to Payment Button */}
           {cart.length > 0 && (
               <button 
                   onClick={onCheckout} 
                   className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#026cdf] text-white py-4 px-12 rounded-full font-black uppercase italic tracking-widest shadow-xl hover:bg-[#014bb4] transition-all"
               >
                   Proceed to Payment ({cart.length} seats)
               </button>
           )}
        </div>
      )}

    </div>
  );
}
