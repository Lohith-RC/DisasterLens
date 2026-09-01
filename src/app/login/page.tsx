'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function Login() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.user.role === 'RESCUER') {
        router.push('/rescuer');
      } else {
        router.push('/victim');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center px-4 relative overflow-hidden" style={{ fontFamily: "var(--font-body)" }}>
      <div className="absolute top-[-200px] left-[-100px] w-[500px] h-[500px] rounded-full bg-[var(--color-blue-core)]/10 blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-100px] right-[-50px] w-[400px] h-[400px] rounded-full bg-[var(--color-amber)]/8 blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-[var(--color-bg-surface)]/80 border border-white/5 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.5)] overflow-hidden backdrop-blur-xl">
          <div className="p-8 pb-6 border-b border-white/5">
            <div className="w-14 h-14 gradient-blue rounded-2xl flex items-center justify-center text-white text-2xl mb-5 shadow-lg shadow-blue-500/30">
              <i className="fa-solid fa-shield-halved"></i>
            </div>
            <h2 className="type-h2 text-white mb-1">Sign In</h2>
            <p className="text-sm text-slate-400">Access your Disaster<span className="amber-shimmer">Lens</span> portal</p>
          </div>

          <form onSubmit={handleLogin} className="p-8 space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-3 rounded-xl font-medium flex items-center gap-2">
                <i className="fa-solid fa-triangle-exclamation"></i> {error}
              </div>
            )}

            <Input
              label="Full Name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cmdr. Lohith or Chandana"
              required
            />

            <Input
              label="Access Key"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              loading={loading}
              icon="right-to-bracket"
              className="w-full py-3.5 mt-4 shadow-[0_8px_30px_rgba(59,130,246,0.3)]"
            >
              Authorize Login
            </Button>
          </form>

          <div className="px-8 py-5 bg-[var(--color-bg-primary)]/50 border-t border-white/5 text-xs text-slate-500 space-y-1">
            <p className="font-bold text-[var(--color-amber)] text-[10px] uppercase tracking-widest mb-2">Demo Credentials</p>
            <p><span className="text-slate-400 font-semibold">Rescuers:</span> Cmdr. Lohith, Cmdr. Rakshith</p>
            <p><span className="text-slate-400 font-semibold">Victims:</span> Chandana, Sindhu, Shalini, Keerthi, Madan, Meghana, Keertana, Maanya</p>
            <p><span className="text-slate-400 font-semibold">Password:</span> disaster123</p>
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">Kalpataru Institute of Technology, Tiptur</p>
      </div>
    </div>
  );
}
