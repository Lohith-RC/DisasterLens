'use client';
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function useScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? scrollTop / docHeight : 0);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return progress;
}

export function useSectionReveal(ref: React.RefObject<HTMLElement | null>, options?: {
  threshold?: number;
  start?: string;
}) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const anim = gsap.fromTo(
      el,
      { opacity: 0, y: 60 },
      {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: options?.start || 'top 80%',
          toggleActions: 'play none none reverse',
        },
      }
    );

    return () => { anim.kill(); };
  }, [ref]);
}

export function useParallax(ref: React.RefObject<HTMLElement | null>, speed: number = 0.3) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const anim = gsap.to(el, {
      y: () => el.offsetHeight * speed,
      ease: 'none',
      scrollTrigger: {
        trigger: el,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    });

    return () => { anim.kill(); };
  }, [ref, speed]);
}

export function useCountUp(
  ref: React.RefObject<HTMLElement | null>,
  endValue: number,
  options?: { duration?: number; suffix?: string }
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obj = { val: 0 };
    const anim = gsap.to(obj, {
      val: endValue,
      duration: options?.duration || 2,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
      },
      onUpdate: () => {
        el.textContent = Math.round(obj.val).toString() + (options?.suffix || '');
      },
    });

    return () => { anim.kill(); };
  }, [ref, endValue, options]);
}

export function useStaggerReveal(
  containerRef: React.RefObject<HTMLElement | null>,
  itemsSelector: string,
  options?: { stagger?: number; start?: string }
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const items = container.querySelectorAll(itemsSelector);
    if (!items.length) return;

    const anim = gsap.fromTo(
      items,
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: 0.7,
        stagger: options?.stagger || 0.1,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: container,
          start: options?.start || 'top 80%',
          toggleActions: 'play none none reverse',
        },
      }
    );

    return () => { anim.kill(); };
  }, [containerRef, itemsSelector, options]);
}
