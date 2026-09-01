'use client';
import { useRef, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useScrollProgress, useCountUp } from '@/hooks/useScrollAnimation';
import { Button } from '@/components/ui/Button';

gsap.registerPlugin(ScrollTrigger);

const Scene3D = dynamic(() => import('@/components/three/Scene3D'), { ssr: false });

const volunteers = [
  { name: 'Lohith', role: 'Lead Developer & AI Architect', emoji: '🧠' },
];

const features = [
  {
    icon: 'fa-solid fa-brain',
    title: 'Explainable AI Triage',
    desc: 'Multi-Criteria Decision Making algorithm ranks every SOS signal and generates human-readable reasoning for emergency prioritization.',
    gradient: 'from-blue-500 to-blue-700',
  },
  {
    icon: 'fa-solid fa-satellite-dish',
    title: 'Offline Mesh Resiliency',
    desc: 'When networks fail, DisasterLens simulates Bluetooth ad-hoc mesh relay to bridge SOS payloads from disconnected devices.',
    gradient: 'from-amber-500 to-orange-600',
  },
  {
    icon: 'fa-solid fa-map-location-dot',
    title: 'Live Tactical Maps',
    desc: 'Interactive Leaflet maps with real-time SOS marker clustering, priority-color-coded pins, and automatic rescue route visualization.',
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    icon: 'fa-solid fa-comments',
    title: 'Two-Way Communication',
    desc: 'Victims and rescuers exchange real-time messages. Instructions flow both ways, even in simulated offline mesh mode.',
    gradient: 'from-blue-500 to-cyan-600',
  },
  {
    icon: 'fa-solid fa-shield-halved',
    title: 'Role-Based Access Control',
    desc: 'Secure JWT authentication with distinct dashboards for Victims and Rescuers. Each role sees only what they need.',
    gradient: 'from-rose-500 to-pink-600',
  },
  {
    icon: 'fa-solid fa-battery-half',
    title: 'Survival Window Estimation',
    desc: 'AI predicts battery drain curves and urgency windows, escalating priority for victims about to lose connectivity.',
    gradient: 'from-yellow-500 to-amber-600',
  },
];

function ScrollReveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const anim = gsap.fromTo(
      el,
      { opacity: 0, y: 60 },
      { opacity: 1, y: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 80%', toggleActions: 'play none none reverse' } }
    );
    return () => { anim.kill(); };
  }, []);
  return <div ref={ref} className={className}>{children}</div>;
}

function StaggerGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const items = el.querySelectorAll('.stagger-item');
    if (!items.length) return;
    const anim = gsap.fromTo(
      items,
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 0.7, stagger: 0.1, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 80%', toggleActions: 'play none none reverse' } }
    );
    return () => { anim.kill(); };
  }, []);
  return <div ref={ref} className={className}>{children}</div>;
}

export default function Home() {
  const scrollProgress = useScrollProgress();

  const heroRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLElement>(null);
  const teamRef = useRef<HTMLElement>(null);
  const stat1Ref = useRef<HTMLDivElement>(null);
  const stat2Ref = useRef<HTMLDivElement>(null);
  const stat3Ref = useRef<HTMLDivElement>(null);

  useCountUp(stat1Ref, 10, { suffix: '+' });
  useCountUp(stat2Ref, 99, { suffix: '%' });
  useCountUp(stat3Ref, 247, { suffix: '' });

  useEffect(() => {
    const anim = gsap.to(heroRef.current, {
      y: () => window.innerHeight * 0.15,
      ease: 'none',
      scrollTrigger: { trigger: heroRef.current, start: 'top top', end: 'bottom top', scrub: 1 },
    });
    return () => { anim.kill(); };
  }, []);

  return (
    <main className="min-h-screen bg-[var(--color-bg-primary)] text-white overflow-x-hidden" style={{ fontFamily: "var(--font-body)" }}>
      <Scene3D scrollProgress={scrollProgress} />

      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 40%, transparent 0%, var(--color-bg-primary) 100%)',
          zIndex: 1,
        }}
      />

      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 px-6 py-4 flex items-center justify-between backdrop-blur-xl bg-[var(--color-bg-primary)]/60" style={{ zIndex: 50 }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-blue flex items-center justify-center shadow-lg shadow-blue-500/30">
            <i className="fa-solid fa-shield-halved text-white text-lg"></i>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Disaster<span className="amber-shimmer">Lens</span></h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-semibold">AI Intelligence System</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="px-5 py-2.5 gradient-blue text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2">
            <i className="fa-solid fa-right-to-bracket"></i> Secure Login
          </Link>
        </div>
      </nav>

      <section className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden" style={{ zIndex: 5 }}>
        <div ref={heroRef} className="relative z-10 max-w-5xl mx-auto text-center pt-24">
          <div className="slide-up inline-flex items-center gap-2 border border-[var(--color-amber)]/30 bg-[var(--color-amber)]/10 px-4 py-1.5 rounded-full text-[var(--color-amber)] text-xs font-bold tracking-widest uppercase mb-8 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
            <span className="w-2 h-2 bg-[var(--color-amber)] rounded-full animate-pulse"></span>
            AI Triage Engine v2.0 Active
          </div>

          <h1 className="slide-up slide-up-delay-1 type-hero tracking-tight mb-6 sm:text-5xl md:text-7xl">
            <span className="bg-gradient-to-r from-white via-blue-200 to-blue-300 bg-clip-text text-transparent">Intelligence</span>
            <br/>
            <span className="bg-gradient-to-r from-white via-blue-200 to-blue-300 bg-clip-text text-transparent">in the Midst of </span>
            <span className="amber-shimmer">Chaos</span>
          </h1>

          <p className="slide-up slide-up-delay-2 type-body text-slate-400 mb-12 max-w-2xl mx-auto font-light">
            Connecting victims and rescuers through a <strong className="text-blue-300">real-time, explainable, and offline-resilient</strong> AI platform. Prioritizing those in critical need when every second counts.
          </p>

          <div className="slide-up slide-up-delay-3 flex flex-col sm:flex-row items-center gap-4 justify-center mb-16">
            <Link href="/login">
              <Button variant="primary" icon="rocket" size="lg" className="shadow-[0_8px_40px_rgba(59,130,246,0.4)]">
                Access Platform
              </Button>
            </Link>
            <button
              onClick={() => fetch('/api/seed').then(r=>r.json()).then(d=>alert(d.message || 'Database Seeded!'))}
              className="btn-secondary w-full sm:w-auto px-10 py-4 text-white font-bold text-lg rounded-2xl active:scale-95 flex items-center justify-center gap-3 z-10 border-amber-500/30 hover:border-amber-500/60 hover:text-amber-300"
            >
              <i className="fa-solid fa-database"></i> Initialize Database
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto slide-up slide-up-delay-4">
            <div className="bg-[var(--color-bg-surface)]/80 backdrop-blur-sm border border-white/5 rounded-2xl p-6 text-center hover-lift">
              <div ref={stat1Ref} className="text-3xl font-black text-[var(--color-blue-light)] mb-1">0</div>
              <div className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Volunteers</div>
            </div>
            <div className="bg-[var(--color-bg-surface)]/80 backdrop-blur-sm border border-white/5 rounded-2xl p-6 text-center hover-lift">
              <div ref={stat2Ref} className="text-3xl font-black text-[var(--color-amber)] mb-1">0</div>
              <div className="text-xs text-slate-400 uppercase tracking-widest font-semibold">AI Accuracy</div>
            </div>
            <div className="bg-[var(--color-bg-surface)]/80 backdrop-blur-sm border border-white/5 rounded-2xl p-6 text-center hover-lift">
              <div ref={stat3Ref} className="text-3xl font-black text-[var(--color-blue-light)] mb-1">0</div>
              <div className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Offline Ready</div>
            </div>
          </div>
        </div>
      </section>

      <section ref={featuresRef} className="relative py-24 px-6" style={{ zIndex: 5 }}>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--color-bg-secondary)]/60 to-transparent pointer-events-none"></div>
        <div className="relative z-10 max-w-6xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-16">
              <h2 className="type-h1 md:text-5xl mb-4">
                <span className="bg-gradient-to-r from-blue-300 to-blue-400 bg-clip-text text-transparent">Core </span>
                <span className="amber-shimmer">Capabilities</span>
              </h2>
              <p className="text-slate-400 text-lg max-w-xl mx-auto font-light">Engineered for the worst-case scenarios. Every feature is built to save lives.</p>
            </div>
          </ScrollReveal>
          <StaggerGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="stagger-item group bg-[var(--color-bg-surface)]/80 backdrop-blur-sm border border-white/5 rounded-2xl p-6 hover:border-blue-500/30 transition-all duration-500 hover-lift">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${f.gradient} flex items-center justify-center text-white text-xl mb-5 shadow-lg group-hover:scale-110 transition-transform`}>
                  <i className={f.icon}></i>
                </div>
                <h3 className="type-h3 mb-2 text-white">{f.title}</h3>
                <p className="type-small text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </StaggerGrid>
        </div>
      </section>

      <section ref={teamRef} className="relative py-24 px-6 border-t border-white/5" style={{ zIndex: 5 }}>
        <div className="absolute top-0 left-[30%] w-[500px] h-[500px] rounded-full bg-[var(--color-blue-core)]/5 blur-[150px] pointer-events-none"></div>
        <div className="relative z-10 max-w-6xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-4">
              <div className="inline-flex items-center gap-2 border border-[var(--color-amber)]/30 bg-[var(--color-amber)]/10 px-4 py-1.5 rounded-full text-[var(--color-amber)] text-xs font-bold tracking-widest uppercase mb-6">
                <i className="fa-solid fa-graduation-cap"></i> Academic Project
              </div>
              <h2 className="type-h1 md:text-5xl mb-4">
                <span className="bg-gradient-to-r from-blue-300 to-blue-400 bg-clip-text text-transparent">Meet the </span>
                <span className="amber-shimmer">Volunteers</span>
              </h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto font-light mb-3">
                Proudly built by students of <strong className="text-[var(--color-amber)]">Kalpataru Institute of Technology, Tiptur</strong>
              </p>
              <p className="text-slate-500 text-sm max-w-xl mx-auto">
                Department of Computer Science & Engineering — Karnataka, India.
              </p>
            </div>
          </ScrollReveal>

          <StaggerGrid className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mt-12">
            {volunteers.map((v, i) => (
              <div key={i} className="stagger-item group bg-[var(--color-bg-surface)]/80 backdrop-blur-sm border border-white/5 rounded-2xl p-5 text-center hover:border-[var(--color-amber)]/30 transition-all duration-500 hover-lift">
                <div className="w-14 h-14 rounded-full gradient-blue flex items-center justify-center text-2xl mx-auto mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/20">
                  {v.emoji}
                </div>
                <h4 className="font-bold text-white text-sm mb-1">{v.name}</h4>
                <p className="text-[10px] text-slate-400 leading-tight uppercase tracking-wider font-semibold">{v.role}</p>
              </div>
            ))}
          </StaggerGrid>

          <ScrollReveal>
            <div className="mt-12 text-center">
              <div className="inline-flex flex-col items-center bg-[var(--color-bg-surface)]/60 backdrop-blur-sm border border-white/5 rounded-2xl px-8 py-6">
                <i className="fa-solid fa-university text-[var(--color-amber)] text-2xl mb-3"></i>
                <p className="text-white font-bold text-lg">Kalpataru Institute of Technology</p>
                <p className="text-slate-400 text-sm">Tiptur, Tumkur District, Karnataka — 572201</p>
                <p className="text-slate-500 text-xs mt-1">Affiliated to VTU Belagavi | AICTE Approved</p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <footer className="relative border-t border-white/5 py-8 px-6 text-center" style={{ zIndex: 5 }}>
        <p className="text-slate-500 text-sm">
          &copy; 2025 Disaster<span className="amber-shimmer">Lens</span> — AI-Powered Disaster Intelligence |
          Kalpataru Institute of Technology, Tiptur
        </p>
      </footer>
    </main>
  );
}
