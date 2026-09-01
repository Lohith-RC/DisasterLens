'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/Button';
import { Badge, PriorityBadge, StatusBadge } from '@/components/ui/Badge';
import { Toast, type ToastData } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { SignalCardSkeleton, MessageSkeleton } from '@/components/ui/Skeleton';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { TriageSimulatorModal } from '@/components/ui/TriageSimulatorModal';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { playNewSignalSound, playDispatchSound, playResolveSound, playMessageSound } from '@/lib/notifications';
import { calculateDistanceKm, calculateBearing } from '@/lib/geo';

const MapComponent = dynamic(() => import('@/components/Map'), { ssr: false });

export default function RescuerDashboard() {
  const router = useRouter();
  const [signals, setSignals] = useState<any[]>([]);
  const [activeSignal, setActiveSignal] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [tab, setTab] = useState<'triage' | 'comms'>('triage');
  const [actionLoading, setActionLoading] = useState('');
  const [toast, setToast] = useState<ToastData | null>(null);
  const [loadingSignals, setLoadingSignals] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [isSseConnected, setIsSseConnected] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [resolvedTotal, setResolvedTotal] = useState(0);

  // Filter and Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'CRITICAL' | 'PENDING' | 'DISPATCHED'>('ALL');

  // Rescuer Unit Position
  const [rescuerPos, setRescuerPos] = useState<[number, number]>([12.9716, 77.5946]);

  const [confirmModal, setConfirmModal] = useState<{ type: 'dispatch' | 'resolve'; signalId: string } | null>(null);

  const previousSignalCount = useRef(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback((msg: string, type: ToastData['type'] = 'info') => {
    setToast({ msg, type });
  }, []);

  // Detect Rescuer live GPS position on load
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setRescuerPos([pos.coords.latitude, pos.coords.longitude]);
        },
        () => {
          // Default to Bangalore command center if denied
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
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

  const fetchSignals = useCallback(async () => {
    try {
      const res = await fetch('/api/sos/stream');
      const data = await res.json();
      if (data.signals) {
        if (data.signals.length > previousSignalCount.current && previousSignalCount.current > 0 && !audioMuted) {
          playNewSignalSound();
        }
        previousSignalCount.current = data.signals.length;
        setSignals(data.signals);
        if (typeof data.resolvedCount === 'number') {
          setResolvedTotal(data.resolvedCount);
        }
        if (activeSignal) {
          const updated = data.signals.find((s: any) => s.id === activeSignal.id);
          if (updated) setActiveSignal(updated);
          else setActiveSignal(null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch signals:', err);
    } finally {
      setLoadingSignals(false);
    }
  }, [activeSignal, audioMuted]);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/messages/stream');
      const data = await res.json();
      if (data.messages) setMessages(data.messages);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  // Real-Time Server-Sent Events (SSE) stream setup
  useEffect(() => {
    fetchSignals();
    fetchMessages();

    let es: EventSource | null = null;

    try {
      es = new EventSource('/api/events');

      es.onopen = () => {
        setIsSseConnected(true);
      };

      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'signal_update') {
            fetchSignals();
          } else if (payload.type === 'message_update') {
            fetchMessages();
          }
        } catch {
          // ignore heartbeat or parse issue
        }
      };

      es.onerror = () => {
        setIsSseConnected(false);
      };
    } catch {
      setIsSseConnected(false);
    }

    // Gentle heartbeat fallback (every 15s instead of 4s aggressive polling)
    const fallbackInterval = setInterval(() => {
      fetchSignals();
      fetchMessages();
    }, 15000);

    return () => {
      if (es) es.close();
      clearInterval(fallbackInterval);
    };
  }, [fetchSignals, fetchMessages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelect = (id: string) => {
    const s = signals.find((x: any) => x.id === id);
    if (s) {
      setActiveSignal(s);
      setTab('triage');
    }
  };

  useKeyboardShortcuts([
    {
      key: 'd',
      handler: () => {
        if (activeSignal?.status === 'PENDING')
          setConfirmModal({ type: 'dispatch', signalId: activeSignal.id });
      },
      enabled: !!activeSignal && tab === 'triage',
    },
    {
      key: 'r',
      handler: () => {
        if (activeSignal && activeSignal.status !== 'RESOLVED')
          setConfirmModal({ type: 'resolve', signalId: activeSignal.id });
      },
      enabled: !!activeSignal && tab === 'triage',
    },
    ...signals.slice(0, 9).map((sig, i) => ({
      key: String(i + 1),
      handler: () => handleSelect(sig.id),
      enabled: true,
    })),
  ]);

  const handleDispatch = async () => {
    if (!confirmModal) return;
    const { signalId } = confirmModal;
    setActionLoading('dispatch_' + signalId);
    setConfirmModal(null);
    try {
      const res = await fetch('/api/sos/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signalId, action: 'DISPATCHED' }),
      });
      if (res.ok) {
        if (!audioMuted) playDispatchSound();
        await fetchSignals();
        await fetchMessages();
        showToast('Rescue unit dispatched! Victim notified.', 'success');
      }
    } catch {
      showToast('Dispatch failed', 'error');
    }
    setActionLoading('');
  };

  const handleResolve = async () => {
    if (!confirmModal) return;
    const { signalId } = confirmModal;
    setActionLoading('resolve_' + signalId);
    setConfirmModal(null);
    try {
      const res = await fetch('/api/sos/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signalId, action: 'RESOLVED' }),
      });
      if (res.ok) {
        if (!audioMuted) playResolveSound();
        await fetchSignals();
        await fetchMessages();
        if (activeSignal?.id === signalId) setActiveSignal(null);
        showToast('Signal resolved and logged.', 'success');
      }
    } catch {
      showToast('Resolve failed', 'error');
    }
    setActionLoading('');
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newMessage,
          recipientId: activeSignal?.userId || null,
          signalId: activeSignal?.id || null,
        }),
      });
      if (res.ok) {
        if (!audioMuted) playMessageSound();
        setNewMessage('');
        fetchMessages();
      }
    } catch {
      // silent
    }
  };

  // Filter signals
  const filteredSignals = signals.filter((sig: any) => {
    // Status filter
    if (statusFilter === 'CRITICAL' && sig.priority_score < 60) return false;
    if (statusFilter === 'PENDING' && sig.status !== 'PENDING') return false;
    if (statusFilter === 'DISPATCHED' && sig.status !== 'DISPATCHED') return false;

    // Search query
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      sig.user?.name?.toLowerCase().includes(q) ||
      sig.disaster_type?.toLowerCase().includes(q) ||
      sig.status?.toLowerCase().includes(q)
    );
  });

  // KPI Metrics Calculation
  const totalCount = signals.length;
  const criticalCount = signals.filter((s: any) => s.priority_score >= 60).length;
  const pendingCount = signals.filter((s: any) => s.status === 'PENDING').length;
  const dispatchedCount = signals.filter((s: any) => s.status === 'DISPATCHED').length;
  const resolvedCount = resolvedTotal || signals.filter((s: any) => s.status === 'RESOLVED').length;

  // Active Signal Vector Data
  const distanceToVictim =
    activeSignal?.location_lat && activeSignal?.location_lng && rescuerPos
      ? calculateDistanceKm(rescuerPos[0], rescuerPos[1], activeSignal.location_lat, activeSignal.location_lng)
      : null;
  const bearingToVictim =
    activeSignal?.location_lat && activeSignal?.location_lng && rescuerPos
      ? calculateBearing(rescuerPos[0], rescuerPos[1], activeSignal.location_lat, activeSignal.location_lng)
      : null;
  const etaMins = distanceToVictim ? Math.max(2, Math.round((distanceToVictim / 40) * 60)) : null;

  return (
    <div
      className="h-screen flex flex-col bg-[var(--color-bg-primary)] text-slate-50 overflow-hidden"
      style={{ fontFamily: 'var(--font-body)' }}
    >
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      {/* Interactive MCDM Simulator Modal */}
      <TriageSimulatorModal isOpen={simulatorOpen} onClose={() => setSimulatorOpen(false)} />

      {/* Confirmation Modal */}
      <Modal
        open={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        onConfirm={confirmModal?.type === 'dispatch' ? handleDispatch : handleResolve}
        title={confirmModal?.type === 'dispatch' ? 'Dispatch Rescue Unit?' : 'Resolve Signal?'}
        description={
          confirmModal?.type === 'dispatch'
            ? "A tactical rescue unit will be deployed to the victim's GPS coordinates. They will receive automated status notifications."
            : 'This will mark the emergency operation as resolved. The victim will be notified.'
        }
        confirmLabel={confirmModal?.type === 'dispatch' ? 'Confirm Dispatch' : 'Confirm Resolve'}
        confirmVariant={confirmModal?.type || 'primary'}
        icon={confirmModal?.type === 'dispatch' ? 'fa-helicopter' : 'fa-check-double'}
        loading={actionLoading.startsWith(confirmModal?.type === 'dispatch' ? 'dispatch' : 'resolve')}
      />

      {/* Main Header */}
      <header className="h-16 bg-[var(--color-bg-secondary)]/90 border-b border-white/5 flex items-center justify-between px-6 z-20 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 gradient-blue rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <i className="fa-solid fa-satellite-dish text-white"></i>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              Disaster<span className="amber-shimmer">Lens</span>
            </h1>
            <p className="text-[9px] text-slate-500 uppercase tracking-[0.2em] font-semibold">
              Mission Control • Sector Command
            </p>
          </div>
        </div>

        {/* Tactical HUD KPI Stats */}
        <div className="hidden lg:flex items-center gap-2 bg-slate-950/70 border border-slate-800/80 rounded-xl px-3 py-1.5 font-mono text-xs">
          <div className="flex items-center gap-1.5 px-2 border-r border-slate-800">
            <span className="text-slate-500">TOTAL:</span>
            <span className="font-bold text-slate-200">{totalCount}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 border-r border-slate-800">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            <span className="text-red-400 font-bold">{criticalCount} CRIT</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 border-r border-slate-800">
            <span className="text-amber-400 font-bold">{pendingCount} QUEUED</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 border-r border-slate-800">
            <span className="text-sky-400 font-bold">{dispatchedCount} ACTIVE</span>
          </div>
          <div className="flex items-center gap-1.5 px-2">
            <span className="text-emerald-400 font-bold">{resolvedCount} RESOLVED</span>
          </div>
        </div>

        {/* Controls & Connection Status */}
        <div className="flex items-center gap-3">
          {/* Triage Simulator Launcher */}
          <button
            onClick={() => setSimulatorOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-300 border border-blue-500/30 hover:bg-blue-600/30 transition shadow-sm"
          >
            <i className="fa-solid fa-brain"></i>
            <span className="hidden sm:inline">Triage Sandbox</span>
          </button>

          {/* Audio Mute Toggle */}
          <button
            onClick={() => setAudioMuted(!audioMuted)}
            className={`p-2 rounded-lg border text-xs transition ${
              audioMuted
                ? 'bg-slate-800 text-slate-400 border-slate-700'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}
            title={audioMuted ? 'Unmute Audio Cues' : 'Mute Audio Cues'}
          >
            <i className={`fa-solid ${audioMuted ? 'fa-volume-xmark' : 'fa-volume-high'}`}></i>
          </button>

          {/* Real-Time Stream Status */}
          <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <span className="flex h-2.5 w-2.5 relative">
              {isSseConnected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  isSseConnected ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              ></span>
            </span>
            <span className="text-[11px] font-mono text-slate-300">
              {isSseConnected ? 'LIVE STREAM' : 'SYNC POLLING'}
            </span>
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
        {/* Left SOS Grid Sidebar */}
        <aside className="w-[360px] bg-[var(--color-bg-secondary)]/40 flex flex-col border-r border-white/5 z-20 shrink-0">
          <div className="p-4 border-b border-white/5 space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="type-h3 flex items-center gap-2">
                <i className="fa-solid fa-layer-group text-[var(--color-amber)]"></i> Active SOS Grid
              </h2>
              <Badge intent="info">{filteredSignals.length} Found</Badge>
            </div>

            {/* Search Box */}
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search victim, hazard, status..."
              className="text-xs"
            />

            {/* Quick Filter Buttons */}
            <div className="grid grid-cols-4 gap-1.5 pt-1">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'CRITICAL', label: 'Critical' },
                { id: 'PENDING', label: 'Pending' },
                { id: 'DISPATCHED', label: 'In Transit' },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setStatusFilter(filter.id as any)}
                  className={`py-1 text-[10px] font-bold uppercase rounded-md border transition ${
                    statusFilter === filter.id
                      ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold flex items-center justify-between">
              <span>AI Triage Ranked</span>
              <span>
                <kbd className="text-[var(--color-amber)]">1</kbd>-<kbd className="text-[var(--color-amber)]">9</kbd> Quick Pick
              </span>
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loadingSignals ? (
              Array.from({ length: 3 }).map((_, i) => <SignalCardSkeleton key={i} />)
            ) : filteredSignals.length === 0 ? (
              <div className="text-center text-slate-600 mt-16">
                <i className="fa-solid fa-satellite-dish text-3xl mb-3 opacity-20"></i>
                <p className="text-sm font-medium">No signals matching filters</p>
                <p className="text-xs text-slate-700 mt-1">Awaiting incoming telemetry...</p>
              </div>
            ) : (
              filteredSignals.map((sig: any, idx: number) => {
                const isSelected = activeSignal?.id === sig.id;
                return (
                  <Card
                    key={sig.id}
                    onClick={() => handleSelect(sig.id)}
                    active={isSelected}
                    hover
                    className="p-3"
                  >
                    <div className="flex items-start gap-2 mb-2">
                      {isSelected && (
                        <div className="w-1 h-full min-h-[2rem] bg-blue-500 rounded-full shrink-0 mt-0.5 shadow-sm shadow-blue-500"></div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-bold text-sm text-white truncate flex items-center gap-1.5">
                            <span className="text-[9px] text-slate-500 font-mono">[{idx + 1}]</span>
                            {sig.user?.name}
                          </span>
                          <PriorityBadge score={sig.priority_score} />
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-500">
                          <span>
                            <i className="fa-solid fa-triangle-exclamation mr-1 text-amber-500"></i>
                            {sig.disaster_type}
                          </span>
                          <StatusBadge status={sig.status} />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-1.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {sig.status === 'PENDING' && (
                        <Button
                          variant="dispatch"
                          size="sm"
                          icon="helicopter"
                          loading={actionLoading === 'dispatch_' + sig.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmModal({ type: 'dispatch', signalId: sig.id });
                          }}
                          className="flex-1"
                        >
                          Dispatch
                        </Button>
                      )}
                      {sig.status !== 'RESOLVED' && (
                        <Button
                          variant="resolve"
                          size="sm"
                          icon="check"
                          loading={actionLoading === 'resolve_' + sig.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmModal({ type: 'resolve', signalId: sig.id });
                          }}
                          className="flex-1"
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </aside>

        {/* Center Tactical Map */}
        <section className="flex-1 relative z-10 w-full h-full">
          <MapComponent
            signals={signals}
            activeSignalId={activeSignal?.id}
            onMarkerClick={handleSelect}
            rescuerPos={rescuerPos}
          />
        </section>

        {/* Right Inspection & Comms Panel */}
        <aside className="w-[400px] bg-[var(--color-bg-secondary)]/60 border-l border-white/5 flex flex-col z-20 shrink-0">
          <div className="flex border-b border-white/5 shrink-0">
            <button
              onClick={() => setTab('triage')}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition ${
                tab === 'triage'
                  ? 'text-[var(--color-amber)] border-b-2 border-[var(--color-amber)] bg-[var(--color-amber)]/5'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <i className="fa-solid fa-brain mr-1"></i> AI Triage <kbd className="ml-1 text-[9px] opacity-60">D/R</kbd>
            </button>
            <button
              onClick={() => setTab('comms')}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition ${
                tab === 'comms'
                  ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/5'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <i className="fa-solid fa-comments mr-1"></i> Comms
              {messages.length > 0 && (
                <span className="ml-1 bg-blue-500/30 text-blue-300 text-[9px] px-1.5 py-0.5 rounded-full">
                  {messages.length}
                </span>
              )}
            </button>
          </div>

          {tab === 'triage' ? (
            !activeSignal ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-600">
                <i className="fa-solid fa-crosshairs text-4xl mb-3 opacity-20 animate-pulse"></i>
                <p className="text-sm font-semibold">Select an SOS beacon to inspect</p>
                <p className="text-xs text-slate-700 mt-2">
                  Use keys <kbd className="text-[var(--color-amber)]">1</kbd>-<kbd className="text-[var(--color-amber)]">9</kbd> to rapidly navigate beacons.
                </p>
              </div>
            ) : (
              <div className="flex-1 p-4 flex flex-col overflow-y-auto space-y-4">
                <div>
                  <div className="flex items-start justify-between mb-1.5">
                    <h3 className="type-h3 text-white">{activeSignal.user?.name}</h3>
                    <StatusBadge status={activeSignal.status} />
                  </div>

                  {/* Tactical Distance & Bearing Banner */}
                  {distanceToVictim !== null && (
                    <div className="mb-3 px-3 py-2 rounded-xl bg-sky-950/40 border border-sky-500/30 flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-1.5 text-sky-300">
                        <i className="fa-solid fa-location-arrow text-sky-400"></i>
                        <span>{distanceToVictim} km</span>
                        <span className="text-sky-500">({bearingToVictim})</span>
                      </div>
                      <div className="text-sky-400 font-bold">~{etaMins}m ETA</div>
                    </div>
                  )}

                  <p className="text-[10px] text-slate-500 font-mono">
                    GPS: {activeSignal.location_lat?.toFixed(4)}, {activeSignal.location_lng?.toFixed(4)}
                  </p>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="bg-[var(--color-bg-primary)] p-2.5 rounded-xl border border-white/5 text-center">
                      <p className="text-[9px] uppercase text-slate-500 font-bold mb-1">Battery</p>
                      <p
                        className={`font-bold text-sm ${
                          activeSignal.battery_level < 20 ? 'text-red-400 animate-pulse' : 'text-emerald-400'
                        }`}
                      >
                        {activeSignal.battery_level}%
                      </p>
                    </div>
                    <div className="bg-[var(--color-bg-primary)] p-2.5 rounded-xl border border-white/5 text-center">
                      <p className="text-[9px] uppercase text-slate-500 font-bold mb-1">Hazard</p>
                      <p className="font-bold text-sm text-slate-200">{activeSignal.disaster_type}</p>
                    </div>
                    <div className="bg-[var(--color-bg-primary)] p-2.5 rounded-xl border border-white/5 text-center">
                      <p className="text-[9px] uppercase text-slate-500 font-bold mb-1">Severity</p>
                      <p className="font-bold text-sm text-orange-400">{activeSignal.injury_severity}</p>
                    </div>
                  </div>
                </div>

                {/* AI Reasoning Log */}
                <div className="bg-[var(--color-bg-primary)] border border-white/5 p-4 rounded-2xl">
                  <h4 className="type-xs uppercase font-bold text-[var(--color-amber)] mb-2.5 flex items-center gap-2">
                    <i className="fa-solid fa-robot"></i> Explainable AI Decision Vector
                  </h4>
                  <div
                    className="text-xs text-slate-300 leading-relaxed bg-black/40 p-3 rounded-xl border border-white/5"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {activeSignal.ai_explanation || 'Computing triage parameters...'}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 mt-auto pt-2">
                  {activeSignal.status === 'PENDING' && (
                    <Button
                      variant="dispatch-pulse"
                      icon="helicopter"
                      loading={actionLoading === 'dispatch_' + activeSignal.id}
                      onClick={() => setConfirmModal({ type: 'dispatch', signalId: activeSignal.id })}
                      className="w-full py-3.5"
                    >
                      Dispatch Tactical Rescue Unit
                    </Button>
                  )}

                  {activeSignal.status === 'DISPATCHED' && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-400 flex items-center gap-2">
                      <i className="fa-solid fa-truck-fast animate-pulse"></i>
                      <span className="font-bold">Rescue team deployed • Navigation vector active</span>
                    </div>
                  )}

                  {activeSignal.status !== 'RESOLVED' && (
                    <Button
                      variant="resolve"
                      icon="check-double"
                      loading={actionLoading === 'resolve_' + activeSignal.id}
                      onClick={() => setConfirmModal({ type: 'resolve', signalId: activeSignal.id })}
                      className="w-full py-3"
                    >
                      Mark Resolved & Close Operation
                    </Button>
                  )}

                  <Button
                    variant="primary"
                    icon="comments"
                    className="w-full py-3"
                    onClick={() => setTab('comms')}
                  >
                    Transmit Instructions to Victim
                  </Button>
                </div>
              </div>
            )
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMessages ? (
                  <div className="space-y-3">
                    <MessageSkeleton incoming />
                    <MessageSkeleton />
                    <MessageSkeleton incoming />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-600">
                    <i className="fa-solid fa-message text-3xl mb-3 opacity-20"></i>
                    <p className="text-sm">No communications logged.</p>
                    <p className="text-[10px] text-slate-700 mt-1">
                      Dispatching a unit will send automated updates.
                    </p>
                  </div>
                ) : (
                  messages.map((msg: any) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.senderRole === 'RESCUER' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                          msg.senderRole === 'RESCUER'
                            ? 'bg-blue-600 text-white rounded-br-md shadow-md shadow-blue-500/20'
                            : 'bg-[var(--color-bg-primary)] border border-amber-500/20 text-slate-200 rounded-bl-md'
                        }`}
                      >
                        <div className="text-[9px] font-bold uppercase tracking-wider opacity-60 mb-1 flex items-center justify-between">
                          <span>{msg.senderName}</span>
                          <span className="text-[8px] font-mono">{msg.senderRole}</span>
                        </div>
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                        <p className="text-[9px] opacity-40 mt-1 text-right">
                          {new Date(msg.createdAt || msg.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatEndRef}></div>
              </div>

              <div className="p-3 border-t border-white/5 shrink-0">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type urgent rescue instructions..."
                  />
                  <Button icon="paper-plane" onClick={sendMessage} disabled={!newMessage.trim()} />
                </div>
              </div>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
