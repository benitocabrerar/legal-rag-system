import type { Metadata } from 'next';
import { LegalShell } from '@/components/landing/LegalShell';

export const metadata: Metadata = {
  title: 'LOPDP Ecuador · Poweria Legal',
  description:
    'Cómo Poweria Legal cumple con la Ley Orgánica de Protección de Datos Personales (LOPDP) del Ecuador.',
};

export default function LopdpPage() {
  return (
    <LegalShell
      kicker="Cumplimiento normativo"
      title="LOPDP — Ecuador"
      subtitle="Cómo Poweria Legal cumple con la Ley Orgánica de Protección de Datos Personales del Ecuador (Registro Oficial Suplemento 459 del 26 de mayo de 2021)."
      effectiveDate="1 de mayo de 2026"
    >
      <h2>1. Marco normativo</h2>
      <p>
        Poweria Legal opera bajo la jurisdicción del Ecuador y se sujeta de manera
        íntegra a la Ley Orgánica de Protección de Datos Personales (LOPDP), su
        Reglamento, y las directrices emitidas por la Superintendencia de Protección
        de Datos Personales (SPDP).
      </p>

      <h2>2. Principios aplicados</h2>
      <ul>
        <li><strong>Juridicidad</strong>: tratamos datos solo bajo las bases legales del Art. 7 LOPDP.</li>
        <li><strong>Lealtad</strong>: comunicamos clara y oportunamente para qué usamos cada dato.</li>
        <li><strong>Transparencia</strong>: nuestra Política de Privacidad es pública y comprensible.</li>
        <li><strong>Finalidad</strong>: recogemos datos para propósitos específicos y declarados.</li>
        <li><strong>Minimización</strong>: pedimos solo los datos necesarios para prestar el servicio.</li>
        <li><strong>Proporcionalidad</strong>: tratamiento adecuado, pertinente y limitado.</li>
        <li><strong>Confidencialidad</strong>: cifrado en reposo (AES-256) y en tránsito (TLS 1.3).</li>
        <li><strong>Calidad y exactitud</strong>: mantenemos los datos actualizados.</li>
        <li><strong>Conservación</strong>: durante el tiempo necesario y conforme la ley.</li>
        <li><strong>Seguridad</strong>: medidas técnicas y organizativas demostrables.</li>
        <li><strong>Responsabilidad demostrada (accountability)</strong>: documentamos todo.</li>
      </ul>

      <h2>3. Derechos del titular y cómo ejercerlos</h2>
      <p>
        Conforme a los arts. 12 al 21 de la LOPDP, como titular de los datos puedes:
      </p>
      <ul>
        <li>Acceder a la información que tenemos sobre ti.</li>
        <li>Solicitar rectificación de datos inexactos o incompletos.</li>
        <li>Solicitar eliminación (derecho al olvido).</li>
        <li>Oponerte al tratamiento.</li>
        <li>Solicitar la portabilidad en formato estructurado.</li>
        <li>Pedir limitación o suspensión temporal del tratamiento.</li>
        <li>No ser objeto de decisiones automatizadas con efectos jurídicos
          significativos sin intervención humana.</li>
      </ul>
      <p>
        <strong>Cómo ejercerlos:</strong> envía un correo a
        <a href="mailto:francisecuador1@gmail.com"> francisecuador1@gmail.com</a> con
        el asunto &ldquo;Ejercicio de derechos LOPDP&rdquo; e incluye copia de tu
        cédula. Respondemos dentro de los 15 días hábiles establecidos por la ley.
      </p>

      <h2>4. Datos que tratamos como Responsable</h2>
      <p>
        Los datos de cuenta, facturación y contenido subido por el Usuario son
        tratados por COGNITEX como <strong>Responsable</strong> del tratamiento,
        para los fines descritos en la Política de Privacidad.
      </p>

      <h2>5. Datos que tratamos como Encargado</h2>
      <p>
        Cuando un abogado usuario sube información de sus propios clientes a la
        Plataforma, COGNITEX actúa como <strong>Encargado</strong> del tratamiento.
        Solo tratamos esa información siguiendo las instrucciones del Responsable
        (el abogado) y los términos del contrato. Sugerimos al abogado obtener
        consentimiento de su cliente cuando legalmente proceda.
      </p>

      <h2>6. Transferencias internacionales</h2>
      <p>
        Algunos proveedores (Supabase, OpenAI, Anthropic, PayPal) pueden procesar
        datos fuera del Ecuador. Solo trabajamos con proveedores que ofrecen
        garantías equivalentes a las exigidas por la LOPDP, mediante:
      </p>
      <ul>
        <li>Cláusulas contractuales tipo aprobadas por autoridades de protección.</li>
        <li>Acuerdos de procesamiento de datos (DPA).</li>
        <li>Compromisos de no-retención y no-entrenamiento de modelos con datos del cliente.</li>
      </ul>

      <h2>7. Vulneraciones de seguridad</h2>
      <p>
        En caso de una vulneración que comprometa datos personales, notificaremos a
        la Superintendencia de Protección de Datos Personales y a los titulares
        afectados <strong>dentro de las 72 horas</strong> de detectada, conforme al
        Art. 41 de la LOPDP.
      </p>

      <h2>8. Decisiones automatizadas e IA</h2>
      <p>
        Las funciones de IA de Poweria Legal (resúmenes, sugerencias, tarjetas
        argumentales) son <strong>asistentes</strong> al criterio profesional del
        abogado, no toman decisiones automatizadas con efectos jurídicos sobre
        terceros. Toda salida de IA está sujeta a revisión humana antes de su uso.
      </p>

      <h2>9. Reclamos ante la SPDP</h2>
      <p>
        Si consideras que no atendimos correctamente tu solicitud, puedes presentar
        un reclamo ante la Superintendencia de Protección de Datos Personales del
        Ecuador. Más información en el portal oficial del organismo.
      </p>

      <h2>10. Contacto del responsable</h2>
      <ul>
        <li><strong>COGNITEX</strong> — Quito, Ecuador</li>
        <li><a href="mailto:francisecuador1@gmail.com">francisecuador1@gmail.com</a></li>
        <li><a href="https://wa.me/593983964333">+593 98 396 4333</a></li>
        <li>Ver también: <a href="/privacy">Política de Privacidad</a> y <a href="/terms">Términos de servicio</a>.</li>
      </ul>
    </LegalShell>
  );
}
