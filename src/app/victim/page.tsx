'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Toast, type ToastData } from '@/components/ui/Toast';
import { MessageSkeleton } from '@/components/ui/Skeleton';

const MapComponent = dynamic(() => import('@/components/Map'), { ssr: false });

export default function VictimDashboard() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'IDLE' | 'SENT'>('IDLE');
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [optimisticMessages, setOptimisticMessages] = useState<any[]>([]);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    disaster_type: 'Medical',
    injury_severity: 'Severe',
    battery_level: Math.floor(Math.random() * 20) + 5,
    location_lat: 12.9716 + (Math.random() - 0.5) * 0.1,
    location_lng: 77.5946 + (Math.random() - 0.5) * 0.1,
    group_size: 1,
    environment: 'Normal',
  });

  const showToast = useCallback((msg: string, type: ToastData['type'] = 'info') => {
    setToast({ msg, type });
  }, []);

  useEffect(() => {
    const handler = (e: CustomEvent<ToastData>) => showToast(e.detail.msg, e.detail.type);
    window.addEventListener('dl-toast', handler as EventListener);
    return () => window.removeEventListener('dl-toast', handler as EventListener);
  }, [showToast]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/messages/stream');
      const data = await res.json();
      if (data.messages) setMessages(data.messages);
    } catch {
      // silent
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 4000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, optimisticMessages]);

  const sendSOS = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sos/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const data = await res.json();
        setStatus('SENT');
        showToast('SOS Transmitted - AI Rank: ' + data.rank + ' (Score: ' + data.score + '/100)', 'success');
      }
    } catch {
      showToast('Failed to transmit SOS', 'error');
    }
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const tempId = 'opt_' + Date.now();
    const optimisticMsg = {
      id: tempId,
      content: newMessage,
      senderRole: 'VICTIM',
      senderName: 'You',
      timestamp: new Date().toISOString(),
      optimistic: true,
    };

    setOptimisticMessages(prev => [...prev, optimisticMsg]);
    const sentContent = newMessage;
    setNewMessage('');

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: sentContent }),
      });
      if (res.ok) {
        setOptimisticMessages(prev => prev.filter(m => m.id !== tempId));
        fetchMessages();
      } else {
        setOptimisticMessages(prev =>
          prev.map(m => m.id === tempId ? { ...m, failed: true } : m)
        );
      }
    } catch {
      setOptimisticMessages(prev =>
        prev.map(m => m.id === tempId ? { ...m, failed: true } : m)
      );
    }
  };

  const allMessages = [...messages, ...optimisticMessages].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return (
    <div className="h-screen flex flex-col bg-[var(--color-bg-primary)] text-white overflow-hidden" style={{ fontFamily: "var(--font-body)" }}>
      {toast && (
        <Toast toast={toast} onClose={() => setToast(null)} />
      )}

      <header className="h-16 bg-[var(--color-bg-secondary)]/90 border-b border-white/5 flex items-center justify-between px-5 z-20 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/')} className="w-9 h-9 rounded-xl gradient-blue flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform">
            <i className="fa-solid fa-shield-halved text-white text-sm"></i>
          </button>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Disaster<span className="amber-shimmer">Lens</span></h1>
            <p className="text-[9px] text-slate-500 uppercase tracking-[0.2em] font-semibold">Victim Dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            icon={sidebarOpen ? 'chevron-left' : 'chevron-right'}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? 'Hide Panel' : 'Show Panel'}
          </Button>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{isOnline ? 'Online' : 'Offline'}</span>
          <div
            className={`toggle-switch ${isOnline ? 'active' : ''}`}
            onClick={() => { setIsOnline(!isOnline); showToast(isOnline ? 'Switched to Mesh Offline Mode' : 'Back Online - Syncing...', 'info'); }}
          >
            <div className="toggle-knob"></div>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${isOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
            {isOnline ? 'Connected' : 'Mesh Mode'}
          </div>
          <Button variant="ghost" size="sm" icon="right-from-bracket" onClick={handleLogout} className="text-red-400 hover:text-red-300">
            Logout
          </Button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <div className={`${sidebarOpen ? 'w-[420px]' : 'w-0'} flex flex-col border-r border-white/5 shrink-0 overflow-hidden transition-all duration-300`}>
          <div className="h-48 shrink-0 relative">
            {isOnline ? (
              <MapComponent signals={[{
                id: 'self',
                location_lat: formData.location_lat,
                location_lng: formData.location_lng,
                priority_score: 50,
                user: { name: 'Your Location' },
                disaster_type: formData.disaster_type,
                battery_level: formData.battery_level,
              }]} activeSignalId={null} onMarkerClick={() => {}} />
            ) : (
              <div className="h-full w-full bg-[var(--color-bg-secondary)] flex flex-col items-center justify-center">
                <div className="w-20 h-20 rounded-full border border-amber-500/20 flex items-center justify-center relative mb-3">
                  <div className="w-16 h-16 rounded-full border-2 border-amber-500/30 animate-ping absolute opacity-20"></div>
                  <i className="fa-solid fa-wifi text-amber-500/50 text-xl relative z-10"></i>
                </div>
                <p className="text-amber-500/70 text-xs font-semibold">Mesh Scanning - Last coordinates cached</p>
              </div>
            )}
            {!isOnline && (
              <div className="absolute top-2 left-2 bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1.5 z-30">
                <i className="fa-solid fa-triangle-exclamation"></i> OFFLINE MODE
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            <div>
              <h3 className="type-h3 text-white mb-0.5 flex items-center gap-2">
                <i className="fa-solid fa-hand-holding-medical text-blue-400"></i> Emergency Intel
              </h3>
              <p className="text-[10px] text-slate-500">Fill all fields for accurate AI triage scoring.</p>
            </div>

            <Select
              label="Emergency Type"
              value={formData.disaster_type}
              onChange={e => setFormData({...formData, disaster_type: e.target.value})}
            >
              <option value="Medical">Medical Emergency</option>
              <option value="Trapped">Structural Collapse / Trapped</option>
              <option value="Fire">Fire / Smoke Condition</option>
              <option value="Flood">Water Level Rising</option>
              <option value="Earthquake">Earthquake Aftermath</option>
              <option value="Chemical">Chemical / HAZMAT Exposure</option>
            </Select>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-1 block">Injury Severity</label>
              <div className="flex gap-2">
                {['Minor', 'Moderate', 'Severe'].map(s => (
                  <button key={s} onClick={() => setFormData({...formData, injury_severity: s})}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                      formData.injury_severity === s
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                        : 'bg-[var(--color-bg-secondary)] border border-white/5 text-slate-400 hover:border-blue-500/30'
                    }`}>
                    {s === 'Minor' ? 'Green - ' : s === 'Moderate' ? 'Yellow - ' : 'Red - '} {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Select label="Group Size" value={formData.group_size} onChange={e => setFormData({...formData, group_size: parseInt(e.target.value)})}>
                <option value={1}>1 Person</option>
                <option value={2}>2 People</option>
                <option value={3}>3-4 People</option>
                <option value={5}>5+ People</option>
                <option value={10}>10+ (Mass)</option>
              </Select>
              <Select label="Conditions" value={formData.environment} onChange={e => setFormData({...formData, environment: e.target.value})}>
                <option value="Normal">Normal</option>
                <option value="Night">Nighttime</option>
                <option value="Rain">Heavy Rain</option>
                <option value="Extreme_Heat">Extreme Heat</option>
              </Select>
            </div>

            <div className="flex gap-2">
              <div className="flex-1 bg-[var(--color-bg-secondary)] border border-white/5 rounded-xl p-2.5 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-bold uppercase"><i className="fa-solid fa-battery-half mr-1"></i>Power</span>
                <span className={`font-bold text-sm ${formData.battery_level < 20 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>{formData.battery_level}%</span>
              </div>
              <div className="flex-1 bg-[var(--color-bg-secondary)] border border-white/5 rounded-xl p-2.5 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-bold uppercase"><i className="fa-solid fa-satellite mr-1"></i>GPS</span>
                <span className="font-bold text-sm text-emerald-400">LOCKED</span>
              </div>
            </div>

            {status === 'SENT' ? (
              <div className="bg-[var(--color-bg-surface)] border border-blue-500/20 rounded-2xl p-4">
                <h4 className="font-bold text-blue-300 flex items-center gap-2 mb-2">
                  <i className="fa-solid fa-check-circle text-[var(--color-amber)]"></i> Signal Transmitted
                </h4>
                <p className="text-[11px] text-slate-400 mb-2">AI Command logged your coordinates. Rescue routing in progress.</p>
                <div className="bg-[var(--color-bg-primary)] rounded-lg p-2.5 text-xs font-bold flex justify-between items-center">
                  <span className="text-slate-400">Unit Dispatch</span>
                  <span className="text-[var(--color-amber)] animate-pulse">Routing...</span>
                </div>
                <Button variant="secondary" icon="rotate-left" className="w-full mt-3" onClick={() => setStatus('IDLE')}>
                  Send Another SOS
                </Button>
              </div>
            ) : (
              <Button
                variant="sos"
                icon="satellite-dish"
                loading={loading}
                className="w-full py-4 rounded-2xl"
                onClick={sendSOS}
              >
                TRANSMIT SOS
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-[var(--color-bg-deep)]">
          <div className="h-12 bg-[var(--color-bg-secondary)]/60 border-b border-white/5 flex items-center px-5 shrink-0">
            <i className="fa-solid fa-comments text-[var(--color-amber)] mr-3"></i>
            <h2 className="font-bold text-white text-sm">Live Communication</h2>
            <span className="ml-auto text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {isOnline ? 'Connected' : 'Offline Cache'}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {loadingMessages ? (
              <div className="space-y-3 p-4">
                <MessageSkeleton incoming />
                <MessageSkeleton />
                <MessageSkeleton incoming />
              </div>
            ) : allMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-600">
                <div className="w-16 h-16 rounded-full bg-[var(--color-bg-surface)] flex items-center justify-center mb-4">
                  <i className="fa-solid fa-message text-2xl opacity-30"></i>
                </div>
                <p className="text-sm font-semibold">No messages yet</p>
                <p className="text-xs mt-1 text-slate-700">Rescuer instructions will appear here after your SOS.</p>
              </div>
            ) : (
              allMessages.map((msg: any) => (
                <div key={msg.id} className={`flex ${msg.senderRole === 'VICTIM' ? 'justify-end' : 'justify-start'} ${msg.optimistic ? 'opacity-80' : ''}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                    msg.senderRole === 'VICTIM'
                      ? 'bg-blue-600 text-white rounded-br-md'
                      : 'bg-[var(--color-bg-surface)] border border-[var(--color-amber)]/20 text-slate-200 rounded-bl-md'
                  } ${msg.failed ? 'border-red-500/50 border-dashed' : ''}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                        {msg.senderRole === 'RESCUER' ? 'Rescuer' : ''}{msg.senderName !== 'You' ? msg.senderName : ''}
                      </span>
                      {msg.optimistic && <Badge intent="info" dot={false}>Sending...</Badge>}
                      {msg.failed && <Badge intent="critical" dot={false}>Failed</Badge>}
                    </div>
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                    <p className="text-[9px] opacity-40 mt-1 text-right">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef}></div>
          </div>

          <div className="p-4 border-t border-white/5 bg-[var(--color-bg-secondary)]/40 shrink-0">
            <div className="flex gap-2">
              <Input
                type="text"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder={isOnline ? 'Type a message to rescue command...' : 'Message queued for sync...'}
                className="flex-1"
              />
              <Button
                icon="paper-plane"
                onClick={sendMessage}
                disabled={!newMessage.trim()}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
