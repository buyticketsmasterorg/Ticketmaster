import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, MessageSquare, Send, Bell, UserPlus, Settings, Calendar, ChevronLeft, Check, Ban, Trash2, Menu } from 'lucide-react';
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

  useEffect(() => {
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'sessions'), orderBy('createdAt', 'desc'));
    const unsubSessions = onSnapshot(q, (snap) => setAllSessions(snap.docs.map(d => ({id: d.id, ...d.data()}))));

    const unsubSettings = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'global_settings'), (snap) => {
        if(snap.exists()) setGlobalSettings(snap.data());
    });

    const unsubEvents = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'events'), (snap) => {
        setEventsList(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });

    return () => { unsubSessions(); unsubSettings(); unsubEvents(); };
  }, []);

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
  };

  const createEvent = async () => {
      if(!newEvent.artist) return;
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'events'), newEvent);
      setNewEvent({ artist: '', venue: '', date: '', image: '', badge: '', timer: '' });
      alert("Event Published!");
  };

  const deleteEvent = async (eid) => {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', eid));
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans flex flex-col md:flex-row">
        
        {/* MOBILE: Main View Logic (List or Chat) */}
        <div className={`w-full md:w-1/3 flex flex-col h-screen border-r border-gray-200 ${selectedUser ? 'hidden md:flex' : 'flex'}`}>
            
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/6/6c/Facebook_Messenger_logo_2018.svg" className="w-8 h-8" />
                    <h1 className="font-bold text-xl tracking-tight">Chats</h1>
                </div>
                <div className="bg-gray-100 p-2 rounded-full"><Settings className="w-5 h-5 text-black" /></div>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto">
                {adminTab === 'settings' ? (
                     <div className="p-4 space-y-6">
                        <h3 className="font-black text-sm uppercase tracking-widest text-gray-400 mb-4">Pricing</h3>
                        <div className="space-y-2"><label className="text-xs font-bold">Regular Price</label><input type="number" className="w-full bg-gray-100 p-3 rounded-lg font-mono text-sm" value={globalSettings.regularPrice} onChange={e => setGlobalSettings({...globalSettings, regularPrice: e.target.value})} /><button onClick={() => updateGlobalPrice('regularPrice', globalSettings.regularPrice)} className="w-full bg-[#0084ff] text-white py-3 rounded-xl text-xs font-bold uppercase">Update</button></div>
                        <div className="space-y-2"><label className="text-xs font-bold">VIP Price</label><input type="number" className="w-full bg-gray-100 p-3 rounded-lg font-mono text-sm" value={globalSettings.vipPrice} onChange={e => setGlobalSettings({...globalSettings, vipPrice: e.target.value})} /><button onClick={() => updateGlobalPrice('vipPrice', globalSettings.vipPrice)} className="w-full bg-pink-500 text-white py-3 rounded-xl text-xs font-bold uppercase">Update</button></div>
                    </div>
                ) : adminTab === 'events' ? (
                    <div className="p-4 space-y-4">
                        <h3 className="font-black text-sm uppercase tracking-widest text-gray-400 mb-4">Events</h3>
                        <input placeholder="Artist" className="w-full bg-gray-100 p-3 rounded-xl text-sm font-bold" value={newEvent.artist} onChange={e=>setNewEvent({...newEvent, artist: e.target.value})} />
                        <div className="flex gap-2">
                             <input placeholder="Venue" className="flex-1 bg-gray-100 p-3 rounded-xl text-sm" value={newEvent.venue} onChange={e=>setNewEvent({...newEvent, venue: e.target.value})} />
                             <input placeholder="Date" className="flex-1 bg-gray-100 p-3 rounded-xl text-sm" value={newEvent.date} onChange={e=>setNewEvent({...newEvent, date: e.target.value})} />
                        </div>
                        <input placeholder="Image URL" className="w-full bg-gray-100 p-3 rounded-xl text-sm" value={newEvent.image} onChange={e=>setNewEvent({...newEvent, image: e.target.value})} />
                        <button onClick={createEvent} className="w-full bg-[#0084ff] text-white py-3 rounded-xl font-bold text-sm">Add Event</button>
                        <div className="mt-4 space-y-2">
                            {eventsList.map(ev => (<div key={ev.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-xl"><span className="text-sm font-bold truncate w-40">{ev.artist}</span><button onClick={() => deleteEvent(ev.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></button></div>))}
                        </div>
                    </div>
                ) : (
                    <div className="p-2 space-y-1">
                        {allSessions.map(s => (
                            <div key={s.id} onClick={() => setSelectedUser(s)} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-gray-100 transition-all ${selectedUser?.id === s.id ? 'bg-blue-50' : ''}`}>
                                <div className="relative">
                                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500 text-lg">{s.name ? s.name[0] : '?'}</div>
                                    {s.status === 'waiting_approval' && <div className="absolute bottom-0 right-0 w-4 h-4 bg-orange-500 border-2 border-white rounded-full animate-pulse" />}
                                    {s.status === 'in_queue' && <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between">
                                        <h4 className={`text-sm truncate ${s.status==='waiting_approval' ? 'font-black text-black' : 'font-semibold text-gray-900'}`}>{s.name}</h4>
                                        <span className="text-xs text-gray-400">{new Date(s.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                    <p className={`text-xs truncate ${s.status==='waiting_approval' ? 'font-bold text-orange-600' : 'text-gray-500'}`}>{s.status === 'waiting_approval' ? 'Waiting for approval...' : s.email}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Bottom Nav */}
            <div className="border-t border-gray-200 bg-white p-2 flex justify-around">
                <button onClick={()=>setAdminTab('chats')} className={`flex flex-col items-center p-2 rounded-xl w-20 ${adminTab==='chats'?'text-[#0084ff]':'text-gray-400'}`}><MessageSquare className="w-6 h-6" /><span className="text-[10px] font-bold mt-1">Chats</span></button>
                <button onClick={()=>setAdminTab('events')} className={`flex flex-col items-center p-2 rounded-xl w-20 ${adminTab==='events'?'text-[#0084ff]':'text-gray-400'}`}><Calendar className="w-6 h-6" /><span className="text-[10px] font-bold mt-1">Events</span></button>
                <button onClick={()=>setAdminTab('settings')} className={`flex flex-col items-center p-2 rounded-xl w-20 ${adminTab==='settings'?'text-[#0084ff]':'text-gray-400'}`}><Settings className="w-6 h-6" /><span className="text-[10px] font-bold mt-1">Settings</span></button>
            </div>
        </div>

        {/* DESKTOP/MOBILE CHAT VIEW */}
        <div className={`w-full md:w-2/3 h-screen bg-white flex-col ${selectedUser ? 'flex fixed inset-0 z-50 md:static' : 'hidden md:flex'}`}>
            {selectedUser ? (
                <>
                    {/* Chat Header */}
                    <div className="bg-white p-3 border-b border-gray-200 flex justify-between items-center shadow-sm sticky top-0 z-20">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setSelectedUser(null)} className="md:hidden p-2 hover:bg-gray-100 rounded-full"><ChevronLeft className="w-6 h-6 text-[#0084ff]" /></button>
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-500">{selectedUser.name[0]}</div>
                            <div>
                                <h3 className="font-bold text-base text-black leading-tight">{selectedUser.name}</h3>
                                <p className="text-xs text-gray-500">{selectedUser.email} • {selectedUser.location}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                             {selectedUser.status === 'waiting_approval' ? (
                                <>
                                    <button onClick={() => updateSessionStatus(selectedUser.id, 'allowed')} className="bg-[#0084ff] text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg hover:bg-blue-600 transition-all flex items-center gap-1"><Check className="w-4 h-4" /> Allow</button>
                                    <button onClick={() => updateSessionStatus(selectedUser.id, 'denied')} className="bg-gray-100 text-red-500 px-4 py-2 rounded-full text-sm font-bold hover:bg-gray-200 transition-all"><Ban className="w-4 h-4" /></button>
                                </>
                             ) : (
                                <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">Active</div>
                             )}
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-white">
                        {(selectedUser.chatHistory || []).map((m, i) => (
                            <div key={i} className={`flex ${m.sender==='system'?'justify-end':'justify-start'}`}>
                                <div className={`max-w-[75%] p-3 rounded-2xl text-sm ${m.sender==='system'?'bg-[#0084ff] text-white':'bg-[#f0f0f0] text-black'}`}>{m.text}</div>
                            </div>
                        ))}
                    </div>

                    {/* Input Area */}
                    <div className="p-3 border-t border-gray-200 bg-white">
                        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-full">
                            <input className="flex-1 bg-transparent px-4 py-2 text-sm outline-none text-black placeholder:text-gray-500" placeholder="Aa" value={adminMsg} onChange={e => setAdminMsg(e.target.value)} />
                            <button onClick={sendAdminMessage} className="p-2 rounded-full text-[#0084ff] hover:bg-blue-100"><Send className="w-5 h-5" /></button>
                        </div>
                        <div className="mt-2 flex gap-2 overflow-x-auto pb-2">
                            <button onClick={() => { setAdminMsg("Access Granted. Welcome!"); setTimeout(sendAdminMessage, 100); }} className="bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full text-xs font-bold text-gray-600 whitespace-nowrap">👋 Welcome</button>
                            <button onClick={() => { setAdminMsg("Please check your email."); setTimeout(sendAdminMessage, 100); }} className="bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full text-xs font-bold text-gray-600 whitespace-nowrap">📧 Email</button>
                            <div className="w-px h-6 bg-gray-300 mx-1"></div>
                            <div className="flex items-center gap-2 flex-1">
                                <input className="flex-1 bg-red-50 border border-red-100 rounded-full px-3 py-1.5 text-xs text-red-600 outline-none placeholder:text-red-300" placeholder="Alert..." value={adminAlert} onChange={e=>setAdminAlert(e.target.value)} />
                                <button onClick={sendAdminPing} className="p-1.5 bg-red-500 rounded-full text-white"><Bell className="w-3 h-3" /></button>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
                    <MessageSquare className="w-20 h-20 mb-4 opacity-20" />
                    <p className="font-bold text-gray-400">Select a chat to start messaging</p>
                </div>
            )}
        </div>
    </div>
  );
}


