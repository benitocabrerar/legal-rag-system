import bcrypt from 'bcrypt';

const API_URL = 'https://legal-rag-api-qnew.onrender.com';

// Hash de la contraseña "Admin123!"
const password = 'Admin123!';
const saltRounds = 10;
const passwordHash = await bcrypt.hash(password, saltRounds);

console.log('🔐 Password hash generado:', passwordHash);
console.log('\n📝 Intentando crear usuario administrador...\n');

try {
  // Intentar registrar el usuario usando el endpoint de registro
  const response = await fetch(`${API_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'benitocabrerar@gmail.com',
      password: password,
      name: 'Benito Cabrera',
      role: 'ADMIN'
    })
  });

  const data = await response.json();

  if (response.ok) {
    console.log('✅ Usuario administrador creado exitosamente!');
    console.log('📊 Detalles:', JSON.stringify(data, null, 2));
  } else {
    console.log('❌ Error al crear usuario:', response.status);
    console.log('📊 Respuesta:', JSON.stringify(data, null, 2));

    // Si el usuario ya existe, intentar login
    if (data.error && data.error.includes('existe')) {
      console.log('\n🔄 El usuario ya existe. Intentando login...\n');

      const loginResponse = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'benitocabrerar@gmail.com',
          password: password
        })
      });

      const loginData = await loginResponse.json();

      if (loginResponse.ok) {
        console.log('✅ Login exitoso!');
        console.log('📊 Token:', loginData.token);
        console.log('👤 Usuario:', JSON.stringify(loginData.user, null, 2));
      } else {
        console.log('❌ Error en login:', loginResponse.status);
        console.log('📊 Respuesta:', JSON.stringify(loginData, null, 2));
      }
    }
  }
} catch (error) {
  console.error('❌ Error:', error.message);
}
