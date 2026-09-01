'use client';
import { forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'sos' | 'dispatch' | 'dispatch-pulse' | 'resolve' | 'ghost';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: string;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-[var(--color-blue-core)] text-white shadow-[0_4px_14px_rgba(59,130,246,0.3)] hover:bg-[var(--color-blue-light)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.4)]',
  secondary: 'bg-[var(--color-bg-surface)] border border-white/10 text-[var(--color-text-secondary)] hover:bg-white/5 hover:border-white/20 hover:text-[var(--color-text-primary)]',
  sos: 'bg-[#dc2626] text-white shadow-[0_8px_30px_rgba(239,68,68,0.3)] hover:bg-[#ef4444] hover:shadow-[0_12px_40px_rgba(239,68,68,0.5)]',
  dispatch: 'bg-[#d97706] text-white shadow-[0_4px_20px_rgba(245,158,11,0.3)] hover:bg-[#f59e0b] hover:shadow-[0_6px_25px_rgba(245,158,11,0.5)]',
  'dispatch-pulse': 'bg-[#d97706] text-white shadow-[0_4px_20px_rgba(245,158,11,0.3)] hover:bg-[#f59e0b] animate-pulse-amber',
  resolve: 'bg-[#059669] text-white shadow-[0_4px_20px_rgba(16,185,129,0.3)] hover:bg-[#10b981] hover:shadow-[0_6px_25px_rgba(16,185,129,0.5)]',
  ghost: 'bg-transparent text-[var(--color-text-secondary)] hover:bg-white/5 hover:text-[var(--color-text-primary)]',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-[10px]',
  md: 'px-5 py-3 text-sm',
  lg: 'px-10 py-4 text-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', icon, loading, size = 'md', className = '', children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center gap-2 font-bold rounded-xl transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-blue-core)] ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : icon ? (
          <i className={`fa-solid fa-${icon}`} />
        ) : null}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
