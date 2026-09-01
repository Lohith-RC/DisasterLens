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
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { playNewSignalSound, playDispatchSound, playResolveSound, playMessageSound } from '@/lib/notifications';

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

  const [confirmModal, setConfirmModal] = useState<{ type: 'dispatch' | 'resolve'; signalId: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const previousSignalCount = useRef(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

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

  const fetchSignals = useCallback(async () => {
    try {
      const res = await fetch('/api/sos/stream');
      const data = await res.json();
      if (data.signals) {
        if (data.signals.length > previousSignalCount.current && previousSignalCount.current > 0) {
          playNewSignalSound();
        }
        previousSignalCount.current = data.signals.length;
        setSignals(data.signals);
        if (activeSignal) {
          const updated = data.signals.find((s: any) => s.id === activeSignal.id);
          if (updated) setActiveSignal(updated);
          else setActiveSignal(null);
        }
      }
    } catch {
      // silent
    } finally {
      setLoadingSignals(false);
    }
  }, [activeSignal]);

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
    fetchSignals();
    fetchMessages();
    const i1 = setInterval(fetchSignals, 5000);
    const i2 = setInterval(fetchMessages, 4000);
    return () => { clearInterval(i1); clearInterval(i2); };
  }, [fetchSignals, fetchMessages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useKeyboardShortcuts([
    { key: 'd', handler: () => { if (activeSignal?.status === 'PENDING') setConfirmModal({ type: 'dispatch', signalId: activeSignal.id }); }, enabled: !!activeSignal && tab === 'triage' },
    { key: 'r', handler: () => { if (activeSignal && activeSignal.status !== 'RESOLVED') setConfirmModal({ type: 'resolve', signalId: activeSignal.id }); }, enabled: !!activeSignal && tab === 'triage' },
    ...signals.slice(0, 9).map((sig, i) => ({
      key: String(i + 1),
      handler: () => handleSelect(sig.id),
      enabled: true,
    })),
  ]);

  const handleSelect = (id: string) => {
    const s = signals.find((x: any) => x.id === id);
    if (s) {
      setActiveSignal(s);
      setTab('triage');
    }
  };

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
        playDispatchSound();
        await fetchSignals();
        await fetchMessages();
        showToast('Rescue unit dispatched! Victim has been notified.', 'success');
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
        playResolveSound();
        await fetchSignals();
        await fetchMessages();
        if (activeSignal?.id === signalId) setActiveSignal(null);
        showToast('Signal resolved and removed from active grid.', 'success');
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
        playMessageSound();
        setNewMessage('');
        fetchMessages();
      }
    } catch {
      // silent
    }
  };

  const filteredSignals = signals.filter((sig: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      sig.user?.name?.toLowerCase().includes(q) ||
      sig.disaster_type?.toLowerCase().includes(q) ||
      sig.status?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="h-screen flex flex-col bg-[var(--color-bg-primary)] text-slate-50 overflow-hidden" style={{ fontFamily: "var(--font-body)" }}>
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      <Modal
        open={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        onConfirm={confirmModal?.type === 'dispatch' ? handleDispatch : handleResolve}
        title={confirmModal?.type === 'dispatch' ? 'Dispatch Rescue Unit?' : 'Resolve Signal?'}
        description={
          confirmModal?.type === 'dispatch'
            ? 'A rescue unit will be dispatched to the victim\'s location. They will be notified immediately.'
            : 'This will mark the signal as resolved and remove it from the active grid. The victim will be notified.'
        }
        confirmLabel={confirmModal?.type === 'dispatch' ? 'Confirm Dispatch' : 'Confirm Resolve'}
        confirmVariant={confirmModal?.type || 'primary'}
        icon={confirmModal?.type === 'dispatch' ? 'fa-helicopter' : 'fa-check-double'}
        loading={actionLoading.startsWith(confirmModal?.type === 'dispatch' ? 'dispatch' : 'resolve')}
      />

      <header className="h-16 bg-[var(--color-bg-secondary)]/90 border-b border-white/5 flex items-center justify-between px-6 z-20 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 gradient-blue rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <i className="fa-solid fa-satellite-dish text-white"></i>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Disaster<span className="amber-shimmer">Lens</span></h1>
            <p className="text-[9px] text-slate-500 uppercase tracking-[0.2em] font-semibold">Rescuer Dashboard - Sector KA</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          <span className="text-sm font-semibold text-slate-300">System Live</span>
          <Badge intent="info">{signals.length} Active</Badge>
          <Button variant="ghost" size="sm" icon="right-from-bracket" onClick={handleLogout} className="text-red-400 hover:text-red-300">
            Logout
          </Button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <aside className="w-[340px] bg-[var(--color-bg-secondary)]/40 flex flex-col border-r border-white/5 z-20 shrink-0">
          <div className="p-4 border-b border-white/5 space-y-2">
            <h2 className="type-h3 flex items-center gap-2">
              <i className="fa-solid fa-layer-group text-[var(--color-amber)]"></i> Active SOS Grid
            </h2>
            <Input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name, type, status..."
              className="text-xs"
            />
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
              AI MCDM Ranked - Select to inspect &middot; <kbd className="text-[var(--color-amber)]">1</kbd>-<kbd className="text-[var(--color-amber)]">9</kbd> quick select
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loadingSignals ? (
              Array.from({ length: 3 }).map((_, i) => <SignalCardSkeleton key={i} />)
            ) : filteredSignals.length === 0 ? (
              <div className="text-center text-slate-600 mt-16">
                <i className="fa-solid fa-satellite-dish text-3xl mb-3 opacity-20"></i>
                <p className="text-sm">Awaiting incoming signals...</p>
              </div>
            ) : (
              filteredSignals.map((sig: any, idx: number) => {
                const statusBadge = sig.status === 'DISPATCHED' ? 'dispatched' as const : sig.status === 'RESOLVED' ? 'resolved' as const : 'critical' as const;
                return (
                  <Card
                    key={sig.id}
                    onClick={() => handleSelect(sig.id)}
                    active={activeSignal?.id === sig.id}
                    hover
                    className="p-3"
                  >
                    <div className="flex items-start gap-2 mb-2">
                      {activeSignal?.id === sig.id && (
                        <div className="w-1 h-full min-h-[2rem] bg-blue-500 rounded-full shrink-0 mt-0.5"></div>
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
                          <span><i className="fa-solid fa-truck-medical mr-1"></i>{sig.disaster_type}</span>
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
                          onClick={(e) => { e.stopPropagation(); setConfirmModal({ type: 'dispatch', signalId: sig.id }); }}
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
                          onClick={(e) => { e.stopPropagation(); setConfirmModal({ type: 'resolve', signalId: sig.id }); }}
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

        <section className="flex-1 relative z-10 w-full h-full">
          <MapComponent signals={signals} activeSignalId={activeSignal?.id} onMarkerClick={handleSelect} />
        </section>

        <aside className="w-[380px] bg-[var(--color-bg-secondary)]/60 border-l border-white/5 flex flex-col z-20 shrink-0">
          <div className="flex border-b border-white/5 shrink-0">
            <button onClick={() => setTab('triage')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition ${tab === 'triage' ? 'text-[var(--color-amber)] border-b-2 border-[var(--color-amber)] bg-[var(--color-amber)]/5' : 'text-slate-500 hover:text-slate-300'}`}>
              <i className="fa-solid fa-brain mr-1"></i> AI Triage <kbd className="ml-1 text-[9px] opacity-60">D/R</kbd>
            </button>
            <button onClick={() => setTab('comms')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition ${tab === 'comms' ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/5' : 'text-slate-500 hover:text-slate-300'}`}>
              <i className="fa-solid fa-comments mr-1"></i> Comms
              {messages.length > 0 && <span className="ml-1 bg-blue-500/30 text-blue-300 text-[9px] px-1.5 py-0.5 rounded-full">{messages.length}</span>}
            </button>
          </div>

          {tab === 'triage' ? (
            !activeSignal ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-600">
                <i className="fa-solid fa-crosshairs text-4xl mb-3 opacity-20 animate-pulse"></i>
                <p className="text-sm">Select an SOS beacon to view AI analysis.</p>
                <p className="text-xs text-slate-700 mt-2">Use keys <kbd className="text-[var(--color-amber)]">1</kbd>-<kbd className="text-[var(--color-amber)]">9</kbd> to quickly select signals.</p>
              </div>
            ) : (
              <div className="flex-1 p-4 flex flex-col overflow-y-auto">
                <div className="mb-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="type-h3 text-white">{activeSignal.user?.name}</h3>
                    <StatusBadge status={activeSignal.status} />
                  </div>
                  <p className="text-[10px] text-slate-500" style={{ fontFamily: 'var(--font-mono)' }}>
                    {activeSignal.location_lat?.toFixed(4)}, {activeSignal.location_lng?.toFixed(4)}
                  </p>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="bg-[var(--color-bg-primary)] p-3 rounded-xl border border-white/5 text-center">
                      <p className="text-[9px] uppercase text-slate-500 font-bold mb-1">Battery</p>
                      <p className={`font-bold text-sm ${activeSignal.battery_level < 20 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>{activeSignal.battery_level}%</p>
                    </div>
                    <div className="bg-[var(--color-bg-primary)] p-3 rounded-xl border border-white/5 text-center">
                      <p className="text-[9px] uppercase text-slate-500 font-bold mb-1">Hazard</p>
                      <p className="font-bold text-sm text-slate-200">{activeSignal.disaster_type}</p>
                    </div>
                    <div className="bg-[var(--color-bg-primary)] p-3 rounded-xl border border-white/5 text-center">
                      <p className="text-[9px] uppercase text-slate-500 font-bold mb-1">Severity</p>
                      <p className="font-bold text-sm text-orange-400">{activeSignal.injury_severity}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-[var(--color-bg-primary)] border border-white/5 p-4 rounded-2xl mb-4">
                  <h4 className="type-xs uppercase font-bold text-[var(--color-amber)] mb-3 flex items-center gap-2">
                    <i className="fa-solid fa-robot"></i> AI Reasoning Payload
                  </h4>
                  <div className="text-xs text-slate-300 leading-relaxed bg-black/30 p-3 rounded-xl" style={{ fontFamily: 'var(--font-mono)' }}>
                    {activeSignal.ai_explanation || 'Processing...'}
                  </div>
                </div>

                <div className="space-y-2 mt-auto">
                  {activeSignal.status === 'PENDING' && (
                    <Button
                      variant="dispatch-pulse"
                      icon="helicopter"
                      loading={actionLoading === 'dispatch_' + activeSignal.id}
                      onClick={() => setConfirmModal({ type: 'dispatch', signalId: activeSignal.id })}
                      className="w-full py-3.5"
                    >
                      Dispatch Rescue Unit
                    </Button>
                  )}

                  {activeSignal.status === 'DISPATCHED' && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-400 flex items-center gap-2">
                      <i className="fa-solid fa-truck-fast animate-pulse"></i>
                      <span className="font-bold">Unit en route - ETA calculating...</span>
                    </div>
                  )}

                  {activeSignal.status !== 'RESOLVED' && (
                    <Button
                      variant="resolve"
                      icon="check-double"
                      loading={actionLoading === 'resolve_' + activeSignal.id}
                      onClick={() => setConfirmModal({ type: 'resolve', signalId: activeSignal.id })}
                      className="w-full py-3.5"
                    >
                      Mark Resolved & Remove
                    </Button>
                  )}

                  <Button
                    variant="primary"
                    icon="comments"
                    className="w-full py-3.5"
                    onClick={() => setTab('comms')}
                  >
                    Send Instructions to Victim
                  </Button>

                  <Button
                    variant="secondary"
                    icon="tower-broadcast"
                    className="w-full py-3"
                    onClick={() => showToast('Mesh broadcast initiated. SOS relay propagated to nearby nodes.', 'info')}
                  >
                    Broadcast to Mesh Network
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
                    <p className="text-sm">No communications yet.</p>
                    <p className="text-[10px] text-slate-700 mt-1">Dispatch a unit to auto-message the victim.</p>
                  </div>
                ) : (
                  messages.map((msg: any) => (
                    <div key={msg.id} className={`flex ${msg.senderRole === 'RESCUER' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        msg.senderRole === 'RESCUER'
                          ? 'bg-blue-600 text-white rounded-br-md'
                          : 'bg-[var(--color-bg-primary)] border border-amber-500/20 text-slate-200 rounded-bl-md'
                      }`}>
                        <div className="text-[9px] font-bold uppercase tracking-wider opacity-60 mb-1">
                          {msg.senderName}
                        </div>
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                        <p className="text-[9px] opacity-30 mt-1 text-right">{new Date(msg.createdAt || msg.timestamp).toLocaleTimeString()}</p>
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
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                    placeholder="Send rescue instructions..."
                  />
                  <Button
                    icon="paper-plane"
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                  />
                </div>
              </div>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}
