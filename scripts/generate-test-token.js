// ============================================================================
// GENERAR TOKEN DE PRUEBA - Para testing del API
// ============================================================================
// Este script genera un JWT válido para hacer pruebas del API
// Uso: node scripts/generate-test-token.js
// ============================================================================

import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

async function generateTestToken() {
  console.log('\n🔑 Generando token de prueba...\n');

  try {
    // Buscar usuario admin o crear uno de prueba
    const adminEmail = 'benitocabrerar@gmail.com';

    let user = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (!user) {
      console.log('❌ Usuario no encontrado. Ejecuta create-admin-ssh.js primero.\n');
      process.exit(1);
    }

    // Generar token JWT (válido por 7 días)
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        planTier: user.planTier
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ Token generado exitosamente!\n');
    console.log('📧 Usuario:', user.email);
    console.log('👤 Nombre:', user.name);
    console.log('🔑 Rol:', user.role);
    console.log('📦 Plan:', user.planTier);
    console.log('\n🎫 JWT TOKEN:\n');
    console.log(token);
    console.log('\n');
    console.log('📝 Ejemplo de uso con curl:\n');
    console.log(`curl -X POST https://legal-rag-api-qnew.onrender.com/api/v1/query \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -H "Authorization: Bearer ${token}" \\`);
    console.log(`  -d '{"query": "¿Qué dice sobre los derechos fundamentales?", "maxResults": 3}'`);
    console.log('\n');

  } catch (error) {
    console.error('❌ Error generando token:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

generateTestToken();
