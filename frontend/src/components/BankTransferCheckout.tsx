'use client';

/**
 * Pago por transferencia bancaria — UX optimizada para móvil.
 *  - Copy-to-clipboard en cada dato
 *  - Deep link a app del banco + web
 *  - QR con datos del beneficiario (escaneable desde la app)
 *  - WhatsApp / email pre-armados con el comprobante
 *  - Toast feedback al copiar
 */
import { useState, useRef, useEffect, type ReactNode } from 'react';
import { api } from '@/lib/api';

interface BankAccount {
  bank_slug: string;
  bank_name: string;
  account_holder: string;
  account_number: string;
  account_last4: string;
  account_type: string | null;
  currency: string;
  country_code: string;
  tax_id_holder: string | null;
  app_deep_link: string | null;
  web_url: string | null;
  instructions_es: string | null;
  instructions_en: string | null;
}

interface BankTransferCheckoutProps {
  paymentId: string;
  amountCents: number;
  currency: string;
  referenceCode: string;
  banks: BankAccount[];
  notificationEmail?: string; // francisecuador1@gmail.com
  notificationPhone?: string; // +593983964333 (WhatsApp)
}

const ADMIN_WHATSAPP = '+593983964333'; // Ing. Francisco Jacome
const ADMIN_EMAIL_DEFAULT = 'francisecuador1@gmail.com';

export default function BankTransferCheckout({
  paymentId,
  amountCents,
  currency,
  referenceCode,
  banks,
  notificationEmail = ADMIN_EMAIL_DEFAULT,
  notificationPhone = ADMIN_WHATSAPP,
}: BankTransferCheckoutProps) {
  const [toast, setToast] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const amountFmt = (amountCents / 100).toFixed(2);
  const bank = banks[0]; // Por ahora una sola cuenta COGNITEX

  function copy(value: string, label: string) {
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      // Fallback: prompt para móviles viejos
      window.prompt('Copia este valor:', value);
      return;
    }
    navigator.clipboard.writeText(value).then(
      () => {
        setToast(`✓ ${label} copiado`);
        setTimeout(() => setToast(null), 1800);
      },
      () => setToast('No se pudo copiar')
    );
  }

  // QR con string legible humano + estructurado
  const qrData = bank
    ? [
        `Pago a: ${bank.account_holder}`,
        bank.tax_id_holder ? `RUC: ${bank.tax_id_holder}` : null,
        `Banco: ${bank.bank_name}`,
        `Cuenta ${bank.account_type}: ${bank.account_number}`,
        `Monto: ${currency} ${amountFmt}`,
        `Referencia: ${referenceCode}`,
      ].filter(Boolean).join('\n')
    : '';
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=4&data=${encodeURIComponent(qrData)}`;

  // Mensajes pre-armados
  const whatsappText = encodeURIComponent(
    `Hola Francisco, acabo de transferir ${currency} ${amountFmt} con referencia ${referenceCode}. Aquí el comprobante:`
  );
  const whatsappUrl = `https://wa.me/${notificationPhone.replace(/\D/g, '')}?text=${whatsappText}`;

  const emailSubject = encodeURIComponent(`Comprobante de pago · ${referenceCode}`);
  const emailBody = encodeURIComponent(
    `Hola,

Adjunto el comprobante de mi transferencia:

  • Referencia: ${referenceCode}
  • Monto: ${currency} ${amountFmt}
  • Banco destino: ${bank?.bank_name}
  • Beneficiario: ${bank?.account_holder}

Gracias.`
  );
  const mailtoUrl = `mailto:${notificationEmail}?subject=${emailSubject}&body=${emailBody}`;

  // Web Share API (móviles)
  function shareNative() {
    const text = `Pago a ${bank?.account_holder} · ${bank?.bank_name} · Cuenta ${bank?.account_number} · Monto ${currency} ${amountFmt} · Ref ${referenceCode}`;
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      (navigator as any).share({ title: 'Datos de pago', text }).catch(() => {});
    } else {
      copy(text, 'Datos de pago');
    }
  }

  async function handleUpload() {
    if (!proofFile) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', proofFile);
      fd.append('referenceNumber', referenceCode);
      await api.post(`/payhub/payments/${paymentId}/receipt`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploaded(true);
      setToast('✅ Comprobante enviado · admin notificado');
      setTimeout(() => setToast(null), 3000);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Error subiendo comprobante');
    } finally {
      setUploading(false);
    }
  }

  // Auto-clear toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (!bank) {
    return (
      <div className="p-6 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
        No hay cuentas bancarias activas. Contactá soporte.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast flotante */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-full shadow-lg text-sm font-medium animate-fade-in">
          {toast}
        </div>
      )}

      {/* Card principal — datos del beneficiario */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-xs uppercase tracking-wider opacity-80 mb-1">
              🇪🇨 {bank.country_code} · {bank.bank_name}
            </p>
            <h3 className="text-2xl font-bold leading-tight">{bank.account_holder}</h3>
            {bank.tax_id_holder && (
              <p className="text-sm opacity-80 mt-1">
                RUC/ID: <span className="font-mono">{bank.tax_id_holder}</span>
              </p>
            )}
          </div>
          <div className="text-3xl">🏦</div>
        </div>

        {/* Monto destacado */}
        <CopyRow
          label="Monto a transferir"
          value={`${currency} ${amountFmt}`}
          copyValue={amountFmt}
          large
          onCopy={() => copy(amountFmt, 'Monto')}
          theme="dark"
        />

        {/* Número de cuenta */}
        <CopyRow
          label={`Cuenta ${bank.account_type}`}
          value={bank.account_number}
          large
          mono
          onCopy={() => copy(bank.account_number, 'Número de cuenta')}
          theme="dark"
        />

        {/* Referencia (lo más importante para identificar el pago) */}
        <div className="bg-yellow-300 text-gray-900 rounded-lg p-4 mt-4">
          <p className="text-xs uppercase tracking-wider font-bold mb-1">
            ⚠️ Concepto / Referencia obligatoria
          </p>
          <div className="flex items-center justify-between gap-2">
            <code className="text-2xl font-bold tracking-wider flex-1 truncate">
              {referenceCode}
            </code>
            <button
              type="button"
              onClick={() => copy(referenceCode, 'Referencia')}
              className="bg-gray-900 text-yellow-300 px-3 py-1.5 rounded-md text-xs font-bold hover:bg-gray-800 whitespace-nowrap"
            >
              📋 Copiar
            </button>
          </div>
          <p className="text-xs mt-2 opacity-80">
            Indicá esta referencia en el concepto/detalle de la transferencia
          </p>
        </div>
      </div>

      {/* Botones de acción rápida */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {bank.app_deep_link && (
          <button
            type="button"
            onClick={() => {
              // Custom-scheme deep links sólo funcionan si el dispositivo tiene la
              // app instalada. En desktop o sin app, el navegador imprime
              // "Failed to launch 'pichincha://...'" en consola y no pasa nada.
              // Intentamos abrir el deep link y caemos al sitio web del banco
              // (o al SDK web del propio banco) tras un breve timeout.
              const before = Date.now();
              const fallbackUrl = bank.web_url ?? null;
              const tab = fallbackUrl ? window.open('about:blank', '_blank') : null;
              try {
                window.location.href = bank.app_deep_link!;
              } catch {
                /* swallow — manejamos el fallback abajo */
              }
              setTimeout(() => {
                // Si seguimos en la misma página después de >800ms, asumimos
                // que el deep link falló — abrimos el sitio web si está disponible.
                if (Date.now() - before < 1500 && fallbackUrl && tab) {
                  tab.location.href = fallbackUrl;
                } else if (tab) {
                  tab.close();
                }
              }, 800);
            }}
            className="flex flex-col items-center gap-2 p-4 bg-white border-2 border-indigo-200 rounded-xl hover:border-indigo-400 transition-all hover:scale-105 active:scale-95"
          >
            <div className="text-3xl">📱</div>
            <span className="text-xs font-semibold text-gray-900 text-center">App del banco</span>
          </button>
        )}
        {bank.web_url && (
          <a
            href={bank.web_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-2 p-4 bg-white border-2 border-indigo-200 rounded-xl hover:border-indigo-400 transition-all hover:scale-105 active:scale-95"
          >
            <div className="text-3xl">🌐</div>
            <span className="text-xs font-semibold text-gray-900 text-center">Sitio web</span>
          </a>
        )}
        <button
          type="button"
          onClick={shareNative}
          className="flex flex-col items-center gap-2 p-4 bg-white border-2 border-indigo-200 rounded-xl hover:border-indigo-400 transition-all hover:scale-105 active:scale-95"
        >
          <div className="text-3xl">📤</div>
          <span className="text-xs font-semibold text-gray-900 text-center">Compartir datos</span>
        </button>
        <button
          type="button"
          onClick={() =>
            copy(
              `${bank.bank_name}\n${bank.account_holder}\nCuenta ${bank.account_type}: ${bank.account_number}\nMonto: ${currency} ${amountFmt}\nReferencia: ${referenceCode}`,
              'Todos los datos'
            )
          }
          className="flex flex-col items-center gap-2 p-4 bg-emerald-600 text-white border-2 border-emerald-600 rounded-xl hover:bg-emerald-700 transition-all hover:scale-105 active:scale-95"
        >
          <div className="text-3xl">📋</div>
          <span className="text-xs font-semibold text-center">Copiar todo</span>
        </button>
      </div>

      {/* QR opcional + alternativas de envío de comprobante */}
      <details className="group bg-white border border-gray-200 rounded-xl overflow-hidden">
        <summary className="cursor-pointer p-4 hover:bg-gray-50 flex items-center justify-between font-semibold text-gray-900">
          <span>📱 Escanear QR · datos para tu banco</span>
          <span className="text-gray-400 group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="p-6 border-t border-gray-100 flex justify-center">
          <div className="text-center">
            <img
              src={qrSrc}
              alt="QR con datos del pago"
              className="mx-auto rounded-lg border border-gray-200"
              width={200}
              height={200}
            />
            <p className="text-xs text-gray-500 mt-3 max-w-xs">
              Escaneá este QR con la app del banco si soporta lectura. También sirve para
              compartir los datos con un colaborador.
            </p>
          </div>
        </div>
      </details>

      {/* Una vez transferido — 3 caminos para enviar comprobante */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-1">
          ✅ ¿Ya transferiste? Enviá el comprobante
        </h3>
        <p className="text-sm text-gray-500 mb-5">
          Elegí el método más cómodo. Activamos tu plan en menos de 24h.
        </p>

        {/* WhatsApp + email — los más rápidos */}
        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-[#25D366] text-white rounded-xl hover:bg-[#1eb858] transition-all hover:scale-[1.02]"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm">Enviar por WhatsApp</div>
              <div className="text-xs opacity-90">Mensaje pre-armado · adjuntá foto</div>
            </div>
          </a>

          <a
            href={mailtoUrl}
            className="flex items-center gap-3 p-4 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all hover:scale-[1.02]"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm">Enviar por correo</div>
              <div className="text-xs opacity-80 truncate">{notificationEmail}</div>
            </div>
          </a>
        </div>

        <div className="text-center text-xs text-gray-400 my-3">— o subí el archivo aquí —</div>

        {/* Upload directo */}
        <div className="flex flex-col gap-3">
          <label
            htmlFor="proof-file"
            className={`block border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              proofFile
                ? 'border-emerald-300 bg-emerald-50'
                : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50'
            }`}
          >
            {proofFile ? (
              <>
                <div className="text-3xl mb-2">📎</div>
                <p className="text-sm font-semibold text-gray-900 truncate">{proofFile.name}</p>
                <p className="text-xs text-gray-500">{(proofFile.size / 1024).toFixed(0)} KB</p>
              </>
            ) : (
              <>
                <div className="text-3xl mb-2">📤</div>
                <p className="text-sm font-semibold text-gray-700">Toca para subir foto o PDF</p>
                <p className="text-xs text-gray-500 mt-1">JPG · PNG · PDF · hasta 20 MB</p>
              </>
            )}
            <input
              id="proof-file"
              ref={fileInput}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => setProofFile(e.target.files?.[0] || null)}
            />
          </label>

          {proofFile && !uploaded && (
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:opacity-95 transition-all disabled:opacity-50"
            >
              {uploading ? 'Enviando…' : '📥 Enviar comprobante'}
            </button>
          )}

          {uploaded && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
              <p className="text-emerald-800 font-semibold text-sm">
                ✅ Comprobante recibido. Te avisamos en menos de 24h por correo.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Animación CSS para toast */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translate(-50%, 8px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-fade-in { animation: fade-in 0.18s ease-out; }
      `}</style>
    </div>
  );
}

// ============= Sub-componente: fila copy ==============
function CopyRow({
  label,
  value,
  copyValue,
  onCopy,
  large = false,
  mono = false,
  theme = 'light',
}: {
  label: string;
  value: ReactNode;
  copyValue?: string;
  onCopy: () => void;
  large?: boolean;
  mono?: boolean;
  theme?: 'light' | 'dark';
}) {
  const isDark = theme === 'dark';
  return (
    <div className={`mb-3 ${isDark ? '' : 'border-b border-gray-100 pb-3'}`}>
      <p className={`text-xs uppercase tracking-wider font-semibold mb-1 ${isDark ? 'opacity-75' : 'text-gray-500'}`}>
        {label}
      </p>
      <div className="flex items-center justify-between gap-2">
        <div
          className={`${large ? 'text-2xl' : 'text-base'} ${mono ? 'font-mono' : ''} font-bold flex-1 truncate ${isDark ? 'text-white' : 'text-gray-900'}`}
        >
          {value}
        </div>
        <button
          type="button"
          onClick={onCopy}
          className={`px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-colors ${
            isDark
              ? 'bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm'
              : 'bg-gray-900 hover:bg-gray-800 text-white'
          }`}
          title={`Copiar ${label}`}
        >
          📋 Copiar
        </button>
      </div>
    </div>
  );
}
