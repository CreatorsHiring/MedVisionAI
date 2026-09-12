import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import AccordionGallery, { type AccordionGalleryItem } from '../components/AccordionGallery';
import TrueFocus from '../components/TrueFocus';
import FoldText from '../components/FoldText';
import { 
  Eye, FileText, Users, ArrowRight, 
  Activity, ShieldCheck, Lock, 
  Check, RotateCcw
} from 'lucide-react';

const CLINICAL_GALLERY_ITEMS: AccordionGalleryItem[] = [
  { 
    image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1400&q=85', 
    label: 'Point-of-Care Fundus Capture', 
    alt: 'High-precision clinical ophthalmic examination' 
  },
  { 
    image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1400&q=85', 
    label: 'Neural Inference & Grad-CAM', 
    alt: 'Clinician evaluating diagnostic neural activations' 
  },
  { 
    image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1400&q=85', 
    label: 'Diagnostic Triage Workstation', 
    alt: 'Specialist triage and imaging station' 
  },
  { 
    image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=1400&q=85', 
    label: 'Patient Counseling Suite', 
    alt: 'Healthcare worker counseling patient on screening summary' 
  },
  { 
    image: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1400&q=85', 
    label: 'Hospital Referral Network', 
    alt: 'Tertiary ophthalmic center specialized care' 
  }
];

const RedPaintRollCounter: React.FC = () => {
  const [count, setCount] = useState<number>(0);
  const [isAnimating, setIsAnimating] = useState<boolean>(true);
  const target = 3900000; // 3.9 Million

  const startAnimation = useCallback(() => {
    setCount(0);
    setIsAnimating(true);
    let startTimestamp: number | null = null;
    const duration = 3000; // 3.0s count up animation

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Easing function: easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(ease * target);
      setCount(current);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(target);
        setIsAnimating(false);
      }
    };

    window.requestAnimationFrame(step);
  }, [target]);

  useEffect(() => {
    startAnimation();
  }, [startAnimation]);

  const formattedString = count.toLocaleString('en-US');
  const charArray = formattedString.split('');
  const digitsDesc = [9, 8, 7, 6, 5, 4, 3, 2, 1, 0];

  return (
    <div className="relative my-8 max-w-3xl">
      {/* Non-neon, Matte Deep Red Paint Card Container */}
      <div className="relative bg-[#9E1B1B] text-white p-6 sm:p-8 rounded-xl border border-red-800/80 overflow-hidden shadow-md">
        
        {/* Subtle Matte Paint Texture Overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
            <path d="M 0 0 C 140 15 360 -10 500 10 L 500 150 C 340 135 160 160 0 140 Z" fill="#701212" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          
          {/* Animated Counter Display: 0 -> 3,900,000+ */}
          <div className="flex flex-col items-start">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-black/30 text-rose-100 text-[11px] font-mono font-semibold uppercase tracking-wider mb-2 border border-white/10">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-300"></span>
              // AFFECTED POPULATION
            </div>

            {/* Rolling Top-to-Down Number Strip */}
            <div className="flex items-baseline font-black tracking-tight text-3xl sm:text-5xl font-mono text-white">
              {charArray.map((char, idx) => {
                if (char === ',') {
                  return (
                    <span key={`comma-${idx}`} className="text-amber-300 font-extrabold px-0.5 text-3xl sm:text-5xl">
                      ,
                    </span>
                  );
                }
                const digitNum = parseInt(char, 10);
                return (
                  <div key={`digit-${idx}`} className="h-10 sm:h-14 overflow-hidden relative inline-block">
                    <div 
                      className="transition-transform duration-100 ease-out flex flex-col items-center"
                      style={{ transform: `translateY(-${(9 - digitNum) * 10}%)` }}
                    >
                      {digitsDesc.map((digit) => (
                        <span 
                          key={digit} 
                          className="h-10 sm:h-14 flex items-center justify-center font-black text-white drop-shadow-xs px-[1px]"
                        >
                          {digit}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
              <span className="text-amber-300 ml-1 font-black text-3xl sm:text-5xl">+</span>
            </div>

            {/* Replay Roll Button */}
            <button
              onClick={startAnimation}
              disabled={isAnimating}
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-rose-100 hover:text-white transition-colors bg-black/25 hover:bg-black/40 px-3 py-1 rounded-md border border-white/15"
            >
              <RotateCcw className={`w-3 h-3 ${isAnimating ? 'animate-spin' : ''}`} />
              <span>{isAnimating ? 'Counting...' : 'Replay Roll'}</span>
            </button>
          </div>

          {/* Context Text */}
          <div className="text-left space-y-2 flex-1 border-t md:border-t-0 md:border-l border-white/20 pt-4 md:pt-0 md:pl-6">
            <h3 className="text-lg sm:text-xl font-bold text-white leading-snug">
              People Affected by Diabetic Retinopathy Worldwide
            </h3>
            <p className="text-xs sm:text-sm text-rose-100/90 leading-relaxed font-normal">
              Yet the vast majority of vision loss is completely preventable with timely detection. The primary bottleneck is access to early diagnostic evaluation.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};

const NAV_ITEMS = [

  { id: 'problem', label: '// THE PROBLEM' },
  { id: 'gap', label: '// THE GAP' },
  { id: 'process', label: '// THE PROCESS' },
  { id: 'capabilities', label: '// TOOLING' },
];

const Landing = () => {
  const { user } = useAuth();
  const dashboardLink = user?.role === 'PATIENT' ? '/patient/dashboard' : '/worker/dashboard';
  const [activeSection, setActiveSection] = useState<string>('problem');
  const [pillStyle, setPillStyle] = useState<{ left: number; width: number; opacity: number }>({
    left: 0,
    width: 0,
    opacity: 0,
  });
  const lenisRef = useRef<Lenis | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const updatePill = useCallback((id: string) => {
    const btn = btnRefs.current[id];
    const nav = navRef.current;
    if (btn && nav) {
      const navRect = nav.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      setPillStyle({
        left: btnRect.left - navRect.left,
        width: btnRect.width,
        opacity: 1,
      });
    }
  }, []);

  useEffect(() => {
    updatePill(activeSection);
  }, [activeSection, updatePill]);

  useEffect(() => {
    const handleResize = () => updatePill(activeSection);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeSection, updatePill]);

  useEffect(() => {
    // Force browser to always return to top on refresh
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);

    const handleBeforeUnload = () => {
      window.scrollTo(0, 0);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Initialize viscous, inertial smooth scrolling on the landing page
    const lenis = new Lenis({
      duration: 1.35,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 0.85,
      touchMultiplier: 1.2,
      infinite: false,
    });

    lenisRef.current = lenis;
    lenis.scrollTo(0, { immediate: true });

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }

    rafId = requestAnimationFrame(raf);

    // Track active section as user scrolls
    const sections = ['problem', 'gap', 'process', 'capabilities'];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.25, rootMargin: '-70px 0px -40% 0px' }
    );

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      cancelAnimationFrame(rafId);
      lenis.destroy();
      observer.disconnect();
    };
  }, []);

  const handleNavClick = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    setActiveSection(id);
    const target = document.getElementById(id);
    if (target) {
      if (lenisRef.current) {
        lenisRef.current.scrollTo(target, { offset: -80, duration: 1.2 });
      } else {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] text-[#0F172A] font-sans antialiased selection:bg-[#0F766E]/20 selection:text-[#0F766E]">
      
      {/* ========================================================================= */}
      {/* FLOATING CAPSULE NAVIGATION BAR */}
      {/* ========================================================================= */}
      <div className="sticky top-3 z-50 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full">
        <header className="bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-2xl px-4 sm:px-5 py-2.5 shadow-sm flex items-center justify-between transition-all">
          
          {/* Brand Pill */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <img 
              src="/logo.png" 
              alt="MedVisionAI Logo" 
              className="w-8 h-8 object-contain group-hover:scale-105 transition-transform" 
            />
            <span className="text-sm font-bold tracking-tight text-slate-900 font-mono">
              MedVision<span className="text-[#0F766E]">AI</span>
            </span>
          </Link>

          {/* Section Nav Capsules with Animated Sliding Glider */}
          <nav 
            ref={navRef}
            className="relative hidden md:flex items-center p-1 bg-slate-100/90 rounded-full border border-slate-200/80 shadow-2xs"
          >
            {/* Sliding Glider Capsule Indicator */}
            <div
              className="absolute top-1 bottom-1 rounded-full bg-white shadow-xs border border-teal-200/90 transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] pointer-events-none"
              style={{
                transform: `translateX(${pillStyle.left}px)`,
                width: `${pillStyle.width}px`,
                opacity: pillStyle.opacity,
              }}
            />

            {NAV_ITEMS.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  ref={(el) => { btnRefs.current[item.id] = el; }}
                  onClick={(e) => handleNavClick(item.id, e)}
                  className={`relative z-10 px-3.5 py-1 rounded-full font-mono text-[11px] font-semibold transition-colors duration-200 cursor-pointer select-none ${
                    isActive
                      ? 'text-[#0F766E]'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Auth CTA Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {user ? (
              <Link 
                to={dashboardLink} 
                className="bg-[#0F766E] hover:bg-[#0D9488] active:bg-[#115E59] text-white px-3.5 py-1.5 rounded-xl text-xs font-medium transition shadow-xs flex items-center gap-1.5"
              >
                <span>Enter Workspace</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            ) : (
              <>
                <Link 
                  to="/login?role=patient" 
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition px-2.5 py-1.5 rounded-lg hover:bg-slate-100"
                >
                  Patient Portal
                </Link>
                <Link 
                  to="/login?role=doctor" 
                  className="bg-[#0F766E] hover:bg-[#0D9488] active:bg-[#115E59] text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold transition shadow-xs flex items-center gap-1.5"
                >
                  <span>Clinician Login</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </>
            )}
          </div>
        </header>
      </div>

      {/* Main Content Area: Editorial Rhythm */}
      <main className="flex-1">

        {/* ========================================================================= */}
        {/* SECTION 1: HERO — PROBLEM-FIRST, HUMAN STAKES */}
        {/* ========================================================================= */}
        <section id="problem" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 sm:pt-24 sm:pb-28 text-left">
          <div className="space-y-6">
            
            {/* Monospace Eyebrow Tag with Live Beacon */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold tracking-wider uppercase text-[#0F766E] bg-teal-50 border border-teal-200 px-3 py-1 rounded-full shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0F766E] animate-pulse"></span>
                // 01 . THE PROBLEM
              </span>
            </div>

            {/* Oversized Dual-Tone Editorial Headline with FoldText 3D Unfolding */}
            <h1 className="text-3xl sm:text-5xl lg:text-[54px] font-extrabold text-slate-950 tracking-tight leading-[1.08] uppercase">
              <FoldText
                text="DIABETIC RETINOPATHY IS PREVENTABLE BLINDNESS."
                splitBy="word"
                hinge="top"
                trigger="mount"
                duration={1.05}
                stagger={0.075}
                ease="power3.out"
                color="#020617"
              />{' '}
              <span className="text-[#0F766E] block sm:inline">
                <FoldText
                  text="SCREENING FOR IT USUALLY ISN’T."
                  splitBy="word"
                  hinge="top"
                  trigger="mount"
                  duration={1.05}
                  stagger={0.075}
                  ease="power3.out"
                  color="#0F766E"
                />
              </span>
            </h1>

            {/* Red Paint Brush Statistic Component */}
            <RedPaintRollCounter />

            {/* Real-World Context Paragraph */}
            <div className="space-y-4 text-base sm:text-lg text-slate-600 font-normal leading-relaxed max-w-3xl">
              <p className="text-sm sm:text-base text-slate-500 leading-relaxed border-l-2 border-red-500/40 pl-4 py-0.5">
                Standard screening requires dilated fundus examinations by specialized ophthalmologists using expensive hospital-grade equipment that community health centers and primary care clinics rarely possess. As a consequence, early microvascular lesions routinely go unnoticed until irreversible vision impairment is already underway.
              </p>
            </div>


          </div>
        </section>

        {/* ========================================================================= */}
        {/* CLINICAL MOTTO STATEMENT — TRUE FOCUS ANIMATION */}
        {/* ========================================================================= */}
        <section className="border-y border-slate-200/90 bg-white py-16 sm:py-20 text-center overflow-hidden">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="flex items-center justify-center gap-2">
              <span className="font-mono text-[11px] font-semibold tracking-widest uppercase text-[#0F766E] bg-teal-50 border border-teal-200/80 px-3 py-1 rounded-full shadow-2xs">
                // OUR CORE DIRECTIVE
              </span>
            </div>

            <div className="py-2">
              <TrueFocus 
                sentence="Screen Earlier.|Explain Better.|Reach Further."
                separator="|"
                manualMode={false}
                blurAmount={5}
                borderColor="#0F766E"
                glowColor="rgba(15, 118, 110, 0.45)"
                animationDuration={0.75}
                pauseBetweenAnimations={1.5}
              />
            </div>

            <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto font-normal leading-relaxed">
              A tripartite diagnostic commitment: detecting retinopathy before microlesions advance, providing transparent visual reasoning, and bringing specialist-grade triage to every frontline community.
            </p>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 2: THE GAP — OLD WAY VS NEW REALITY */}
        {/* ========================================================================= */}
        <section id="gap" className="border-t border-slate-200/90 bg-[#F8F9FA] py-20 sm:py-28">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-left space-y-10">
            
            <div className="space-y-3">
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold tracking-wider uppercase text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                // 02 . THE GAP
              </span>
              <h2 className="text-2xl sm:text-4xl font-bold text-slate-950 tracking-tight leading-tight">
                Specialist triage queues are overburdened.{' '}
                <span className="text-[#0F766E]">On-site pre-screening changes the equation.</span>
              </h2>
            </div>

            {/* Contrast Grid: Old Way vs AI-Assisted Protocol */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              
              {/* Box A: The Bottleneck (Old Way) */}
              <div className="rounded-2xl border border-rose-200/80 bg-rose-50/20 p-6 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between text-rose-900 font-semibold text-xs font-mono uppercase tracking-wider pb-2 border-b border-rose-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    <span>Standard Screening Pipeline</span>
                  </div>
                  <span className="text-[10px] text-rose-600 bg-rose-100/80 px-2 py-0.5 rounded font-mono">STATUS QUO</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-600 leading-relaxed pt-1">
                  <li className="flex items-start gap-2.5">
                    <span className="text-rose-400 font-mono text-sm leading-none">•</span>
                    <span>Patients wait weeks or months for specialized ophthalmology appointments.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-rose-400 font-mono text-sm leading-none">•</span>
                    <span>Asymptomatic early-stage lesions are missed during routine primary consultations.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-rose-400 font-mono text-sm leading-none">•</span>
                    <span>Specialist time is heavily consumed reviewing negative, non-pathological scans.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-rose-400 font-mono text-sm leading-none">•</span>
                    <span>High patient attrition rate between primary clinics and tertiary eye hospitals.</span>
                  </li>
                </ul>
              </div>

              {/* Box B: The AI-Assisted Protocol (New Reality) */}
              <div className="rounded-2xl border-2 border-teal-500/40 bg-teal-50/30 p-6 space-y-4 shadow-xs">
                <div className="flex items-center justify-between text-[#0F766E] font-semibold text-xs font-mono uppercase tracking-wider pb-2 border-b border-teal-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#0F766E]"></span>
                    <span>MedVisionAI Assisted Workflow</span>
                  </div>
                  <span className="text-[10px] text-teal-800 bg-teal-100 px-2 py-0.5 rounded font-mono font-bold">OPTIMIZED</span>
                </div>
                <ul className="space-y-3 text-xs text-slate-700 leading-relaxed pt-1">
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
                    <span>Frontline healthcare workers perform fundus photo screening on-site in seconds.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
                    <span>Validated neural models grade scans with calibrated confidence and risk stratification.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
                    <span>Only high-risk and borderline cases are escalated to ophthalmologists for dilated exams.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
                    <span>Grad-CAM heatmaps ensure clinicians visually inspect model reasoning before referring.</span>
                  </li>
                </ul>
              </div>

            </div>

            {/* Matter-of-Fact Clinical Positioning Note */}
            <div className="rounded-xl p-4 bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed flex items-start gap-3">
              <span className="font-mono text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded uppercase font-semibold shrink-0 mt-0.5">NOTE</span>
              <p>
                <strong className="text-slate-900 font-semibold">Clinical Positioning:</strong> MedVisionAI is designed strictly as an assistive screening aid, not an autonomous diagnostic replacement. It exists to expand frontline triage bandwidth and ensure patients who need specialized ophthalmic intervention are identified before vision loss becomes irreversible.
              </p>
            </div>

          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 3: HOW IT WORKS — THE PROCESS & FIRST PRODUCT VISUAL */}
        {/* ========================================================================= */}
        <section id="process" className="border-t border-slate-200/90 bg-[#F8F9FA] py-20 sm:py-28">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-left space-y-12">
            
            <div className="space-y-3">
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold tracking-wider uppercase text-[#0F766E] bg-teal-50 border border-teal-200 px-3 py-1 rounded-full shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0F766E]"></span>
                // 03 . THE PROCESS
              </span>
              <h2 className="text-2xl sm:text-4xl font-bold text-slate-950 tracking-tight leading-tight">
                From fundus photograph to verifiable referral{' '}
                <span className="text-[#0F766E]">in under 60 seconds.</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-normal leading-relaxed">
                A standardized four-step screening protocol structured for clinical fidelity, speed, and auditability.
              </p>
            </div>

            {/* Numbered Step-by-Step Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Step 1 */}
              <div className="p-4.5 rounded-2xl border border-slate-200/90 bg-white shadow-2xs space-y-2 hover:border-slate-300 transition">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <span className="font-mono text-xs font-bold text-[#0F766E] bg-teal-50 px-2 py-0.5 rounded border border-teal-200/60">01</span>
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Ingestion</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">Digital Fundus Scan</h3>
                <p className="text-xs text-slate-600 font-normal leading-relaxed">
                  High-resolution retinal photograph uploaded and pre-screened for optical quality.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-4.5 rounded-2xl border border-slate-200/90 bg-white shadow-2xs space-y-2 hover:border-slate-300 transition">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <span className="font-mono text-xs font-bold text-[#0F766E] bg-teal-50 px-2 py-0.5 rounded border border-teal-200/60">02</span>
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Inference</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">Neural Classification</h3>
                <p className="text-xs text-slate-600 font-normal leading-relaxed">
                  EfficientNet-B0 screens retinal fields for early microvascular lesions and DR signs.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-4.5 rounded-2xl border-2 border-teal-500/50 bg-white shadow-xs space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-teal-100">
                  <span className="font-mono text-xs font-bold text-white bg-[#0F766E] px-2 py-0.5 rounded">03</span>
                  <span className="text-[10px] font-mono text-[#0F766E] uppercase tracking-wider font-bold">Explainability</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">Grad-CAM Localization</h3>
                <p className="text-xs text-slate-600 font-normal leading-relaxed">
                  Gradient activation heatmaps highlight exact retinal regions driving model decisions.
                </p>
              </div>

              {/* Step 4 */}
              <div className="p-4.5 rounded-2xl border border-slate-200/90 bg-white shadow-2xs space-y-2 hover:border-slate-300 transition">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <span className="font-mono text-xs font-bold text-[#0F766E] bg-teal-50 px-2 py-0.5 rounded border border-teal-200/60">04</span>
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">Referral</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">Report & Stratification</h3>
                <p className="text-xs text-slate-600 font-normal leading-relaxed">
                  Confidence-scored clinical PDF report generated for rapid triage action and referrals.
                </p>
              </div>

            </div>

            {/* ACCORDION GALLERY: Widescreen Framed Showcase matching reference */}
            <div className="space-y-4 pt-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-1">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#0F766E] font-semibold block">
                    // WORKSPACE MODALITIES
                  </span>
                  <h4 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    Clinical Screening Lifecycle & Visual Verification
                  </h4>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  Hover to inspect screening stages
                </span>
              </div>

              {/* Framed Container with subtle background and crisp border */}
              <div className="rounded-3xl border border-slate-200/90 bg-white/70 p-3.5 sm:p-5 shadow-xs">
                <AccordionGallery
                  items={CLINICAL_GALLERY_ITEMS}
                  defaultIndex={0}
                  expandRatio={0.56}
                  trigger="hover"
                  accentColor="#0F766E"
                  overlayColor="#020617"
                  textColor="#ffffff"
                  grayscale={true}
                  showLabels={true}
                  duration={0.65}
                  ease="power3.out"
                  parallax={0.5}
                  tilt={6}
                  stagger={0.06}
                  height={460}
                  gap={12}
                  radius={18}
                  orientation="horizontal"
                />
              </div>
            </div>

          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 4: WHY EXPLAINABILITY MATTERS — THE TRUST PROBLEM */}
        {/* ========================================================================= */}
        <section className="border-t border-slate-200/90 bg-white py-20 sm:py-28">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-left space-y-8">
            
            <div className="space-y-3">
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold tracking-wider uppercase text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                // 04 . THE TRUST PROBLEM
              </span>
              <h2 className="text-2xl sm:text-4xl font-bold text-slate-950 tracking-tight leading-tight">
                In clinical medicine,{' '}
                <span className="text-[#0F766E]">a black-box percentage is not enough.</span>
              </h2>
            </div>

            <div className="space-y-4 text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
              <p>
                A <strong className="text-slate-900 font-semibold">94% confidence score alone</strong> does not give an attending clinician enough justification to initiate a specialist referral. Did the neural network identify authentic microaneurysms near the macula, or was it influenced by a dust artifact or lighting edge near the boundary of the photograph?
              </p>
              <p>
                MedVisionAI explicitly couples deep learning inference with layer-level gradient class activation mapping. Healthcare workers and consulting ophthalmologists do not have to take model predictions on faith — they can visually verify whether the model’s focal attention matches physiological indicators of diabetic retinopathy.
              </p>
              <p className="text-xs sm:text-sm text-slate-500 font-normal border-l-2 border-slate-300 pl-3">
                This shifts AI from an opaque classifier into a transparent, auditable triage partner that augments human clinical judgement rather than obscuring it.
              </p>
            </div>

          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 5: CAPABILITIES — THE TOOLING */}
        {/* ========================================================================= */}
        <section id="capabilities" className="border-t border-slate-200/90 bg-[#F8F9FA] py-20 sm:py-28">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-left space-y-10">
            
            <div className="space-y-3">
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold tracking-wider uppercase text-[#0F766E] bg-teal-50 border border-teal-200 px-3 py-1 rounded-full shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0F766E]"></span>
                // 05 . THE TOOLING
              </span>
              <h2 className="text-2xl sm:text-4xl font-bold text-slate-950 tracking-tight leading-tight">
                Structured clinical workspace capabilities.
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-normal">
                Purpose-built tooling designed for healthcare workers, attending specialists, and patients.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              
              <CapabilityCard 
                tag="CAP-01"
                icon={<Activity className="w-4 h-4 text-[#0F766E]" />}
                title="Automated DR Grading"
                description="Deep learning evaluation of uploaded retinal fundus images with calibrated confidence and risk levels."
              />

              <CapabilityCard 
                tag="CAP-02"
                icon={<Eye className="w-4 h-4 text-[#0F766E]" />}
                title="Grad-CAM Verification"
                description="Pixel-level neural attention heatmaps highlighting retinal region focus for immediate clinician validation."
              />

              <CapabilityCard 
                tag="CAP-03"
                icon={<ShieldCheck className="w-4 h-4 text-[#0F766E]" />}
                title="Patient Health Portal"
                description="Dedicated portal access for patients to review published screening summaries and download clinical PDFs."
              />

              <CapabilityCard 
                tag="CAP-04"
                icon={<Users className="w-4 h-4 text-[#0F766E]" />}
                title="Directory & Excel Export"
                description="Manage registered patient profiles, view screening history timelines, and export structured Excel records."
              />

              <CapabilityCard 
                tag="CAP-05"
                icon={<FileText className="w-4 h-4 text-[#0F766E]" />}
                title="Report-Grounded Assistant"
                description="RAG-assisted clinical chatbot strictly grounded in official diagnostic reports to explain findings to patients."
              />

              <CapabilityCard 
                tag="CAP-06"
                icon={<Lock className="w-4 h-4 text-[#0F766E]" />}
                title="Role-Based Security"
                description="HTTP-only session cookies and strict role-based access control (RBAC) separating clinician and patient suites."
              />

            </div>

          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 6: CLOSING CTA — GET STARTED */}
        {/* ========================================================================= */}
        <section className="border-t border-slate-200/90 bg-[#0B1120] py-20 sm:py-28 text-left text-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            
            <div>
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold tracking-wider uppercase text-teal-400 bg-teal-950 border border-teal-800/80 px-3 py-1 rounded-full shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                // 06 . GET STARTED
              </span>
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight leading-tight">
                <FoldText
                  text="Deploy reliable retinal screening to your clinical workflow."
                  splitBy="word"
                  hinge="top"
                  trigger="scroll"
                  duration={1.05}
                  stagger={0.075}
                  ease="power3.out"
                  color="#ffffff"
                />
              </h2>
              <p className="text-sm sm:text-base text-slate-300 font-normal leading-relaxed max-w-2xl">
                Equip healthcare workers and primary clinics with assistive deep learning tools to detect early diabetic retinopathy before vision loss begins.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
              <Link 
                to="/login?role=doctor" 
                className="bg-[#0F766E] hover:bg-[#0D9488] active:bg-[#115E59] text-white px-6 py-3.5 rounded-xl text-xs font-bold transition shadow-lg flex items-center justify-center gap-2"
              >
                <span>Launch Clinical Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link 
                to="/login?role=patient" 
                className="bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 px-6 py-3.5 rounded-xl text-xs font-semibold transition text-center"
              >
                Patient Portal Sign In
              </Link>
            </div>

          </div>
        </section>

      </main>

      {/* ========================================================================= */}
      {/* SECTION 7: FOOTER & REGULATORY DISCLAIMER */}
      {/* ========================================================================= */}
      <footer className="border-t border-slate-800 bg-[#060911] py-10 text-center text-slate-400 text-xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-3">
          <div className="flex items-center justify-center gap-2 font-mono text-[11px] text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>MedVisionAI Clinical Screening System • Production Build</span>
          </div>
          <p className="leading-relaxed max-w-xl mx-auto text-[11px] text-slate-500 font-normal">
            This system is an AI-assisted screening tool intended for preliminary assessment support. Final clinical diagnosis must be performed by an authorized healthcare professional.
          </p>
        </div>
      </footer>

    </div>
  );
};

const CapabilityCard = ({ tag, icon, title, description }: { tag: string, icon: React.ReactNode, title: string, description: string }) => (
  <div className="rounded-2xl p-5 border border-slate-200/90 bg-white text-left hover:border-teal-400/80 hover:shadow-md transition-all duration-200 space-y-3 group">
    <div className="flex items-center justify-between">
      <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200/70 flex items-center justify-center shadow-2xs group-hover:bg-teal-100/80 transition">
        {icon}
      </div>
      <span className="font-mono text-[10px] text-slate-400 font-semibold bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60">
        {tag}
      </span>
    </div>
    <h3 className="text-xs font-bold text-slate-900 group-hover:text-[#0F766E] transition">{title}</h3>
    <p className="text-xs leading-relaxed text-slate-600 font-normal">{description}</p>
  </div>
);

export default Landing;



