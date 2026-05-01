'use client';

/**
 * Botón PayPal que carga el SDK JS dinámicamente y orquesta el flujo
 * createOrder → onApprove → captureOrder con el backend del Payments Hub.
 *
 * Sin nuevas dependencias npm — usa el script CDN oficial de PayPal.
 */
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

interface PayPalCheckoutButtonProps {
  /** Si pasás planCode, el backend resuelve el monto contra el catálogo del Hub. */
  planCode?: string;
  /** Si planCode no se pasa, debés pasar amountCents + currency. */
  amountCents?: number;
  currency?: string;
  /** Si ya existe un payment record, podés reutilizarlo (en /payment/[id]). */
  paymentId?: string;
  /** Callback cuando el pago se confirma (status COMPLETED). */
  onSuccess?: (info: { paymentId: string; orderId: string }) => void;
  /** Callback en error/cancel. */
  onError?: (err: unknown) => void;
}

declare global {
  interface Window {
    paypal?: any;
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
const SDK_URL = `https://www.paypal.com/sdk/js?client-id=${CLIENT_ID}&currency=USD&intent=capture&disable-funding=credit`;

function loadPaypalSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('SSR'));
    if (window.paypal) return resolve();
    const existing = document.querySelector(`script[src^="https://www.paypal.com/sdk/js"]`) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Falló carga PayPal SDK')));
      return;
    }
    const s = document.createElement('script');
    s.src = SDK_URL;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Falló carga PayPal SDK'));
    document.head.appendChild(s);
  });
}

export default function PayPalCheckoutButton({
  planCode,
  amountCents,
  currency = 'USD',
  paymentId: existingPaymentId,
  onSuccess,
  onError,
}: PayPalCheckoutButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!CLIENT_ID) {
      setError('NEXT_PUBLIC_PAYPAL_CLIENT_ID no configurado');
      setLoading(false);
      return;
    }

    let cancelled = false;
    let createdPaymentId: string | null = null;

    (async () => {
      try {
        await loadPaypalSdk();
        if (cancelled || !containerRef.current || !window.paypal) return;

        // Limpiar contenedor antes de renderizar
        containerRef.current.innerHTML = '';

        window.paypal.Buttons({
          style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' },

          createOrder: async () => {
            try {
              const res = await api.post('/payhub/paypal/orders/init', {
                planCode,
                amountCents,
                currency,
                paymentId: existingPaymentId,
              });
              createdPaymentId = res.data.paymentId;
              if (!res.data.orderId) throw new Error('PayPal no devolvió orderId');
              return res.data.orderId as string;
            } catch (err: any) {
              setError(err?.response?.data?.error || err?.message || 'Error creando orden PayPal');
              throw err;
            }
          },

          onApprove: async (data: { orderID: string }) => {
            try {
              const res = await api.post(`/payhub/paypal/orders/${data.orderID}/capture`, {});
              if (res.data?.success) {
                onSuccess?.({ paymentId: res.data.paymentId, orderId: data.orderID });
              } else {
                setError(`Pago no completado (status: ${res.data?.status || '?'})`);
                onError?.(new Error('not_completed'));
              }
            } catch (err: any) {
              setError(err?.response?.data?.error || 'Error capturando pago');
              onError?.(err);
            }
          },

          onCancel: () => {
            setError('Pago cancelado');
            onError?.(new Error('cancelled'));
          },

          onError: (err: unknown) => {
            console.error('paypal onError', err);
            setError('Error en PayPal — intentá de nuevo o usá transferencia bancaria');
            onError?.(err);
          },
        }).render(containerRef.current);

        setLoading(false);
      } catch (err: any) {
        setError(err?.message || 'Error inicializando PayPal');
        setLoading(false);
      }
    })();

    return () => { cancelled = true; void createdPaymentId; };
  }, [planCode, amountCents, currency, existingPaymentId, onSuccess, onError]);

  return (
    <div className="space-y-2">
      {loading && (
        <div className="flex items-center justify-center py-6 text-sm text-gray-500">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 mr-2" />
          Cargando PayPal…
        </div>
      )}
      <div ref={containerRef} />
      {error && (
        <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}
    </div>
  );
}
