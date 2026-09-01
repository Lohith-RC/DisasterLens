'use client';
import { useEffect, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastData {
  msg: string;
  type: ToastType;
}

const icons: Record<ToastType, string> = {
  success: 'fa-circle-check',
  error: 'fa-circle-xmark',
  info: 'fa-circle-info',
};

const colors: Record<ToastType, string> = {
  success: 'bg-emerald-600',
  error: 'bg-red-600',
  info: 'bg-[var(--color-blue-dark)]',
};

interface ToastProps {
  toast: ToastData;
  onClose: () => void;
  duration?: number;
}

export function Toast({ toast, onClose, duration = 3500 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div
      className={`fixed top-4 right-4 z-[100] px-5 py-3 rounded-xl shadow-2xl text-sm font-semibold flex items-center gap-2.5 animate-[slideUp_0.3s_ease] ${colors[toast.type]} text-white`}
    >
      <i className={`fa-solid ${icons[toast.type]}`} />
      <span>{toast.msg}</span>
      <button onClick={onClose} className="ml-1 opacity-60 hover:opacity-100 text-lg leading-none">&times;</button>
    </div>
  );
}

export function useToast() {
  const show = useCallback((msg: string, type: ToastType = 'info') => {
    const event = new CustomEvent<ToastData>('dl-toast', { detail: { msg, type } });
    window.dispatchEvent(event);
  }, []);
  return { show };
}
