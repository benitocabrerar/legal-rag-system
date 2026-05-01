# Payments Hub SDK

SDK liviano para que cualquier app de COGNITEX cobre a través del **Payments Hub**
(proyecto Supabase central `ufklwvhgueejtlzwzzhi`).

## Variables de entorno

```env
# Frontend (público)
NEXT_PUBLIC_PAYHUB_SUPABASE_URL=https://ufklwvhgueejtlzwzzhi.supabase.co
NEXT_PUBLIC_PAYHUB_SUPABASE_PUBLISHABLE_KEY=sb_publishable_mgphJyq2FLtLSw2D4ZvCRA_TgXxO6dH

# Backend (privado, NUNCA al frontend)
PAYHUB_SUPABASE_URL=https://ufklwvhgueejtlzwzzhi.supabase.co
PAYHUB_SUPABASE_SERVICE_ROLE_KEY=<service_role>

# Email transaccional
RESEND_API_KEY=<...>
RESEND_FROM=Payments Hub <noreply@cognitex.app>
```

## API

### Frontend (público, lectura)

| Función | Descripción |
|---|---|
| `listBankAccounts(appSlug)` | Lista cuentas bancarias activas (banco + last4 + instrucciones, nunca número completo) |

### Backend (server-only, escritura)

| Función | Descripción |
|---|---|
| `createPayment(appSlug, input)` | Crea pago `pending` con FX snapshot. Genera `reference_code`. Idempotente por metadata. |
| `attachReceiptUrl(paymentId, url)` | Adjunta URL del comprobante de transferencia. |
| `markPaymentPaid(paymentId, adminId, providerPaymentId?)` | Admin aprueba pago manual. |
| `markPaymentFailed(paymentId, reason)` | Marca pago como fallido. |
| `getPaymentById(paymentId)` | Lee estado de un pago. |
| `listPaymentsByUser(appSlug, externalUserId, limit?)` | Historial de pagos. |

### Notificaciones (Resend)

| Función | Trigger |
|---|---|
| `notifyPaymentInstructions(...)` | Envía instrucciones bancarias al usuario al crear pago. |
| `notifyReceiptUploaded(...)` | Avisa al admin (`payment_notification_email` de la app) que el usuario subió comprobante. |
| `notifyPaymentApproved(...)` | Avisa al usuario cuando el admin aprueba. |

## Cuenta bancaria activa (Ecuador)

```
Banco:    Banco del Pichincha
Titular:  COGNITEX S.A.S.
Tipo:     Cuenta corriente
Número:   2100349416 (last4: 9416)
Moneda:   USD
País:     EC

Comprobantes a: francisecuador1@gmail.com
```

Disponible para apps: `poweria-legal`, `candidato-360`.

## Flujo end-to-end (transferencia bancaria)

```
1. Frontend pide listBankAccounts('poweria-legal')
2. Backend crea payment via createPayment(...)
   → genera reference_code PAY-XXXXXXXXXX
   → registra payment_events 'created'
3. Backend manda notifyPaymentInstructions al usuario
   → email con datos del banco + referencia
4. Usuario transfiere $49 USD desde su banco
5. Usuario sube foto del comprobante (Supabase Storage / S3)
6. Backend hace attachReceiptUrl(paymentId, proofUrl)
7. Backend manda notifyReceiptUploaded(...) → llega a francisecuador1@gmail.com
8. Admin verifica el depósito y llama markPaymentPaid(paymentId, adminId)
9. Backend manda notifyPaymentApproved al usuario
```

## Códigos de moneda soportados

USD, COP, MXN, EUR, PEN, CLP, ARS, BRL — el FX snapshot se persiste por pago
para que el reporting histórico sea consistente.

## Schema referencia

Toda la lógica vive en el schema `payhub` del proyecto Supabase
`ufklwvhgueejtlzwzzhi`. El SDK no asume nada de la tabla `public` ni del
schema `auth` de la app cliente.
