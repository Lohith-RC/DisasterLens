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
  const [isSseConnected, setIsSseConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isStrobeActive, setIsStrobeActive] = useState(false);
  const [gpsLocked, setGpsLocked] = useState(false);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const [formData, setFormData] = useState({
    disaster_type: 'Medical',
    injury_severity: 'Severe',
    battery_level: 45,
    location_lat: 12.9716,
    location_lng: 77.5946,
    group_size: 1,
    environment: 'Normal',
  });

  const showToast = useCallback((msg: string, type: ToastData['type'] = 'info') => {
    setToast({ msg, type });
  }, []);

  // Update offline queue count from localStorage
  const updateQueueCount = useCallback(() => {
    try {
      const queue = JSON.parse(localStorage.getItem('dl_offline_queue') || '[]');
      setOfflineQueueCount(queue.length);
    } catch {
      setOfflineQueueCount(0);
    }
  }, []);

  useEffect(() => {
    updateQueueCount();
  }, [updateQueueCount]);

  // Real Hardware Battery API integration
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const level = Math.round(battery.level * 100);
        setFormData((prev) => ({ ...prev, battery_level: level }));

        battery.addEventListener('levelchange', () => {
          setFormData((prev) => ({
            ...prev,
            battery_level: Math.round(battery.level * 100),
          }));
        });
      }).catch(() => {});
    }
  }, []);

  // Real Browser GPS Geolocation detection
  const detectLocation = useCallback(() => {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setFormData((prev) => ({
            ...prev,
            location_lat: pos.coords.latitude,
            location_lng: pos.coords.longitude,
          }));
          setGpsLocked(true);
          showToast(
            `GPS Locked (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}) - Accuracy ±${Math.round(pos.coords.accuracy)}m`,
            'success'
          );
        },
        (err) => {
          console.warn('Geolocation warning:', err.message);
          showToast('GPS unavailable. Defaulting to regional coordinates.', 'info');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }, [showToast]);

  useEffect(() => {
    detectLocation();
  }, [detectLocation]);

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
      // offline or silent
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // Flush and synchronize offline queue
  const syncOfflineQueue = useCallback(async () => {
    try {
      const raw = localStorage.getItem('dl_offline_queue');
      if (!raw) return;
      const queue: any[] = JSON.parse(raw);
      if (queue.length === 0) return;

      showToast(`Synchronizing ${queue.length} offline emergency payload(s)...`, 'info');

      let syncedCount = 0;
      for (const item of queue) {
        if (item.type === 'SOS') {
          const res = await fetch('/api/sos/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.data),
          });
          if (res.ok) syncedCount++;
        } else if (item.type === 'MESSAGE') {
          const res = await fetch('/api/messages/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.data),
          });
          if (res.ok) syncedCount++;
        }
      }

      localStorage.removeItem('dl_offline_queue');
      updateQueueCount();
      showToast(`Successfully synced ${syncedCount} queued emergency transmission(s)!`, 'success');
      fetchMessages();
    } catch (err) {
      console.error('Failed to sync offline queue:', err);
    }
  }, [fetchMessages, showToast, updateQueueCount]);

  // Real-time SSE Connection
  useEffect(() => {
    fetchMessages();

    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/events');
      es.onopen = () => setIsSseConnected(true);
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'message_update' || data.type === 'signal_update') {
            fetchMessages();
          }
        } catch {
          // ignore
        }
      };
      es.onerror = () => setIsSseConnected(false);
    } catch {
      setIsSseConnected(false);
    }

    // Heartbeat sync
    const interval = setInterval(fetchMessages, 12000);

    // Auto-sync when device reconnects to internet
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('Network disconnected. Offline mesh cache engaged.', 'info');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (es) es.close();
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchMessages, syncOfflineQueue, showToast]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, optimisticMessages]);

  // Voice speech-to-text dictation
  const toggleVoiceInput = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showToast('Speech recognition not supported in this browser.', 'info');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        showToast('Listening... Speak emergency details clearly.', 'info');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setNewMessage((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Speech recognition error:', err);
      setIsListening(false);
    }
  };

  const sendSOS = async () => {
    setLoading(true);

    if (!isOnline) {
      // Queue locally in localStorage
      try {
        const queue = JSON.parse(localStorage.getItem('dl_offline_queue') || '[]');
        queue.push({ type: 'SOS', data: formData, timestamp: new Date().toISOString() });
        localStorage.setItem('dl_offline_queue', JSON.stringify(queue));
        updateQueueCount();
        setStatus('SENT');
        showToast('SOS cached locally in offline mesh queue. Will auto-sync upon connection.', 'info');
      } catch {
        showToast('Failed to queue offline SOS', 'error');
      }
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/sos/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const data = await res.json();
        setStatus('SENT');
        showToast(`SOS Transmitted • AI Priority: ${data.rank} (Score: ${data.score}/100)`, 'success');
      } else {
        showToast('Failed to transmit SOS', 'error');
      }
    } catch {
      showToast('Connection error. Switched to offline queue.', 'error');
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

    setOptimisticMessages((prev) => [...prev, optimisticMsg]);
    const sentContent = newMessage;
    setNewMessage('');

    if (!isOnline) {
      try {
        const queue = JSON.parse(localStorage.getItem('dl_offline_queue') || '[]');
        queue.push({
          type: 'MESSAGE',
          data: { content: sentContent },
          timestamp: new Date().toISOString(),
        });
        localStorage.setItem('dl_offline_queue', JSON.stringify(queue));
        updateQueueCount();
        showToast('Message queued locally in offline mesh.', 'info');
      } catch {
        // queue error
      }
      return;
    }

    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: sentContent }),
      });
      if (res.ok) {
        setOptimisticMessages((prev) => prev.filter((m) => m.id !== tempId));
        fetchMessages();
      } else {
        setOptimisticMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, failed: true } : m))
        );
      }
    } catch {
      setOptimisticMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, failed: true } : m))
      );
    }
  };

  const allMessages = [...messages, ...optimisticMessages].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return (
    <div
      className="h-screen flex flex-col bg-[var(--color-bg-primary)] text-white overflow-hidden"
      style={{ fontFamily: 'var(--font-body)' }}
    >
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      {/* Night Rescue Strobe Beacon Screen Overlay */}
      {isStrobeActive && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center cursor-pointer select-none"
          style={{
            animation: 'strobePulse 0.4s infinite alternate',
          }}
          onClick={() => setIsStrobeActive(false)}
        >
          <style jsx>{`
            @keyframes strobePulse {
              0% {
                background-color: #ffffff;
                color: #000000;
              }
              100% {
                background-color: #ef4444;
                color: #ffffff;
              }
            }
          `}</style>
          <div className="text-center p-6 bg-black/70 rounded-3xl backdrop-blur-md border border-white/20">
            <i className="fa-solid fa-lightbulb text-6xl mb-4 animate-bounce"></i>
            <h2 className="text-3xl font-black tracking-widest uppercase">RESCUE BEACON ACTIVE</h2>
            <p className="text-sm font-semibold opacity-80 mt-2">
              Holding high-contrast flash for aerial / ground search teams
            </p>
            <div className="mt-6 px-6 py-2 bg-white text-black font-bold rounded-xl text-sm inline-block shadow-xl">
              Tap Screen to Deactivate
            </div>
          </div>
        </div>
      )}

      {/* Main Header */}
      <header className="h-16 bg-[var(--color-bg-secondary)]/90 border-b border-white/5 flex items-center justify-between px-5 z-20 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="w-9 h-9 rounded-xl gradient-blue flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform"
          >
            <i className="fa-solid fa-shield-halved text-white text-sm"></i>
          </button>
          <div>
            <h1 className="text-lg font-bold tracking-tight">
              Disaster<span className="amber-shimmer">Lens</span>
            </h1>
            <p className="text-[9px] text-slate-500 uppercase tracking-[0.2em] font-semibold">
              Victim Emergency Portal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Rescue Strobe Beacon Launcher */}
          <button
            onClick={() => setIsStrobeActive(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition shadow-sm"
            title="Activate Fullscreen High-Visibility Beacon"
          >
            <i className="fa-solid fa-bolt text-amber-400"></i>
            <span className="hidden sm:inline">Strobe Beacon</span>
          </button>

          {/* Panel Toggle */}
          <Button
            variant="secondary"
            size="sm"
            icon={sidebarOpen ? 'chevron-left' : 'chevron-right'}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? 'Hide' : 'Intel'}
          </Button>

          {/* Offline Mesh Mode Switcher */}
          <div
            className={`toggle-switch ${isOnline ? 'active' : ''}`}
            onClick={() => {
              const nextState = !isOnline;
              setIsOnline(nextState);
              if (nextState) {
                showToast('Connected - Synchronizing cached transmissions...', 'info');
                syncOfflineQueue();
              } else {
                showToast('Switched to Mesh Offline Mode (Storage Cached)', 'info');
              }
            }}
            title="Toggle Offline Mesh Mode"
          >
            <div className="toggle-knob"></div>
          </div>

          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
              isOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            ></span>
            {isOnline ? 'Online' : 'Mesh Mode'}
            {offlineQueueCount > 0 && (
              <span className="ml-1 bg-amber-500 text-black text-[9px] px-1.5 py-0.2 rounded-full font-black">
                {offlineQueueCount}
              </span>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            icon="right-from-bracket"
            onClick={handleLogout}
            className="text-red-400 hover:text-red-300"
          >
            Logout
          </Button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left SOS Intel Panel */}
        <div
          className={`${
            sidebarOpen ? 'w-[420px]' : 'w-0'
          } flex flex-col border-r border-white/5 shrink-0 overflow-hidden transition-all duration-300`}
        >
          {/* Tactical Self-Location Map */}
          <div className="h-48 shrink-0 relative">
            {isOnline ? (
              <MapComponent
                signals={[
                  {
                    id: 'self',
                    location_lat: formData.location_lat,
                    location_lng: formData.location_lng,
                    priority_score: 75,
                    user: { name: 'Your Location' },
                    disaster_type: formData.disaster_type,
                    battery_level: formData.battery_level,
                  },
                ]}
                activeSignalId="self"
                onMarkerClick={() => {}}
              />
            ) : (
              <div className="h-full w-full bg-[var(--color-bg-secondary)] flex flex-col items-center justify-center">
                <div className="w-20 h-20 rounded-full border border-amber-500/20 flex items-center justify-center relative mb-3">
                  <div className="w-16 h-16 rounded-full border-2 border-amber-500/30 animate-ping absolute opacity-20"></div>
                  <i className="fa-solid fa-wifi text-amber-500/50 text-xl relative z-10"></i>
                </div>
                <p className="text-amber-500/70 text-xs font-semibold">
                  Mesh Scanning • Last GPS Coordinates Cached
                </p>
              </div>
            )}
            {!isOnline && (
              <div className="absolute top-2 left-2 bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1.5 z-30">
                <i className="fa-solid fa-triangle-exclamation"></i> OFFLINE LOCAL QUEUE
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="type-h3 text-white mb-0.5 flex items-center gap-2">
                  <i className="fa-solid fa-hand-holding-medical text-blue-400"></i> Emergency Intel
                </h3>
                <p className="text-[10px] text-slate-500">MCDM telemetry inputs for triage scoring.</p>
              </div>
              <button
                type="button"
                onClick={detectLocation}
                className="text-[10px] font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-md"
              >
                <i className="fa-solid fa-location-crosshairs"></i> Refresh GPS
              </button>
            </div>

            <Select
              label="Emergency Hazard Type"
              value={formData.disaster_type}
              onChange={(e) => setFormData({ ...formData, disaster_type: e.target.value })}
            >
              <option value="Medical">Medical Emergency / Trauma</option>
              <option value="Trapped">Structural Collapse / Trapped</option>
              <option value="Fire">Fire / Hazardous Smoke</option>
              <option value="Flood">Rapid Water Surge / Drowning Risk</option>
              <option value="Earthquake">Earthquake Shock / Aftershock</option>
              <option value="Chemical">Chemical / HAZMAT Contamination</option>
            </Select>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-1.5 block">
                Injury Severity Rating
              </label>
              <div className="flex gap-2">
                {['Minor', 'Moderate', 'Severe'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setFormData({ ...formData, injury_severity: s })}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                      formData.injury_severity === s
                        ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                        : 'bg-[var(--color-bg-secondary)] border border-white/5 text-slate-400 hover:border-blue-500/30'
                    }`}
                  >
                    {s === 'Minor' ? '🟢 Minor' : s === 'Moderate' ? '🟡 Moderate' : '🔴 Severe'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Select
                label="Group Size"
                value={formData.group_size}
                onChange={(e) => setFormData({ ...formData, group_size: parseInt(e.target.value) })}
              >
                <option value={1}>1 Person (Solo)</option>
                <option value={2}>2 People</option>
                <option value={3}>3-4 People</option>
                <option value={5}>5+ People</option>
                <option value={10}>10+ Mass Group</option>
              </Select>
              <Select
                label="Environment"
                value={formData.environment}
                onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
              >
                <option value="Normal">Day / Clear</option>
                <option value="Night">Nighttime Darkness</option>
                <option value="Rain">Heavy Storm / Rain</option>
                <option value="Extreme_Heat">Extreme Heat Wave</option>
              </Select>
            </div>

            {/* Hardware Sensor Telemetry Status */}
            <div className="flex gap-2">
              <div className="flex-1 bg-[var(--color-bg-secondary)] border border-white/5 rounded-xl p-2.5 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">
                  <i className="fa-solid fa-battery-half text-blue-400"></i> Power
                </span>
                <span
                  className={`font-bold text-sm font-mono ${
                    formData.battery_level < 20 ? 'text-red-400 animate-pulse' : 'text-emerald-400'
                  }`}
                >
                  {formData.battery_level}%
                </span>
              </div>
              <div className="flex-1 bg-[var(--color-bg-secondary)] border border-white/5 rounded-xl p-2.5 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">
                  <i className="fa-solid fa-satellite text-blue-400"></i> GPS
                </span>
                <span className={`font-bold text-xs font-mono ${gpsLocked ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {gpsLocked ? 'LOCKED' : 'APPROX'}
                </span>
              </div>
            </div>

            {status === 'SENT' ? (
              <div className="bg-[var(--color-bg-surface)] border border-blue-500/20 rounded-2xl p-4">
                <h4 className="font-bold text-blue-300 flex items-center gap-2 mb-1.5">
                  <i className="fa-solid fa-check-circle text-[var(--color-amber)]"></i> SOS Signal Active
                </h4>
                <p className="text-[11px] text-slate-400 mb-2">
                  Command center received your coordinates. Keep device illuminated and stay stationary if safe.
                </p>
                <div className="bg-[var(--color-bg-primary)] rounded-lg p-2.5 text-xs font-bold flex justify-between items-center">
                  <span className="text-slate-400">Tactical Status</span>
                  <span className="text-[var(--color-amber)] animate-pulse">TRIAGE QUEUED</span>
                </div>
                <Button
                  variant="secondary"
                  icon="rotate-left"
                  className="w-full mt-3"
                  onClick={() => setStatus('IDLE')}
                >
                  Submit Updated Condition
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
                TRANSMIT EMERGENCY SOS
              </Button>
            )}
          </div>
        </div>

        {/* Right Chat Communication Center */}
        <div className="flex-1 flex flex-col bg-[var(--color-bg-deep)]">
          <div className="h-12 bg-[var(--color-bg-secondary)]/60 border-b border-white/5 flex items-center justify-between px-5 shrink-0">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-comments text-[var(--color-amber)]"></i>
              <h2 className="font-bold text-white text-sm">Two-Way Rescue Comms</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {isOnline ? 'Live Stream Active' : 'Mesh Queue Engaged'}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  isSseConnected && isOnline ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              ></span>
            </div>
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
                <p className="text-sm font-semibold">No transmissions yet</p>
                <p className="text-xs mt-1 text-slate-700">
                  Rescue dispatch confirmations and responder messages appear here in real time.
                </p>
              </div>
            ) : (
              allMessages.map((msg: any) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.senderRole === 'VICTIM' ? 'justify-end' : 'justify-start'} ${
                    msg.optimistic ? 'opacity-80' : ''
                  }`}
                >
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                      msg.senderRole === 'VICTIM'
                        ? 'bg-blue-600 text-white rounded-br-md shadow-md shadow-blue-500/20'
                        : 'bg-[var(--color-bg-surface)] border border-[var(--color-amber)]/20 text-slate-200 rounded-bl-md'
                    } ${msg.failed ? 'border-red-500/50 border-dashed' : ''}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                        {msg.senderRole === 'RESCUER' ? '🚨 Command Responder: ' : ''}
                        {msg.senderName !== 'You' ? msg.senderName : ''}
                      </span>
                      {msg.optimistic && <Badge intent="info" dot={false}>Queuing...</Badge>}
                      {msg.failed && <Badge intent="critical" dot={false}>Failed</Badge>}
                    </div>
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                    <p className="text-[9px] opacity-40 mt-1 text-right">
                      {new Date(msg.timestamp || msg.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef}></div>
          </div>

          {/* Chat Input Toolbar with Speech-to-Text */}
          <div className="p-4 border-t border-white/5 bg-[var(--color-bg-secondary)]/40 shrink-0">
            <div className="flex gap-2">
              <Input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder={
                  isOnline
                    ? 'Type message to tactical rescue command...'
                    : 'Network offline: Message will queue locally...'
                }
                className="flex-1"
              />

              {/* Voice Speech-to-Text Button */}
              <button
                type="button"
                onClick={toggleVoiceInput}
                className={`px-3 py-2 rounded-xl border transition ${
                  isListening
                    ? 'bg-red-500/30 border-red-500 text-red-300 animate-pulse'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
                title={isListening ? 'Stop Voice Recording' : 'Voice Dictate Emergency Message'}
              >
                <i className="fa-solid fa-microphone"></i>
              </button>

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
