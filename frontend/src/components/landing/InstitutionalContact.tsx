'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';

const SALES_NAME = 'Ing. Francisco Jacome';
const SALES_COMPANY = 'COGNITEX';
const SALES_PHONE = '+593983964333';
const SALES_PHONE_DISPLAY = '+593 98 396 4333';
const SALES_EMAIL = 'francisecuador1@gmail.com';
const WHATSAPP_TEXT_ES = encodeURIComponent(
  'Hola, me interesa una cotización del plan Institucional de Poweria Legal para mi firma/institución.'
);
const WHATSAPP_TEXT_EN = encodeURIComponent(
  "Hi, I'm interested in a quote for the Institutional plan of Poweria Legal for my firm/institution."
);
const TEL_URL = `tel:${SALES_PHONE}`;

export default function InstitutionalContact() {
  const { t, locale } = useTranslation();
  const whatsappUrl = `https://wa.me/${SALES_PHONE.replace(/\D/g, '')}?text=${
    locale === 'en' ? WHATSAPP_TEXT_EN : WHATSAPP_TEXT_ES
  }`;
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    organization: '',
    seats: '',
    message: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.organization.trim()) {
      setError('Completa al menos nombre, email e institución.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${apiBase}/api/contact-sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, source: 'landing_institutional' }),
      });
      if (!res.ok) {
        // Fallback: open mailto
        const subject = encodeURIComponent('Solicitud cotización plan Institucional — Poweria Legal');
        const body = encodeURIComponent(
          `Nombre: ${form.name}\nEmail: ${form.email}\nTeléfono: ${form.phone}\nInstitución: ${form.organization}\nUsuarios estimados: ${form.seats}\n\nMensaje:\n${form.message}`
        );
        window.location.href = `mailto:${SALES_EMAIL}?subject=${subject}&body=${body}`;
        setSubmitted(true);
        return;
      }
      setSubmitted(true);
    } catch (_err) {
      // Network failure: also fallback to mailto
      const subject = encodeURIComponent('Solicitud cotización plan Institucional — Poweria Legal');
      const body = encodeURIComponent(
        `Nombre: ${form.name}\nEmail: ${form.email}\nTeléfono: ${form.phone}\nInstitución: ${form.organization}\nUsuarios estimados: ${form.seats}\n\nMensaje:\n${form.message}`
      );
      window.location.href = `mailto:${SALES_EMAIL}?subject=${subject}&body=${body}`;
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Institutional card section */}
      <div className="mt-10 bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 rounded-2xl shadow-2xl p-8 md:p-10 text-white relative overflow-hidden">
        {/* Decorative gradient blob */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-amber-400/20 to-transparent rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />

        <div className="grid md:grid-cols-2 gap-8 items-center relative">
          <div>
            <div className="inline-flex items-center gap-2 bg-amber-400/20 backdrop-blur border border-amber-400/30 px-3 py-1 rounded-full text-xs font-bold tracking-wider mb-4 text-amber-200">
              {t('landing.institutionalBadge')}
            </div>
            <h3 className="text-3xl md:text-4xl font-bold mb-3">
              {t('landing.institutionalTitle')}
            </h3>
            <p className="text-lg opacity-90 mb-6">
              {t('landing.institutionalDesc')}
            </p>

            <ul className="space-y-2 mb-6 text-sm">
              {(locale === 'en'
                ? [
                    'Custom users and AI quotas',
                    'SSO / SAML and advanced auditing',
                    'White-label with custom domain',
                    '99.9% SLA with dedicated support',
                    'Private / on-premise deployment (optional)',
                    'In-house training for your team',
                    'Corporate billing with tax ID',
                  ]
                : [
                    'Usuarios y cuotas IA personalizadas',
                    'SSO / SAML y auditoría avanzada',
                    'White-label con dominio propio',
                    'SLA 99.9% con soporte dedicado',
                    'Despliegue privado / on-premise (opcional)',
                    'Capacitación in-house para tu equipo',
                    'Facturación corporativa con NIT',
                  ]
              ).map((bullet) => (
                <li key={bullet} className="flex items-start gap-2"><span className="text-amber-300 font-bold">✓</span><span>{bullet}</span></li>
              ))}
            </ul>

            <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4 mb-6">
              <p className="text-xs uppercase tracking-wider text-amber-300 font-semibold mb-2">{t('landing.salesContact')}</p>
              <p className="font-bold text-lg">{SALES_NAME}</p>
              <p className="text-sm opacity-80">{t('landing.salesDept')} · {SALES_COMPANY}</p>
              <p className="text-xs opacity-60">{t('landing.salesCompanyDesc')}</p>
              <p className="text-sm opacity-80 mt-2">📞 {SALES_PHONE_DISPLAY} · ✉️ {SALES_EMAIL}</p>
            </div>
          </div>

          <div className="space-y-3">
            {/* WhatsApp button */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full bg-[#25D366] hover:bg-[#1eb858] text-white py-4 px-6 rounded-xl font-bold text-base transition-all shadow-lg hover:shadow-xl hover:scale-[1.02]"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              <span>{t('landing.ctaWhatsApp')}</span>
            </a>

            {/* Phone button */}
            <a
              href={TEL_URL}
              className="flex items-center justify-center gap-3 w-full bg-white text-slate-900 hover:bg-gray-100 py-4 px-6 rounded-xl font-bold text-base transition-all shadow-lg"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              <span>{t('landing.ctaCall')} {SALES_PHONE_DISPLAY}</span>
            </a>

            {/* Form button */}
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex items-center justify-center gap-3 w-full bg-amber-500 hover:bg-amber-600 text-white py-4 px-6 rounded-xl font-bold text-base transition-all shadow-lg hover:scale-[1.02]"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <span>{t('landing.ctaForm')}</span>
            </button>

            <p className="text-xs text-center opacity-70 mt-3">
              {t('landing.ctaResponseTime')}
            </p>
          </div>
        </div>
      </div>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => !submitting && setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {!submitted ? (
              <form onSubmit={handleSubmit} className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Solicitar cotización</h3>
                    <p className="text-sm text-gray-500 mt-1">Plan Institucional · Poweria Legal</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                    aria-label="Cerrar"
                  >
                    ×
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Nombre completo <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Email <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Teléfono</label>
                      <input
                        type="tel"
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder="+593..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Institución / Firma <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="organization"
                      value={form.organization}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Usuarios estimados</label>
                    <select
                      name="seats"
                      value={form.seats}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="10-20">10 a 20 usuarios</option>
                      <option value="20-50">20 a 50 usuarios</option>
                      <option value="50-100">50 a 100 usuarios</option>
                      <option value="100+">Más de 100 usuarios</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Cuéntanos tu necesidad</label>
                    <textarea
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      rows={4}
                      placeholder="Tipo de práctica, áreas legales, requerimientos especiales..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 resize-none"
                    />
                  </div>

                  {error && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-bold hover:opacity-90 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Enviando...' : 'Enviar solicitud'}
                  </button>

                  <p className="text-xs text-gray-500 text-center">
                    Al enviar aceptas que {SALES_NAME} ({SALES_COMPANY}) se ponga en contacto contigo en ≤ 24h.
                  </p>
                </div>
              </form>
            ) : (
              <div className="p-10 text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">¡Solicitud enviada!</h3>
                <p className="text-gray-600 mb-6">
                  {SALES_NAME} ({SALES_COMPANY}) se pondrá en contacto contigo en menos de 24 horas hábiles.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setSubmitted(false);
                    setForm({ name: '', email: '', phone: '', organization: '', seats: '', message: '' });
                  }}
                  className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
