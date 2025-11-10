/**
 * Test script for SendGrid email service
 *
 * Usage:
 *   npx tsx scripts/test-email.ts your-email@example.com
 */

import { emailService } from '../src/services/emailService.js';
import EmailTemplates from '../src/templates/emailTemplates.js';

async function testEmail(recipientEmail: string) {
  console.log('🧪 Testing SendGrid Email Service...\n');

  // Check if email is valid
  if (!emailService.isValidEmail(recipientEmail)) {
    console.error('❌ Error: Invalid email address:', recipientEmail);
    process.exit(1);
  }

  console.log('📧 Recipient:', recipientEmail);
  console.log('📤 Sending test email...\n');

  try {
    // Test 1: Simple email
    console.log('Test 1: Sending simple welcome email...');
    const welcomeHtml = EmailTemplates.welcomeEmail({
      userName: 'Usuario de Prueba',
      userEmail: recipientEmail,
      actionUrl: 'https://legal-rag-api-qnew.onrender.com/dashboard',
      actionText: 'Acceder al Sistema',
    });

    const success = await emailService.sendEmail({
      to: recipientEmail,
      subject: '✅ Prueba de Email - Poweria Legal',
      html: welcomeHtml,
    });

    if (success) {
      console.log('✅ Email sent successfully!\n');

      console.log('📬 Check your inbox for:');
      console.log('   - Subject: ✅ Prueba de Email - Poweria Legal');
      console.log('   - From: Poweria Legal <noreply@poweria-legal.com>');
      console.log('   - A welcome email with a professional design\n');

      console.log('💡 Tips:');
      console.log('   - Check spam folder if not in inbox');
      console.log('   - Add sender to contacts for better deliverability');
      console.log('   - Verify sender email in SendGrid if you see errors\n');

      // Test 2: Event reminder
      console.log('Test 2: Sending event reminder email...');
      const eventHtml = EmailTemplates.eventReminder({
        userName: 'Usuario de Prueba',
        eventTitle: 'Audiencia Judicial - Prueba',
        eventDate: new Date(Date.now() + 86400000).toLocaleDateString('es-ES', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        eventTime: '10:00 AM',
        eventLocation: 'Corte Provincial de Quito',
        caseTitle: 'Caso de Prueba #001',
        actionUrl: 'https://legal-rag-api-qnew.onrender.com/events',
      });

      const success2 = await emailService.sendEmail({
        to: recipientEmail,
        subject: '📅 Recordatorio de Evento - Poweria Legal',
        html: eventHtml,
      });

      if (success2) {
        console.log('✅ Event reminder email sent successfully!\n');
      }

      console.log('✨ All tests completed successfully!');
      console.log('\n📊 SendGrid Dashboard: https://app.sendgrid.com/');
      console.log('   - View email statistics');
      console.log('   - Check delivery rates');
      console.log('   - Monitor bounces and spam reports\n');

    } else {
      console.warn('⚠️  Email service is not configured (SendGrid API key missing)');
      console.log('   - This is normal in development without API key');
      console.log('   - Check console logs for email content');
      console.log('   - Add SENDGRID_API_KEY to .env to enable sending\n');
    }

  } catch (error) {
    console.error('\n❌ Error sending email:', error);

    if (error instanceof Error) {
      console.error('Error message:', error.message);

      if (error.message.includes('Forbidden')) {
        console.log('\n🔐 Sender verification required:');
        console.log('   1. Go to: https://app.sendgrid.com/settings/sender_auth');
        console.log('   2. Click "Verify a Single Sender"');
        console.log('   3. Verify: noreply@poweria-legal.com (or your email)');
        console.log('   4. Check email and click verification link');
        console.log('   5. Run this test again\n');
      } else if (error.message.includes('Unauthorized')) {
        console.log('\n🔑 API key issue:');
        console.log('   1. Check SENDGRID_API_KEY in .env');
        console.log('   2. Verify key is correct in SendGrid dashboard');
        console.log('   3. Key should start with "SG."\n');
      }
    }

    process.exit(1);
  }
}

// Get recipient email from command line argument
const recipientEmail = process.argv[2];

if (!recipientEmail) {
  console.error('❌ Error: No recipient email provided\n');
  console.log('Usage: npx tsx scripts/test-email.ts your-email@example.com\n');
  console.log('Example: npx tsx scripts/test-email.ts juan.perez@example.com\n');
  process.exit(1);
}

testEmail(recipientEmail);
