import React, { useState } from 'react';
import { ChevronLeft, Info, ShoppingCart } from 'lucide-react';

export default function SeatMap({ event, globalPrice, cart, setCart, onCheckout }) {
  const [view, setView] = useState('stadium'); // 'stadium' or 'section'
  const [selectedSection, setSelectedSection] = useState(null);

  // Define Sections: Floor, Lower Bowl, Upper Bowl
  const sections = [
    { id: 'floor', name: 'Floor A', color: 'bg-blue-600', price: globalPrice * 2 },
    { id: '101', name: 'Sec 101', color: 'bg-indigo-500', price: globalPrice * 1.5 },
    { id: '102', name: 'Sec 102', color: 'bg-indigo-500', price: globalPrice * 1.5 },
    { id: '103', name: 'Sec 103', color: 'bg-indigo-500', price: globalPrice * 1.5 },
    { id: '201', name: 'Sec 201', color: 'bg-purple-500', price: globalPrice },
    { id: '202', name: 'Sec 202', color: 'bg-purple-500', price: globalPrice },
    { id: '203', name: 'Sec 203', color: 'bg-purple-500', price: globalPrice },
  ];

  const addToCart = (seatLabel, price) => {
    setCart([...cart, { id: Date.now(), label: seatLabel, price }]);
  };

  return (
    <div className="animate-fadeIn pb-20">
      {/* Top Bar Info */}
      <div className="flex items-center justify-between mb-8">
        <div>
           <h2 className="text-2xl lg:text-4xl font-black italic uppercase tracking-tighter text-white">Select Seats</h2>
           <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{event?.venue}</p>
        </div>
        <div className="bg-[#026cdf] px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
           <ShoppingCart className="w-4 h-4 text-white" />
           <span className="font-black text-white">{cart.length}</span>
        </div>
      </div>

      {/* --- STADIUM VIEW (LEVEL 1) --- */}
      {view === 'stadium' && (
        <div className="relative w-full max-w-3xl mx-auto aspect-square bg-[#1f262d] rounded-full border-4 border-white/5 shadow-2xl p-8 flex flex-col items-center justify-center overflow-hidden">
           
           {/* STAGE */}
           <div className="absolute top-10 w-1/2 h-24 bg-gray-800 rounded-lg flex items-center justify-center border-b-4 border-[#ea0042] shadow-[0_0_50px_rgba(234,0,66,0.3)]">
              <span className="text-gray-500 font-black uppercase tracking-[0.5em] text-xs">Stage</span>
           </div>

           {/* FLOOR */}
           <button 
             onClick={() => { setView('section'); setSelectedSection(sections[0]); }}
             className="mt-20 w-1/2 h-1/3 bg-blue-900/40 border-2 border-blue-500/50 rounded-xl hover:bg-blue-600 hover:scale-105 transition-all flex items-center justify-center group"
           >
              <span className="font-black text-blue-300 uppercase tracking-widest group-hover:text-white">Floor A</span>
           </button>

           {/* LOWER BOWL (Semi-Circle) */}
           <div className="absolute inset-x-8 bottom-32 flex justify-between gap-4">
              <button onClick={() => { setView('section'); setSelectedSection(sections[1]); }} className="flex-1 h-20 bg-indigo-900/40 border-2 border-indigo-500/50 rounded-lg hover:bg-indigo-600 transition-all flex items-center justify-center"><span className="text-[10px] font-bold text-indigo-300">101</span></button>
              <button onClick={() => { setView('section'); setSelectedSection(sections[2]); }} className="flex-1 h-20 bg-indigo-900/40 border-2 border-indigo-500/50 rounded-lg hover:bg-indigo-600 transition-all flex items-center justify-center"><span className="text-[10px] font-bold text-indigo-300">102</span></button>
              <button onClick={() => { setView('section'); setSelectedSection(sections[3]); }} className="flex-1 h-20 bg-indigo-900/40 border-2 border-indigo-500/50 rounded-lg hover:bg-indigo-600 transition-all flex items-center justify-center"><span className="text-[10px] font-bold text-indigo-300">103</span></button>
           </div>

           {/* UPPER BOWL */}
           <div className="absolute inset-x-4 bottom-8 flex justify-between gap-2">
              <button onClick={() => { setView('section'); setSelectedSection(sections[4]); }} className="flex-1 h-16 bg-purple-900/40 border-2 border-purple-500/50 rounded-lg hover:bg-purple-600 transition-all flex items-center justify-center"><span className="text-[10px] font-bold text-purple-300">201</span></button>
              <button onClick={() => { setView('section'); setSelectedSection(sections[5]); }} className="flex-1 h-16 bg-purple-900/40 border-2 border-purple-500/50 rounded-lg hover:bg-purple-600 transition-all flex items-center justify-center"><span className="text-[10px] font-bold text-purple-300">202</span></button>
              <button onClick={() => { setView('section'); setSelectedSection(sections[6]); }} className="flex-1 h-16 bg-purple-900/40 border-2 border-purple-500/50 rounded-lg hover:bg-purple-600 transition-all flex items-center justify-center"><span className="text-[10px] font-bold text-purple-300">203</span></button>
           </div>
           
           <p className="absolute bottom-4 text-[9px] text-gray-500 font-bold uppercase tracking-widest">Tap a section to zoom</p>
        </div>
      )}

      {/* --- ZOOMED SECTION VIEW (LEVEL 2) --- */}
      {view === 'section' && selectedSection && (
        <div className="animate-slideUp">
           <button onClick={() => setView('stadium')} className="mb-6 flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-white transition-colors">
              <ChevronLeft className="w-4 h-4" /> Back to Stadium
           </button>
           
           <div className="bg-white text-gray-900 rounded-[40px] p-6 lg:p-10 shadow-2xl">
              <div className="flex justify-between items-end mb-8 border-b border-gray-100 pb-4">
                 <div>
                    <h3 className="text-3xl font-black italic uppercase tracking-tighter">{selectedSection.name}</h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Standard Admission</p>
                 </div>
                 <div className="text-right">
                    <p className="text-3xl font-black text-[#026cdf]">${selectedSection.price}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Per Ticket</p>
                 </div>
              </div>

              {/* SEAT GRID (Scrollable on Mobile) */}
              <div className="overflow-x-auto pb-4">
                 <div className="min-w-[500px] grid grid-cols-10 gap-3 justify-center">
                    {[...Array(60)].map((_, i) => {
                       const row = String.fromCharCode(65 + Math.floor(i / 10)); // Row A, B, C...
                       const num = (i % 10) + 1;
                       const label = `${selectedSection.name} • Row ${row}-${num}`;
                       const isSelected = cart.find(c => c.label === label);
                       
                       return (
                          <button 
                            key={i} 
                            disabled={isSelected}
                            onClick={() => addToCart(label, selectedSection.price)}
                            className={`
                              w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-black transition-all border-2
                              ${isSelected 
                                ? 'bg-gray-300 border-gray-300 text-gray-500 cursor-not-allowed' 
                                : 'bg-white border-[#026cdf] text-[#026cdf] hover:bg-[#026cdf] hover:text-white hover:scale-110 shadow-sm'}
                            `}
                          >
                             {row}{num}
                          </button>
                       )
                    })}
                 </div>
              </div>

              <div className="mt-8 bg-gray-50 p-6 rounded-2xl flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <Info className="w-5 h-5 text-gray-400" />
                    <p className="text-xs font-bold text-gray-500">Zoom/Pan enabled for precision selection.</p>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* --- CHECKOUT BAR (Visible when cart has items) --- */}
      {cart.length > 0 && (
         <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 p-6 z-50 animate-slideUp">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
               <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Total</p>
                  <p className="text-3xl font-black text-gray-900">${cart.reduce((a,b) => a + b.price, 0)}</p>
               </div>
               <button onClick={onCheckout} className="bg-[#026cdf] text-white px-10 py-4 rounded-full font-black uppercase italic tracking-widest shadow-[0_10px_30px_rgba(2,108,223,0.4)] hover:scale-105 active:scale-95 transition-all">
                  Proceed to Pay
               </button>
            </div>
         </div>
      )}
    </div>
  );
}

