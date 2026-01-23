import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, MessageSquare, Send, Bell, UserPlus, Settings, Calendar, ChevronLeft, Check, Ban, Trash2 } from 'lucide-react';
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
  const [adminTab, setAdminTab] = useState('requests'); 
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
    <div className="min-h-screen bg-[#f1f5f9] text-gray-900 flex font-sans">
        {/* SIDEBAR */}
        <div className={`w-full md:w-1/3 border-r border-gray-200 bg-white flex flex-col ${selectedUser ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#f8fafc]">
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" /><h2 className="font-black text-sm uppercase italic">War Room</h2></div>
                <div className="flex gap-2">
                    <button onClick={() => setAdminTab('requests')} className={`p-2 rounded-full ${adminTab==='requests'?'bg-orange-100 text-orange-600':'text-gray-400'}`}><UserPlus className="w-4 h-4" /></button>
                    <button onClick={() => setAdminTab('active')} className={`p-2 rounded-full ${adminTab==='active'?'bg-blue-100 text-blue-600':'text-gray-400'}`}><CheckCircle className="w-4 h-4" /></button>
                    <button onClick={() => setAdminTab('settings')} className={`p-2 rounded-full ${adminTab==='settings'?'bg-gray-200 text-gray-700':'text-gray-400'}`}><Settings className="w-4 h-4" /></button>
                    <button onClick={() => setAdminTab('events')} className={`p-2 rounded-full ${adminTab==='events'?'bg-purple-100 text-purple-600':'text-gray-400'}`}><Calendar className="w-4 h-4" /></button>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {adminTab === 'settings' ? (
                    <div className="p-4 space-y-6">
                        <h3 className="font-black text-sm uppercase tracking-widest text-gray-400">Pricing</h3>
                        <div className="space-y-2"><label className="text-xs font-bold">Regular Price</label><input type="number" className="w-full bg-gray-100 p-3 rounded-lg font-mono text-sm" value={globalSettings.regularPrice} onChange={e => setGlobalSettings({...globalSettings, regularPrice: e.target.value})} /><button onClick={() => updateGlobalPrice('regularPrice', globalSettings.regularPrice)} className="w-full bg-[#026cdf] text-white py-2 rounded-lg text-xs font-bold uppercase">Update Regular</button></div>
                        <div className="space-y-2"><label className="text-xs font-bold">VIP Price</label><input type="number" className="w-full bg-gray-100 p-3 rounded-lg font-mono text-sm" value={globalSettings.vipPrice} onChange={e => setGlobalSettings({...globalSettings, vipPrice: e.target.value})} /><button onClick={() => updateGlobalPrice('vipPrice', globalSettings.vipPrice)} className="w-full bg-pink-500 text-white py-2 rounded-lg text-xs font-bold uppercase">Update VIP</button></div>
                    </div>
                ) : adminTab === 'events' ? (
                    <div className="p-4 space-y-4">
                        <h3 className="font-black text-sm uppercase tracking-widest text-gray-400">Add Event</h3>
                        <input placeholder="Artist Name" className="w-full bg-gray-100 p-3 rounded-lg text-xs font-bold" value={newEvent.artist} onChange={e=>setNewEvent({...newEvent, artist: e.target.value})} />
                        <input placeholder="Venue" className="w-full bg-gray-100 p-3 rounded-lg text-xs" value={newEvent.venue} onChange={e=>setNewEvent({...newEvent, venue: e.target.value})} />
                        <input placeholder="Date" className="w-full bg-gray-100 p-3 rounded-lg text-xs" value={newEvent.date} onChange={e=>setNewEvent({...newEvent, date: e.target.value})} />
                        <input placeholder="Image URL" className="w-full bg-gray-100 p-3 rounded-lg text-xs" value={newEvent.image} onChange={e=>setNewEvent({...newEvent, image: e.target.value})} />
                        <div className="flex gap-2">
                            <input placeholder="Badge (High Demand)" className="flex-1 bg-gray-100 p-3 rounded-lg text-xs" value={newEvent.badge} onChange={e=>setNewEvent({...newEvent, badge: e.target.value})} />
                            <input placeholder="Timer (02:45:00)" className="flex-1 bg-gray-100 p-3 rounded-lg text-xs" value={newEvent.timer} onChange={e=>setNewEvent({...newEvent, timer: e.target.value})} />
                        </div>
                        <button onClick={createEvent} className="w-full bg-purple-600 text-white py-3 rounded-lg font-black text-xs uppercase">Publish</button>
                        <div className="mt-6 space-y-2">
                            <h4 className="text-xs font-bold text-gray-400 uppercase">Active Events</h4>
                            {eventsList.map(ev => (<div key={ev.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg"><span className="text-xs font-bold truncate w-32">{ev.artist}</span><button onClick={() => deleteEvent(ev.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></button></div>))}
                        </div>
                    </div>
                ) : (
                    (allSessions || []).filter(s => adminTab==='requests' ? s.status==='waiting_approval' : s.status!=='waiting_approval').map(s => (
                        <div key={s.id} onClick={() => setSelectedUser(s)} className={`p-4 rounded-xl cursor-pointer hover:bg-gray-50 transition-all border ${selectedUser?.id === s.id ? 'border-[#026cdf] bg-blue-50' : 'border-transparent'}`}>
                            <div className="flex justify-between items-center mb-1"><h4 className="font-bold text-sm truncate">{s.name}</h4>{s.status==='waiting_approval' && <span className="bg-orange-100 text-orange-600 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">Wait</span>}</div>
                            <p className="text-xs text-gray-400 truncate">{s.email}</p>
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* MAIN CHAT */}
        <div className={`w-full md:w-2/3 bg-[#f1f5f9] flex flex-col ${!selectedUser ? 'hidden md:flex' : 'flex'}`}>
            {selectedUser ? (
                <>
                    <div className="bg-white p-4 border-b border-gray-200 flex justify-between items-center shadow-sm">
                        <div className="flex items-center gap-3"><button onClick={() => setSelectedUser(null)} className="md:hidden p-2 hover:bg-gray-100 rounded-full"><ChevronLeft className="w-5 h-5" /></button><div><h3 className="font-bold text-sm">{selectedUser.name}</h3><p className="text-xs text-gray-400">{selectedUser.email}</p></div></div>
                        <div className="flex gap-2">{selectedUser.status === 'waiting_approval' ? (<><button onClick={() => updateSessionStatus(selectedUser.id, 'allowed')} className="bg-green-500 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-green-600 transition-all flex items-center gap-1"><Check className="w-3 h-3" /> Approve</button><button onClick={() => updateSessionStatus(selectedUser.id, 'denied')} className="bg-red-100 text-red-500 px-4 py-2 rounded-lg text-xs font-bold uppercase hover:bg-red-200 transition-all flex items-center gap-1"><Ban className="w-3 h-3" /> Deny</button></>) : (<div className="bg-gray-100 px-3 py-1 rounded-full text-xs font-bold text-gray-500 uppercase">{selectedUser.status}</div>)}</div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">{(selectedUser.chatHistory || []).map((m, i) => (<div key={i} className={`flex ${m.sender==='system'?'justify-end':'justify-start'}`}><div className={`max-w-[70%] p-3 rounded-xl text-xs font-medium ${m.sender==='system'?'bg-[#026cdf] text-white':'bg-white text-gray-800 shadow-sm'}`}>{m.text}</div></div>))}</div>
                    <div className="p-4 bg-white border-t border-gray-200 space-y-3">
                        <div className="flex gap-2"><input className="flex-1 bg-gray-100 rounded-lg px-4 py-3 text-sm outline-none border border-transparent focus:border-[#026cdf]" placeholder="Support Chat Message..." value={adminMsg} onChange={e => setAdminMsg(e.target.value)} /><button onClick={sendAdminMessage} className="bg-[#026cdf] p-3 rounded-lg text-white hover:bg-blue-700 transition-all"><Send className="w-4 h-4" /></button></div>
                        <div className="flex gap-2 border-t border-gray-100 pt-3"><input className="flex-1 bg-red-50 rounded-lg px-4 py-2 text-xs outline-none border border-transparent focus:border-red-500 text-red-900 placeholder:text-red-300" placeholder="Priority Alert (Bell Notification)..." value={adminAlert} onChange={e => setAdminAlert(e.target.value)} /><button onClick={sendAdminPing} className="bg-red-500 px-4 rounded-lg text-white text-xs font-black uppercase hover:bg-red-600"><Bell className="w-3 h-3" /></button></div>
                    </div>
                </>
            ) : <div className="flex-1 flex flex-col items-center justify-center text-gray-300"><MessageSquare className="w-16 h-16 mb-4" /><p className="font-bold text-sm uppercase tracking-widest">Select a Session</p></div>}
        </div>
    </div>
  );
}


