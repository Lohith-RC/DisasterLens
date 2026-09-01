'use client';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

export function Input({ label, hint, className = '', ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">
          {label}
        </label>
      )}
      <input
        className={`w-full bg-[var(--color-bg-primary)] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none transition placeholder-slate-600 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 ${className}`}
        {...props}
      />
      {hint && <p className="text-[10px] text-slate-600">{hint}</p>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export function Select({ label, children, className = '', ...props }: SelectProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">
          {label}
        </label>
      )}
      <select
        className={`w-full bg-[var(--color-bg-secondary)] border border-white/10 rounded-xl p-2.5 text-white font-semibold outline-none transition text-sm focus:border-blue-500/50 ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
