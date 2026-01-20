import React, { useState } from 'react';
import { ChevronLeft, CheckCircle, Filter, Info } from 'lucide-react';

export default function SeatMap({ event, cart, setCart, globalPrice, onCheckout }) {
  const [viewState, setViewState] = useState('overview'); // overview, zoomed
  const [clickAttempts, setClickAttempts] = useState(0); 
  const [fakeSoldSeats, setFakeSoldSeats] = useState([]);
  const [toast, setToast] = useState(null);

  const handleSeatClick = (seatData) => {
    if (fakeSoldSeats.includes(seatData.id)) return;

    // Logic: First 4 clicks fail (Frustration Mode)
    if (clickAttempts < 4) {
       setFakeSoldSeats([...fakeSoldSeats, seatData.id]);
       setClickAttempts(prev => prev + 1);
       showToast("Sorry! Another fan beat you to these tickets.", "error");
       return;
    }

    const exists = cart.find(s => s.id === seatData.id);
    if (exists) {
      setCart(cart.filter(s => s.id !== seatData.id));
    } else {
      if (cart.length >= 8) return alert("You can only select up to 8 tickets.");
      setCart([...cart, seatData]);
    }
  };

  const showToast = (msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const totalPrice = cart.reduce((acc, item) => acc + item.price, 0);

  // Render Zoomed Floor Grid
  const renderZoomedFloor = () => {
    let seats = [];
    const rows = 12;
    const cols = 14;
    
    for (let r = 1; r <= rows; r++) {
      let rowSeats = [];
      for (let c = 1; c <= cols; c++) {
        const id = `flr-${r}-${c}`;
        const isSelected = cart.find(s => s.id === id);
        const isFakeSold = fakeSoldSeats.includes(id);
        const isRealSold = (r * c) % 7 === 0;
        const isResale = (r * c) % 13 === 0;
        const price = isResale ? Math.floor(globalPrice * 1.5) : globalPrice;
        
        rowSeats.push(
          <div 
            key={id}
            onClick={() => !isRealSold && !isFakeSold && handleSeatClick({ id, row: r, seat: c, price, section: 'Floor A' })}
            className={`
              flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full m-1 cursor-pointer transition-transform hover:scale-110
              flex items-center justify-center border
              ${isSelected ? 'bg-green-600 border-green-700 text-white scale-110 shadow-lg' : 
                (isRealSold || isFakeSold) ? 'bg-gray-300 border-gray-300 cursor-not-allowed' : 
                isResale ? 'bg-[#ea0042] border-[#ea0042]' : 'bg-[#026cdf] border-[#026cdf]'}
            `}
          >
            {isSelected && <CheckCircle className="w-4 h-4" />}
          </div>
        );
      }
      seats.push(<div key={r} className="flex justify-center w-max mx-auto">{rowSeats}</div>);
    }
    return (
      <div className="animate-fadeIn w-full">
         <button onClick={() => setViewState('overview')} className="mb-4 flex items-center text-sm font-bold text-[#026cdf] hover:underline bg-white px-4 py-2 rounded-full shadow">
           <ChevronLeft className="w-4 h-4" /> Back to Stadium Map
         </button>
         <div className="bg-white p-6 rounded-lg shadow-xl border border-gray-200 w-full overflow-x-auto">
           <div className="min-w-[800px] flex flex-col items-center">
             <div className="bg-[#1f262d] text-white text-center py-4 mb-8 font-bold tracking-[0.5em] rounded shadow-md w-full">STAGE</div>
             <div className="space-y-2">{seats}</div>
           </div>
         </div>
         <p className="text-center text-xs text-gray-400 mt-2 md:hidden">Swipe left/right to see more seats</p>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-white overflow-hidden relative">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-24 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-2xl font-bold flex items-center gap-2 animate-bounce ${toast.type === 'error' ? 'bg-[#ea0042] text-white' : 'bg-green-600 text-white'}`}>
          <Info className="w-5 h-5" /> {toast.msg}
        </div>
      )}

      {/* Top Warning */}
      <div className="bg-[#ea0042] text-white text-xs md:text-sm py-2 px-4 text-center font-bold flex items-center justify-center gap-2">
         <Info className="w-4 h-4" /> Ticket availability is extremely limited. Prices may fluctuate.
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <div className="hidden md:block w-80 border-r bg-white p-4 overflow-y-auto z-10 shadow-lg">
           <div className="flex justify-between items-start mb-4">
             <h2 className="font-bold text-xl">{event?.artist}</h2>
             <div className="bg-[#026cdf] rounded-full w-5 h-5 flex items-center justify-center"><CheckCircle className="w-3.5 h-3.5 text-white stroke-[3]" /></div>
           </div>
           <p className="text-sm text-gray-500 mb-6">{event?.venue} • {event?.date}</p>
           <div className="space-y-4 border-t pt-4">
              <h3 className="font-bold text-sm text-gray-700">Legend</h3>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-[#026cdf]"></div><span className="text-sm">Standard Ticket</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-[#ea0042]"></div><span className="text-sm">Verified Resale</span></div>
              <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-gray-300"></div><span className="text-sm">Unavailable</span></div>
           </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 bg-gray-50 relative overflow-y-auto overflow-x-hidden p-4 pb-32">
          <div className="absolute top-4 right-4 z-10">
             <button className="bg-white px-4 py-2 rounded-full shadow-md border flex items-center gap-2 text-sm font-bold text-[#026cdf]"><Filter className="w-4 h-4" /> Filter</button>
          </div>
          <div className="flex items-center justify-center min-h-[500px]">
             {viewState === 'overview' ? (
                <div className="relative w-full max-w-4xl mx-auto aspect-video p-4 animate-fadeIn">
                  <svg viewBox="0 0 800 500" className="w-full h-full drop-shadow-2xl">
                    <rect x="0" y="0" width="800" height="500" fill="#f8fafc" rx="10" />
                    <path d="M 250 50 L 550 50 L 550 100 L 250 100 Z" fill="#1f262d" />
                    <text x="400" y="85" fill="white" fontSize="24" fontWeight="bold" textAnchor="middle" letterSpacing="0.2em">STAGE</text>
                    <g onClick={() => setViewState('zoomed')} className="cursor-pointer hover:opacity-80 transition-all group">
                      <rect x="250" y="120" width="300" height="200" fill="#e0e7ff" stroke="#026cdf" strokeWidth="3" rx="10" />
                      <text x="400" y="210" fill="#026cdf" fontSize="18" fontWeight="bold" textAnchor="middle">FLOOR SEATING</text>
                      <text x="400" y="235" fill="#026cdf" fontSize="14" textAnchor="middle" className="uppercase tracking-widest bg-white/50 px-2">Click to select seats</text>
                    </g>
                    {/* Decorative stadium shapes */}
                    <path d="M 230 120 L 100 120 Q 50 220 100 320 L 230 320 Q 180 220 230 120 Z" fill="#e2e8f0" stroke="gray" />
                    <path d="M 570 120 L 700 120 Q 750 220 700 320 L 570 320 Q 620 220 570 120 Z" fill="#e2e8f0" stroke="gray" />
                    <path d="M 230 340 L 570 340 L 550 450 L 250 450 Z" fill="#ffe4e6" stroke="#ea0042" />
                  </svg>
                </div>
             ) : renderZoomedFloor()}
          </div>
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="h-24 bg-white border-t shadow-[0_-5px_15px_rgba(0,0,0,0.1)] flex items-center justify-between px-6 z-30 fixed bottom-0 w-full">
         <div>
            {cart.length > 0 ? (
               <div className="animate-slideUp">
                  <p className="text-xs uppercase font-bold text-gray-500">{cart.length} Tickets Selected</p>
                  <p className="text-2xl font-extrabold text-gray-900">${totalPrice.toFixed(2)} <span className="text-sm font-normal text-gray-400">+ fees</span></p>
               </div>
            ) : <p className="text-gray-500 text-sm font-medium">Select seats to proceed</p>}
         </div>
         <button onClick={onCheckout} disabled={cart.length === 0} className={`px-10 py-4 rounded-lg font-bold text-white transition-all text-lg ${cart.length > 0 ? 'bg-[#026cdf] hover:bg-blue-700 shadow-xl' : 'bg-gray-300 cursor-not-allowed'}`}>
           Next
         </button>
      </div>
    </div>
  );
}

