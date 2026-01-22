import React, { useState } from 'react';
import { ChevronLeft, CreditCard, Lock, Calendar, Ticket, Wallet, Gift, AlertOctagon } from 'lucide-react';

export default function Checkout({ cart, onBack, onSuccess }) {
    const [paymentMethod, setPaymentMethod] = useState('card'); 
    const [card, setCard] = useState('');
    const [cvv, setCvv] = useState('');
    const [date, setDate] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const pay = () => {
        setError('');
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            onSuccess();
        }, 2000);
    }

    return (
        <div className="min-h-screen bg-[#0a0e14] text-white flex items-center justify-center p-4 animate-slideUp">
            <div className="w-full max-w-lg bg-[#1f262d] rounded-[40px] p-8 lg:p-10 border border-white/10 shadow-2xl relative overflow-hidden">
                <div className="flex items-center gap-4 mb-8 relative z-10">
                     <button onClick={onBack} className="p-2 rounded-full hover:bg-white/10 transition-colors"><ChevronLeft className="w-6 h-6" /></button>
                     <div><h2 className="text-2xl font-black uppercase italic tracking-tighter">Secure Checkout</h2><div className="flex items-center gap-1 text-[10px] text-green-400 font-bold uppercase tracking-widest mt-1"><Lock className="w-3 h-3" /> 256-Bit SSL Encrypted</div></div>
                </div>
                <div className="mb-8 bg-black/20 p-6 rounded-2xl border border-white/5 space-y-4">
                    <div className="flex justify-between items-center border-b border-white/10 pb-4"><span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Order Total</span><span className="text-4xl font-black text-[#026cdf]">${cart.reduce((a,b)=>a+b.price, 0).toFixed(2)}</span></div>
                    <div className="flex items-center gap-3 text-gray-300"><Ticket className="w-5 h-5 text-gray-500" /><span className="text-sm font-bold">{cart.length} Tickets Selected</span></div>
                    {cart.map((item, i) => (<div key={i} className="text-[10px] text-gray-500 font-mono uppercase pl-8">{item.label || item.name}</div>))}
                </div>
                <div className="flex gap-2 mb-6">
                    <button onClick={()=>setPaymentMethod('card')} className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2 border transition-all ${paymentMethod==='card'?'bg-[#026cdf] border-[#026cdf] text-white':'bg-transparent border-white/10 text-gray-500 hover:text-white'}`}><CreditCard className="w-4 h-4" /> Card</button>
                    <button onClick={()=>setPaymentMethod('paypal')} className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2 border transition-all ${paymentMethod==='paypal'?'bg-[#003087] border-[#003087] text-white':'bg-transparent border-white/10 text-gray-500 hover:text-white'}`}><Wallet className="w-4 h-4" /> PayPal</button>
                    <button onClick={()=>setPaymentMethod('gift')} className={`flex-1 py-3 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2 border transition-all ${paymentMethod==='gift'?'bg-[#ea0042] border-[#ea0042] text-white':'bg-transparent border-white/10 text-gray-500 hover:text-white'}`}><Gift className="w-4 h-4" /> Gift</button>
                </div>
                <div className="space-y-4 relative z-10">
                    {paymentMethod === 'card' && (
                        <>
                            <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Card Number</label><div className="bg-[#0f131a] p-4 rounded-2xl border border-white/10 flex items-center gap-4 group focus-within:border-[#026cdf] transition-colors shadow-inner"><CreditCard className="text-gray-500 group-focus-within:text-[#026cdf]" /><input className="bg-transparent font-bold text-lg outline-none w-full placeholder:text-gray-700" placeholder="0000 0000 0000 0000" value={card} onChange={e=>setCard(e.target.value)} maxLength={19} /></div></div>
                            <div className="flex gap-4"><div className="space-y-2 flex-1"><label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Expiry</label><div className="bg-[#0f131a] p-4 rounded-2xl border border-white/10 flex items-center gap-3 group focus-within:border-[#026cdf] transition-colors shadow-inner"><Calendar className="w-5 h-5 text-gray-500 group-focus-within:text-[#026cdf]" /><input className="bg-transparent font-bold text-lg outline-none w-full placeholder:text-gray-700" placeholder="MM/YY" value={date} onChange={e=>setDate(e.target.value)} maxLength={5} /></div></div><div className="space-y-2 flex-1"><label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">CVC</label><div className="bg-[#0f131a] p-4 rounded-2xl border border-white/10 flex items-center gap-3 group focus-within:border-[#026cdf] transition-colors shadow-inner"><Lock className="w-5 h-5 text-gray-500 group-focus-within:text-[#026cdf]" /><input type="password" className="bg-transparent font-bold text-lg outline-none w-full placeholder:text-gray-700" placeholder="123" value={cvv} onChange={e=>setCvv(e.target.value)} maxLength={4} /></div></div></div>
                        </>
                    )}
                    {paymentMethod === 'paypal' && <div className="bg-[#0f131a] p-8 rounded-2xl border border-white/10 text-center space-y-4"><Wallet className="w-12 h-12 text-[#003087] mx-auto" /><p className="text-sm font-bold text-gray-400">You will be redirected to PayPal to complete your purchase securely.</p></div>}
                    {paymentMethod === 'gift' && <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-4">Gift Card Code</label><div className="bg-[#0f131a] p-4 rounded-2xl border border-white/10 flex items-center gap-4 group focus-within:border-[#ea0042] transition-colors shadow-inner"><Gift className="text-gray-500 group-focus-within:text-[#ea0042]" /><input className="bg-transparent font-bold text-lg outline-none w-full placeholder:text-gray-700" placeholder="XXXX-XXXX-XXXX" /></div></div>}
                    {error && <div className="bg-red-500/10 border border-red-500/50 p-3 rounded-xl flex items-center gap-2 text-red-500 text-xs font-bold uppercase tracking-widest animate-shake"><AlertOctagon className="w-4 h-4" /> {error}</div>}
                    <button onClick={pay} disabled={loading} className="w-full bg-[#026cdf] text-white py-5 rounded-full font-black uppercase tracking-widest text-lg shadow-[0_10px_40px_rgba(2,108,223,0.4)] hover:bg-white hover:text-[#026cdf] transition-all active:scale-95 mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3">{loading ? 'Processing...' : 'Pay Now'}</button>
                </div>
            </div>
        </div>
    )
}


