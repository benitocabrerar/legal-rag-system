'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Sparkles, Scale, Layers, FileSearch, Calendar, Wallet, Shield, Lock, Globe,
  ArrowRight, Check, Quote, Building2, Mail, Phone, MessageCircle, ChevronDown,
  Zap, Brain, Clock, BookMarked, Users, Star, MapPin, Target,
} from 'lucide-react';
import InstitutionalContact from '@/components/landing/InstitutionalContact';

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <main className="bg-slate-950 text-slate-100 antialiased overflow-x-hidden">
      {/* ─── NAV ─────────────────────────────────────────────── */}
      <nav
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-slate-950/80 backdrop-blur-xl border-b border-white/5'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30 group-hover:shadow-violet-500/50 transition">
              <Scale className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-base sm:text-lg tracking-tight">Poweria Legal</span>
          </Link>

          <div className="hidden md:flex items-center gap-7 text-sm text-slate-300">
            <a href="#producto" className="hover:text-white transition">Producto</a>
            <a href="#como-funciona" className="hover:text-white transition">Cómo funciona</a>
            <a href="#precios" className="hover:text-white transition">Precios</a>
            <a href="#privacidad" className="hover:text-white transition">Privacidad</a>
            <a href="#empresa" className="hover:text-white transition">Empresa</a>
            <a href="#contacto" className="hover:text-white transition">Contacto</a>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden sm:inline-flex text-sm text-slate-300 hover:text-white px-3 py-1.5 transition">
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 text-sm font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-[1.02] transition"
            >
              Probar gratis
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={() => setNavOpen((v) => !v)}
              className="md:hidden p-2 -mr-2 text-slate-200"
              aria-label="Menú"
            >
              <ChevronDown className={`w-5 h-5 transition ${navOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
        {navOpen && (
          <div className="md:hidden border-t border-white/5 bg-slate-950/95 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-1 text-sm text-slate-300">
              {[
                ['#producto', 'Producto'],
                ['#como-funciona', 'Cómo funciona'],
                ['#precios', 'Precios'],
                ['#privacidad', 'Privacidad'],
                ['#empresa', 'Empresa'],
                ['#contacto', 'Contacto'],
              ].map(([h, l]) => (
                <a key={h} href={h} onClick={() => setNavOpen(false)} className="px-2 py-2 rounded hover:bg-white/5">
                  {l}
                </a>
              ))}
              <Link href="/login" onClick={() => setNavOpen(false)} className="px-2 py-2 rounded hover:bg-white/5 sm:hidden">
                Iniciar sesión
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ─── HERO ────────────────────────────────────────────── */}
      <section className="relative pt-32 sm:pt-40 pb-24 sm:pb-32 overflow-hidden">
        <BackgroundOrbs />
        <GridBackground />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur text-[11px] sm:text-xs font-semibold tracking-wider text-slate-300 mb-6">
            <Sparkles className="w-3 h-3 text-violet-400" />
            <span className="uppercase">Hecho en Ecuador · LOPDP-ready · IA con citas reales</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] max-w-4xl mx-auto">
            El cerebro jurídico
            <br />
            que <span className="bg-gradient-to-br from-violet-400 via-fuchsia-400 to-amber-300 bg-clip-text text-transparent">litiga contigo</span>
          </h1>

          <p className="mt-5 sm:mt-7 text-base sm:text-xl text-slate-300/90 max-w-2xl mx-auto leading-relaxed">
            Sala de litigación a pantalla completa, tarjetas de argumentos por IA,
            convocatorias que se autocompletan al subir la providencia, calendario,
            tareas y finanzas — todo en un lugar.
          </p>

          <div className="mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-5 sm:px-6 py-3 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white font-bold text-sm sm:text-base shadow-2xl shadow-violet-500/30 hover:shadow-violet-500/60 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Empezar gratis
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#producto"
              className="inline-flex items-center gap-2 px-5 sm:px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-200 font-semibold text-sm sm:text-base hover:bg-white/10 hover:border-white/20 transition"
            >
              Ver el producto
            </a>
          </div>

          <div className="mt-10 sm:mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[11px] sm:text-xs text-slate-500 uppercase tracking-widest font-semibold">
            <span className="flex items-center gap-1.5"><Lock className="w-3 h-3 text-emerald-400" /> Cifrado en reposo</span>
            <span className="flex items-center gap-1.5"><Shield className="w-3 h-3 text-sky-400" /> RLS por usuario</span>
            <span className="flex items-center gap-1.5"><Globe className="w-3 h-3 text-amber-400" /> Multi-jurisdicción</span>
            <span className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-violet-400" /> Tiempo real</span>
          </div>
        </div>

        <HeroMockup />
      </section>

      {/* ─── FEATURES ────────────────────────────────────────── */}
      <section id="producto" className="relative py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            kicker="El producto"
            title={<>Diseñado para <em className="not-italic bg-gradient-to-br from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">ganar audiencias</em>, no para llenarse de pestañas</>}
            subtitle="Cada vista resuelve un momento real del trabajo legal. Sin distracciones, con IA cuando ayuda y silencio cuando estorba."
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-12 sm:mt-16">
            {FEATURES.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW ─────────────────────────────────────────────── */}
      <section id="como-funciona" className="relative py-20 sm:py-28 bg-gradient-to-b from-transparent via-slate-900/40 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            kicker="En 3 pasos"
            title={<>De cero a <em className="not-italic bg-gradient-to-br from-emerald-400 to-cyan-400 bg-clip-text text-transparent">litigar con IA</em> en una tarde</>}
            subtitle="No necesitas migrar nada. Sube tus casos, conecta tu calendario y deja que la IA aprenda contigo."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-8 mt-12">
            {STEPS.map((s, i) => (
              <StepCard key={s.title} index={i + 1} {...s} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── STATS ───────────────────────────────────────────── */}
      <section className="py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
            {STATS.map((s) => (
              <div key={s.label} className="text-center rounded-2xl p-4 sm:p-6 bg-white/[0.02] border border-white/5">
                <div className="text-2xl sm:text-4xl font-black bg-gradient-to-br from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">{s.value}</div>
                <div className="text-[10px] sm:text-xs uppercase tracking-wider text-slate-500 font-bold mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ─────────────────────────────────────────── */}
      <section id="precios" className="relative py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            kicker="Precios"
            title={<>Empieza gratis. <em className="not-italic bg-gradient-to-br from-amber-300 to-rose-400 bg-clip-text text-transparent">Crece cuando estés listo.</em></>}
            subtitle="Sin sorpresas. Cancelas cuando quieras. Datos siempre tuyos."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 mt-12">
            {PLANS.map((p) => (
              <PlanCard key={p.code} {...p} />
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/pricing" className="text-sm text-slate-400 hover:text-white inline-flex items-center gap-1 underline-offset-4 hover:underline">
              Comparación detallada y opciones de pago <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── PRIVACY ─────────────────────────────────────────── */}
      <section id="privacidad" className="relative py-20 sm:py-28 bg-gradient-to-b from-transparent via-slate-900/60 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
            <div>
              <Kicker>Privacidad y manejo de datos</Kicker>
              <h2 className="mt-3 text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                Tu información <em className="not-italic bg-gradient-to-br from-emerald-400 to-cyan-400 bg-clip-text text-transparent">jamás</em> entrena nuestros modelos.
              </h2>
              <p className="mt-5 text-base sm:text-lg text-slate-300/90 leading-relaxed">
                Construimos Poweria Legal con un principio simple:
                el dato del cliente es del cliente. Cumplimos con la
                Ley Orgánica de Protección de Datos del Ecuador (LOPDP)
                y aplicamos las mejores prácticas internacionales de
                seguridad y minimización de datos.
              </p>
              <div className="mt-8 flex flex-wrap gap-2">
                {['LOPDP Ecuador', 'GDPR-aligned', 'Cifrado AES-256', 'TLS 1.3', 'PostgreSQL RLS'].map((b) => (
                  <span key={b} className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                    {b}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {PRIVACY.map((p) => (
                <div key={p.title} className="rounded-2xl bg-white/[0.03] border border-white/5 p-4 sm:p-5 hover:bg-white/[0.05] transition">
                  <p.icon className={`w-5 h-5 ${p.color}`} />
                  <h3 className="mt-3 text-sm font-bold text-white">{p.title}</h3>
                  <p className="mt-1 text-[12px] text-slate-400 leading-relaxed">{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── COMPANY (COGNITEX) ──────────────────────────────── */}
      <section id="empresa" className="relative py-20 sm:py-28 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[120px]" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Kicker>La empresa detrás del producto</Kicker>
          <div className="mt-6 inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 border border-violet-500/30 backdrop-blur">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-xl tracking-wider">COGNITEX</span>
          </div>

          <h2 className="mt-8 text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            IA con propósito.
            <br />
            <em className="not-italic bg-gradient-to-br from-violet-400 via-fuchsia-400 to-amber-300 bg-clip-text text-transparent">Hecha en Ecuador, pensada para el mundo.</em>
          </h2>

          <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            COGNITEX es una empresa ecuatoriana de tecnología que diseña
            herramientas inteligentes para profesionales que toman decisiones
            con consecuencias. Poweria Legal es nuestro primer producto:
            la primera plataforma de IA jurídica creada por y para abogados
            del Ecuador.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://www.cognitex.app"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-200 font-semibold text-sm hover:bg-white/10 hover:border-white/20 transition group/cog"
            >
              <Globe className="w-4 h-4 text-violet-400" />
              www.cognitex.app
              <ArrowRight className="w-3.5 h-3.5 group-hover/cog:translate-x-0.5 transition-transform" />
            </a>
          </div>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-3xl mx-auto">
            {[
              { icon: Target,    label: 'Misión', text: 'Liberar tiempo a los profesionales con IA confiable y trazable.' },
              { icon: Building2, label: 'Sede',   text: 'Ecuador · operación remota cubriendo LATAM.' },
              { icon: Users,     label: 'Equipo', text: 'Abogados + ingenieros de ML + diseñadores de producto.' },
            ].map((b) => (
              <div key={b.label} className="rounded-2xl bg-white/[0.03] border border-white/5 p-4 text-left">
                <b.icon className="w-4 h-4 text-violet-400" />
                <div className="mt-2 text-[10px] uppercase tracking-widest font-bold text-slate-500">{b.label}</div>
                <p className="text-sm text-slate-300 leading-snug">{b.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CONTACT ─────────────────────────────────────────── */}
      <section id="contacto" className="relative py-20 sm:py-28 bg-gradient-to-b from-transparent via-slate-900/40 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            kicker="Hablemos"
            title={<>¿Estudio jurídico o institución? <em className="not-italic bg-gradient-to-br from-amber-300 to-rose-400 bg-clip-text text-transparent">Te contactamos hoy.</em></>}
            subtitle="Demos personalizadas, planes corporativos y on-boarding asistido."
          />

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-12">
            <div className="lg:col-span-3">
              <InstitutionalContact />
            </div>
            <div className="lg:col-span-2 space-y-3">
              <ContactCard
                icon={Phone}
                label="Teléfono / WhatsApp"
                value="+593 98 396 4333"
                href="https://wa.me/593983964333"
                tint="from-emerald-500 to-teal-500"
              />
              <ContactCard
                icon={Mail}
                label="Correo de ventas"
                value="francisecuador1@gmail.com"
                href="mailto:francisecuador1@gmail.com"
                tint="from-violet-500 to-fuchsia-500"
              />
              <ContactCard
                icon={MessageCircle}
                label="Encargado comercial"
                value="Ing. Francisco Jacome — COGNITEX"
                tint="from-amber-500 to-orange-500"
              />
              <ContactCard
                icon={MapPin}
                label="Ubicación"
                value="Quito · Ecuador"
                tint="from-sky-500 to-cyan-500"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ───────────────────────────────────────── */}
      <section className="relative py-20 sm:py-32">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="rounded-3xl p-8 sm:p-14 bg-gradient-to-br from-violet-600/20 via-fuchsia-600/20 to-amber-500/10 border border-white/10 backdrop-blur relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-fuchsia-500/30 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-violet-500/30 blur-3xl" />
            <div className="relative">
              <Quote className="w-8 h-8 text-violet-300 mx-auto" />
              <p className="mt-4 text-xl sm:text-3xl font-bold text-white max-w-2xl mx-auto leading-snug">
                &ldquo;Antes me llevaba dos horas preparar una audiencia.
                Ahora abro Poweria, subo la providencia, todo está allí.&rdquo;
              </p>
              <div className="mt-6 inline-flex items-center gap-1 text-amber-300">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
              </div>
              <p className="mt-2 text-sm text-slate-400">— Abogada en estudio penalista, Quito</p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white font-bold text-base shadow-2xl shadow-violet-500/30 hover:shadow-violet-500/60 hover:scale-[1.02] transition-all"
                >
                  Empezar gratis ahora
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="#contacto"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-200 font-semibold text-base hover:bg-white/10 hover:border-white/20 transition"
                >
                  Hablar con un humano
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ──────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <Scale className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold">Poweria Legal</span>
            </Link>
            <p className="mt-3 text-xs text-slate-500 leading-relaxed">
              Plataforma de IA jurídica del Ecuador. Un producto de COGNITEX.
            </p>
          </div>
          <FooterCol
            title="Producto"
            links={[
              ['#producto', 'Características'],
              ['#como-funciona', 'Cómo funciona'],
              ['#precios', 'Precios'],
              ['/pricing', 'Comparar planes'],
            ]}
          />
          <FooterCol
            title="Empresa"
            links={[
              ['#empresa', 'Sobre COGNITEX'],
              ['https://www.cognitex.app', 'cognitex.app'],
              ['#contacto', 'Contacto'],
            ]}
          />
          <FooterCol
            title="Legal"
            links={[
              ['#privacidad', 'Privacidad'],
              ['/terms', 'Términos de servicio'],
              ['/lopdp', 'LOPDP Ecuador'],
            ]}
          />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 pt-6 border-t border-white/5 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} COGNITEX · Ecuador. Todos los derechos reservados.</span>
          <span className="opacity-60">Diseñado con ☕ y 🇪🇨</span>
        </div>
      </footer>
    </main>
  );
}

// ─── Subcomponents ──────────────────────────────────────────

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
    <div className="text-center max-w-3xl mx-auto">
      <Kicker>{kicker}</Kicker>
      <h2 className="mt-4 text-3xl sm:text-5xl font-black tracking-tight leading-tight">{title}</h2>
      {subtitle && <p className="mt-4 text-base sm:text-lg text-slate-400 leading-relaxed">{subtitle}</p>}
    </div>
  );
}

function FeatureCard({ icon: Icon, title, body, gradient, accent }: {
  icon: any; title: string; body: string; gradient: string; accent: string;
}) {
  return (
    <div className="group/feat relative rounded-2xl bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/5 p-5 sm:p-6 hover:border-white/10 hover:bg-white/[0.05] transition-all overflow-hidden">
      <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${gradient} opacity-10 blur-2xl group-hover/feat:opacity-20 transition-opacity`} />
      <div className={`relative inline-flex w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} items-center justify-center shadow-lg ${accent}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <h3 className="relative mt-4 text-lg font-bold text-white leading-tight">{title}</h3>
      <p className="relative mt-2 text-[13px] text-slate-400 leading-relaxed">{body}</p>
    </div>
  );
}

function StepCard({ index, title, body, icon: Icon, color }: {
  index: number; title: string; body: string; icon: any; color: string;
}) {
  return (
    <div className="relative rounded-2xl bg-white/[0.03] border border-white/5 p-5 sm:p-6">
      <div className="flex items-baseline gap-3 mb-4">
        <span className={`text-5xl sm:text-6xl font-black ${color} leading-none`}>{index}</span>
        <Icon className="w-5 h-5 text-slate-500" />
      </div>
      <h3 className="text-lg font-bold text-white">{title}</h3>
      <p className="mt-2 text-[13px] text-slate-400 leading-relaxed">{body}</p>
    </div>
  );
}

function PlanCard({ name, price, period, description, features, cta, popular, code }: {
  name: string; price: string; period: string; description: string;
  features: string[]; cta: string; popular?: boolean; code: string;
}) {
  return (
    <div
      className={`relative rounded-2xl p-6 sm:p-8 transition-all ${
        popular
          ? 'bg-gradient-to-br from-violet-600/20 to-fuchsia-600/20 border-2 border-violet-500/40 shadow-2xl shadow-violet-500/20 scale-100 sm:scale-[1.03]'
          : 'bg-white/[0.03] border border-white/5 hover:bg-white/[0.05]'
      }`}
    >
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-violet-500/40">
          <Sparkles className="w-3 h-3" />
          Más popular
        </div>
      )}
      <h3 className="text-lg font-bold text-white">{name}</h3>
      <p className="mt-1 text-xs text-slate-400">{description}</p>
      <div className="mt-6 flex items-baseline gap-1">
        <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">{price}</span>
        <span className="text-sm text-slate-500">{period}</span>
      </div>
      <ul className="mt-6 space-y-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-[13px] text-slate-300">
            <Check className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Link
        href={code === 'enterprise' ? '#contacto' : '/register'}
        className={`mt-7 inline-flex w-full items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
          popular
            ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/40 hover:shadow-violet-500/60 hover:scale-[1.01]'
            : 'bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-white/20'
        }`}
      >
        {cta}
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
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
      {inner}
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: Array<[string, string]> }) {
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-3">{title}</div>
      <ul className="space-y-1.5">
        {links.map(([href, label]) => (
          <li key={href}>
            <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer"
              className="text-xs text-slate-500 hover:text-slate-200 transition">
              {label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Visual flair ──────────────────────────────────────────

function BackgroundOrbs() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="absolute -top-40 left-1/3 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-violet-600/20 blur-[120px]" />
      <div className="absolute top-20 right-0 translate-x-1/4 w-[500px] h-[500px] rounded-full bg-fuchsia-500/15 blur-[120px]" />
      <div className="absolute -top-20 left-0 -translate-x-1/4 w-[400px] h-[400px] rounded-full bg-amber-500/10 blur-[120px]" />
    </div>
  );
}

function GridBackground() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none opacity-[0.07]"
      style={{
        backgroundImage:
          'linear-gradient(rgba(148,163,184,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.4) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
        maskImage: 'radial-gradient(circle at center top, black 30%, transparent 70%)',
      }}
    />
  );
}

function HeroMockup() {
  return (
    <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 sm:mt-16">
      <div className="relative rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-white/10 shadow-2xl shadow-violet-500/10 overflow-hidden">
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/5 bg-slate-950/80">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
          <span className="ml-3 text-[10px] font-mono text-slate-500">poweria.legal · sala-de-litigación</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 sm:p-4 h-72 sm:h-80">
          <div className="rounded-lg bg-gradient-to-br from-rose-950/50 to-rose-900/30 border border-rose-500/30 p-3">
            <div className="text-[9px] uppercase tracking-widest font-bold text-rose-300 mb-2">Próxima audiencia</div>
            <div className="text-white text-sm font-bold">Audiencia preliminar</div>
            <div className="mt-1 text-[10px] text-rose-200">Empieza en 02h 14m</div>
            <div className="mt-3 inline-flex text-[10px] font-bold px-2 py-1 rounded bg-emerald-600 text-white">▶ Unirse</div>
          </div>
          <div className="rounded-lg bg-gradient-to-br from-violet-700 via-fuchsia-700 to-rose-700 p-3">
            <div className="text-[9px] uppercase tracking-widest font-bold text-white/70 mb-1">Tarjeta 1/7</div>
            <div className="text-white text-base font-black">🎙️ Apertura</div>
            <p className="mt-2 text-[11px] italic text-white/90 leading-snug">&ldquo;Su Señoría, hoy comparecemos para…&rdquo;</p>
            <div className="mt-2 space-y-1">
              {['Identificar partes', 'Resumir hechos'].map((p) => (
                <div key={p} className="text-[10px] text-white bg-white/15 backdrop-blur rounded px-2 py-1">○ {p}</div>
              ))}
            </div>
          </div>
          <div className="rounded-lg bg-slate-900 border border-white/5 p-3 flex flex-col">
            <div className="text-[9px] uppercase tracking-widest font-bold text-violet-300 mb-2">Asistente IA</div>
            <div className="text-[11px] text-slate-300 bg-white/5 rounded-lg px-2 py-1.5 mb-2">¿Qué artículo aplica al hecho principal?</div>
            <div className="text-[11px] text-slate-100 bg-violet-600 rounded-lg px-2 py-1.5">Art. 76, Constitución del Ecuador — debido proceso…</div>
            <div className="mt-auto h-2 bg-violet-500/30 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Data ───────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Scale, title: 'Sala de Litigación',
    body: 'Pantalla completa con cronómetro, brief del caso, cronología, notas en vivo y un asistente IA que ya conoce el expediente.',
    gradient: 'from-violet-500 to-fuchsia-500',
    accent: 'shadow-violet-500/30',
  },
  {
    icon: Layers, title: 'Tarjetas argumentales por IA',
    body: 'Apertura, hechos, fundamento, prueba, refutación, réplica y cierre — generadas en streaming a partir del caso, listas para leer en orden.',
    gradient: 'from-indigo-500 to-violet-500',
    accent: 'shadow-indigo-500/30',
  },
  {
    icon: FileSearch, title: 'Convocatoria que se autocompleta',
    body: 'Sube el PDF de la providencia y la IA extrae fecha, hora, link de Zoom/Teams/Meet, código y juzgado emisor.',
    gradient: 'from-emerald-500 to-teal-500',
    accent: 'shadow-emerald-500/30',
  },
  {
    icon: Calendar, title: 'Calendario y tareas en sintonía',
    body: 'Mes/Semana/Día/Agenda con drag-and-drop. Kanban con sub-tareas y plantillas legales. Todo se sincroniza en tiempo real.',
    gradient: 'from-sky-500 to-cyan-500',
    accent: 'shadow-sky-500/30',
  },
  {
    icon: Wallet, title: 'Finanzas con CFO virtual',
    body: 'Dashboard con aging de cobranza, forecast de 4 semanas, factura desde tareas en un click, PDF generado al vuelo.',
    gradient: 'from-amber-500 to-orange-500',
    accent: 'shadow-amber-500/30',
  },
  {
    icon: BookMarked, title: 'Buscador jurídico instantáneo',
    body: 'Cita "Art. 76, Constitución" o "234 COIP" y ves el contenido completo del artículo en un segundo, leído en voz alta si quieres.',
    gradient: 'from-rose-500 to-pink-500',
    accent: 'shadow-rose-500/30',
  },
];

const STEPS = [
  { icon: FileSearch, title: 'Carga tus casos', body: 'Importa documentos en PDF, Word, imagen o texto. La IA los entiende, los indexa y los enriquece automáticamente.', color: 'text-violet-400' },
  { icon: Brain,      title: 'Habla con la IA',  body: 'Pregunta, pide resúmenes, genera tarjetas argumentales o sugerencias de subtareas. La IA cita siempre las fuentes.', color: 'text-fuchsia-400' },
  { icon: Zap,        title: 'Litiga sin fricción', body: 'Abre la Sala de Litigación con un click. Cronómetro, chat IA y argumentos a la mano durante la audiencia.', color: 'text-amber-400' },
];

const STATS = [
  { value: '12+',  label: 'Códigos legales indexados' },
  { value: '100%', label: 'Citas con fuente' },
  { value: '<2s',  label: 'Latencia de búsqueda' },
  { value: '24/7', label: 'IA disponible' },
];

const PLANS = [
  {
    code: 'gratis',
    name: 'Gratis',
    price: '$0',
    period: '/mes',
    description: 'Para abogados que están explorando.',
    features: ['Hasta 5 casos', 'Hasta 50 documentos', '100 consultas IA al mes', 'Calendario y tareas', 'Soporte por email'],
    cta: 'Empezar gratis',
  },
  {
    code: 'pro',
    name: 'Pro',
    price: '$29',
    period: '/mes',
    description: 'Para el abogado independiente o estudio pequeño.',
    features: ['Casos ilimitados', '5 GB de almacenamiento', '2 000 consultas IA', 'Sala de Litigación', 'Tarjetas argumentales con IA', 'Finanzas y facturación', 'Soporte prioritario'],
    cta: 'Probar Pro 14 días',
    popular: true,
  },
  {
    code: 'enterprise',
    name: 'Institucional',
    price: 'A medida',
    period: '',
    description: 'Para estudios grandes, instituciones públicas o universidades.',
    features: ['Todo lo del plan Pro', 'Usuarios ilimitados', 'SLA dedicado', 'On-boarding asistido', 'Integraciones a medida', 'Datos en tu jurisdicción', 'Capacitación al equipo'],
    cta: 'Hablar con ventas',
  },
];

const PRIVACY = [
  { icon: Lock,   title: 'Cifrado AES-256',           body: 'Todos los datos en reposo se almacenan cifrados; el tráfico viaja por TLS 1.3.', color: 'text-emerald-400' },
  { icon: Shield, title: 'Aislamiento por usuario',   body: 'Row-Level Security en PostgreSQL — un cliente jamás puede ver datos de otro.',     color: 'text-sky-400' },
  { icon: Brain,  title: 'Sin entrenar con tus datos',body: 'No usamos tu información para entrenar modelos. Cero excepciones.',                color: 'text-violet-400' },
  { icon: Globe,  title: 'LOPDP y trazabilidad',      body: 'Cumplimos la Ley Orgánica de Protección de Datos del Ecuador y registramos accesos.',color: 'text-amber-400' },
  { icon: Clock,  title: 'Tú controlas la retención', body: 'Exporta o elimina tu información cuando quieras — sin contratos a futuro.',         color: 'text-rose-400' },
  { icon: Users,  title: 'Auditoría disponible',      body: 'Cada acción importante queda en el log; el plan Institucional incluye reportes.',   color: 'text-fuchsia-400' },
];
