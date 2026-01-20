import React, { useState } from 'react';
import { ChevronLeft, CheckCircle, Info } from 'lucide-react';

export default function SeatMap({ event, cart, setCart, globalPrice, onCheckout }) {
  const [viewState, setViewState] = useState('overview');
  const [clickAttempts, setClickAttempts] = useState(0); 
  const [fakeSoldSeats, setFakeSoldSeats] = useState([]);

  const handleSeatClick = (seatData) => {
    if (fakeSoldSeats.includes(seatData.id)) return;

    if (clickAttempts < 3) {
       setFakeSoldSeats([...fakeSoldSeats, seatData.id]);
       setClickAttempts(prev => prev + 1);
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

  const totalPrice = cart.reduce((acc, item) => acc + item.price, 0);

  const renderFloor = () => {
    let rows = [];
    for (let r = 1; r <= 8; r++) {
      let seats = [];
      for (let c = 1; c <= 12; c++) {
        const id = `s-${r}-${c}`;
        const isSelected = cart.find(s => s.id === id);
        const isSold = fakeSoldSeats.includes(id) || (r + c) % 5 === 0;
        
        seats.push(
          <div 
            key={id}
            onClick={() => !isSold && handleSeatClick({ id, section: 'Floor', price: globalPrice })}
            className={`w-7 h-7 md:w-8 md:h-8 rounded-full cursor-pointer flex items-center justify-center text-[8px] transition-all border
              ${isSelected ? 'bg-green-600 border-green-700 text-white scale-110' : 
                isSold ? 'bg-gray-200 border-gray-200 cursor-not-allowed opacity-40' : 
                'bg-[#026cdf] border-[#026cdf] hover:scale-105'}
            `}
          >
            {isSelected && <CheckCircle className="w-4 h-4" />}
          </div>
        );
      }
      rows.push(<div key={r} className="flex gap-2 justify-center">{seats}</div>);
    }
    return (
      <div className="bg-white p-6 rounded-2xl shadow-xl space-y-3 animate-slideUp overflow-x-auto min-w-full">
        <div className="bg-gray-800 text-white text-center py-2 font-bold tracking-widest text-xs mb-8 rounded">STAGE</div>
        <div className="space-y-2">{rows}</div>
      </div>
    );
  };

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-gray-50 relative overflow-hidden">
      <div className="bg-[#ea0042] text-white text-[10px] py-1 text-center font-bold tracking-wide">
         DEMAND IS HIGH: Ticket availability is extremely limited
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-32">
        <div className="max-w-4xl mx-auto space-y-6">
          {viewState === 'overview' ? (
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 text-center animate-slideUp">
              <h2 className="text-xl font-bold mb-1">{event?.artist}</h2>
              <p className="text-gray-500 text-sm mb-8">{event?.venue}</p>
              
              <div 
                onClick={() => setViewState('zoomed')} 
                className="w-full max-w-sm mx-auto aspect-video bg-blue-50 border-2 border-dashed border-[#026cdf] rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-blue-100 transition-colors"
              >
                <div className="w-20 h-4 bg-gray-300 rounded mb-8">STAGE</div>
                <span className="font-bold text-[#026cdf]">FLOOR SEATING</span>
                <span className="text-xs text-gray-400 mt-2">Tap to zoom in</span>
              </div>
            </div>
          ) : (
            <div>
              <button onClick={() => setViewState('overview')} className="mb-4 text-[#026cdf] font-bold text-sm flex items-center gap-1">
                <ChevronLeft className="w-4 h-4" /> Back to Stadium
              </button>
              {renderFloor()}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border-t p-6 fixed bottom-0 w-full shadow-[0_-4px_10px_rgba(0,0,0,0.05)] flex items-center justify-between z-20">
        <div>
          <p className="text-xs text-gray-400 font-bold uppercase">{cart.length} Tickets</p>
          <p className="text-2xl font-black">${totalPrice.toFixed(2)}</p>
        </div>
        <button 
          onClick={onCheckout}
          disabled={cart.length === 0}
          className={`px-12 py-4 rounded-xl font-bold text-white shadow-xl transition-all ${cart.length > 0 ? 'bg-[#026cdf] hover:bg-blue-700' : 'bg-gray-300'}`}
        >
          Next
        </button>
      </div>
    </div>
  );
}

