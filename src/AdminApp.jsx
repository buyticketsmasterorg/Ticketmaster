import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, MessageSquare, Send, Bell, UserPlus, Settings, Calendar, ChevronLeft, Check, Ban, Trash2, Moon, Sun, MoreVertical, X } from 'lucide-react';
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
  const [adminTab, setAdminTab] = useState('chats'); // chats, events, settings
  const [allSessions, setAllSessions] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null); 
  const [adminMsg, setAdminMsg] = useState('');
  const [adminAlert, setAdminAlert] = useState('');
  const [globalSettings, setGlobalSettings] = useState({ regularPrice: 150, vipPrice: 450 });
  const [newEvent, setNewEvent] = useState({ artist: '', venue: '', date: '', image: '', badge: '', timer: '' });
  const [eventsList, setEventsList] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // --- SYNC DATA ---
  useEffect(() => {
    // 1. Sessions (Users)
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'sessions'), orderBy('createdAt', 'desc'));
    const unsubSessions = onSnapshot(q, (snap) => setAllSessions(snap.docs.map(d => ({id: d.id, ...d.data()}))));

    // 2. Settings (Price)
    const unsubSettings = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'global_settings'), (snap) => {
        if(snap.exists()) setGlobalSettings(snap.data());
    });

    // 3. Events
    const unsubEvents = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'events'), (snap) => {
        setEventsList(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });

    return () => { unsubSessions(); unsubSettings(); unsubEvents(); };
  }, []);

  // --- ACTIONS ---
  const updateSessionStatus = async (sid, status) => {
      // Updates DB status. UI updates automatically via snapshot.
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', sid), { 
          accessGranted: status, 
          status: status === 'allowed' ? 'in_queue' : 'blocked' 
      });
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
      // Sends to the Bell Icon on user side
      const newNotifs = [...(selectedUser.notifications || []), { text: adminAlert, timestamp: new Date().toISOString() }];
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', selectedUser.id), { notifications: newNotifs });
      setAdminAlert('');
      alert("Alert Sent to User Bell!");
  };

  const createEvent = async () => {
      if(!newEvent.artist) return;
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'events'), newEvent);
      setNewEvent({ artist: '', venue: '', date: '', image: '', badge: '', timer: '' });
      alert("Event Published!");
  };

  const deleteEvent = async (eid) => {
      if(confirm("Delete this event?")) {
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', eid));
      }
  };
  
  const deleteSession = async (sid) => {
      if(confirm('Delete user session permanently?')) {
          // Close chat FIRST to prevent crash
          setSelectedUser(null);
          // Then delete from DB
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'sessions', sid));
      }
  };

  // Filter Users
  const waitingUsers = allSessions.filter(s => s.status === 'waiting_approval');
  const activeUsers = allSessions.filter(s => s.status !== 'waiting_approval');

  return (
    <div className={`min-h-screen font-sans flex flex-col md:flex-row ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
        
        {/* SIDEBAR / MAIN LIST (Visible on mobile if no user selected) */}
        <div className={`w-full md:w-1/3 flex flex-col h-screen border-r ${darkMode ? 'border-gray-800' : 'border-gray-200'} ${selectedUser ? 'hidden md:flex' : 'flex'}`}>
            
            {/* Header */}
            <div className={`p-4 border-b flex justify-between items-center sticky top-0 z-10 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
                <div className="flex items-center gap-3">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/6/6c/Facebook_Messenger_logo_2018.svg" className="w-8 h-8" />
                    <h1 className="font-bold text-2xl tracking-tight">Chats</h1>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setDarkMode(!darkMode)} className={`p-2 rounded-full ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}>
                        {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>
                </div>
            </div>
            
            {/* CONTENT AREA */}
            <div className="flex-1 overflow-y-auto">
                {adminTab === 'chats' && (
                    <>
                        {/* STORIES ROW (Waiting Users) */}
                        {waitingUsers.length > 0 && (
                            <div className="py-4 pl-4 overflow-x-auto whitespace-nowrap scrollbar-hide border-b border-gray-100/10">
                                <div className="flex gap-4">
                                    {waitingUsers.map(s => (
                                        <div key={s.id} onClick={() => setSelectedUser(s)} className="flex flex-col items-center gap-1 cursor-pointer w-16 flex-shrink-0 group">
                                            <div className="w-14 h-14 rounded-full border-[3px] border-[#ea0042] p-[2px] group-hover:scale-105 transition-transform">
                                                <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500 text-lg overflow-hidden">
                                                    {s.name ? s.name[0].toUpperCase() : '?'}
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-medium truncate w-full text-center opacity-80">{s.name.split(' ')[0]}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* CHAT LIST (Active Users) */}
                        <div className="p-2 space-y-1">
                            {activeUsers.map(s => (
                                <div key={s.id} onClick={() => setSelectedUser(s)} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} ${selectedUser?.id === s.id ? (darkMode ? 'bg-gray-800' : 'bg-blue-50') : ''}`}>
                                    <div className="relative">
                                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500 text-lg">{s.name ? s.name[0].toUpperCase() : '?'}</div>
                                        {s.status === 'in_queue' && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline">
                                            <h4 className={`text-sm truncate ${s.hasUnread ? 'font-black' : 'font-semibold'}`}>{s.name}</h4>
                                            <span className="text-[10px] opacity-50">{new Date(s.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        </div>
                                        <p className="text-xs opacity-60 truncate">{s.email}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* EVENTS TAB */}
                {adminTab === 'events' && (
                    <div className="p-4 space-y-6">
                        <h3 className="font-black text-xs uppercase tracking-widest opacity-50 mb-4">Add New Event</h3>
                        <div className="space-y-3">
                            <input placeholder="Artist Name" className={`w-full p-4 rounded-xl text-sm font-bold outline-none ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`} value={newEvent.artist} onChange={e=>setNewEvent({...newEvent, artist: e.target.value})} />
                            <div className="flex gap-2">
                                 <input placeholder="Venue" className={`flex-1 p-4 rounded-xl text-sm outline-none ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`} value={newEvent.venue} onChange={e=>setNewEvent({...newEvent, venue: e.target.value})} />
                                 <input placeholder="Date" className={`flex-1 p-4 rounded-xl text-sm outline-none ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`} value={newEvent.date} onChange={e=>setNewEvent({...newEvent, date: e.target.value})} />
                            </div>
                            <input placeholder="Image URL (Right click > Copy Image Address)" className={`w-full p-4 rounded-xl text-sm outline-none ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`} value={newEvent.image} onChange={e=>setNewEvent({...newEvent, image: e.target.value})} />
                            <div className="flex gap-2">
                                <input placeholder="Badge (e.g. High Demand)" className={`flex-1 p-4 rounded-xl text-sm outline-none ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`} value={newEvent.badge} onChange={e=>setNewEvent({...newEvent, badge: e.target.value})} />
                                <input placeholder="Timer (e.g. 02:45:00)" className={`flex-1 p-4 rounded-xl text-sm outline-none ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`} value={newEvent.timer} onChange={e=>setNewEvent({...newEvent, timer: e.target.value})} />
                            </div>
                            <button onClick={createEvent} className="w-full bg-[#0084ff] text-white py-4 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-transform">Publish Event</button>
                        </div>
                        
                        <div className="mt-8 space-y-3">
                            <h4 className="font-black text-xs uppercase tracking-widest opacity-50">Active Events</h4>
                            {eventsList.map(ev => (
                                <div key={ev.id} className={`flex justify-between items-center p-4 rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 shadow-sm'}`}>
                                    <div className="flex items-center gap-3">
                                        <img src={ev.image} className="w-10 h-10 rounded-lg object-cover" />
                                        <div><p className="text-sm font-bold">{ev.artist}</p><p className="text-[10px] opacity-60">{ev.date}</p></div>
                                    </div>
                                    <button onClick={() => deleteEvent(ev.id)} className="text-red-500 p-2 hover:bg-red-500/10 rounded-full"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* SETTINGS TAB (PRICING) */}
                {adminTab === 'settings' && (
                     <div className="p-4 space-y-6">
                        <h3 className="font-black text-xs uppercase tracking-widest opacity-50 mb-4">Ticket Pricing</h3>
                        <div className={`p-6 rounded-2xl border space-y-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 shadow-lg'}`}>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase opacity-60">Regular Seat Price</label>
                                <div className="flex gap-2">
                                    <span className="p-3 bg-transparent text-xl font-black opacity-50">$</span>
                                    <input type="number" className={`w-full p-3 rounded-xl text-lg font-mono font-bold outline-none ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`} value={globalSettings.regularPrice} onChange={e => setGlobalSettings({...globalSettings, regularPrice: e.target.value})} />
                                </div>
                                <button onClick={() => updateGlobalPrice('regularPrice', globalSettings.regularPrice)} className="w-full bg-[#0084ff] text-white py-3 rounded-xl text-xs font-bold uppercase">Update Regular</button>
                            </div>
                        </div>
                        <div className={`p-6 rounded-2xl border space-y-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 shadow-lg'}`}>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-pink-500">VIP Seat Price</label>
                                <div className="flex gap-2">
                                    <span className="p-3 bg-transparent text-xl font-black opacity-50">$</span>
                                    <input type="number" className={`w-full p-3 rounded-xl text-lg font-mono font-bold outline-none ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`} value={globalSettings.vipPrice} onChange={e => setGlobalSettings({...globalSettings, vipPrice: e.target.value})} />
                                </div>
                                <button onClick={() => updateGlobalPrice('vipPrice', globalSettings.vipPrice)} className="w-full bg-pink-600 text-white py-3 rounded-xl text-xs font-bold uppercase">Update VIP</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Nav */}
            <div className={`border-t p-2 flex justify-around ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
                <button onClick={()=>setAdminTab('chats')} className={`flex flex-col items-center p-2 rounded-xl w-20 transition-all ${adminTab==='chats'?'text-[#0084ff] scale-110':'text-gray-400'}`}><MessageSquare className="w-6 h-6" /><span className="text-[10px] font-bold mt-1">Chats</span></button>
                <button onClick={()=>setAdminTab('events')} className={`flex flex-col items-center p-2 rounded-xl w-20 transition-all ${adminTab==='events'?'text-[#0084ff] scale-110':'text-gray-400'}`}><Calendar className="w-6 h-6" /><span className="text-[10px] font-bold mt-1">Events</span></button>
                <button onClick={()=>setAdminTab('settings')} className={`flex flex-col items-center p-2 rounded-xl w-20 transition-all ${adminTab==='settings'?'text-[#0084ff] scale-110':'text-gray-400'}`}><Settings className="w-6 h-6" /><span className="text-[10px] font-bold mt-1">Settings</span></button>
            </div>
        </div>

        {/* DESKTOP/MOBILE CHAT VIEW */}
        <div className={`w-full md:w-2/3 h-screen flex-col ${selectedUser ? 'flex fixed inset-0 z-50 md:static' : 'hidden md:flex'} ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
            {selectedUser ? (
                <>
                    {/* Chat Header */}
                    <div className={`p-3 border-b flex justify-between items-center shadow-sm sticky top-0 z-20 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setSelectedUser(null)} className={`md:hidden p-2 rounded-full ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}><ChevronLeft className="w-6 h-6 text-[#0084ff]" /></button>
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500">{selectedUser.name[0]}</div>
                            <div>
                                <h3 className="font-bold text-base leading-tight">{selectedUser.name}</h3>
                                <p className="text-xs opacity-60">{selectedUser.email}</p>
                            </div>
                        </div>
                        <div className="flex gap-2 items-center relative">
                             {/* APPROVE / DENY LOGIC */}
                             {selectedUser.status === 'waiting_approval' ? (
                                <>
                                    <button onClick={() => { updateSessionStatus(selectedUser.id, 'allowed'); setSelectedUser(null); }} className="bg-[#0084ff] text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg hover:bg-blue-600 transition-all flex items-center gap-1"><Check className="w-4 h-4" /> Allow</button>
                                    <button onClick={() => { updateSessionStatus(selectedUser.id, 'denied'); setSelectedUser(null); }} className="bg-gray-100 text-red-500 px-4 py-2 rounded-full text-sm font-bold hover:bg-gray-200 transition-all"><Ban className="w-4 h-4" /></button>
                                </>
                             ) : (
                                <>
                                    <button onClick={() => setShowMenu(!showMenu)} className="p-2 rounded-full hover:bg-gray-100"><MoreVertical className="w-5 h-5" /></button>
                                    {showMenu && (
                                        <div className="absolute top-10 right-0 bg-white shadow-xl border rounded-xl overflow-hidden z-50 w-40">
                                            <button onClick={() => { deleteSession(selectedUser.id); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-red-500 hover:bg-red-50 text-sm font-bold flex items-center gap-2"><Trash2 className="w-4 h-4" /> Delete Chat</button>
                                        </div>
                                    )}
                                </>
                             )}
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className={`flex-1 overflow-y-auto p-4 space-y-2 ${darkMode ? 'bg-gray-900' : 'bg-white'}`} onClick={() => setShowMenu(false)}>
                        {(selectedUser.chatHistory || []).map((m, i) => (
                            <div key={i} className={`flex ${m.sender==='system'?'justify-end':'justify-start'}`}>
                                <div className={`max-w-[75%] p-3 rounded-2xl text-sm ${m.sender==='system'?'bg-[#0084ff] text-white': (darkMode ? 'bg-gray-800' : 'bg-[#f0f0f0] text-black')}`}>{m.text}</div>
                            </div>
                        ))}
                    </div>

                    {/* Input Area */}
                    <div className={`p-3 border-t ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
                        <div className={`flex items-center gap-2 p-1 rounded-full ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                            <input className="flex-1 bg-transparent px-4 py-2 text-sm outline-none placeholder:text-gray-500" placeholder="Aa" value={adminMsg} onChange={e => setAdminMsg(e.target.value)} />
                            <button onClick={sendAdminMessage} className="p-2 rounded-full text-[#0084ff] hover:bg-blue-100/10"><Send className="w-5 h-5" /></button>
                        </div>
                        <div className="mt-2 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                            <button onClick={() => { setAdminMsg("Access Granted. Welcome!"); setTimeout(sendAdminMessage, 100); }} className={`border px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${darkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>👋 Welcome</button>
                            <div className="flex items-center gap-2 flex-1 ml-2">
                                <input className={`flex-1 border rounded-full px-3 py-1.5 text-xs outline-none ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-red-50 border-red-100 text-red-600'}`} placeholder="Alert..." value={adminAlert} onChange={e=>setAdminAlert(e.target.value)} />
                                <button onClick={sendAdminPing} className="p-1.5 bg-red-500 rounded-full text-white"><Bell className="w-3 h-3" /></button>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className={`flex-1 flex flex-col items-center justify-center ${darkMode ? 'text-gray-700' : 'text-gray-300'}`}>
                    <MessageSquare className="w-20 h-20 mb-4 opacity-20" />
                    <p className="font-bold text-sm uppercase tracking-widest">Select a chat to start messaging</p>
                </div>
            )}
        </div>
    </div>
  );
}


