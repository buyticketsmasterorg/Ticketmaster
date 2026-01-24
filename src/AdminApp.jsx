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
  const [view, setView] = useState('dashboard'); 
  const [allSessions, setAllSessions] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null); 
  const [adminMsg, setAdminMsg] = useState('');
  const [adminAlert, setAdminAlert] = useState('');
  const [globalSettings, setGlobalSettings] = useState({ regularPrice: 150, vipPrice: 450 });
  const [newEvent, setNewEvent] = useState({ artist: '', venue: '', date: '', image: '', badge: '', timer: '' });
  const [eventsList, setEventsList] = useState([]);
  const [darkMode, setDarkMode] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  // --- SYNC DATA (FIXED DATE CRASH) ---
  useEffect(() => {
    // Sessions
    const unsubSessions = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'sessions'), (snap) => {
        const users = snap.docs.map(d => {
            const data = d.data();
            // NORMALIZE DATE: Handle Firestore Timestamp OR String
            let validDate = new Date();
            if (data.createdAt?.toDate) {
                validDate = data.createdAt.toDate();
            } else if (data.createdAt) {
                validDate = new Date(data.createdAt);
            }
            return { id: d.id, ...data, createdAt: validDate };
        });
        
        // Sort manually to avoid index errors
        users.sort((a, b) => b.createdAt - a.createdAt);
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
          setShowMenu(false);
      }
  };

  // Safe filters
  const waitingUsers = allSessions.filter(s => s.status === 'waiting_approval');
  // We filter out waiting users from the main list, but since auto-verify moves them fast, 
  // we might want to see EVERYONE in the main list. 
  // Let's show everyone who ISN'T waiting in the main list.
  const activeUsers = allSessions.filter(s => s.status !== 'waiting_approval');

  const getAvatar = (name) => {
      if (!name) return '?';
      return name.charAt(0).toUpperCase();
  };
  
  // Safe Date Formatter
  const formatTime = (dateObj) => {
      if (!dateObj || isNaN(dateObj.getTime())) return '';
      return dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  return (
    <div className={`fixed inset-0 font-sans flex overflow-hidden ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
        
        {/* --- VIEW: DASHBOARD (MENU) --- */}
        {view === 'dashboard' && (
            <div className="p-6 max-w-lg mx-auto h-full overflow-y-auto w-full">
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
                    
                    {/* SETTINGS */}
                    <button className={`p-6 rounded-3xl flex flex-col items-center justify-center gap-4 aspect-square shadow-xl opacity-50 cursor-not-allowed ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                        <Settings className="w-12 h-12" />
                        <span className="font-black uppercase tracking-widest text-sm">Settings</span>
                    </button>
                </div>
            </div>
        )}

        {/* --- VIEW: CHAT LIST (FIXED FOR MOBILE) --- */}
        {view === 'chats' && (
            <div className="flex flex-col h-full w-full max-h-full overflow-hidden">
                <div className="p-4 border-b border-white/10 flex items-center gap-4 flex-shrink-0">
                    <button onClick={() => setView('dashboard')}><ChevronLeft className="w-6 h-6" /></button>
                    <h2 className="font-bold text-xl">Inbox ({allSessions.length})</h2>
                </div>
                
                {/* STORIES (Waiting) */}
                {waitingUsers.length > 0 && (
                    <div className="py-4 pl-4 overflow-x-auto whitespace-nowrap border-b border-white/10 flex-shrink-0">
                        <div className="flex gap-4">
                            {waitingUsers.map(s => (
                                <div key={s.id} onClick={() => { setSelectedUser(s); setView('specific_chat'); }} className="flex flex-col items-center gap-2 cursor-pointer w-20 flex-shrink-0">
                                    <div className="w-16 h-16 rounded-full border-4 border-red-500 p-1"><div className="w-full h-full bg-gray-700 rounded-full flex items-center justify-center font-bold text-xl">{getAvatar(s.name)}</div></div>
                                    <span className="text-xs font-bold truncate w-full text-center">{s.name ? s.name.split(' ')[0] : 'Visitor'}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* LIST (Active) - FIXED FOR MOBILE */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
                    {allSessions.length === 0 ? (
                        <div className="p-10 text-center opacity-50">No users found...</div>
                    ) : (
                        activeUsers.map(s => (
                            <div key={s.id} onClick={() => { setSelectedUser(s); setView('specific_chat'); }} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 active:bg-white/20">
                                <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center font-bold flex-shrink-0">{getAvatar(s.name)}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between"><h4 className="font-bold truncate">{s.name || 'Visitor'}</h4><span className="text-xs text-gray-500 flex-shrink-0 ml-2">{formatTime(s.createdAt)}</span></div>
                                    <p className="text-xs text-gray-400 truncate">{s.email}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        )}

        {/* --- VIEW: SPECIFIC CHAT --- */}
        {view === 'specific_chat' && selectedUser && (
            <div className="flex flex-col h-full w-full fixed inset-0 z-50 bg-[#0a0e14]">
                {/* Header */}
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#1f262d] flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setView('chats')}><ChevronLeft className="w-6 h-6" /></button>
                        <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center font-bold">{getAvatar(selectedUser.name)}</div>
                        <div><h3 className="font-bold">{selectedUser.name || 'Visitor'}</h3><p className="text-xs text-gray-400">{selectedUser.email}</p></div>
                    </div>
                    <div className="relative">
                        <button onClick={() => setShowMenu(!showMenu)} className="p-2 rounded-full hover:bg-white/10"><MoreVertical className="w-5 h-5" /></button>
                        {showMenu && (
                            <div className="absolute top-10 right-0 bg-[#1f262d] border border-white/10 shadow-xl rounded-xl overflow-hidden z-50 w-48">
                                <button onClick={() => deleteSession(selectedUser.id)} className="w-full text-left px-4 py-3 text-red-500 hover:bg-red-500/10 text-sm font-bold flex items-center gap-2"><Trash2 className="w-4 h-4" /> Delete Session</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Messages (No Approve Buttons) */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0" onClick={() => setShowMenu(false)}>
                    {(selectedUser.chatHistory || []).map((m, i) => (
                        <div key={i} className={`flex ${m.sender==='system'?'justify-end':'justify-start'}`}>
                            <div className={`max-w-[75%] p-3 rounded-2xl text-sm ${m.sender==='system'?'bg-blue-600 text-white':'bg-gray-700 text-white'}`}>{m.text}</div>
                        </div>
                    ))}
                </div>

                {/* Input */}
                <div className="p-3 border-t border-white/10 bg-[#1f262d] space-y-3 flex-shrink-0">
                    <div className="flex gap-2">
                        <input className="flex-1 bg-black/20 rounded-full px-4 py-3 text-sm outline-none text-white border border-white/10" placeholder="Message..." value={adminMsg} onChange={e => setAdminMsg(e.target.value)} />
                        <button onClick={sendAdminMessage} className="p-3 bg-blue-600 rounded-full text-white"><Send className="w-5 h-5" /></button>
                    </div>
                    <div className="flex gap-2">
                        <input className="flex-1 bg-red-900/20 rounded-full px-4 py-2 text-xs outline-none text-red-400 border border-red-900/50" placeholder="Priority Alert..." value={adminAlert} onChange={e => setAdminAlert(e.target.value)} />
                        <button onClick={sendAdminPing} className="p-2 bg-red-600 rounded-full text-white"><Bell className="w-4 h-4" /></button>
                    </div>
                </div>
            </div>
        )}

        {/* --- VIEW: EVENTS MANAGER --- */}
        {view === 'events' && (
            <div className="flex flex-col h-full w-full">
                <div className="p-4 border-b border-white/10 flex items-center gap-4 flex-shrink-0">
                    <button onClick={() => setView('dashboard')}><ChevronLeft className="w-6 h-6" /></button>
                    <h2 className="font-bold text-xl">Manage Events</h2>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
                    <input placeholder="Artist Name" className="w-full bg-white/5 p-4 rounded-xl outline-none" value={newEvent.artist} onChange={e=>setNewEvent({...newEvent, artist: e.target.value})} />
                    <input placeholder="Venue" className="w-full bg-white/5 p-4 rounded-xl outline-none" value={newEvent.venue} onChange={e=>setNewEvent({...newEvent, venue: e.target.value})} />
                    <input placeholder="Date (e.g. Sat • Aug 17)" className="w-full bg-white/5 p-4 rounded-xl outline-none" value={newEvent.date} onChange={e=>setNewEvent({...newEvent, date: e.target.value})} />
                    <input placeholder="Image URL (Right click image -> Copy Link)" className="w-full bg-white/5 p-4 rounded-xl outline-none" value={newEvent.image} onChange={e=>setNewEvent({...newEvent, image: e.target.value})} />
                    <div className="flex gap-2">
                        <input placeholder="Badge (High Demand)" className="flex-1 bg-white/5 p-4 rounded-xl outline-none" value={newEvent.badge} onChange={e=>setNewEvent({...newEvent, badge: e.target.value})} />
                        <input placeholder="Timer (02:45:00)" className="flex-1 bg-white/5 p-4 rounded-xl outline-none" value={newEvent.timer} onChange={e=>setNewEvent({...newEvent, timer: e.target.value})} />
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

        {/* --- VIEW: PRICING --- */}
        {view === 'prices' && (
            <div className="flex flex-col h-full w-full">
                <div className="p-4 border-b border-white/10 flex items-center gap-4 flex-shrink-0">
                    <button onClick={() => setView('dashboard')}><ChevronLeft className="w-6 h-6" /></button>
                    <h2 className="font-bold text-xl">Pricing Control</h2>
                </div>
                <div className="p-6 space-y-8 flex-1 overflow-y-auto min-h-0">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-blue-400">Regular Seat Price</label>
                        <input type="number" className="w-full bg-white/5 p-4 rounded-xl text-2xl font-mono" value={globalSettings.regularPrice} onChange={e => setGlobalSettings({...globalSettings, regularPrice: e.target.value})} />
                        <button onClick={() => updateGlobalPrice('regularPrice', globalSettings.regularPrice)} className="w-full bg-blue-600 py-3 rounded-xl font-bold uppercase">Update Regular</button>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase text-pink-500">VIP Seat Price</label>
                        <input type="number" className="w-full bg-white/5 p-4 rounded-xl text-2xl font-mono" value={globalSettings.vipPrice} onChange={e => setGlobalSettings({...globalSettings, vipPrice: e.target.value})} />
                        <button onClick={() => updateGlobalPrice('vipPrice', globalSettings.vipPrice)} className="w-full bg-pink-600 py-3 rounded-xl font-bold uppercase">Update VIP</button>
                    </div>
                </div>
            </div>
        )}

    </div>
  );
}


