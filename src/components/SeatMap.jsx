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
       showToast("SORRY! ANOTHER FAN BEAT YOU TO THESE SEATS.", "error");
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
      showToast("ACCESS GRANTED. VERIFIED FAN STATUS CONFIRMED.", "success");
    } else {
      showToast("INVALID PRESALE CODE. CONTACT SUPPORT.", "error");
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
        const isResale = (r + c) % 13 === 0;
        const price = isVIP ? globalPrice * 2.5 : isResale ? globalPrice * 1.4 : globalPrice;
        
        seats.push(
          <div 
            key={id}
            onClick={() => !isSold && handleSeatClick({ id, row: r, seat: c, section: 'Floor', price })}
            className={`w-9 h-9 md:w-11 md:h-11 rounded-full cursor-pointer flex items-center justify-center text-[10px] font-black transition-all border-2 relative
              ${isSelected ? 'bg-green-500 border-green-700 text-white scale-110 shadow-[0_0_20px_rgba(34,197,94,0.5)]' : 
                isSold ? 'bg-gray-200 border-gray-200 cursor-not-allowed opacity-30 text-transparent' : 
                isVIP ? 'bg-gradient-to-br from-amber-300 to-amber-500 border-amber-600 text-amber-950 shadow-lg' : 
                isResale ? 'bg-gradient-to-br from-pink-400 to-pink-600 border-pink-700 text-white shadow-lg' : 
                'bg-gradient-to-br from-[#026cdf] to-blue-700 border-blue-800 text-white hover:scale-110'}
            `}
          >
            {isSelected ? <CheckCircle className="w-6 h-6" /> : !isSold && `${c}`}
          </div>
        );
      }
      rows.push(<div key={r} className="flex gap-2 justify-center">{seats}</div>);
    }
    return (
      <div className="bg-white p-12 rounded-[60px] shadow-[0_60px_120px_rgba(0,0,0,0.15)] space-y-4 animate-slideUp overflow-x-auto min-w-full relative border-8 border-white">
        <div className="bg-gradient-to-b from-[#1f262d] to-black text-white text-center py-10 font-black tracking-[2em] text-sm mb-20 rounded-[40px] shadow-2xl border-b-[12px] border-black/30 flex items-center justify-center">
          STAGE
        </div>
        <div className="space-y-4 pb-10">{rows}</div>
      </div>
    );
  };

  if (isLocked) return (
    <div className="min-h-[85vh] flex items-center justify-center p-6 bg-[#f1f5f9]">
      <div className="bg-white w-full max-w-sm rounded-[60px] shadow-[0_50px_120px_rgba(0,0,0,0.1)] p-12 border border-white text-center space-y-10 animate-slideUp">
        <div className="w-24 h-24 bg-blue-50 rounded-[40px] flex items-center justify-center mx-auto shadow-inner"><Lock className="text-[#026cdf] w-12 h-12" /></div>
        <div className="space-y-3">
          <h2 className="text-4xl font-black tracking-tighter">Event Locked</h2>
          <p className="text-gray-400 text-[11px] font-black uppercase tracking-widest leading-relaxed">Identity verification required to access verified floor seating inventory.</p>
        </div>
        <input 
          className="w-full border-4 border-gray-50 p-6 rounded-[35px] text-center font-black tracking-[0.4em] uppercase text-3xl focus:border-[#026cdf] focus:bg-blue-50/20 outline-none transition-all shadow-inner" 
          placeholder="CODE" 
          value={enteredCode} 
          onChange={e=>setEnteredCode(e.target.value.toUpperCase())} 
        />
        <div className="bg-gray-50 p-5 rounded-[30px] border border-gray-100">
           <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] leading-relaxed">No code? Our Live Chat agents are standing by to verify your fan status in real-time.</p>
        </div>
        <button onClick={unlock} className="w-full bg-[#026cdf] text-white py-6 rounded-[30px] font-black shadow-[0_20px_50px_rgba(2,108,223,0.3)] hover:scale-[1.03] active:scale-95 transition-all uppercase tracking-widest">
          Join Presale
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-[#f1f5f9] relative overflow-hidden">
      {/* Dynamic Toast */}
      {toast && (
        <div className={`fixed top-24 left-1/2 transform -translate-x-1/2 z-[100] px-12 py-5 rounded-full shadow-[0_30px_60px_rgba(0,0,0,0.3)] font-black flex items-center gap-4 animate-bounce ${toast.type === 'error' ? 'bg-[#ea0042] text-white' : 'bg-green-600 text-white'}`}>
          <Info className="w-6 h-6" /> {toast.msg}
        </div>
      )}

      <div className="bg-gradient-to-r from-[#ea0042] to-[#c40038] text-white text-[10px] py-2 text-center font-black tracking-[0.3em] uppercase animate-pulse shadow-2xl z-20">
         URGENT: YOU ARE CURRENTLY 1 OF 6,842 FANS COMPETING FOR THESE TICKETS.
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-14 pb-48">
        <div className="max-w-7xl mx-auto space-y-12">
          {viewState === 'overview' ? (
            <div className="bg-white p-14 rounded-[70px] shadow-[0_80px_150px_rgba(0,0,0,0.15)] border-8 border-white text-center animate-slideUp">
              <div className="flex flex-wrap justify-center gap-5 mb-12">
                <div className="flex items-center gap-2 bg-amber-50 px-5 py-2.5 rounded-full border border-amber-200 text-amber-600 text-[11px] font-black shadow-sm"><Star className="w-4 h-4 fill-current" /> VIP PLATINUM</div>
                <div className="flex items-center gap-2 bg-pink-50 px-5 py-2.5 rounded-full border border-pink-200 text-pink-600 text-[11px] font-black shadow-sm"><Ticket className="w-4 h-4" /> VERIFIED RESALE</div>
                <div className="flex items-center gap-2 bg-blue-50 px-5 py-2.5 rounded-full border border-blue-200 text-[#026cdf] text-[11px] font-black shadow-sm"><ShieldCheck className="w-4 h-4" /> SECURE ACCESS</div>
              </div>
              
              <div className="space-y-4 mb-16">
                <h2 className="text-5xl md:text-7xl font-black tracking-tighter uppercase italic text-gray-900 leading-none">{event?.artist}</h2>
                <p className="text-gray-400 font-black uppercase tracking-[0.3em] text-sm">{event?.venue} • {event?.date}</p>
              </div>
              
              <div 
                onClick={() => setViewState('zoomed')} 
                className="w-full max-w-2xl mx-auto aspect-video bg-gradient-to-br from-blue-50 to-blue-100/50 border-4 border-dashed border-[#026cdf] rounded-[70px] flex flex-col items-center justify-center cursor-pointer hover:scale-[1.02] transition-all shadow-inner relative group"
              >
                <div className="absolute top-0 w-64 h-10 bg-black rounded-b-[30px] shadow-2xl font-black text-[11px] text-white flex items-center justify-center tracking-[0.6em] border-b-4 border-black/40">STAGE</div>
                
                <div className="bg-white px-12 py-8 rounded-[45px] shadow-[0_30px_70px_rgba(0,0,0,0.12)] border-2 border-blue-50 flex flex-col items-center group-hover:shadow-blue-500/30 transition-all duration-500">
                   <span className="font-black text-[#026cdf] text-4xl tracking-tighter italic">FLOOR SEATS</span>
                   <span className="text-[11px] font-black text-gray-400 mt-3 uppercase tracking-[0.4em]">Tap to zoom into section</span>
                </div>

                <div className="absolute bottom-6 flex gap-2 animate-bounce">
                   <div className="w-2 h-2 bg-[#026cdf] rounded-full" />
                   <div className="w-2 h-2 bg-[#026cdf]/50 rounded-full" />
                   <div className="w-2 h-2 bg-[#026cdf]/20 rounded-full" />
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-fadeIn">
              <button 
                onClick={() => setViewState('overview')} 
                className="mb-10 text-[#026cdf] font-black text-[11px] flex items-center gap-3 bg-white px-8 py-4 rounded-full shadow-2xl uppercase tracking-[0.3em] border-2 border-gray-50 hover:scale-105 active:scale-95 transition-all"
              >
                <ChevronLeft className="w-5 h-5" /> Back to Stadium
              </button>
              {renderFloor()}
            </div>
          )}
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="h-32 bg-white/95 backdrop-blur-xl border-t-2 border-gray-50 p-8 fixed bottom-0 w-full shadow-[0_-30px_80px_rgba(0,0,0,0.2)] flex items-center justify-between z-[50]">
        <div className="space-y-1">
          <p className="text-[12px] text-gray-400 font-black uppercase tracking-[0.3em] leading-none">{cart.length} Seats Locked in Cart</p>
          <p className="text-5xl font-black text-gray-900 tracking-tighter leading-none">${totalPrice.toFixed(2)}</p>
          <div className="flex gap-2 items-center mt-2">
             <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
             <p className="text-[10px] text-green-600 font-black uppercase tracking-widest">Holding for 4:59</p>
          </div>
        </div>
        <button 
          onClick={onCheckout} 
          disabled={cart.length === 0} 
          className={`px-20 py-6 rounded-[35px] font-black text-white shadow-[0_20px_50px_rgba(2,108,223,0.4)] transition-all uppercase tracking-[0.2em] text-xl italic ${cart.length > 0 ? 'bg-[#026cdf] hover:bg-blue-700 hover:scale-[1.05] active:scale-95' : 'bg-gray-200 cursor-not-allowed opacity-50'}`}
        >
          Checkout
        </button>
      </div>
    </div>
  );
}

