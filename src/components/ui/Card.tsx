'use client';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  active?: boolean;
}

export function Card({ children, className = '', hover = false, onClick, active }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-[var(--color-bg-surface)]/80 backdrop-blur-sm border rounded-2xl transition-all duration-300 ${
        active
          ? 'border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.1)]'
          : 'border-white/5'
      } ${hover ? 'hover:border-blue-500/30 hover-lift cursor-pointer' : ''} ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
