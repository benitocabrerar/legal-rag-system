import type { Metadata } from 'next';
import { LegalShell } from '@/components/landing/LegalShell';

export const metadata: Metadata = {
  title: 'Términos de Servicio · Poweria Legal',
  description:
    'Condiciones que rigen el uso de Poweria Legal, plataforma de IA jurídica desarrollada por COGNITEX en Ecuador.',
};

export default function TermsPage() {
  return (
    <LegalShell
      kicker="Documento legal"
      title="Términos de servicio"
      subtitle="Estos términos rigen el uso de Poweria Legal, propiedad de COGNITEX. Al crear una cuenta o usar la plataforma, aceptas todo lo que sigue."
      effectiveDate="1 de mayo de 2026"
    >
      <h2>1. Aceptación</h2>
      <p>
        Al acceder o usar Poweria Legal (la &ldquo;Plataforma&rdquo;), aceptas estar sujeto a
        estos Términos. Si no estás de acuerdo, no utilices la Plataforma. Estos términos
        constituyen un acuerdo legalmente vinculante entre el Usuario y <strong>COGNITEX</strong>,
        empresa registrada en la República del Ecuador, con domicilio comercial en Quito.
      </p>

      <h2>2. La Plataforma</h2>
      <p>
        Poweria Legal es una herramienta de software como servicio (SaaS) que asiste a
        profesionales del derecho con: gestión de casos, calendario y tareas, búsqueda
        jurídica con IA, sala de litigación, generación de tarjetas argumentales,
        facturación electrónica y módulo financiero. La Plataforma es una herramienta
        de productividad — no reemplaza el criterio profesional ni constituye asesoría
        jurídica de COGNITEX hacia los clientes finales del Usuario.
      </p>

      <h2>3. Cuenta y elegibilidad</h2>
      <ul>
        <li>Debes ser mayor de edad y tener capacidad legal para contratar.</li>
        <li>La información de registro debe ser veraz y mantenerse actualizada.</li>
        <li>Eres responsable de la confidencialidad de tu contraseña y de toda actividad
          realizada bajo tu cuenta.</li>
        <li>Notifícanos inmediatamente si sospechas un acceso no autorizado.</li>
      </ul>

      <h2>4. Planes y pagos</h2>
      <p>
        Ofrecemos planes gratuitos y de pago (Starter, Pro, Pro Max, Studio,
        Institucional). Los precios y características vigentes están publicados en
        <a href="/pricing"> /pricing</a>. Los pagos se procesan vía PayPal o transferencia
        bancaria a una cuenta corporativa de COGNITEX. Al elegir un plan recurrente,
        autorizas cargos automáticos hasta que canceles.
      </p>
      <p>
        <strong>Reembolsos:</strong> dentro de los primeros 14 días de la primera
        suscripción de pago, puedes solicitar reembolso completo. Después de ese plazo,
        no se reembolsan periodos ya consumidos.
      </p>

      <h2>5. Uso aceptable</h2>
      <p>El Usuario se obliga a no:</p>
      <ul>
        <li>Vulnerar derechos de propiedad intelectual de terceros.</li>
        <li>Subir documentos con malware o contenido ilegal.</li>
        <li>Intentar acceder a datos de otros usuarios o eludir mecanismos de seguridad.</li>
        <li>Usar la Plataforma para automatizar procesos judiciales sin supervisión humana.</li>
        <li>Hacer ingeniería inversa, copiar o sub-licenciar el software.</li>
      </ul>

      <h2>6. Propiedad intelectual</h2>
      <p>
        El software, marcas y modelos de IA propios de Poweria Legal son y seguirán
        siendo propiedad de COGNITEX. Tú conservas la titularidad sobre los documentos
        y datos de tus casos. Nos otorgas únicamente la licencia mínima necesaria para
        operar la Plataforma a tu favor (almacenar, indexar, procesar con IA cuando lo
        solicites).
      </p>

      <h2>7. Privacidad y manejo de datos</h2>
      <p>
        El tratamiento de datos personales se rige por nuestra
        <a href="/privacy"> Política de Privacidad</a> y la
        <a href="/lopdp"> Ley Orgánica de Protección de Datos del Ecuador (LOPDP)</a>.
        En particular: <strong>nunca</strong> entrenamos nuestros modelos con tus datos.
      </p>

      <h2>8. Disponibilidad y mantenimiento</h2>
      <p>
        Hacemos esfuerzos razonables para mantener la Plataforma operativa 24/7. Los
        planes Institucionales incluyen un SLA específico. Para los demás planes, la
        Plataforma se ofrece &ldquo;tal cual&rdquo; (as-is).
      </p>

      <h2>9. Limitación de responsabilidad</h2>
      <p>
        En la máxima medida permitida por la ley, COGNITEX no será responsable por
        daños indirectos, lucro cesante o pérdida de datos derivados del uso de la
        Plataforma. Nuestra responsabilidad agregada se limita al monto pagado por el
        Usuario en los 12 meses anteriores al evento que dio origen al reclamo.
      </p>

      <h2>10. Terminación</h2>
      <p>
        Puedes cancelar tu cuenta en cualquier momento desde Configuración. Podemos
        suspender o cancelar tu acceso si incumples gravemente estos términos. Al
        terminar, conservas el derecho de exportar tu información durante 30 días
        antes del borrado permanente.
      </p>

      <h2>11. Cambios a estos términos</h2>
      <p>
        Podemos actualizar estos Términos. Te notificaremos por correo electrónico y
        publicaremos la nueva versión con su fecha de vigencia. Si los cambios son
        materiales, te daremos al menos 30 días para revisarlos antes de que entren
        en vigor.
      </p>

      <h2>12. Ley aplicable y jurisdicción</h2>
      <p>
        Estos Términos se rigen por las leyes de la República del Ecuador. Cualquier
        controversia se someterá a los jueces competentes de la ciudad de Quito,
        renunciando expresamente a otro fuero.
      </p>

      <h2>13. Contacto</h2>
      <p>
        Cualquier consulta sobre estos términos:
      </p>
      <ul>
        <li><strong>COGNITEX</strong> · <a href="https://www.cognitex.app" target="_blank" rel="noreferrer">www.cognitex.app</a></li>
        <li>Ing. Francisco Jacome — <a href="mailto:francisecuador1@gmail.com">francisecuador1@gmail.com</a></li>
        <li>Teléfono / WhatsApp: <a href="https://wa.me/593983964333">+593 98 396 4333</a></li>
        <li>Quito · Ecuador</li>
      </ul>
    </LegalShell>
  );
}
