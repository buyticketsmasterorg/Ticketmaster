import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, MessageSquare, Send, Bell, UserPlus, Settings, Calendar, ChevronLeft, Check, Ban, Trash2, Moon, Sun, MoreVertical, X, DollarSign, Users } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, updateDoc, doc, onSnapshot, query, orderBy, addDoc, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const appId = import.meta.env.VITE_APP_ID || 'default-app-id';

export default function AdminApp() {
  const [view, setView] = useState('dashboard'); // dashboard, chats, chat_detail, events, prices
  const [allSessions, setAllSessions] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null); 
  const [adminMsg, setAdminMsg] = useState('');
  const [adminAlert, setAdminAlert] = useState('');
  const [globalSettings, setGlobalSettings] = useState({ regularPrice: 150, vipPrice: 450 });
  const [newEvent, setNewEvent] = useState({ artist: '', venue: '', date: '', image: '', badge: '', timer: '' });
  const [eventsList, setEventsList] = useState([]);
  const [darkMode, setDarkMode] = useState(true);

  // --- SYNC ---
  useEffect(() => {
    // 1. Sessions (Simple Query)
    const unsubSessions = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'sessions'), (snap) => {
        const users = snap.docs.map(d => ({id: d.id, ...d.data()}));
        users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setAllSessions(users);
    });

    const unsubSettings = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'global_settings'), (snap) => {
        if(snap.exists()) setGlobalSettings(snap.data());
    });

    const unsubEvents = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'events'), (snap) => {
        setEventsList(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });

    return () => { unsubSessions(); unsubSettings(); unsubEvents(); };
  }, []);

  // --- ACTIONS ---
  const updateSessionStatus = async (sid, status) => {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', sid), { accessGranted: status, status: status === 'allowed' ? 'in_queue' : 'blocked' });
  };
  const updateGlobalPrice = async (type, val) => {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'global_settings'), { [type]: Number(val) });
  };
  const sendAdminMessage = async () => {
      if(!selectedUser || !adminMsg.trim()) return;
      const newHistory = [...(selectedUser.chatHistory || []), { sender: 'system', text: adminMsg, timestamp: new Date().toISOString() }];
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', selectedUser.id), { chatHistory: newHistory });
      setAdminMsg('');
  };
  const sendAdminPing = async () => {
      if(!selectedUser || !adminAlert.trim()) return;
      const newNotifs = [...(selectedUser.notifications || []), { text: adminAlert, timestamp: new Date().toISOString() }];
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', selectedUser.id), { notifications: newNotifs });
      setAdminAlert('');
      alert("Alert Sent!");
  };
  const createEvent = async () => {
      if(!newEvent.artist) return;
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'events'), newEvent);
      setNewEvent({ artist: '', venue: '', date: '', image: '', badge: '', timer: '' });
      alert("Event Published!");
  };
  const deleteEvent = async (eid) => { if(confirm("Delete this event?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', eid)); };
  const deleteSession = async (sid) => {
      if(confirm('Delete user session permanently?')) {
          setSelectedUser(null); setView('chats');
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', sid));
      }
  };

  const waitingUsers = allSessions.filter(s => s.status === 'waiting_approval');
  const activeUsers = allSessions.filter(s => s.status !== 'waiting_approval');
  const getAvatar = (name) => name ? name.charAt(0).toUpperCase() : '?';

  // --- RENDER ---
  return (
    <div className={`min-h-screen font-sans ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
        
        {/* --- VIEW: DASHBOARD (MENU) --- */}
        {view === 'dashboard' && (
            <div className="p-6 max-w-lg mx-auto">
                <div className="flex justify-between items-center mb-10">
                    <h1 className="text-3xl font-black uppercase italic tracking-tighter">War Room</h1>
                    <button onClick={() => setDarkMode(!darkMode)} className="p-3 rounded-full bg-white/10">{darkMode ? <Sun /> : <Moon />}</button>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    {/* CHATS BUTTON */}
                    <button onClick={() => setView('chats')} className={`p-6 rounded-3xl flex flex-col items-center justify-center gap-4 aspect-square shadow-xl transition-all active:scale-95 ${darkMode ? 'bg-blue-600 text-white' : 'bg-white text-blue-600'}`}>
                        <MessageSquare className="w-12 h-12" />
                        <span className="font-black uppercase tracking-widest text-sm">Chats</span>
                        <div className="flex gap-2">
                             <span className="bg-black/20 text-white text-xs px-2 py-1 rounded-lg font-bold">{allSessions.length} Total</span>
                             {waitingUsers.length > 0 && <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-lg font-bold">{waitingUsers.length} Wait</span>}
                        </div>
                    </button>

                    {/* EVENTS BUTTON */}
                    <button onClick={() => setView('events')} className={`p-6 rounded-3xl flex flex-col items-center justify-center gap-4 aspect-square shadow-xl transition-all active:scale-95 ${darkMode ? 'bg-purple-600 text-white' : 'bg-white text-purple-600'}`}>
                        <Calendar className="w-12 h-12" />
                        <span className="font-black uppercase tracking-widest text-sm">Events</span>
                    </button>

                    {/* PRICING BUTTON */}
                    <button onClick={() => setView('prices')} className={`p-6 rounded-3xl flex flex-col items-center justify-center gap-4 aspect-square shadow-xl transition-all active:scale-95 ${darkMode ? 'bg-green-600 text-white' : 'bg-white text-green-600'}`}>
                        <DollarSign className="w-12 h-12" />
                        <span className="font-black uppercase tracking-widest text-sm">Pricing</span>
                    </button>
                    
                    {/* SETTINGS (Placeholder) */}
                    <button className={`p-6 rounded-3xl flex flex-col items-center justify-center gap-4 aspect-square shadow-xl opacity-50 cursor-not-allowed ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                        <Settings className="w-12 h-12" />
                        <span className="font-black uppercase tracking-widest text-sm">Settings</span>
                    </button>
                </div>
            </div>
        )}

        {/* --- VIEW: CHAT LIST --- */}
        {view === 'chats' && (
            <div className="p-4 max-w-lg mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => setView('dashboard')}><ChevronLeft className="w-8 h-8" /></button>
                    <h2 className="font-bold text-2xl">Inbox ({allSessions.length})</h2>
                </div>
                
                {/* WAITING USERS */}
                {waitingUsers.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-xs font-black uppercase tracking-widest opacity-50 mb-3">Gate Requests</h3>
                        <div className="space-y-2">
                            {waitingUsers.map(s => (
                                <div key={s.id} onClick={() => { setSelectedUser(s); setView('chat_detail'); }} className="flex items-center justify-between p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30 cursor-pointer">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center font-bold text-white">{getAvatar(s.name)}</div>
                                        <div><h4 className="font-bold text-sm">{s.name}</h4><p className="text-xs opacity-70">Waiting for approval...</p></div>
                                    </div>
                                    <ChevronLeft className="w-5 h-5 rotate-180 opacity-50" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ACTIVE USERS */}
                <div>
                    <h3 className="text-xs font-black uppercase tracking-widest opacity-50 mb-3">Active Users</h3>
                    <div className="space-y-2">
                        {activeUsers.length === 0 ? <p className="opacity-30 text-center py-10">No active users</p> : activeUsers.map(s => (
                            <div key={s.id} onClick={() => { setSelectedUser(s); setView('chat_detail'); }} className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 shadow-sm'}`}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center font-bold text-white">{getAvatar(s.name)}</div>
                                    <div><h4 className="font-bold text-sm">{s.name || 'Visitor'}</h4><p className="text-xs opacity-50">{s.email}</p></div>
                                </div>
                                <ChevronLeft className="w-5 h-5 rotate-180 opacity-50" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* --- VIEW: CHAT DETAIL --- */}
        {view === 'chat_detail' && selectedUser && (
            <div className="flex flex-col h-screen max-w-lg mx-auto bg-black">
                {/* Header */}
                <div className={`p-4 border-b flex justify-between items-center ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center gap-3">
                        <button onClick={() => setView('chats')}><ChevronLeft className="w-6 h-6" /></button>
                        <div><h3 className="font-bold">{selectedUser.name}</h3><p className="text-xs opacity-50">{selectedUser.status}</p></div>
                    </div>
                    <button onClick={() => deleteSession(selectedUser.id)} className="text-red-500"><Trash2 className="w-5 h-5" /></button>
                </div>

                {/* Messages */}
                <div className={`flex-1 overflow-y-auto p-4 space-y-3 ${darkMode ? 'bg-black' : 'bg-gray-50'}`}>
                     {selectedUser.status === 'waiting_approval' && (
                         <div className="bg-orange-900/30 p-4 rounded-xl text-center border border-orange-500/30 mb-6">
                             <p className="text-orange-400 font-bold text-xs mb-3">User is at the Gate</p>
                             <div className="flex justify-center gap-3">
                                 <button onClick={() => updateSessionStatus(selectedUser.id, 'allowed')} className="bg-green-600 px-6 py-2 rounded-full font-bold text-xs uppercase">Approve</button>
                                 <button onClick={() => updateSessionStatus(selectedUser.id, 'denied')} className="bg-red-600 px-6 py-2 rounded-full font-bold text-xs uppercase">Deny</button>
                             </div>
                         </div>
                     )}
                    {(selectedUser.chatHistory || []).map((m, i) => (
                        <div key={i} className={`flex ${m.sender==='system'?'justify-end':'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${m.sender==='system'?'bg-blue-600 text-white': 'bg-gray-700 text-gray-200'}`}>{m.text}</div>
                        </div>
                    ))}
                </div>

                {/* Input */}
                <div className={`p-3 border-t ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
                    <div className="flex gap-2 mb-3">
                        <input className="flex-1 bg-white/10 rounded-full px-4 py-3 text-sm outline-none" placeholder="Reply..." value={adminMsg} onChange={e => setAdminMsg(e.target.value)} />
                        <button onClick={sendAdminMessage} className="bg-blue-600 p-3 rounded-full"><Send className="w-4 h-4" /></button>
                    </div>
                    <div className="flex gap-2">
                        <input className="flex-1 bg-red-900/20 rounded-full px-4 py-2 text-xs outline-none text-red-400 border border-red-900/50" placeholder="Send Alert..." value={adminAlert} onChange={e => setAdminAlert(e.target.value)} />
                        <button onClick={sendAdminPing} className="p-2 bg-red-600 rounded-full"><Bell className="w-4 h-4" /></button>
                    </div>
                </div>
            </div>
        )}

        {/* --- VIEW: EVENTS --- */}
        {view === 'events' && (
            <div className="p-4 max-w-lg mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => setView('dashboard')}><ChevronLeft className="w-6 h-6" /></button>
                    <h2 className="font-bold text-xl">Events Manager</h2>
                </div>
                <div className="space-y-4">
                    <input placeholder="Artist" className="w-full bg-white/10 p-4 rounded-xl outline-none" value={newEvent.artist} onChange={e=>setNewEvent({...newEvent, artist: e.target.value})} />
                    <div className="flex gap-2">
                         <input placeholder="Venue" className="flex-1 bg-white/10 p-4 rounded-xl outline-none" value={newEvent.venue} onChange={e=>setNewEvent({...newEvent, venue: e.target.value})} />
                         <input placeholder="Date" className="flex-1 bg-white/10 p-4 rounded-xl outline-none" value={newEvent.date} onChange={e=>setNewEvent({...newEvent, date: e.target.value})} />
                    </div>
                    <input placeholder="Image URL" className="w-full bg-white/10 p-4 rounded-xl outline-none" value={newEvent.image} onChange={e=>setNewEvent({...newEvent, image: e.target.value})} />
                    <div className="flex gap-2">
                        <input placeholder="Badge" className="flex-1 bg-white/10 p-4 rounded-xl outline-none" value={newEvent.badge} onChange={e=>setNewEvent({...newEvent, badge: e.target.value})} />
                        <input placeholder="Timer" className="flex-1 bg-white/10 p-4 rounded-xl outline-none" value={newEvent.timer} onChange={e=>setNewEvent({...newEvent, timer: e.target.value})} />
                    </div>
                    <button onClick={createEvent} className="w-full bg-purple-600 text-white py-4 rounded-xl font-bold uppercase">Publish</button>
                    
                    <div className="mt-8 space-y-4">
                        {eventsList.map(ev => (
                            <div key={ev.id} className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/10">
                                <div><h4 className="font-bold">{ev.artist}</h4><p className="text-xs text-gray-400">{ev.date}</p></div>
                                <button onClick={() => deleteEvent(ev.id)} className="text-red-500"><Trash2 className="w-5 h-5" /></button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* --- VIEW: PRICES --- */}
        {view === 'prices' && (
            <div className="p-4 max-w-lg mx-auto">
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => setView('dashboard')}><ChevronLeft className="w-6 h-6" /></button>
                    <h2 className="font-bold text-xl">Pricing Control</h2>
                </div>
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-blue-400">Regular Seat Price</label>
                        <input type="number" className="w-full bg-white/10 p-4 rounded-xl text-2xl font-mono" value={globalSettings.regularPrice} onChange={e => setGlobalSettings({...globalSettings, regularPrice: e.target.value})} />
                        <button onClick={() => updateGlobalPrice('regularPrice', globalSettings.regularPrice)} className="w-full bg-blue-600 py-3 rounded-xl font-bold uppercase">Update Regular</button>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-pink-500">VIP Seat Price</label>
                        <input type="number" className="w-full bg-white/10 p-4 rounded-xl text-2xl font-mono" value={globalSettings.vipPrice} onChange={e => setGlobalSettings({...globalSettings, vipPrice: e.target.value})} />
                        <button onClick={() => updateGlobalPrice('vipPrice', globalSettings.vipPrice)} className="w-full bg-pink-600 py-3 rounded-xl font-bold uppercase">Update VIP</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}


