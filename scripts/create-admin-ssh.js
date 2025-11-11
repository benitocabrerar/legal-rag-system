// ============================================================================
// CREAR USUARIO ADMIN - Ejecutar en SSH de Render Backend
// ============================================================================
// Este script crea el usuario admin directamente en el servidor de Render
// Uso: node scripts/create-admin-ssh.js
// ============================================================================

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createAdmin() {
  console.log('\n🔐 Creando usuario admin...\n');

  try {
    // Email y nombre del admin
    const adminEmail = 'benitocabrerar@gmail.com';
    const adminName = 'Benito Cabrera';
    const adminPassword = 'Admin123!'; // Cambiar después del primer login

    // Hash de la contraseña
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    // Crear o actualizar usuario admin
    // Solo usar los campos esenciales que existen en la BD
    const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        role: 'admin',
        planTier: 'team',
        isActive: true,
        passwordHash: passwordHash,
      },
      create: {
        email: adminEmail,
        name: adminName,
        role: 'admin',
        planTier: 'team',
        isActive: true,
        passwordHash: passwordHash,
      },
    });

    console.log('✅ Usuario admin creado exitosamente!\n');
    console.log('📧 Email:', admin.email);
    console.log('👤 Nombre:', admin.name);
    console.log('🔑 Rol:', admin.role);
    console.log('📦 Plan:', admin.planTier);
    console.log('🔒 Contraseña temporal:', adminPassword);
    console.log('\n⚠️  IMPORTANTE: Cambia esta contraseña después del primer login!\n');
    console.log('🌐 Frontend:', 'https://legal-rag-frontend.onrender.com');
    console.log('\n');

  } catch (error) {
    console.error('❌ Error creando admin:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
