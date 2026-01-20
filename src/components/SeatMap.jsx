import React, { useState, useEffect } from 'react';
import { ChevronLeft, CheckCircle, Info, Lock, Star, ShieldCheck } from 'lucide-react';

export default function SeatMap({ event, presaleCode, cart, setCart, globalPrice, onCheckout }) {
  const [viewState, setViewState] = useState('overview');
  const [isLocked, setIsLocked] = useState(event?.status === 'presale');
  const [enteredCode, setEnteredCode] = useState('');
  const [clickAttempts, setClickAttempts] = useState(0); 
  const [fakeSoldSeats, setFakeSoldSeats] = useState([]);
  const [toast, setToast] = useState(null);

  // PHANTOM TAKER ENGINE: Randomly sells seats every 3-5 seconds
  useEffect(() => {
    if (isLocked) return;
    const interval = setInterval(() => {
       const randomRow = Math.floor(Math.random() * 8) + 1;
       const randomCol = Math.floor(Math.random() * 12) + 1;
       const seatId = `s-${randomRow}-${randomCol}`;
       setFakeSoldSeats(prev => [...new Set([...prev, seatId])]);
    }, 4000);
    return () => clearInterval(interval);
  }, [isLocked]);

  const handleSeatClick = (seatData) => {
    if (fakeSoldSeats.includes(seatData.id)) return;

    // Simulate "Someone else got it" for first few interactions
    if (clickAttempts < 2) {
       setFakeSoldSeats(prev => [...prev, seatData.id]);
       setClickAttempts(prev => prev + 1);
       showToast("Sorry! Another fan beat you to these seats.", "error");
       return;
    }

    const exists = cart.find(s => s.id === seatData.id);
    if (exists) {
      setCart(cart.filter(s => s.id !== seatData.id));
    } else {
      if (cart.length >= 8) return;
      setCart([...cart, seatData]);
    }
  };

  const showToast = (msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const unlock = () => {
    if (enteredCode === presaleCode) {
      setIsLocked(false);
      showToast("Access Granted. Verified Fan Status Confirmed.", "success");
    } else {
      showToast("Invalid Presale Code. Try ERAS2024 or contact support.", "error");
    }
  };

  const totalPrice = cart.reduce((acc, item) => acc + item.price, 0);

  const renderFloor = () => {
    let rows = [];
    for (let r = 1; r <= 8; r++) {
      let seats = [];
      for (let c = 1; c <= 12; c++) {
        const id = `s-${r}-${c}`;
        const isSelected = cart.find(s => s.id === id);
        const isSold = fakeSoldSeats.includes(id) || (r + c) % 9 === 0;
        const isVIP = r < 3;
        const price = isVIP ? globalPrice * 2.5 : globalPrice;
        
        seats.push(
          <div 
            key={id}
            onClick={() => !isSold && handleSeatClick({ id, row: r, seat: c, section: 'Floor', price })}
            className={`w-8 h-8 md:w-10 md:h-10 rounded-full cursor-pointer flex items-center justify-center text-[9px] font-black transition-all border relative
              ${isSelected ? 'bg-green-500 border-green-700 text-white scale-110 shadow-2xl' : 
                isSold ? 'bg-gray-200 border-gray-200 cursor-not-allowed opacity-30 text-transparent' : 
                isVIP ? 'bg-amber-400 border-amber-500 text-amber-900 shadow-sm' : 'bg-[#026cdf] border-[#026cdf] text-white hover:scale-110'}
            `}
          >
            {isSelected ? <CheckCircle className="w-5 h-5" /> : !isSold && `${c}`}
          </div>
        );
      }
      rows.push(<div key={r} className="flex gap-2 justify-center">{seats}</div>);
    }
    return (
      <div className="bg-white p-10 rounded-[50px] shadow-[0_50px_100px_rgba(0,0,0,0.1)] space-y-4 animate-slideUp overflow-x-auto min-w-full relative border border-gray-100">
        <div className="bg-[#1f262d] text-white text-center py-8 font-black tracking-[1.5em] text-sm mb-16 rounded-3xl shadow-2xl border-b-8 border-black">STAGE</div>
        <div className="space-y-3">{rows}</div>
      </div>
    );
  };

  if (isLocked) return (
    <div className="min-h-[85vh] flex items-center justify-center p-4 bg-[#f8fafc]">
      <div className="bg-white w-full max-w-sm rounded-[50px] shadow-[0_50px_100px_rgba(0,0,0,0.1)] p-12 border border-gray-50 text-center space-y-8 animate-slideUp">
        <div className="w-20 h-20 bg-blue-50 rounded-[30px] flex items-center justify-center mx-auto shadow-inner"><Lock className="text-[#026cdf] w-10 h-10" /></div>
        <div>
          <h2 className="text-3xl font-black tracking-tight">Presale Restricted</h2>
          <p className="text-gray-400 text-xs mt-3 font-medium uppercase tracking-widest leading-relaxed">Enter your unique Fan Code to unlock verified floor seats.</p>
        </div>
        <input 
          className="w-full border-2 border-gray-100 p-5 rounded-3xl text-center font-black tracking-[0.4em] uppercase text-2xl focus:border-[#026cdf] focus:bg-blue-50/30 outline-none transition-all" 
          placeholder="XXXXXX" 
          value={enteredCode} 
          onChange={e=>setEnteredCode(e.target.value.toUpperCase())} 
        />
        <div className="bg-gray-50 p-4 rounded-2xl">
           <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-tight">No code? Our Live Chat agents are standing by to verify your status.</p>
        </div>
        <button onClick={unlock} className="w-full bg-[#026cdf] text-white py-5 rounded-3xl font-black shadow-2xl shadow-blue-500/30 hover:bg-blue-700 transition-all uppercase tracking-widest">
          Join Presale
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-[#f1f5f9] relative overflow-hidden">
      {/* Dynamic Toast */}
      {toast && (
        <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-[100] px-10 py-5 rounded-full shadow-2xl font-black flex items-center gap-3 animate-bounce ${toast.type === 'error' ? 'bg-[#ea0042] text-white' : 'bg-green-600 text-white'}`}>
          <Info className="w-5 h-5" /> {toast.msg}
        </div>
      )}

      <div className="bg-[#ea0042] text-white text-[10px] py-1.5 text-center font-black tracking-[0.3em] uppercase animate-pulse shadow-md z-10">
         Demand is high: You are currently 1 of 4,321 fans looking at these tickets.
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-12 pb-40">
        <div className="max-w-6xl mx-auto space-y-10">
          {viewState === 'overview' ? (
            <div className="bg-white p-12 rounded-[50px] shadow-2xl border border-gray-50 text-center animate-slideUp">
              <div className="flex flex-wrap justify-center gap-4 mb-10">
                <div className="flex items-center gap-2 bg-amber-50 px-4 py-2 rounded-full border border-amber-100 text-amber-600 text-[10px] font-black"><Star className="w-3 h-3 fill-current" /> VIP PLATINUM</div>
                <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full border border-blue-100 text-[#026cdf] text-[10px] font-black"><ShieldCheck className="w-3 h-3" /> VERIFIED ACCESS</div>
                <div className="flex items-center gap-2 bg-pink-50 px-4 py-2 rounded-full border border-pink-100 text-pink-600 text-[10px] font-black"><CheckCircle className="w-3 h-3" /> SECURE TICKETS</div>
              </div>
              
              <div className="space-y-2 mb-12">
                <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase">{event?.artist}</h2>
                <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-sm">{event?.venue} • {event?.date}</p>
              </div>
              
              <div 
                onClick={() => setViewState('zoomed')} 
                className="w-full max-w-xl mx-auto aspect-video bg-[#e2e8f0] border-4 border-dashed border-[#026cdf] rounded-[60px] flex flex-col items-center justify-center cursor-pointer hover:bg-blue-50 transition-all hover:scale-[1.03] shadow-inner relative group"
              >
                <div className="absolute top-0 w-48 h-8 bg-[#1f262d] rounded-b-3xl shadow-2xl font-black text-[10px] text-white flex items-center justify-center tracking-[0.5em] border-b-4 border-black">STAGE</div>
                
                <div className="bg-white px-10 py-6 rounded-[35px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-blue-100 flex flex-col items-center group-hover:shadow-blue-500/20">
                   <span className="font-black text-[#026cdf] text-2xl tracking-tighter">FLOOR SEATING</span>
                   <span className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-[0.2em]">Select section to view seats</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-fadeIn">
              <button 
                onClick={() => setViewState('overview')} 
                className="mb-8 text-[#026cdf] font-black text-[10px] flex items-center gap-2 bg-white px-6 py-3 rounded-full shadow-xl uppercase tracking-[0.2em] border border-gray-100"
              >
                <ChevronLeft className="w-4 h-4" /> Exit Map View
              </button>
              {renderFloor()}
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="h-28 bg-white border-t p-6 fixed bottom-0 w-full shadow-[0_-20px_50px_rgba(0,0,0,0.1)] flex items-center justify-between z-[50]">
        <div className="space-y-1">
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">{cart.length} Tickets Reserved</p>
          <p className="text-4xl font-black text-gray-900 tracking-tighter leading-none">${totalPrice.toFixed(2)}</p>
          <p className="text-[9px] text-gray-300 font-bold">Price excludes service fees</p>
        </div>
        <button 
          onClick={onCheckout} 
          disabled={cart.length === 0} 
          className={`px-16 py-5 rounded-[24px] font-black text-white shadow-2xl transition-all uppercase tracking-widest text-lg ${cart.length > 0 ? 'bg-[#026cdf] hover:bg-blue-700 shadow-blue-500/40' : 'bg-gray-200 cursor-not-allowed'}`}
        >
          Checkout
        </button>
      </div>
    </div>
  );
}

