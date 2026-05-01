import type { Metadata } from 'next';
import { LegalShell } from '@/components/landing/LegalShell';

export const metadata: Metadata = {
  title: 'Política de Privacidad · Poweria Legal',
  description:
    'Cómo Poweria Legal (COGNITEX) recopila, usa, almacena y protege tu información — alineado con la LOPDP del Ecuador y mejores prácticas internacionales.',
};

export default function PrivacyPage() {
  return (
    <LegalShell
      kicker="Política de privacidad"
      title="Tu información jamás entrena nuestros modelos."
      subtitle="Esta política explica qué datos recopilamos, para qué los usamos, cómo los protegemos y qué controles tienes sobre ellos."
      effectiveDate="1 de mayo de 2026"
    >
      <h2>1. Quién es el responsable</h2>
      <p>
        El responsable del tratamiento de datos personales es <strong>COGNITEX</strong>,
        sociedad ecuatoriana propietaria de la Plataforma Poweria Legal, con domicilio
        comercial en Quito, Ecuador.
      </p>

      <h2>2. Qué datos recopilamos</h2>
      <h3>2.1 Datos que tú nos das directamente</h3>
      <ul>
        <li>Datos de cuenta: nombre, correo electrónico, contraseña (cifrada).</li>
        <li>Datos de facturación: razón social, RUC/cédula, dirección, método de pago.</li>
        <li>Contenido del Usuario: documentos legales, casos, tareas, eventos, notas,
          imágenes y archivos que decides cargar a la Plataforma.</li>
      </ul>
      <h3>2.2 Datos generados por el uso</h3>
      <ul>
        <li>Logs técnicos (IP, navegador, sistema operativo, ID de sesión).</li>
        <li>Métricas de uso anónimas para mejorar el producto.</li>
        <li>Eventos de auditoría (quién hizo qué, cuándo).</li>
      </ul>

      <h2>3. Para qué usamos tus datos</h2>
      <ul>
        <li>Operar la Plataforma y prestarte el servicio contratado.</li>
        <li>Procesar pagos y emitir comprobantes.</li>
        <li>Detectar abuso, fraude y vulneraciones de seguridad.</li>
        <li>Comunicarte cambios en el servicio o de tipo administrativo.</li>
        <li>Cumplir obligaciones legales (tributarias, judiciales, regulatorias).</li>
      </ul>

      <h2>4. Lo que NO hacemos con tus datos</h2>
      <ul>
        <li><strong>No</strong> entrenamos nuestros modelos de IA con tu contenido.</li>
        <li><strong>No</strong> vendemos tus datos a terceros.</li>
        <li><strong>No</strong> compartimos tus documentos con otros usuarios — nunca.</li>
      </ul>

      <h2>5. Bases legales del tratamiento</h2>
      <p>
        Tratamos tus datos con base en: (a) ejecución del contrato (Términos de Servicio),
        (b) consentimiento informado, (c) cumplimiento de obligaciones legales, y (d)
        intereses legítimos en seguridad y mejora del producto.
      </p>

      <h2>6. Compartición con terceros</h2>
      <p>Solo compartimos datos con proveedores estrictamente necesarios:</p>
      <ul>
        <li><strong>Supabase</strong> — base de datos PostgreSQL gestionada (datos en reposo cifrados).</li>
        <li><strong>OpenAI / Anthropic</strong> — proveedores de modelos de IA. Las consultas
          que envías al asistente pasan por su API. Tienen políticas de no-retención
          activadas en nuestros contratos.</li>
        <li><strong>PayPal</strong> — procesamiento de pagos.</li>
        <li><strong>Bancos locales</strong> — recepción de transferencias.</li>
        <li><strong>Cloudinary</strong> — almacenamiento de imágenes (avatares, logos).</li>
      </ul>
      <p>
        No transferimos información a otros terceros sin tu consentimiento previo,
        salvo orden judicial o requerimiento legal vinculante.
      </p>

      <h2>7. Seguridad</h2>
      <ul>
        <li>Cifrado en reposo: AES-256.</li>
        <li>Cifrado en tránsito: TLS 1.3.</li>
        <li>Aislamiento por usuario: PostgreSQL Row-Level Security — un cliente jamás
          puede leer datos de otro.</li>
        <li>Autenticación con tokens JWT cortos y refresh seguro.</li>
        <li>2FA disponible para todos los planes.</li>
        <li>Auditoría de cada acción importante (plan Institucional incluye reportes).</li>
      </ul>

      <h2>8. Retención y eliminación</h2>
      <p>
        Conservamos tu información mientras tu cuenta esté activa. Al cerrar tu cuenta:
      </p>
      <ul>
        <li>Los datos personales se eliminan en 30 días (puedes exportar antes).</li>
        <li>Los registros financieros se conservan por el plazo legal de 7 años (LOPDP +
          obligaciones tributarias).</li>
        <li>Los logs de auditoría se conservan por 12 meses.</li>
      </ul>

      <h2>9. Tus derechos (LOPDP)</h2>
      <p>Puedes ejercer en cualquier momento los siguientes derechos:</p>
      <ul>
        <li><strong>Acceso</strong>: saber qué información tenemos sobre ti.</li>
        <li><strong>Rectificación</strong>: corregir datos inexactos.</li>
        <li><strong>Eliminación</strong>: borrar tu cuenta y datos.</li>
        <li><strong>Portabilidad</strong>: descargar tus datos en formato estructurado.</li>
        <li><strong>Oposición</strong>: oponerte a usos específicos.</li>
        <li><strong>Limitación</strong>: pedir que pausemos cierto tratamiento.</li>
      </ul>
      <p>
        Para ejercer cualquier derecho escríbenos a
        <a href="mailto:francisecuador1@gmail.com"> francisecuador1@gmail.com</a>.
        Respondemos en 15 días hábiles. Si consideras que no atendimos correctamente,
        puedes presentar un reclamo ante la <strong>Superintendencia de Protección de
        Datos Personales del Ecuador</strong>.
      </p>

      <h2>10. Menores de edad</h2>
      <p>
        Poweria Legal está dirigido a profesionales del derecho. No recabamos
        intencionalmente datos de menores de 18 años. Si crees que un menor
        proporcionó información, contáctanos para eliminarla.
      </p>

      <h2>11. Cookies y tecnologías similares</h2>
      <p>
        Usamos cookies estrictamente necesarias (sesión, autenticación) y
        opcionalmente analíticas para entender el uso agregado de la Plataforma.
        Puedes desactivar las analíticas desde tu navegador.
      </p>

      <h2>12. Cambios a esta política</h2>
      <p>
        Cuando actualicemos esta política te notificaremos por correo y publicaremos
        la nueva versión con su fecha de vigencia. Los cambios materiales requerirán
        tu reconocimiento explícito antes de continuar usando la Plataforma.
      </p>

      <h2>13. Contacto</h2>
      <ul>
        <li><strong>Responsable de protección de datos:</strong> COGNITEX — Quito, Ecuador.</li>
        <li><a href="mailto:francisecuador1@gmail.com">francisecuador1@gmail.com</a></li>
        <li><a href="https://wa.me/593983964333">+593 98 396 4333</a></li>
        <li><a href="https://www.cognitex.app" target="_blank" rel="noreferrer">www.cognitex.app</a></li>
      </ul>
    </LegalShell>
  );
}
