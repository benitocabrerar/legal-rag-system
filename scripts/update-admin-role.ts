/**
 * Script para actualizar el usuario benitocabrerar@gmail.com a ADMIN con plan PREMIUM
 *
 * Este script debe ejecutarse UNA SOLA VEZ para dar permisos de administrador
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Actualizando usuario a ADMIN...\n');

  try {
    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: {
        email: 'benitocabrerar@gmail.com'
      }
    });

    if (!user) {
      console.log('❌ Usuario no encontrado: benitocabrerar@gmail.com');
      return;
    }

    console.log('✅ Usuario encontrado:');
    console.log('   - ID:', user.id);
    console.log('   - Email:', user.email);
    console.log('   - Nombre:', user.name);
    console.log('   - Rol actual:', user.role);
    console.log('   - Plan actual:', user.planTier);
    console.log('');

    // Actualizar a ADMIN y PREMIUM
    const updatedUser = await prisma.user.update({
      where: {
        email: 'benitocabrerar@gmail.com'
      },
      data: {
        role: 'admin',
        planTier: 'premium',
        updatedAt: new Date()
      }
    });

    console.log('✅ Usuario actualizado exitosamente!');
    console.log('   - Nuevo rol:', updatedUser.role);
    console.log('   - Nuevo plan:', updatedUser.planTier);
    console.log('');
    console.log('🎉 El usuario benitocabrerar@gmail.com ahora es ADMINISTRADOR con plan PREMIUM');

  } catch (error) {
    console.error('❌ Error al actualizar usuario:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
