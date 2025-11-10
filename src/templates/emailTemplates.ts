/**
 * Email template utilities for generating HTML emails
 */

interface EmailTemplateContext {
  userName?: string;
  userEmail?: string;
  caseTitle?: string;
  caseNumber?: string;
  eventTitle?: string;
  eventDate?: string;
  eventTime?: string;
  eventLocation?: string;
  taskTitle?: string;
  taskDueDate?: string;
  invoiceNumber?: string;
  invoiceAmount?: string;
  invoiceDueDate?: string;
  paymentAmount?: string;
  paymentDate?: string;
  message?: string;
  actionUrl?: string;
  actionText?: string;
  [key: string]: any;
}

const BASE_STYLES = `
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .email-container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .email-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      padding: 30px 20px;
      text-align: center;
    }
    .email-header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .email-body {
      padding: 30px 20px;
    }
    .email-body h2 {
      color: #333;
      font-size: 20px;
      margin-top: 0;
    }
    .email-body p {
      margin: 15px 0;
      color: #555;
    }
    .info-box {
      background-color: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .info-box strong {
      color: #333;
      display: block;
      margin-bottom: 8px;
    }
    .action-button {
      display: inline-block;
      padding: 12px 30px;
      background-color: #667eea;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: 600;
    }
    .action-button:hover {
      background-color: #5568d3;
    }
    .email-footer {
      background-color: #f8f9fa;
      padding: 20px;
      text-align: center;
      color: #777;
      font-size: 14px;
      border-top: 1px solid #e9ecef;
    }
    .email-footer p {
      margin: 5px 0;
    }
  </style>
`;

export class EmailTemplates {
  /**
   * Generate base email wrapper
   */
  private static wrapEmail(title: string, content: string): string {
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        ${BASE_STYLES}
      </head>
      <body>
        <div class="email-container">
          <div class="email-header">
            <h1>Poweria Legal</h1>
          </div>
          ${content}
          <div class="email-footer">
            <p>&copy; ${new Date().getFullYear()} Poweria Legal. Todos los derechos reservados.</p>
            <p>Este es un mensaje automático, por favor no responda a este correo.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Event reminder template
   */
  static eventReminder(context: EmailTemplateContext): string {
    const content = `
      <div class="email-body">
        <h2>Recordatorio de Evento</h2>
        <p>Hola ${context.userName || 'Usuario'},</p>
        <p>Este es un recordatorio de tu próximo evento:</p>

        <div class="info-box">
          <strong>${context.eventTitle}</strong>
          <p><strong>Fecha:</strong> ${context.eventDate}</p>
          <p><strong>Hora:</strong> ${context.eventTime}</p>
          ${context.eventLocation ? `<p><strong>Ubicación:</strong> ${context.eventLocation}</p>` : ''}
          ${context.caseTitle ? `<p><strong>Caso relacionado:</strong> ${context.caseTitle}</p>` : ''}
        </div>

        ${context.actionUrl ? `
          <a href="${context.actionUrl}" class="action-button">
            ${context.actionText || 'Ver Detalles'}
          </a>
        ` : ''}
      </div>
    `;
    return this.wrapEmail('Recordatorio de Evento', content);
  }

  /**
   * Task assignment template
   */
  static taskAssignment(context: EmailTemplateContext): string {
    const content = `
      <div class="email-body">
        <h2>Nueva Tarea Asignada</h2>
        <p>Hola ${context.userName || 'Usuario'},</p>
        <p>Se te ha asignado una nueva tarea:</p>

        <div class="info-box">
          <strong>${context.taskTitle}</strong>
          ${context.taskDueDate ? `<p><strong>Fecha límite:</strong> ${context.taskDueDate}</p>` : ''}
          ${context.caseTitle ? `<p><strong>Caso relacionado:</strong> ${context.caseTitle}</p>` : ''}
          ${context.message ? `<p>${context.message}</p>` : ''}
        </div>

        ${context.actionUrl ? `
          <a href="${context.actionUrl}" class="action-button">
            ${context.actionText || 'Ver Tarea'}
          </a>
        ` : ''}
      </div>
    `;
    return this.wrapEmail('Nueva Tarea Asignada', content);
  }

  /**
   * Task due reminder template
   */
  static taskDueReminder(context: EmailTemplateContext): string {
    const content = `
      <div class="email-body">
        <h2>Tarea Próxima a Vencer</h2>
        <p>Hola ${context.userName || 'Usuario'},</p>
        <p>Recordatorio: La siguiente tarea está próxima a vencer:</p>

        <div class="info-box">
          <strong>${context.taskTitle}</strong>
          <p><strong>Fecha límite:</strong> ${context.taskDueDate}</p>
          ${context.caseTitle ? `<p><strong>Caso relacionado:</strong> ${context.caseTitle}</p>` : ''}
        </div>

        ${context.actionUrl ? `
          <a href="${context.actionUrl}" class="action-button">
            ${context.actionText || 'Ver Tarea'}
          </a>
        ` : ''}
      </div>
    `;
    return this.wrapEmail('Tarea Próxima a Vencer', content);
  }

  /**
   * Invoice generated template
   */
  static invoiceGenerated(context: EmailTemplateContext): string {
    const content = `
      <div class="email-body">
        <h2>Nueva Factura Generada</h2>
        <p>Hola ${context.userName || 'Cliente'},</p>
        <p>Se ha generado una nueva factura:</p>

        <div class="info-box">
          <p><strong>Número de factura:</strong> ${context.invoiceNumber}</p>
          <p><strong>Monto:</strong> ${context.invoiceAmount}</p>
          <p><strong>Fecha de vencimiento:</strong> ${context.invoiceDueDate}</p>
          ${context.caseTitle ? `<p><strong>Caso:</strong> ${context.caseTitle}</p>` : ''}
        </div>

        ${context.actionUrl ? `
          <a href="${context.actionUrl}" class="action-button">
            ${context.actionText || 'Ver Factura'}
          </a>
        ` : ''}
      </div>
    `;
    return this.wrapEmail('Nueva Factura', content);
  }

  /**
   * Payment received template
   */
  static paymentReceived(context: EmailTemplateContext): string {
    const content = `
      <div class="email-body">
        <h2>Pago Recibido</h2>
        <p>Hola ${context.userName || 'Cliente'},</p>
        <p>Hemos recibido tu pago. Gracias por tu confianza.</p>

        <div class="info-box">
          <p><strong>Monto pagado:</strong> ${context.paymentAmount}</p>
          <p><strong>Fecha de pago:</strong> ${context.paymentDate}</p>
          ${context.invoiceNumber ? `<p><strong>Factura:</strong> ${context.invoiceNumber}</p>` : ''}
          ${context.caseTitle ? `<p><strong>Caso:</strong> ${context.caseTitle}</p>` : ''}
        </div>

        ${context.actionUrl ? `
          <a href="${context.actionUrl}" class="action-button">
            ${context.actionText || 'Ver Recibo'}
          </a>
        ` : ''}
      </div>
    `;
    return this.wrapEmail('Pago Recibido', content);
  }

  /**
   * Invoice overdue template
   */
  static invoiceOverdue(context: EmailTemplateContext): string {
    const content = `
      <div class="email-body">
        <h2>Factura Vencida</h2>
        <p>Hola ${context.userName || 'Cliente'},</p>
        <p>La siguiente factura ha vencido. Por favor, procesa el pago a la brevedad posible:</p>

        <div class="info-box" style="border-left-color: #dc3545;">
          <p><strong>Número de factura:</strong> ${context.invoiceNumber}</p>
          <p><strong>Monto:</strong> ${context.invoiceAmount}</p>
          <p><strong>Fecha de vencimiento:</strong> ${context.invoiceDueDate}</p>
          ${context.caseTitle ? `<p><strong>Caso:</strong> ${context.caseTitle}</p>` : ''}
        </div>

        ${context.actionUrl ? `
          <a href="${context.actionUrl}" class="action-button" style="background-color: #dc3545;">
            ${context.actionText || 'Pagar Ahora'}
          </a>
        ` : ''}

        <p style="color: #dc3545; font-weight: 600; margin-top: 20px;">
          Si ya has realizado el pago, por favor ignora este mensaje.
        </p>
      </div>
    `;
    return this.wrapEmail('Factura Vencida', content);
  }

  /**
   * Case status update template
   */
  static caseStatusUpdate(context: EmailTemplateContext): string {
    const content = `
      <div class="email-body">
        <h2>Actualización de Caso</h2>
        <p>Hola ${context.userName || 'Cliente'},</p>
        <p>Hay una actualización en tu caso:</p>

        <div class="info-box">
          <strong>${context.caseTitle}</strong>
          ${context.caseNumber ? `<p><strong>Número de caso:</strong> ${context.caseNumber}</p>` : ''}
          ${context.message ? `<p>${context.message}</p>` : ''}
        </div>

        ${context.actionUrl ? `
          <a href="${context.actionUrl}" class="action-button">
            ${context.actionText || 'Ver Caso'}
          </a>
        ` : ''}
      </div>
    `;
    return this.wrapEmail('Actualización de Caso', content);
  }

  /**
   * Generic notification template
   */
  static genericNotification(context: EmailTemplateContext): string {
    const content = `
      <div class="email-body">
        <h2>${context.subject || 'Notificación'}</h2>
        <p>Hola ${context.userName || 'Usuario'},</p>
        ${context.message ? `<p>${context.message}</p>` : ''}

        ${context.actionUrl ? `
          <a href="${context.actionUrl}" class="action-button">
            ${context.actionText || 'Ver más'}
          </a>
        ` : ''}
      </div>
    `;
    return this.wrapEmail(context.subject || 'Notificación', content);
  }

  /**
   * Welcome email template
   */
  static welcomeEmail(context: EmailTemplateContext): string {
    const content = `
      <div class="email-body">
        <h2>¡Bienvenido a Poweria Legal!</h2>
        <p>Hola ${context.userName || 'Usuario'},</p>
        <p>Tu cuenta ha sido creada exitosamente. Estamos emocionados de tenerte con nosotros.</p>

        <div class="info-box">
          <p><strong>Email:</strong> ${context.userEmail}</p>
          <p>Puedes iniciar sesión usando tu correo electrónico y la contraseña que configuraste.</p>
        </div>

        ${context.actionUrl ? `
          <a href="${context.actionUrl}" class="action-button">
            ${context.actionText || 'Acceder al Sistema'}
          </a>
        ` : ''}

        <p style="margin-top: 30px;">
          Si tienes alguna pregunta, no dudes en contactarnos.
        </p>
      </div>
    `;
    return this.wrapEmail('Bienvenido', content);
  }

  /**
   * Password reset template
   */
  static passwordReset(context: EmailTemplateContext): string {
    const content = `
      <div class="email-body">
        <h2>Restablecer Contraseña</h2>
        <p>Hola ${context.userName || 'Usuario'},</p>
        <p>Hemos recibido una solicitud para restablecer tu contraseña.</p>

        <div class="info-box">
          <p>Haz clic en el botón de abajo para crear una nueva contraseña:</p>
        </div>

        ${context.actionUrl ? `
          <a href="${context.actionUrl}" class="action-button">
            ${context.actionText || 'Restablecer Contraseña'}
          </a>
        ` : ''}

        <p style="margin-top: 30px; color: #dc3545;">
          <strong>Importante:</strong> Si no solicitaste restablecer tu contraseña, ignora este mensaje y tu contraseña permanecerá sin cambios.
        </p>

        <p style="color: #777; font-size: 14px;">
          Este enlace expirará en 1 hora por motivos de seguridad.
        </p>
      </div>
    `;
    return this.wrapEmail('Restablecer Contraseña', content);
  }
}

export default EmailTemplates;
