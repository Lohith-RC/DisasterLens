'use client';

type BadgeIntent = 'critical' | 'high' | 'medium' | 'dispatched' | 'resolved' | 'info' | 'default';

const intentConfig: Record<BadgeIntent, { bg: string; text: string; dot: string }> = {
  critical: { bg: 'bg-red-500/20', text: 'text-red-400', dot: 'bg-red-400' },
  high: { bg: 'bg-orange-500/20', text: 'text-orange-400', dot: 'bg-orange-400' },
  medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', dot: 'bg-yellow-400' },
  dispatched: { bg: 'bg-amber-500/20', text: 'text-amber-400', dot: 'bg-amber-400' },
  resolved: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  info: { bg: 'bg-blue-500/20', text: 'text-blue-300', dot: 'bg-blue-400' },
  default: { bg: 'bg-white/5', text: 'text-slate-400', dot: 'bg-slate-400' },
};

interface BadgeProps {
  children: React.ReactNode;
  intent?: BadgeIntent;
  dot?: boolean;
  className?: string;
}

export function Badge({ children, intent = 'default', dot: showDot = true, className = '' }: BadgeProps) {
  const c = intentConfig[intent];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold ${c.bg} ${c.text} ${className}`}>
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />}
      {children}
    </span>
  );
}

export function PriorityBadge({ score }: { score: number }) {
  const isCrit = score >= 60;
  const isHigh = score >= 35;
  const intent: BadgeIntent = isCrit ? 'critical' : isHigh ? 'high' : 'medium';
  const label = isCrit ? 'CRITICAL' : isHigh ? 'HIGH' : 'MEDIUM';
  return <Badge intent={intent}>{label} [{score}]</Badge>;
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeIntent> = {
    PENDING: 'critical',
    DISPATCHED: 'dispatched',
    RESOLVED: 'resolved',
  };
  return <Badge intent={map[status] || 'default'}>{status}</Badge>;
}
