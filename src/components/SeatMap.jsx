import React, { useState } from 'react';
import { ChevronLeft, Info, ShoppingCart, AlertTriangle, Monitor } from 'lucide-react';

export default function SeatMap({ event, regularPrice, vipPrice, cart, setCart, onCheckout }) {
  const [view, setView] = useState('overview'); // overview (main img), underlay (zoom img), section (zoom + dots)
  const [selectedSection, setSelectedSection] = useState(null);
  
  const [panicState, setPanicState] = useState('idle');
  const [failCount, setFailCount] = useState(0);
  const [flashMsg, setFlashMsg] = useState('');

  // Define Blocks with separate prices (kept for pricing logic, even with static images)
  const sections = [
    { id: 'floor-a', name: 'Floor A (VIP)', color: 'bg-[#026cdf]', price: vipPrice, isVip: true, type: 'floor' },
    { id: 'floor-b', name: 'Floor B', color: 'bg-[#026cdf]', price: regularPrice * 2, type: 'floor' },
    { id: 'floor-c', name: 'Floor C', color: 'bg-[#026cdf]', price: regularPrice * 2, type: 'floor' },
    { id: '101', name: 'Sec 101', color: 'bg-[#374151]', price: regularPrice, type: 'side-left' },
    { id: '102', name: 'Sec 102', color: 'bg-[#374151]', price: regularPrice, type: 'side-left' },
    { id: '103', name: 'Sec 103', color: 'bg-[#374151]', price: regularPrice, type: 'side-left' },
    { id: '104', name: 'Sec 104', color: 'bg-[#374151]', price: regularPrice, type: 'side-right' },
    { id: '105', name: 'Sec 105', color: 'bg-[#374151]', price: regularPrice, type: 'side-right' },
    { id: '106', name: 'Sec 106', color: 'bg-[#374151]', price: regularPrice, type: 'side-right' },
    { id: '201', name: 'Sec 201', color: 'bg-[#4b5563]', price: regularPrice * 0.8, type: 'back' },
    { id: '202', name: 'Sec 202', color: 'bg-[#4b5563]', price: regularPrice * 0.8, type: 'back' },
  ];

  // Cloudinary URLs
  const overviewImage = 'https://res.cloudinary.com/dwqvtrd8p/image/upload/v1769268299/IMG_1794_sq9tsz.jpg';
  const zoomImage = 'https://res.cloudinary.com/dwqvtrd8p/image/upload/v1769268302/IMG_1795_gkc0s7.jpg';

  const handleSeatClick = (seatLabel, price) => {
    // 1. Unpick Logic (Remove if already selected)
    const exists = cart.find(c => c.label === seatLabel);
    if (exists) {
        setCart(cart.filter(c => c.id !== exists.id));
        return;
    }

    if (panicState !== 'idle') return;

    // 2. Panic Logic (Tuned: 2 Flashes, 3 Rejections)
    setPanicState('all-grey');
    setTimeout(() => {
        setPanicState('partial-grey'); 
        setTimeout(() => {
            setPanicState('all-grey'); // Second Flash
            setTimeout(() => {
                setPanicState('idle');
                if (failCount < 3) { // 3 Failures
                    setFailCount(prev => prev + 1);
                    setFlashMsg("Sorry! Another fan beat you to this seat.");
                    setTimeout(() => setFlashMsg(''), 2000);
                } else {
                    setCart([...cart, { id: Date.now(), label: seatLabel, price }]);
                }
            }, 1000);
        }, 800);
    }, 1500); // Shorter duration
  };

  return (
    <div className="animate-fadeIn pb-32">
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex items-center justify-between">
            <div><h2 className="text-2xl lg:text-4xl font-black italic uppercase tracking-tighter text-white">Select Seats</h2><p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{event?.venue}</p></div>
            <div className="bg-[#026cdf] px-4 py-2 rounded-full flex items-center gap-2 shadow-lg"><ShoppingCart className="w-4 h-4 text-white" /><span className="font-black text-white">{cart.length}</span></div>
        </div>
        <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-white/5 p-3 rounded-xl w-fit">
           <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-[#026cdf]" /> Available</div>
           <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-gray-600" /> Sold</div>
           <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-green-500" /> Your Seat</div>
        </div>
      </div>

      {view === 'overview' && (
        <div className="max-w-4xl mx-auto space-y-4 py-10">
            <img 
                src={overviewImage} 
                alt="Stadium Overview" 
                className="w-full h-auto object-contain cursor-pointer rounded-lg shadow-2xl hover:opacity-90 transition-opacity"
                onClick={() => setView('underlay')}
            />
            <p className="text-center text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-4">Tap anywhere to zoom in</p>
        </div>
      )}

      {view === 'underlay' && (
        <div className="animate-slideUp relative">
           <button onClick={() => setView('overview')} className="mb-6 flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-white transition-colors"><ChevronLeft className="w-4 h-4" /> Back to Overview</button>
           <img 
               src={zoomImage} 
               alt="Stadium Zoom" 
               className="w-full h-auto object-contain cursor-pointer rounded-lg shadow-2xl hover:opacity-90 transition-opacity"
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
              <div className="relative">
                  <img 
                      src={zoomImage} 
                      alt="Stadium Zoom with Seats" 
                      className="w-full h-auto object-contain rounded-lg"
                  />
                  <div className="absolute inset-0 overflow-x-auto pb-4">
                      <div className="min-w-[300px] grid grid-cols-10 gap-1 sm:gap-2 justify-center"> {/* Increased to 10 cols, gap-1 for more/smaller */}
                          {[...Array(120)].map((_, i) => { // Increased to 120 dots (10x12)
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
                                      onClick={() => handleSeatClick(label, regularPrice)} // Using regularPrice as default; adjust if needed
                                      className={`w-4 h-4 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[6px] sm:text-[8px] font-black transition-all border ${isVisualGrey ? 'bg-gray-400 border-gray-400 text-transparent scale-90 cursor-not-allowed duration-300' : isSelected ? 'bg-green-500 border-green-500 text-white hover:bg-red-500' : 'bg-white border-[#026cdf] text-[#026cdf] hover:bg-[#026cdf] hover:text-white hover:scale-110 shadow-sm'}`}
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
