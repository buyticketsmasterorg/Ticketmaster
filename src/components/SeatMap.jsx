import React, { useState, useEffect } from 'react';
import { ChevronLeft, CheckCircle, Info, Lock, ShieldCheck, Star } from 'lucide-react';

export default function SeatMap({ event, presaleCode, cart, setCart, globalPrice, onCheckout }) {
  const [viewState, setViewState] = useState('overview');
  const [isLocked, setIsLocked] = useState(event?.status === 'presale');
  const [enteredCode, setEnteredCode] = useState('');
  const [clickAttempts, setClickAttempts] = useState(0); 
  const [fakeSoldSeats, setFakeSoldSeats] = useState([]);
  const [toast, setToast] = useState(null);

  // PHANTOM TAKER LOGIC: Randomly sell seats to create pressure
  useEffect(() => {
    if (isLocked) return;
    const interval = setInterval(() => {
       const randomRow = Math.floor(Math.random() * 8) + 1;
       const randomCol = Math.floor(Math.random() * 12) + 1;
       const seatId = `s-${randomRow}-${randomCol}`;
       setFakeSoldSeats(prev => [...new Set([...prev, seatId])]);
    }, 4500);
    return () => clearInterval(interval);
  }, [isLocked]);

  const handleSeatClick = (seatData) => {
    if (fakeSoldSeats.includes(seatData.id)) return;

    // First 2 clicks always "failed" to simulate competition
    if (clickAttempts < 2) {
       setFakeSoldSeats(prev => [...prev, seatData.id]);
       setClickAttempts(prev => prev + 1);
       showToast("Sorry! Another fan beat you to these tickets.", "error");
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
      showToast("Verified! Access Granted.", "success");
    } else {
      showToast("Invalid Presale Code", "error");
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
        const isSold = fakeSoldSeats.includes(id) || (r + c) % 7 === 0;
        const isVIP = r === 1 || r === 2;
        const price = isVIP ? globalPrice * 3 : globalPrice;
        
        seats.push(
          <div 
            key={id}
            onClick={() => !isSold && handleSeatClick({ id, row: r, seat: c, section: 'Floor', price })}
            className={`w-8 h-8 md:w-10 md:h-10 rounded-full cursor-pointer flex items-center justify-center text-[9px] font-black transition-all border relative
              ${isSelected ? 'bg-green-500 border-green-600 text-white scale-110 shadow-lg' : 
                isSold ? 'bg-gray-200 border-gray-200 cursor-not-allowed opacity-30 text-transparent' : 
                isVIP ? 'bg-amber-400 border-amber-500 text-amber-900 shadow-md' : 'bg-[#026cdf] border-[#026cdf] text-white hover:scale-105'}
            `}
          >
            {isSelected ? <CheckCircle className="w-5 h-5" /> : !isSold && `${c}`}
          </div>
        );
      }
      rows.push(<div key={r} className="flex gap-2 justify-center">{seats}</div>);
    }
    return (
      <div className="bg-white p-8 rounded-[32px] shadow-2xl space-y-4 animate-slideUp overflow-x-auto min-w-full relative">
        <div className="bg-[#1f262d] text-white text-center py-6 font-black tracking-[1em] text-sm mb-12 rounded-xl shadow-inner border-b-4 border-black">STAGE</div>
        <div className="space-y-3">{rows}</div>
      </div>
    );
  };

  if (isLocked) return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 border text-center space-y-6 animate-slideUp">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto"><Lock className="text-[#026cdf]" /></div>
        <div><h2 className="text-2xl font-black">Presale Locked</h2><p className="text-gray-500 text-sm mt-2">Enter your code to unlock verified seats.</p></div>
        <input className="w-full border-2 p-4 rounded-xl text-center font-black tracking-[0.3em] uppercase text-xl focus:border-[#026cdf] outline-none" placeholder="CODE" value={enteredCode} onChange={e=>setEnteredCode(e.target.value.toUpperCase())} />
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">No code? Message support via chat</p>
        <button onClick={unlock} className="w-full bg-[#026cdf] text-white py-4 rounded-xl font-bold shadow-xl">Unlock Event</button>
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-[#f0f2f5] relative overflow-hidden">
      {toast && <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-[100] px-8 py-4 rounded-full shadow-2xl font-black flex items-center gap-2 animate-bounce ${toast.type === 'error' ? 'bg-[#ea0042] text-white' : 'bg-green-600 text-white'}`}><Info className="w-5 h-5" /> {toast.msg}</div>}
      <div className="bg-[#ea0042] text-white text-[10px] py-1 text-center font-black tracking-[0.2em] uppercase">Tickets are selling fast. Checkout now to secure your spots.</div>

      <div className="flex-1 overflow-y-auto p-4 md:p-12 pb-32">
        <div className="max-w-5xl mx-auto space-y-8">
          {viewState === 'overview' ? (
            <div className="bg-white p-12 rounded-[32px] shadow-xl border border-gray-100 text-center animate-slideUp">
              <div className="flex justify-center gap-4 mb-8">
                <div className="flex items-center gap-2 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 text-amber-600 text-[10px] font-black"><Star className="w-3 h-3 fill-current" /> VIP AVAILABLE</div>
                <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 text-[#026cdf] text-[10px] font-black"><ShieldCheck className="w-3 h-3" /> VERIFIED FAN</div>
              </div>
              <h2 className="text-3xl font-black mb-1">{event?.artist}</h2>
              <p className="text-gray-500 font-bold mb-10">{event?.venue} • {event?.date}</p>
              
              <div onClick={() => setViewState('zoomed')} className="w-full max-w-lg mx-auto aspect-video bg-[#e0e7ff] border-4 border-dashed border-[#026cdf] rounded-[40px] flex flex-col items-center justify-center cursor-pointer hover:bg-blue-100 transition-all hover:scale-[1.02] shadow-inner">
                <div className="w-32 h-6 bg-[#1f262d] rounded-b-xl mb-12 shadow-lg font-black text-[8px] text-white flex items-center justify-center tracking-widest">STAGE</div>
                <div className="bg-white px-8 py-4 rounded-3xl shadow-2xl border border-blue-100 flex flex-col items-center">
                   <span className="font-black text-[#026cdf] text-xl">FLOOR SEATING</span>
                   <span className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">Click to Zoom</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="animate-fadeIn">
              <button onClick={() => setViewState('overview')} className="mb-6 text-[#026cdf] font-black text-xs flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-md uppercase tracking-widest">
                <ChevronLeft className="w-4 h-4" /> Exit Map
              </button>
              {renderFloor()}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border-t p-6 fixed bottom-0 w-full shadow-[0_-10px_30px_rgba(0,0,0,0.1)] flex items-center justify-between z-[50]">
        <div>
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{cart.length} Seats Locked</p>
          <p className="text-3xl font-black text-gray-900">${totalPrice.toFixed(2)}</p>
        </div>
        <button onClick={onCheckout} disabled={cart.length === 0} className={`px-16 py-5 rounded-2xl font-black text-white shadow-2xl transition-all uppercase tracking-widest text-lg ${cart.length > 0 ? 'bg-[#026cdf] hover:bg-blue-700' : 'bg-gray-200 cursor-not-allowed'}`}>Next</button>
      </div>
    </div>
  );
}

