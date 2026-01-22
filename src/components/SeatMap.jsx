import React, { useState, useEffect } from 'react';
import { ChevronLeft, Info, ShoppingCart, AlertTriangle, Monitor } from 'lucide-react';

export default function SeatMap({ event, globalPrice, cart, setCart, onCheckout }) {
  const [view, setView] = useState('stadium'); 
  const [selectedSection, setSelectedSection] = useState(null);
  
  const [panicState, setPanicState] = useState('idle');
  const [failCount, setFailCount] = useState(0);
  const [flashMsg, setFlashMsg] = useState('');

  const sections = [
    { id: 'floor-a', name: 'Floor A (VIP)', color: 'bg-[#026cdf]', price: globalPrice * 3, isVip: true, type: 'floor' },
    { id: 'floor-b', name: 'Floor B', color: 'bg-[#026cdf]', price: globalPrice * 2, type: 'floor' },
    { id: 'floor-c', name: 'Floor C', color: 'bg-[#026cdf]', price: globalPrice * 2, type: 'floor' },
    { id: '101', name: 'Sec 101', color: 'bg-[#374151]', price: globalPrice * 1.5, type: 'side-left' },
    { id: '102', name: 'Sec 102', color: 'bg-[#374151]', price: globalPrice * 1.5, type: 'side-left' },
    { id: '103', name: 'Sec 103', color: 'bg-[#374151]', price: globalPrice * 1.5, type: 'side-left' },
    { id: '104', name: 'Sec 104', color: 'bg-[#374151]', price: globalPrice * 1.5, type: 'side-right' },
    { id: '105', name: 'Sec 105', color: 'bg-[#374151]', price: globalPrice * 1.5, type: 'side-right' },
    { id: '106', name: 'Sec 106', color: 'bg-[#374151]', price: globalPrice * 1.5, type: 'side-right' },
    { id: '201', name: 'Sec 201', color: 'bg-[#4b5563]', price: globalPrice, type: 'back' },
    { id: '202', name: 'Sec 202', color: 'bg-[#4b5563]', price: globalPrice, type: 'back' },
  ];

  const handleSeatClick = (seatLabel, price) => {
    if (panicState !== 'idle') return;
    setPanicState('all-grey');
    setTimeout(() => {
        setPanicState('partial-grey'); 
        setTimeout(() => {
            setPanicState('all-grey');
            setTimeout(() => {
                setPanicState('idle');
                if (failCount < 5) {
                    setFailCount(prev => prev + 1);
                    setFlashMsg("Sorry! Another fan beat you to this seat.");
                    setTimeout(() => setFlashMsg(''), 2000);
                } else {
                    setCart([...cart, { id: Date.now(), label: seatLabel, price }]);
                }
            }, 1500);
        }, 800);
    }, 3000);
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
           <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-[#374151]" /> Standard</div>
           <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-gray-600" /> Sold</div>
        </div>
      </div>

      {view === 'stadium' && (
        <div className="max-w-4xl mx-auto space-y-4 py-10">
            <div className="w-full h-24 bg-black border-b-4 border-[#ea0042] rounded-b-3xl shadow-[0_10px_50px_rgba(234,0,66,0.1)] flex items-center justify-center mb-12"><span className="text-gray-600 font-black uppercase tracking-[0.5em] text-xs">Main Stage</span></div>
            <div className="flex justify-center gap-4 lg:gap-8">
                <div className="flex flex-col gap-2 w-20 lg:w-32 pt-10">{sections.filter(s=>s.type==='side-left').map(s => (<button key={s.id} onClick={()=>{setView('section'); setSelectedSection(s);}} className={`${s.color} h-24 rounded-lg border-2 border-white/5 hover:border-white hover:scale-105 transition-all shadow-lg flex items-center justify-center group`}><span className="text-[10px] font-bold text-gray-400 -rotate-90 group-hover:text-white">{s.name}</span></button>))}</div>
                <div className="flex-1 max-w-sm flex flex-col gap-2">
                    {sections.filter(s=>s.type==='floor').map(s => (<button key={s.id} onClick={()=>{setView('section'); setSelectedSection(s);}} className={`${s.color} h-32 rounded-lg border-2 border-white/5 hover:border-white hover:scale-105 transition-all shadow-lg flex items-center justify-center group`}><span className="text-xs font-black text-blue-200 uppercase tracking-widest group-hover:text-white">{s.name}</span></button>))}
                    <div className="flex gap-2 mt-4">{sections.filter(s=>s.type==='back').map(s => (<button key={s.id} onClick={()=>{setView('section'); setSelectedSection(s);}} className={`${s.color} h-16 flex-1 rounded-lg border-2 border-white/5 hover:border-white hover:scale-105 transition-all shadow-lg flex items-center justify-center group`}><span className="text-[10px] font-bold text-gray-400 group-hover:text-white">{s.name}</span></button>))}</div>
                </div>
                <div className="flex flex-col gap-2 w-20 lg:w-32 pt-10">{sections.filter(s=>s.type==='side-right').map(s => (<button key={s.id} onClick={()=>{setView('section'); setSelectedSection(s);}} className={`${s.color} h-24 rounded-lg border-2 border-white/5 hover:border-white hover:scale-105 transition-all shadow-lg flex items-center justify-center group`}><span className="text-[10px] font-bold text-gray-400 rotate-90 group-hover:text-white">{s.name}</span></button>))}</div>
            </div>
            <p className="text-center text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-8">Tap a section to view seats</p>
        </div>
      )}

      {view === 'section' && selectedSection && (
        <div className="animate-slideUp relative">
           <button onClick={() => setView('stadium')} className="mb-6 flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-white transition-colors"><ChevronLeft className="w-4 h-4" /> Return to Map</button>
           {flashMsg && <div className="absolute top-0 left-0 w-full z-50 bg-[#ea0042] text-white p-4 rounded-xl font-bold uppercase tracking-widest text-center animate-bounce shadow-2xl"><AlertTriangle className="w-5 h-5 inline-block mr-2" />{flashMsg}</div>}
           <div className="bg-white text-gray-900 rounded-[40px] p-6 lg:p-10 shadow-2xl relative overflow-hidden min-h-[500px]">
              <div className="flex justify-between items-end mb-8 border-b border-gray-100 pb-4 relative z-10"><div><h3 className={`text-3xl font-black italic uppercase tracking-tighter ${selectedSection.isVip ? 'text-pink-600' : 'text-gray-900'}`}>{selectedSection.name}</h3><p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Standard Admission</p></div><div className="text-right"><p className="text-3xl font-black text-[#026cdf]">${selectedSection.price}</p><p className="text-[10px] font-bold text-gray-400 uppercase">Per Ticket</p></div></div>
              <div className="overflow-x-auto pb-4 relative z-10"><div className="min-w-[300px] grid grid-cols-8 gap-2 sm:gap-3 justify-center">{[...Array(80)].map((_, i) => { const row = String.fromCharCode(65 + Math.floor(i / 8)); const num = (i % 8) + 1; const label = `${selectedSection.name} • Row ${row}-${num}`; const isSelected = cart.find(c => c.label === label); let isVisualGrey = false; if (panicState === 'all-grey') isVisualGrey = true; else if (panicState === 'partial-grey') { if (i % 3 !== 0) isVisualGrey = true; } return (<button key={i} disabled={isSelected || isVisualGrey} onClick={() => handleSeatClick(label, selectedSection.price)} className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-[9px] font-black transition-all border-2 ${isVisualGrey ? 'bg-gray-400 border-gray-400 text-transparent scale-90 cursor-not-allowed duration-300' : isSelected ? 'bg-black border-black text-white cursor-not-allowed' : 'bg-white border-[#026cdf] text-[#026cdf] hover:bg-[#026cdf] hover:text-white hover:scale-110 shadow-sm'}`}>{!isVisualGrey && num}</button>) })}</div></div>
           </div>
        </div>
      )}

      {cart.length > 0 && <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 p-6 z-50 animate-slideUp shadow-[0_-10px_40px_rgba(0,0,0,0.1)]"><div className="max-w-7xl mx-auto flex items-center justify-between"><div><p className="text-xs font-black text-gray-400 uppercase tracking-widest">Total</p><p className="text-3xl font-black text-gray-900">${cart.reduce((a,b) => a + b.price, 0)}</p></div><button onClick={onCheckout} className="bg-[#026cdf] text-white px-8 lg:px-12 py-4 rounded-full font-black uppercase italic tracking-widest shadow-[0_10px_30px_rgba(2,108,223,0.4)] hover:scale-105 active:scale-95 transition-all">Proceed to Pay</button></div></div>}
    </div>
  );
}


