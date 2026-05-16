'use client';

/**
 * Poweria Legal — Landing page.
 *
 * Bilingüe (es/en, sincronizada con el store i18n global) y animada con
 * GSAP + ScrollTrigger: entrada del hero, revelados al hacer scroll,
 * contadores, parallax y marquee. Respeta prefers-reduced-motion.
 */

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Sparkles, Scale, Layers, FileSearch, Calendar, Wallet, Shield, Lock, Globe,
  ArrowRight, Check, Quote, Building2, Mail, Phone, MessageCircle, Menu, X,
  Zap, Brain, Clock, BookMarked, Users, Star, MapPin, Target, Stamp, Languages,
  Workflow, Gauge, ChevronDown, FileSignature, ShieldCheck,
} from 'lucide-react';
import InstitutionalContact from '@/components/landing/InstitutionalContact';
import { useI18n } from '@/lib/i18n';
import { api } from '@/lib/api';

type Lang = 'es' | 'en';

// ════════════════════════════════════════════════════════════════════════
// CONTENIDO BILINGÜE
// ════════════════════════════════════════════════════════════════════════

const FEATURE_META = [
  { id: 'litigacion',  icon: Scale,         gradient: 'from-violet-500 to-fuchsia-500',  accent: 'shadow-violet-500/30' },
  { id: 'workflow',    icon: Workflow,      gradient: 'from-indigo-500 to-violet-500',   accent: 'shadow-indigo-500/30' },
  { id: 'tramites',    icon: FileSignature, gradient: 'from-emerald-500 to-teal-500',    accent: 'shadow-emerald-500/30' },
  { id: 'inmigracion', icon: Stamp,         gradient: 'from-sky-500 to-blue-600',        accent: 'shadow-sky-500/30' },
  { id: 'traductor',   icon: Languages,     gradient: 'from-amber-500 to-orange-500',    accent: 'shadow-amber-500/30' },
  { id: 'bench',       icon: Gauge,         gradient: 'from-rose-500 to-pink-500',       accent: 'shadow-rose-500/30' },
] as const;

interface PlanPrice { code: string; monthly: number; yearly: number; popular: boolean }

// Precios de respaldo: si la API no responde, se usan estos. La landing
// intenta primero leer los precios en vivo desde /payhub/plans, de modo que
// un cambio en el panel super-admin se refleje acá sin tocar el código.
const PLAN_META: PlanPrice[] = [
  { code: 'free',    monthly: 0,   yearly: 0,    popular: false },
  { code: 'starter', monthly: 87,  yearly: 870,  popular: false },
  { code: 'pro',     monthly: 207, yearly: 2070, popular: true },
  { code: 'pro_max', monthly: 387, yearly: 3870, popular: false },
  { code: 'studio',  monthly: 897, yearly: 8970, popular: false },
];

const CONTENT: Record<Lang, any> = {
  es: {
    nav: {
      platform: 'Plataforma', pricing: 'Precios', security: 'Seguridad',
      company: 'Empresa', help: 'Ayuda', login: 'Iniciar sesión', cta: 'Probar gratis',
      platformLead: 'Un producto, seis capacidades que cubren el día del abogado.',
    },
    hero: {
      badge: 'Hecho en Ecuador · LOPDP-ready · IA con citas reales',
      titleA: 'El cerebro jurídico', titleB: 'que litiga contigo',
      sub: 'Sala de litigación, redacción de escritos y trámites, traductor jurídico bilingüe, formularios de inmigración de EE.UU. y un benchmark propio — todo con IA que cita sus fuentes.',
      ctaPrimary: 'Empezar gratis', ctaSecondary: 'Ver la plataforma',
      trust: ['Cifrado en reposo', 'RLS por usuario', 'Multi-jurisdicción', 'Tiempo real'],
    },
    marqueeLabel: 'Lo que Poweria ya domina',
    marquee: [
      '12+ códigos legales del Ecuador', 'Constitución · COIP · COGEP', 'Registro Oficial al día',
      '13 formularios USCIS', 'Traductor jurídico es⇄en', 'Verificación de citas',
      'Corpus multi-jurisdicción', 'Embeddings legales Voyage', 'Asamblea Nacional sincronizada',
    ],
    features: {
      kicker: 'La plataforma',
      title: ['Diseñada para ', 'ganar audiencias', ', no para llenarse de pestañas'],
      sub: 'Cada vista resuelve un momento real del trabajo legal. Con IA cuando ayuda y silencio cuando estorba.',
      items: [
        { tag: 'Fase 1', title: 'Sala de Litigación + Tarjetas IA', body: 'Pantalla completa con cronómetro, brief del caso y tarjetas argumentales —apertura, hechos, fundamento, prueba, refutación, cierre— generadas en streaming desde el expediente.' },
        { tag: 'Fase 1', title: 'Workflow Studio + verificación de citas', body: 'Flujos de trabajo legales reutilizables y un verificador que contrasta cada norma citada contra el corpus jurídico — anti-alucinación, real.' },
        { tag: 'Fase 2', title: 'Agente de Trámites del foro', body: 'Autocompleta escritos tipo del foro ecuatoriano —contestación, anuncio de prueba, recurso de apelación— a partir de campos estructurados, con revisión del abogado obligatoria.' },
        { tag: 'Fase 4', title: 'Agente de Formularios de Inmigración', body: 'Arma paquetes de 13 formularios USCIS (I-130, I-485, N-400…): borrador del formulario, checklist de documentos y guía de presentación. Revisión de abogado con licencia obligatoria.' },
        { tag: 'Fase 3', title: 'Traductor Jurídico bilingüe es⇄en', body: 'Traduce documentos legales preservando el sentido jurídico —no localiza el derecho— y entrega un glosario de términos. Para el abogado que mueve casos entre español e inglés.' },
        { tag: 'Fase 2', title: 'Poweria Bench', body: 'Un benchmark abierto de derecho ecuatoriano que mide la calidad de la IA tarea por tarea. Ningún competidor generalista publica algo así.' },
      ],
    },
    how: {
      kicker: 'En 3 pasos',
      title: ['De cero a ', 'litigar con IA', ' en una tarde'],
      sub: 'No necesitas migrar nada. Sube tus casos, conecta tu calendario y deja que la IA aprenda contigo.',
      steps: [
        { title: 'Carga tus casos', body: 'Importa PDF, Word, imagen o texto. La IA los entiende, indexa y enriquece automáticamente.' },
        { title: 'Conversa con la IA', body: 'Pide resúmenes, genera tarjetas argumentales, trámites o traducciones. La IA cita siempre sus fuentes.' },
        { title: 'Litiga sin fricción', body: 'Abre la Sala de Litigación con un click. Cronómetro, chat IA y argumentos a la mano durante la audiencia.' },
      ],
    },
    stats: {
      items: [
        { count: 13, suffix: '', label: 'Formularios USCIS' },
        { count: 12, suffix: '+', label: 'Códigos legales indexados' },
        { count: 4, suffix: '', label: 'Fases de producto entregadas' },
        { count: 100, suffix: '%', label: 'Citas con fuente verificable' },
      ],
    },
    security: {
      kicker: 'Privacidad y seguridad',
      title: ['Tu información ', 'jamás', ' entrena nuestros modelos'],
      sub: 'Construimos Poweria Legal con un principio simple: el dato del cliente es del cliente. Cumplimos la LOPDP del Ecuador y las mejores prácticas internacionales.',
      badges: ['LOPDP Ecuador', 'GDPR-aligned', 'Cifrado AES-256', 'TLS 1.3', 'PostgreSQL RLS'],
      items: [
        { title: 'Cifrado AES-256', body: 'Datos en reposo cifrados; el tráfico viaja por TLS 1.3.' },
        { title: 'Aislamiento por usuario', body: 'Row-Level Security en PostgreSQL — un cliente jamás ve datos de otro.' },
        { title: 'Sin entrenar con tus datos', body: 'No usamos tu información para entrenar modelos. Cero excepciones.' },
        { title: 'LOPDP y trazabilidad', body: 'Cumplimos la Ley Orgánica de Protección de Datos y registramos accesos.' },
        { title: 'Tú controlas la retención', body: 'Exporta o elimina tu información cuando quieras — sin contratos a futuro.' },
        { title: 'Auditoría disponible', body: 'Cada acción importante queda en el log; el plan Institucional incluye reportes.' },
      ],
    },
    pricing: {
      kicker: 'Precios',
      title: ['Empieza gratis. ', 'Crece cuando estés listo.'],
      sub: 'Sin sorpresas. Cancelas cuando quieras. Datos siempre tuyos. En el plan anual te llevas 2 meses de regalo.',
      monthly: 'Mensual', yearly: 'Anual', save: '−2 meses', perMonth: '/ mes',
      popularLabel: 'Más popular',
      freeNote: '3 días · sin tarjeta de crédito',
      billedYear: (y: number) => `$${y}/año facturado · 2 meses gratis`,
      billedMonth: (m: number) => `$${m} facturado mensual`,
      compare: 'Comparación detallada y opciones de pago',
      plans: [
        { name: 'Gratis', desc: 'Prueba la plataforma 3 días — sin tarjeta de crédito.', cta: 'Empezar prueba',
          features: ['3 días de acceso completo', '2 casos activos', 'Base legal pública Ecuador', 'Asistente IA con citas'] },
        { name: 'Starter', desc: 'Abogado independiente que empieza a digitalizar su práctica.', cta: 'Probar Starter',
          features: ['5 casos activos', 'Generación de documentos', 'OCR Vision', 'Resúmenes ejecutivos IA', 'Soporte por email'] },
        { name: 'Pro', desc: 'Recomendado para abogados con práctica activa.', cta: 'Probar Pro',
          features: ['20 casos activos', 'Sala de Litigación + Tarjetas IA', 'Trámites + Traductor jurídico', 'Módulo Finanzas con CFO virtual', 'Soporte chat 24h'] },
        { name: 'Pro Max', desc: 'Para abogados de alto volumen.', cta: 'Probar Pro Max',
          features: ['35 casos activos', 'Modo de razonamiento premium', 'Prioridad en cola IA', 'API access', 'Reportes avanzados'] },
        { name: 'Studio', desc: 'Firmas de 2-5 abogados con colaboración real-time.', cta: 'Probar Studio',
          features: ['5 usuarios incluidos', '50 casos activos (equipo)', 'Cuota de IA de equipo', 'Roles, permisos y workspace', 'Reportes consolidados'] },
      ],
      institutional: {
        kicker: 'Institucional · plan negociado',
        title: '¿Estudio jurídico, firma o institución?',
        body: 'Tu plan se negocia con el departamento comercial — comercial@cognitex.app. SSO/SAML, white-label, despliegue privado, SLA 99.9%, capacitación in-house y onboarding asistido.',
        cta: 'Escribir a ventas',
      },
    },
    company: {
      kicker: 'La empresa detrás del producto',
      title: ['IA con propósito.', 'Hecha en Ecuador, pensada para el mundo.'],
      body: 'COGNITEX es una empresa ecuatoriana de tecnología que diseña herramientas inteligentes para profesionales que toman decisiones con consecuencias. Poweria Legal es nuestro primer producto: la primera plataforma de IA jurídica creada por y para abogados del Ecuador.',
      cards: [
        { label: 'Misión', text: 'Liberar tiempo a los profesionales con IA confiable y trazable.' },
        { label: 'Sede',   text: 'Ecuador · operación remota cubriendo LATAM y EE.UU.' },
        { label: 'Equipo', text: 'Abogados + ingenieros de ML + diseñadores de producto.' },
      ],
    },
    contact: {
      kicker: 'Hablemos',
      title: ['¿Estudio jurídico o institución? ', 'Te contactamos hoy.'],
      sub: 'Demos personalizadas, planes corporativos y on-boarding asistido.',
      phone: 'Teléfono / WhatsApp', email: 'Correo de ventas',
      person: 'Encargado comercial', location: 'Ubicación', locationValue: 'Quito · Ecuador',
    },
    testimonial: {
      quote: '«Antes me llevaba dos horas preparar una audiencia. Ahora abro Poweria, subo la providencia, todo está allí.»',
      author: '— Abogada en estudio penalista, Quito',
      ctaPrimary: 'Empezar gratis ahora', ctaSecondary: 'Hablar con un humano',
    },
    footer: {
      tagline: 'Plataforma de IA jurídica del Ecuador. Un producto de COGNITEX.',
      colProduct: 'Plataforma', colCompany: 'Empresa', colLegal: 'Legal',
      rights: 'Todos los derechos reservados.', madeWith: 'Diseñado con ☕ y 🇪🇨',
      product: [['#plataforma', 'Capacidades'], ['#como-funciona', 'Cómo funciona'], ['#precios', 'Precios'], ['/pricing', 'Comparar planes']],
      companyLinks: [['#empresa', 'Sobre COGNITEX'], ['https://www.cognitex.app', 'cognitex.app'], ['/help', 'Centro de ayuda'], ['#contacto', 'Contacto']],
      legal: [['/privacy', 'Política de privacidad'], ['/terms', 'Términos de servicio'], ['/lopdp', 'LOPDP Ecuador'], ['#seguridad', 'Seguridad']],
    },
  },
  en: {
    nav: {
      platform: 'Platform', pricing: 'Pricing', security: 'Security',
      company: 'Company', help: 'Help', login: 'Log in', cta: 'Try for free',
      platformLead: 'One product, six capabilities covering the lawyer’s day.',
    },
    hero: {
      badge: 'Built in Ecuador · LOPDP-ready · AI with real citations',
      titleA: 'The legal brain', titleB: 'that litigates with you',
      sub: 'Litigation room, drafting of briefs and filings, a bilingual legal translator, U.S. immigration forms and an in-house benchmark — all with AI that cites its sources.',
      ctaPrimary: 'Start free', ctaSecondary: 'See the platform',
      trust: ['Encrypted at rest', 'Per-user RLS', 'Multi-jurisdiction', 'Real time'],
    },
    marqueeLabel: 'What Poweria already masters',
    marquee: [
      '12+ Ecuadorian legal codes', 'Constitution · COIP · COGEP', 'Official Registry, daily',
      '13 USCIS forms', 'Legal translator es⇄en', 'Citation verification',
      'Multi-jurisdiction corpus', 'Voyage legal embeddings', 'National Assembly synced',
    ],
    features: {
      kicker: 'The platform',
      title: ['Built to ', 'win hearings', ', not to pile up tabs'],
      sub: 'Every view solves a real moment of legal work. AI when it helps, silence when it gets in the way.',
      items: [
        { tag: 'Phase 1', title: 'Litigation Room + AI Cards', body: 'Full screen with timer, case brief and argument cards —opening, facts, grounds, evidence, rebuttal, closing— streamed from the case file.' },
        { tag: 'Phase 1', title: 'Workflow Studio + citation check', body: 'Reusable legal workflows and a verifier that checks every cited norm against the legal corpus — real anti-hallucination.' },
        { tag: 'Phase 2', title: 'Court Filings Agent', body: 'Auto-completes standard Ecuadorian court filings —answers, evidence notices, appeals— from structured fields, with mandatory lawyer review.' },
        { tag: 'Phase 4', title: 'Immigration Forms Agent', body: 'Builds packets for 13 USCIS forms (I-130, I-485, N-400…): form draft, document checklist and filing guide. Mandatory licensed-attorney review.' },
        { tag: 'Phase 3', title: 'Bilingual Legal Translator es⇄en', body: 'Translates legal documents preserving legal meaning —it does not localize the law— and returns a glossary of terms. For the lawyer moving cases between Spanish and English.' },
        { tag: 'Phase 2', title: 'Poweria Bench', body: 'An open benchmark of Ecuadorian law that measures AI quality task by task. No generalist competitor publishes anything like it.' },
      ],
    },
    how: {
      kicker: 'In 3 steps',
      title: ['From zero to ', 'litigating with AI', ' in one afternoon'],
      sub: 'No migration needed. Upload your cases, connect your calendar and let the AI learn with you.',
      steps: [
        { title: 'Upload your cases', body: 'Import PDF, Word, image or text. The AI understands, indexes and enriches them automatically.' },
        { title: 'Talk to the AI', body: 'Ask for summaries, generate argument cards, filings or translations. The AI always cites its sources.' },
        { title: 'Litigate frictionlessly', body: 'Open the Litigation Room in one click. Timer, AI chat and arguments at hand during the hearing.' },
      ],
    },
    stats: {
      items: [
        { count: 13, suffix: '', label: 'USCIS forms' },
        { count: 12, suffix: '+', label: 'Indexed legal codes' },
        { count: 4, suffix: '', label: 'Product phases shipped' },
        { count: 100, suffix: '%', label: 'Citations with verifiable source' },
      ],
    },
    security: {
      kicker: 'Privacy and security',
      title: ['Your data ', 'never', ' trains our models'],
      sub: 'We built Poweria Legal on a simple principle: the client’s data belongs to the client. We comply with Ecuador’s LOPDP and international best practices.',
      badges: ['LOPDP Ecuador', 'GDPR-aligned', 'AES-256 encryption', 'TLS 1.3', 'PostgreSQL RLS'],
      items: [
        { title: 'AES-256 encryption', body: 'Data encrypted at rest; traffic travels over TLS 1.3.' },
        { title: 'Per-user isolation', body: 'Row-Level Security in PostgreSQL — one client never sees another’s data.' },
        { title: 'No training on your data', body: 'We do not use your information to train models. Zero exceptions.' },
        { title: 'LOPDP and traceability', body: 'We comply with the Data Protection Act and log every access.' },
        { title: 'You control retention', body: 'Export or delete your information whenever you want — no future contracts.' },
        { title: 'Audit available', body: 'Every important action is logged; the Institutional plan includes reports.' },
      ],
    },
    pricing: {
      kicker: 'Pricing',
      title: ['Start free. ', 'Grow when you’re ready.'],
      sub: 'No surprises. Cancel anytime. Your data is always yours. On the annual plan you get 2 months free.',
      monthly: 'Monthly', yearly: 'Annual', save: '−2 months', perMonth: '/ mo',
      popularLabel: 'Most popular',
      freeNote: '3 days · no credit card',
      billedYear: (y: number) => `$${y}/yr billed · 2 months free`,
      billedMonth: (m: number) => `$${m} billed monthly`,
      compare: 'Detailed comparison and payment options',
      plans: [
        { name: 'Free', desc: 'Try the platform for 3 days — no credit card.', cta: 'Start trial',
          features: ['3 days full access', '2 active cases', 'Ecuador public legal base', 'AI assistant with citations'] },
        { name: 'Starter', desc: 'Independent lawyer starting to digitize their practice.', cta: 'Try Starter',
          features: ['5 active cases', 'Document generation', 'OCR Vision', 'AI executive summaries', 'Email support'] },
        { name: 'Pro', desc: 'Recommended for lawyers with an active practice.', cta: 'Try Pro',
          features: ['20 active cases', 'Litigation Room + AI Cards', 'Filings + Legal Translator', 'Finance module with virtual CFO', '24h chat support'] },
        { name: 'Pro Max', desc: 'For high-volume lawyers.', cta: 'Try Pro Max',
          features: ['35 active cases', 'Premium reasoning mode', 'AI queue priority', 'API access', 'Advanced reports'] },
        { name: 'Studio', desc: 'Firms of 2-5 lawyers with real-time collaboration.', cta: 'Try Studio',
          features: ['5 users included', '50 active cases (team)', 'Team AI quota', 'Roles, permissions and workspace', 'Consolidated reports'] },
      ],
      institutional: {
        kicker: 'Institutional · negotiated plan',
        title: 'A law firm or an institution?',
        body: 'Your plan is negotiated with the sales department — comercial@cognitex.app. SSO/SAML, white-label, private deployment, 99.9% SLA, in-house training and assisted onboarding.',
        cta: 'Email sales',
      },
    },
    company: {
      kicker: 'The company behind the product',
      title: ['AI with purpose.', 'Built in Ecuador, designed for the world.'],
      body: 'COGNITEX is an Ecuadorian technology company that designs intelligent tools for professionals who make decisions with consequences. Poweria Legal is our first product: the first legal-AI platform built by and for Ecuadorian lawyers.',
      cards: [
        { label: 'Mission', text: 'Free up professionals’ time with reliable, traceable AI.' },
        { label: 'HQ',      text: 'Ecuador · remote operation covering LATAM and the U.S.' },
        { label: 'Team',    text: 'Lawyers + ML engineers + product designers.' },
      ],
    },
    contact: {
      kicker: 'Let’s talk',
      title: ['A law firm or institution? ', 'We’ll contact you today.'],
      sub: 'Personalized demos, corporate plans and assisted onboarding.',
      phone: 'Phone / WhatsApp', email: 'Sales email',
      person: 'Commercial lead', location: 'Location', locationValue: 'Quito · Ecuador',
    },
    testimonial: {
      quote: '“It used to take me two hours to prepare a hearing. Now I open Poweria, upload the court order, and everything is there.”',
      author: '— Lawyer at a criminal-law practice, Quito',
      ctaPrimary: 'Start free now', ctaSecondary: 'Talk to a human',
    },
    footer: {
      tagline: 'Ecuador’s legal-AI platform. A COGNITEX product.',
      colProduct: 'Platform', colCompany: 'Company', colLegal: 'Legal',
      rights: 'All rights reserved.', madeWith: 'Crafted with ☕ and 🇪🇨',
      product: [['#plataforma', 'Capabilities'], ['#como-funciona', 'How it works'], ['#precios', 'Pricing'], ['/pricing', 'Compare plans']],
      companyLinks: [['#empresa', 'About COGNITEX'], ['https://www.cognitex.app', 'cognitex.app'], ['/help', 'Help center'], ['#contacto', 'Contact']],
      legal: [['/privacy', 'Privacy policy'], ['/terms', 'Terms of service'], ['/lopdp', 'LOPDP Ecuador'], ['#seguridad', 'Security']],
    },
  },
};

// ════════════════════════════════════════════════════════════════════════
// PÁGINA
// ════════════════════════════════════════════════════════════════════════

export default function Home() {
  const [lang, setLangState] = useState<Lang>('es');
  const [navOpen, setNavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [platformOpen, setPlatformOpen] = useState(false);
  const rootRef = useRef<HTMLElement>(null);
  const t = CONTENT[lang];

  // Sincroniza el idioma con el store global i18n (tras montar, sin mismatch SSR).
  useEffect(() => {
    try {
      const persisted = useI18n.getState().locale;
      if (persisted === 'es' || persisted === 'en') setLangState(persisted);
    } catch { /* noop */ }
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try { useI18n.getState().setLocale(l); } catch { /* noop */ }
  };

  // Nav: fondo sólido al hacer scroll.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ─── ANIMACIONES GSAP ──────────────────────────────────────────────────
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !rootRef.current) return;

    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      // Entrada del hero — timeline encadenada.
      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .from('[data-hero]', { opacity: 0, y: 34, duration: 0.85, stagger: 0.11 })
        .from('[data-hero-mockup]', { opacity: 0, y: 60, scale: 0.96, duration: 1 }, '-=0.5');

      // Revelados al hacer scroll.
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
        gsap.from(el, {
          opacity: 0, y: 44, duration: 0.9,
          scrollTrigger: { trigger: el, start: 'top 86%' },
        });
      });

      // Contadores numéricos.
      gsap.utils.toArray<HTMLElement>('[data-count]').forEach((el) => {
        const target = parseFloat(el.dataset.count || '0');
        const suffix = el.dataset.suffix || '';
        const obj = { v: 0 };
        gsap.to(obj, {
          v: target, duration: 1.8, ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 90%' },
          onUpdate: () => { el.textContent = Math.round(obj.v) + suffix; },
        });
      });

      // Parallax suave en orbes y mockup.
      gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((el) => {
        const depth = parseFloat(el.dataset.parallax || '12');
        gsap.to(el, {
          yPercent: -depth, ease: 'none',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: 1 },
        });
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <main ref={rootRef} className="bg-slate-950 text-slate-100 antialiased overflow-x-hidden">
      <ScrollProgress />

      {/* ─── NAV ───────────────────────────────────────────────── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-slate-950/80 backdrop-blur-xl border-b border-white/5' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30 group-hover:shadow-violet-500/50 transition">
              <Scale className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-base sm:text-lg tracking-tight">Poweria Legal</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1 text-sm text-slate-300">
            <div className="relative"
              onMouseEnter={() => setPlatformOpen(true)}
              onMouseLeave={() => setPlatformOpen(false)}>
              <button className="flex items-center gap-1 px-3 py-2 hover:text-white transition">
                {t.nav.platform}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${platformOpen ? 'rotate-180' : ''}`} />
              </button>
              {platformOpen && (
                <div className="absolute top-full left-0 pt-2">
                  <div className="w-[420px] rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-2xl p-3">
                    <div className="px-2 pb-2 text-[11px] uppercase tracking-widest font-bold text-slate-500">
                      {t.nav.platformLead}
                    </div>
                    <div className="grid grid-cols-1 gap-0.5">
                      {FEATURE_META.map((fm, i) => {
                        const Icon = fm.icon;
                        return (
                          <a key={fm.id} href={`#feat-${fm.id}`}
                            onClick={() => setPlatformOpen(false)}
                            className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/5 transition group/mm">
                            <span className={`shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br ${fm.gradient} flex items-center justify-center`}>
                              <Icon className="w-4 h-4 text-white" />
                            </span>
                            <span>
                              <span className="block text-sm font-semibold text-white group-hover/mm:text-violet-300 transition">
                                {t.features.items[i].title}
                              </span>
                              <span className="block text-[11px] text-slate-500 leading-snug line-clamp-1">
                                {t.features.items[i].body}
                              </span>
                            </span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <a href="#precios" className="px-3 py-2 hover:text-white transition">{t.nav.pricing}</a>
            <a href="#seguridad" className="px-3 py-2 hover:text-white transition">{t.nav.security}</a>
            <a href="#empresa" className="px-3 py-2 hover:text-white transition">{t.nav.company}</a>
            <Link href="/help" className="px-3 py-2 hover:text-white transition">{t.nav.help}</Link>
          </div>

          <div className="flex items-center gap-2">
            <LangToggle lang={lang} onChange={setLang} />
            <Link href="/login" className="hidden sm:inline-flex text-sm text-slate-300 hover:text-white px-3 py-1.5 transition">
              {t.nav.login}
            </Link>
            <Link href="/register"
              className="inline-flex items-center gap-1.5 text-sm font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-[1.02] transition">
              {t.nav.cta}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <button onClick={() => setNavOpen((v) => !v)} className="md:hidden p-2 -mr-2 text-slate-200" aria-label="Menu">
              {navOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {navOpen && (
          <div className="md:hidden border-t border-white/5 bg-slate-950/95 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1 text-sm text-slate-300">
              {[
                ['#plataforma', t.nav.platform], ['#precios', t.nav.pricing],
                ['#seguridad', t.nav.security], ['#empresa', t.nav.company],
                ['#contacto', 'Contacto'],
              ].map(([h, l]) => (
                <a key={h} href={h} onClick={() => setNavOpen(false)} className="px-2 py-2 rounded hover:bg-white/5">{l}</a>
              ))}
              <Link href="/help" onClick={() => setNavOpen(false)} className="px-2 py-2 rounded hover:bg-white/5">{t.nav.help}</Link>
              <Link href="/login" onClick={() => setNavOpen(false)} className="px-2 py-2 rounded hover:bg-white/5 sm:hidden">{t.nav.login}</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ─── HERO ──────────────────────────────────────────────── */}
      <section className="relative pt-32 sm:pt-40 pb-20 sm:pb-28 overflow-hidden">
        <BackgroundOrbs />
        <GridBackground />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div data-hero className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur text-[11px] sm:text-xs font-semibold tracking-wider text-slate-300 mb-6">
            <Sparkles className="w-3 h-3 text-violet-400" />
            <span className="uppercase">{t.hero.badge}</span>
          </div>

          <h1 data-hero className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] max-w-4xl mx-auto">
            {t.hero.titleA}
            <br />
            <span className="bg-gradient-to-br from-violet-400 via-fuchsia-400 to-amber-300 bg-clip-text text-transparent">{t.hero.titleB}</span>
          </h1>

          <p data-hero className="mt-5 sm:mt-7 text-base sm:text-xl text-slate-300/90 max-w-2xl mx-auto leading-relaxed">
            {t.hero.sub}
          </p>

          <div data-hero className="mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link href="/register"
              className="inline-flex items-center gap-2 px-5 sm:px-6 py-3 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white font-bold text-sm sm:text-base shadow-2xl shadow-violet-500/30 hover:shadow-violet-500/60 hover:scale-[1.02] active:scale-[0.98] transition-all">
              {t.hero.ctaPrimary}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#plataforma"
              className="inline-flex items-center gap-2 px-5 sm:px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-200 font-semibold text-sm sm:text-base hover:bg-white/10 hover:border-white/20 transition">
              {t.hero.ctaSecondary}
            </a>
          </div>

          <div data-hero className="mt-10 sm:mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[11px] sm:text-xs text-slate-500 uppercase tracking-widest font-semibold">
            <span className="flex items-center gap-1.5"><Lock className="w-3 h-3 text-emerald-400" /> {t.hero.trust[0]}</span>
            <span className="flex items-center gap-1.5"><Shield className="w-3 h-3 text-sky-400" /> {t.hero.trust[1]}</span>
            <span className="flex items-center gap-1.5"><Globe className="w-3 h-3 text-amber-400" /> {t.hero.trust[2]}</span>
            <span className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-violet-400" /> {t.hero.trust[3]}</span>
          </div>
        </div>

        <div data-hero-mockup>
          <HeroMockup lang={lang} />
        </div>
      </section>

      {/* ─── MARQUEE ───────────────────────────────────────────── */}
      <section className="py-8 border-y border-white/5 bg-white/[0.015] overflow-hidden">
        <div className="text-center text-[10px] uppercase tracking-[0.2em] font-bold text-slate-600 mb-4">
          {t.marqueeLabel}
        </div>
        <div className="marquee-track flex gap-3 w-max">
          {[...t.marquee, ...t.marquee].map((m: string, i: number) => (
            <span key={i} className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/5 text-xs font-semibold text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              {m}
            </span>
          ))}
        </div>
      </section>

      {/* ─── FEATURES ──────────────────────────────────────────── */}
      <section id="plataforma" className="relative py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader kicker={t.features.kicker}
            title={<>{t.features.title[0]}<em className="not-italic bg-gradient-to-br from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">{t.features.title[1]}</em>{t.features.title[2]}</>}
            subtitle={t.features.sub} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-12 sm:mt-16">
            {FEATURE_META.map((fm, i) => (
              <FeatureCard key={fm.id} id={`feat-${fm.id}`} meta={fm} text={t.features.items[i]} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW ───────────────────────────────────────────────── */}
      <section id="como-funciona" className="relative py-20 sm:py-28 bg-gradient-to-b from-transparent via-slate-900/40 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader kicker={t.how.kicker}
            title={<>{t.how.title[0]}<em className="not-italic bg-gradient-to-br from-emerald-400 to-cyan-400 bg-clip-text text-transparent">{t.how.title[1]}</em>{t.how.title[2]}</>}
            subtitle={t.how.sub} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-8 mt-12">
            {t.how.steps.map((s: any, i: number) => (
              <div key={i} data-reveal className="relative rounded-2xl bg-white/[0.03] border border-white/5 p-5 sm:p-6">
                <div className="flex items-baseline gap-3 mb-4">
                  <span className={`text-5xl sm:text-6xl font-black leading-none ${['text-violet-400', 'text-fuchsia-400', 'text-amber-400'][i]}`}>{i + 1}</span>
                  {[FileSearch, Brain, Zap].map((Ic, j) => j === i && <Ic key={j} className="w-5 h-5 text-slate-500" />)}
                </div>
                <h3 className="text-lg font-bold text-white">{s.title}</h3>
                <p className="mt-2 text-[13px] text-slate-400 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── STATS ─────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
            {t.stats.items.map((s: any, i: number) => (
              <div key={i} data-reveal className="text-center rounded-2xl p-4 sm:p-6 bg-white/[0.02] border border-white/5">
                <div data-count={s.count} data-suffix={s.suffix}
                  className="text-2xl sm:text-4xl font-black bg-gradient-to-br from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                  0{s.suffix}
                </div>
                <div className="text-[10px] sm:text-xs uppercase tracking-wider text-slate-500 font-bold mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SECURITY ──────────────────────────────────────────── */}
      <section id="seguridad" className="relative py-20 sm:py-28 bg-gradient-to-b from-transparent via-slate-900/60 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
            <div data-reveal>
              <Kicker>{t.security.kicker}</Kicker>
              <h2 className="mt-3 text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                {t.security.title[0]}<em className="not-italic bg-gradient-to-br from-emerald-400 to-cyan-400 bg-clip-text text-transparent">{t.security.title[1]}</em>{t.security.title[2]}.
              </h2>
              <p className="mt-5 text-base sm:text-lg text-slate-300/90 leading-relaxed">{t.security.sub}</p>
              <div className="mt-8 flex flex-wrap gap-2">
                {t.security.badges.map((b: string) => (
                  <span key={b} className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">{b}</span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {t.security.items.map((p: any, i: number) => {
                const Icon = [Lock, Shield, Brain, Globe, Clock, ShieldCheck][i];
                const color = ['text-emerald-400', 'text-sky-400', 'text-violet-400', 'text-amber-400', 'text-rose-400', 'text-fuchsia-400'][i];
                return (
                  <div key={i} data-reveal className="rounded-2xl bg-white/[0.03] border border-white/5 p-4 sm:p-5 hover:bg-white/[0.05] transition">
                    <Icon className={`w-5 h-5 ${color}`} />
                    <h3 className="mt-3 text-sm font-bold text-white">{p.title}</h3>
                    <p className="mt-1 text-[12px] text-slate-400 leading-relaxed">{p.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ─── PRICING ───────────────────────────────────────────── */}
      <section id="precios" className="relative py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader kicker={t.pricing.kicker}
            title={<>{t.pricing.title[0]}<em className="not-italic bg-gradient-to-br from-amber-300 to-rose-400 bg-clip-text text-transparent">{t.pricing.title[1]}</em></>}
            subtitle={t.pricing.sub} />
          <PricingDeck t={t.pricing} />
          <div className="mt-8 text-center">
            <Link href="/pricing" className="text-sm text-slate-400 hover:text-white inline-flex items-center gap-1 underline-offset-4 hover:underline">
              {t.pricing.compare} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── COMPANY ───────────────────────────────────────────── */}
      <section id="empresa" className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div data-parallax="8" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[120px]" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div data-reveal>
            <Kicker>{t.company.kicker}</Kicker>
            <div className="mt-6 inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 border border-violet-500/30 backdrop-blur">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <span className="font-black text-xl tracking-wider">COGNITEX</span>
            </div>
            <h2 className="mt-8 text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              {t.company.title[0]}<br />
              <em className="not-italic bg-gradient-to-br from-violet-400 via-fuchsia-400 to-amber-300 bg-clip-text text-transparent">{t.company.title[1]}</em>
            </h2>
            <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">{t.company.body}</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a href="https://www.cognitex.app" target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-200 font-semibold text-sm hover:bg-white/10 hover:border-white/20 transition group/cog">
                <Globe className="w-4 h-4 text-violet-400" />
                www.cognitex.app
                <ArrowRight className="w-3.5 h-3.5 group-hover/cog:translate-x-0.5 transition-transform" />
              </a>
            </div>
          </div>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-3xl mx-auto">
            {t.company.cards.map((b: any, i: number) => {
              const Icon = [Target, Building2, Users][i];
              return (
                <div key={i} data-reveal className="rounded-2xl bg-white/[0.03] border border-white/5 p-4 text-left">
                  <Icon className="w-4 h-4 text-violet-400" />
                  <div className="mt-2 text-[10px] uppercase tracking-widest font-bold text-slate-500">{b.label}</div>
                  <p className="text-sm text-slate-300 leading-snug">{b.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── CONTACT ───────────────────────────────────────────── */}
      <section id="contacto" className="relative py-20 sm:py-28 bg-gradient-to-b from-transparent via-slate-900/40 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader kicker={t.contact.kicker}
            title={<>{t.contact.title[0]}<em className="not-italic bg-gradient-to-br from-amber-300 to-rose-400 bg-clip-text text-transparent">{t.contact.title[1]}</em></>}
            subtitle={t.contact.sub} />
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-12">
            <div data-reveal className="lg:col-span-3"><InstitutionalContact /></div>
            <div className="lg:col-span-2 space-y-3">
              <ContactCard icon={Phone} label={t.contact.phone} value="+593 98 396 4333" href="https://wa.me/593983964333" tint="from-emerald-500 to-teal-500" />
              <ContactCard icon={Mail} label={t.contact.email} value="comercial@cognitex.app" href="mailto:comercial@cognitex.app" tint="from-violet-500 to-fuchsia-500" />
              <ContactCard icon={MessageCircle} label={t.contact.person} value="Ing. Francisco Jacome — COGNITEX" tint="from-amber-500 to-orange-500" />
              <ContactCard icon={MapPin} label={t.contact.location} value={t.contact.locationValue} tint="from-sky-500 to-cyan-500" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─────────────────────────────────────────── */}
      <section className="relative py-20 sm:py-32">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div data-reveal className="rounded-3xl p-8 sm:p-14 bg-gradient-to-br from-violet-600/20 via-fuchsia-600/20 to-amber-500/10 border border-white/10 backdrop-blur relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-fuchsia-500/30 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-violet-500/30 blur-3xl" />
            <div className="relative">
              <Quote className="w-8 h-8 text-violet-300 mx-auto" />
              <p className="mt-4 text-xl sm:text-3xl font-bold text-white max-w-2xl mx-auto leading-snug">{t.testimonial.quote}</p>
              <div className="mt-6 inline-flex items-center gap-1 text-amber-300">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
              </div>
              <p className="mt-2 text-sm text-slate-400">{t.testimonial.author}</p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link href="/register"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white font-bold text-base shadow-2xl shadow-violet-500/30 hover:shadow-violet-500/60 hover:scale-[1.02] transition-all">
                  {t.testimonial.ctaPrimary}
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a href="#contacto"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-200 font-semibold text-base hover:bg-white/10 hover:border-white/20 transition">
                  {t.testimonial.ctaSecondary}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <Scale className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold">Poweria Legal</span>
            </Link>
            <p className="mt-3 text-xs text-slate-500 leading-relaxed">{t.footer.tagline}</p>
          </div>
          <FooterCol title={t.footer.colProduct} links={t.footer.product} />
          <FooterCol title={t.footer.colCompany} links={t.footer.companyLinks} />
          <FooterCol title={t.footer.colLegal} links={t.footer.legal} />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 pt-6 border-t border-white/5 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} COGNITEX · Ecuador. {t.footer.rights}</span>
          <span className="opacity-60">{t.footer.madeWith}</span>
        </div>
      </footer>

      {/* Animaciones CSS — marquee + fallback de visibilidad */}
      <style jsx global>{`
        @keyframes poweria-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .marquee-track { animation: poweria-marquee 38s linear infinite; }
        .marquee-track:hover { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) { .marquee-track { animation: none; } }
      `}</style>
    </main>
  );
}

// ════════════════════════════════════════════════════════════════════════
// SUBCOMPONENTES
// ════════════════════════════════════════════════════════════════════════

function ScrollProgress() {
  const [w, setW] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setW(h > 0 ? (window.scrollY / h) * 100 : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div className="fixed top-0 inset-x-0 z-[60] h-0.5 bg-transparent">
      <div className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-amber-400 transition-[width] duration-150"
        style={{ width: `${w}%` }} />
    </div>
  );
}

function LangToggle({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  return (
    <div className="inline-flex items-center rounded-lg bg-white/5 border border-white/10 p-0.5 text-[11px] font-bold">
      {(['es', 'en'] as Lang[]).map((l) => (
        <button key={l} onClick={() => onChange(l)}
          className={`px-2 py-1 rounded-md transition ${
            lang === l ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-white'
          }`}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-bold uppercase tracking-widest text-slate-300">
      <span className="w-1 h-1 rounded-full bg-violet-400" />
      {children}
    </span>
  );
}

function SectionHeader({ kicker, title, subtitle }: { kicker: string; title: React.ReactNode; subtitle?: string }) {
  return (
    <div data-reveal className="text-center max-w-3xl mx-auto">
      <Kicker>{kicker}</Kicker>
      <h2 className="mt-4 text-3xl sm:text-5xl font-black tracking-tight leading-tight">{title}</h2>
      {subtitle && <p className="mt-4 text-base sm:text-lg text-slate-400 leading-relaxed">{subtitle}</p>}
    </div>
  );
}

function FeatureCard({ id, meta, text }: {
  id: string; meta: typeof FEATURE_META[number]; text: { tag: string; title: string; body: string };
}) {
  const Icon = meta.icon;
  return (
    <div id={id} data-reveal className="group/feat relative rounded-2xl bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/5 p-5 sm:p-6 hover:border-white/10 hover:bg-white/[0.05] transition-all overflow-hidden scroll-mt-24">
      <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${meta.gradient} opacity-10 blur-2xl group-hover/feat:opacity-20 transition-opacity`} />
      <div className="relative flex items-center justify-between">
        <div className={`inline-flex w-10 h-10 rounded-xl bg-gradient-to-br ${meta.gradient} items-center justify-center shadow-lg ${meta.accent}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{text.tag}</span>
      </div>
      <h3 className="relative mt-4 text-lg font-bold text-white leading-tight">{text.title}</h3>
      <p className="relative mt-2 text-[13px] text-slate-400 leading-relaxed">{text.body}</p>
    </div>
  );
}

function PricingDeck({ t }: { t: any }) {
  const [yearly, setYearly] = useState(false);
  const [plans, setPlans] = useState<PlanPrice[]>(PLAN_META);

  // Precios en vivo: leídos de /payhub/plans (subscription_plans). Si la API
  // no responde, se mantienen los precios de respaldo de PLAN_META.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [m, y] = await Promise.all([
          api.get('/payhub/plans', { params: { cycle: 'monthly' } }),
          api.get('/payhub/plans', { params: { cycle: 'yearly' } }),
        ]);
        if (cancelled) return;
        const mMap = new Map<string, any>((m.data?.plans ?? []).map((p: any) => [p.code, p]));
        const yMap = new Map<string, any>((y.data?.plans ?? []).map((p: any) => [p.code, p]));
        setPlans(PLAN_META.map((meta) => {
          const mp = mMap.get(meta.code);
          const yp = yMap.get(meta.code);
          return {
            code: meta.code,
            monthly: mp ? Number(mp.price_cents) / 100 : meta.monthly,
            yearly: yp ? Number(yp.price_cents) / 100 : meta.yearly,
            popular: mp ? mp.is_popular === true : meta.popular,
          };
        }));
      } catch { /* se mantienen los precios de respaldo */ }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <div className="mt-10 flex items-center justify-center">
        <div className="inline-flex items-center gap-1 rounded-full bg-white/5 border border-white/10 p-1 backdrop-blur">
          <button onClick={() => setYearly(false)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${!yearly ? 'bg-white text-slate-900 shadow' : 'text-slate-300 hover:text-white'}`}>
            {t.monthly}
          </button>
          <button onClick={() => setYearly(true)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition inline-flex items-center gap-1.5 ${yearly ? 'bg-white text-slate-900 shadow' : 'text-slate-300 hover:text-white'}`}>
            {t.yearly}
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${yearly ? 'bg-emerald-500 text-white' : 'bg-emerald-500/20 text-emerald-300'}`}>
              {t.save}
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5 mt-10">
        {plans.map((meta, i) => (
          <PlanCard key={meta.code} meta={meta} text={t.plans[i]} yearly={yearly} t={t} />
        ))}
      </div>

      <div data-reveal className="mt-6 rounded-2xl bg-gradient-to-br from-amber-500/10 via-rose-500/10 to-violet-500/10 border border-white/10 p-5 sm:p-7 flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/30 shrink-0">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-widest font-bold text-amber-300">{t.institutional.kicker}</div>
          <h3 className="text-lg sm:text-xl font-black text-white mt-0.5">{t.institutional.title}</h3>
          <p className="text-sm text-slate-300 mt-1">{t.institutional.body}</p>
        </div>
        <a href="mailto:comercial@cognitex.app"
          className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-rose-500 text-white font-bold text-sm shadow-lg shadow-rose-500/30 hover:shadow-rose-500/50 hover:scale-[1.02] transition-all">
          {t.institutional.cta}
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>
    </>
  );
}

function PlanCard({ meta, text, yearly, t }: {
  meta: PlanPrice; text: any; yearly: boolean; t: any;
}) {
  const monthlyEquiv = yearly ? meta.yearly / 12 : meta.monthly;
  const showFree = meta.monthly === 0;
  const ctaHref = showFree
    ? '/register'
    : `/pricing?plan=${encodeURIComponent(meta.code)}&cycle=${yearly ? 'yearly' : 'monthly'}`;
  return (
    <div data-reveal className={`relative rounded-2xl p-5 sm:p-6 transition-all flex flex-col ${
      meta.popular
        ? 'bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 border-2 border-violet-500/40 shadow-2xl shadow-violet-500/20 lg:scale-[1.04]'
        : 'bg-white/[0.03] border border-white/5 hover:bg-white/[0.05]'
    }`}>
      {meta.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-violet-500/40">
          <Sparkles className="w-3 h-3" />
          {t.popularLabel}
        </div>
      )}
      <h3 className="text-lg font-bold text-white">{text.name}</h3>
      <p className="mt-1 text-xs text-slate-400 leading-snug min-h-[2.5em]">{text.desc}</p>
      <div className="mt-5">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-black text-white tracking-tight">${showFree ? '0' : monthlyEquiv.toFixed(0)}</span>
          <span className="text-xs text-slate-500">{t.perMonth}</span>
        </div>
        <p className="text-[10px] text-slate-500 mt-1">
          {showFree ? t.freeNote : yearly
            ? <span className="text-emerald-400">{t.billedYear(meta.yearly)}</span>
            : t.billedMonth(meta.monthly)}
        </p>
      </div>
      <ul className="mt-5 space-y-2 text-[12px] text-slate-300">
        {text.features.map((f: string) => (
          <li key={f} className="flex items-start gap-1.5">
            <Check className="w-3.5 h-3.5 mt-0.5 text-emerald-400 shrink-0" />
            <span className="leading-snug">{f}</span>
          </li>
        ))}
      </ul>
      <Link href={ctaHref}
        className={`mt-6 inline-flex w-full items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-bold text-xs transition-all ${
          meta.popular
            ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/40 hover:shadow-violet-500/60 hover:scale-[1.01]'
            : 'bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20'
        }`}>
        {text.cta}
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

function ContactCard({ icon: Icon, label, value, href, tint }: {
  icon: any; label: string; value: string; href?: string; tint: string;
}) {
  const inner = (
    <>
      <div className={`shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${tint} flex items-center justify-center shadow`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-widest font-bold text-slate-500">{label}</div>
        <div className="text-sm font-semibold text-white truncate">{value}</div>
      </div>
    </>
  );
  return href ? (
    <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer"
      className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.07] hover:border-white/10 transition-all">
      {inner}
    </a>
  ) : (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">{inner}</div>
  );
}

function FooterCol({ title, links }: { title: string; links: Array<[string, string]> }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-3">{title}</div>
      <ul className="space-y-1.5">
        {links.map(([href, label]) => (
          <li key={href + label}>
            <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer"
              className="text-xs text-slate-500 hover:text-slate-200 transition">{label}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Flair visual ──────────────────────────────────────────────────────────

function BackgroundOrbs() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div data-parallax="18" className="absolute -top-40 left-1/3 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-violet-600/20 blur-[120px]" />
      <div data-parallax="10" className="absolute top-20 right-0 translate-x-1/4 w-[500px] h-[500px] rounded-full bg-fuchsia-500/15 blur-[120px]" />
      <div data-parallax="14" className="absolute -top-20 left-0 -translate-x-1/4 w-[400px] h-[400px] rounded-full bg-amber-500/10 blur-[120px]" />
    </div>
  );
}

function GridBackground() {
  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none opacity-[0.07]"
      style={{
        backgroundImage: 'linear-gradient(rgba(148,163,184,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.4) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
        maskImage: 'radial-gradient(circle at center top, black 30%, transparent 70%)',
      }} />
  );
}

function HeroMockup({ lang }: { lang: Lang }) {
  const txt = lang === 'es'
    ? { tab: 'sala-de-litigación', next: 'Próxima audiencia', hearing: 'Audiencia preliminar',
        starts: 'Empieza en 02h 14m', join: '▶ Unirse', card: 'Tarjeta 1/7', open: '🎙️ Apertura',
        quote: '«Su Señoría, hoy comparecemos para…»', p1: 'Identificar partes', p2: 'Resumir hechos',
        ai: 'Asistente IA', q: '¿Qué artículo aplica al hecho principal?',
        a: 'Art. 76, Constitución del Ecuador — debido proceso…' }
    : { tab: 'litigation-room', next: 'Next hearing', hearing: 'Preliminary hearing',
        starts: 'Starts in 02h 14m', join: '▶ Join', card: 'Card 1/7', open: '🎙️ Opening',
        quote: '“Your Honor, today we appear to…”', p1: 'Identify parties', p2: 'Summarize facts',
        ai: 'AI Assistant', q: 'Which article applies to the main fact?',
        a: 'Art. 76, Constitution of Ecuador — due process…' };
  return (
    <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 sm:mt-16">
      <div className="relative rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 shadow-2xl shadow-violet-500/10 overflow-hidden">
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/5 bg-slate-950/80">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
          <span className="ml-3 text-[10px] font-mono text-slate-500">poweria.legal · {txt.tab}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 sm:p-4 h-72 sm:h-80">
          <div className="rounded-lg bg-gradient-to-br from-rose-950/50 to-rose-900/30 border border-rose-500/30 p-3">
            <div className="text-[9px] uppercase tracking-widest font-bold text-rose-300 mb-2">{txt.next}</div>
            <div className="text-white text-sm font-bold">{txt.hearing}</div>
            <div className="mt-1 text-[10px] text-rose-200">{txt.starts}</div>
            <div className="mt-3 inline-flex text-[10px] font-bold px-2 py-1 rounded bg-emerald-600 text-white">{txt.join}</div>
          </div>
          <div className="rounded-lg bg-gradient-to-br from-violet-700 via-fuchsia-700 to-rose-700 p-3">
            <div className="text-[9px] uppercase tracking-widest font-bold text-white/70 mb-1">{txt.card}</div>
            <div className="text-white text-base font-black">{txt.open}</div>
            <p className="mt-2 text-[11px] italic text-white/90 leading-snug">{txt.quote}</p>
            <div className="mt-2 space-y-1">
              {[txt.p1, txt.p2].map((p) => (
                <div key={p} className="text-[10px] text-white bg-white/15 backdrop-blur rounded px-2 py-1">○ {p}</div>
              ))}
            </div>
          </div>
          <div className="rounded-lg bg-slate-900 border border-white/5 p-3 flex flex-col">
            <div className="text-[9px] uppercase tracking-widest font-bold text-violet-300 mb-2">{txt.ai}</div>
            <div className="text-[11px] text-slate-300 bg-white/5 rounded-lg px-2 py-1.5 mb-2">{txt.q}</div>
            <div className="text-[11px] text-slate-100 bg-violet-600 rounded-lg px-2 py-1.5">{txt.a}</div>
            <div className="mt-auto h-2 bg-violet-500/30 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
