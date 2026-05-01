const API_URL = 'https://legal-rag-api-qnew.onrender.com';

console.log('🔐 Probando login con credenciales de administrador...\n');
console.log('Email: benitocabrerar@gmail.com');
console.log('Password: Admin123!\n');

try {
  const loginResponse = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'benitocabrerar@gmail.com',
      password: 'Admin123!'
    })
  });

  const loginData = await loginResponse.json();

  if (loginResponse.ok) {
    console.log('✅ LOGIN EXITOSO!');
    console.log('\n📊 Información del usuario:');
    console.log('   - ID:', loginData.user.id);
    console.log('   - Email:', loginData.user.email);
    console.log('   - Nombre:', loginData.user.name);
    console.log('   - Rol:', loginData.user.role);
    console.log('   - Plan:', loginData.user.planTier);
    console.log('\n🔑 Token JWT:', loginData.token.substring(0, 50) + '...');

    console.log('\n⚠️  NOTA: El usuario tiene rol "user", necesita ser actualizado a "ADMIN"');
  } else {
    console.log('❌ LOGIN FALLIDO');
    console.log('Status:', loginResponse.status);
    console.log('Respuesta:', JSON.stringify(loginData, null, 2));
  }
} catch (error) {
  console.error('❌ Error:', error.message);
}
