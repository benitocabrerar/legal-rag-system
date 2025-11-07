import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center text-white mb-16">
          <h1 className="text-6xl font-bold mb-4">Legal RAG System</h1>
          <p className="text-2xl opacity-90">Sistema de asistencia legal potenciado por IA</p>
        </div>

        <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl p-12">
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-gray-900">Características</h2>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <span className="text-2xl mr-3">📄</span>
                  <div>
                    <h3 className="font-semibold text-lg">Gestión de Casos</h3>
                    <p className="text-gray-600">Organiza y administra casos legales eficientemente</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-2xl mr-3">🤖</span>
                  <div>
                    <h3 className="font-semibold text-lg">IA Conversacional</h3>
                    <p className="text-gray-600">Consulta documentos usando lenguaje natural</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-2xl mr-3">🔍</span>
                  <div>
                    <h3 className="font-semibold text-lg">Búsqueda Semántica</h3>
                    <p className="text-gray-600">Encuentra información relevante al instante</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="text-2xl mr-3">📊</span>
                  <div>
                    <h3 className="font-semibold text-lg">Análisis Inteligente</h3>
                    <p className="text-gray-600">GPT-4 analiza tus documentos legales</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="flex flex-col justify-center">
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-8">
                <h2 className="text-2xl font-bold mb-6 text-gray-900">Comienza Ahora</h2>
                <div className="space-y-4">
                  <Link
                    href="/register"
                    className="block w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-lg font-semibold text-center hover:from-indigo-700 hover:to-purple-700 transition-all"
                  >
                    Crear Cuenta
                  </Link>
                  <Link
                    href="/login"
                    className="block w-full bg-white border-2 border-indigo-600 text-indigo-600 py-4 rounded-lg font-semibold text-center hover:bg-indigo-50 transition-all"
                  >
                    Iniciar Sesión
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t pt-8">
            <div className="text-center">
              <h3 className="text-xl font-bold mb-4 text-gray-900">Tecnología de Vanguardia</h3>
              <div className="flex flex-wrap justify-center gap-4">
                <span className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full font-medium">GPT-4</span>
                <span className="px-4 py-2 bg-purple-100 text-purple-700 rounded-full font-medium">Next.js 15</span>
                <span className="px-4 py-2 bg-pink-100 text-pink-700 rounded-full font-medium">PostgreSQL</span>
                <span className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full font-medium">TypeScript</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Plans Section */}
        <div className="max-w-7xl mx-auto mt-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">Planes y Precios</h2>
            <p className="text-xl text-white opacity-90">Elige el plan perfecto para tus necesidades legales</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {/* Free Plan */}
            <div className="bg-white rounded-2xl shadow-xl p-8 hover:scale-105 transition-transform">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Gratis</h3>
                <div className="text-4xl font-bold text-indigo-600 mb-2">$0</div>
                <p className="text-gray-600">Por siempre</p>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-sm text-gray-700">1 caso activo</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-sm text-gray-700">5 documentos max</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-sm text-gray-700">50 consultas IA/mes</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-sm text-gray-700">Base legal básica</span>
                </li>
                <li className="flex items-start">
                  <span className="text-gray-400 mr-2">✗</span>
                  <span className="text-sm text-gray-400">Sin análisis avanzado</span>
                </li>
              </ul>
              <Link
                href="/register"
                className="block w-full bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold text-center hover:bg-gray-300 transition-colors"
              >
                Comenzar Gratis
              </Link>
            </div>

            {/* Basic Plan */}
            <div className="bg-white rounded-2xl shadow-xl p-8 hover:scale-105 transition-transform">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Básico</h3>
                <div className="text-4xl font-bold text-indigo-600 mb-2">$29</div>
                <p className="text-gray-600">Por mes</p>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-sm text-gray-700">10 casos activos</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-sm text-gray-700">100 documentos</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-sm text-gray-700">500 consultas IA/mes</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-sm text-gray-700">Base legal completa</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-sm text-gray-700">Análisis de documentos</span>
                </li>
              </ul>
              <Link
                href="/register"
                className="block w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold text-center hover:bg-indigo-700 transition-colors"
              >
                Seleccionar Plan
              </Link>
            </div>

            {/* Professional Plan - Popular */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl shadow-2xl p-8 transform scale-105 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-yellow-400 text-gray-900 px-4 py-1 rounded-full text-sm font-bold">
                  POPULAR
                </span>
              </div>
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white mb-2">Profesional</h3>
                <div className="text-4xl font-bold text-white mb-2">$99</div>
                <p className="text-white opacity-90">Por mes</p>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <span className="text-yellow-300 mr-2">✓</span>
                  <span className="text-sm text-white">Casos ilimitados</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-300 mr-2">✓</span>
                  <span className="text-sm text-white">Documentos ilimitados</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-300 mr-2">✓</span>
                  <span className="text-sm text-white">Consultas ilimitadas</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-300 mr-2">✓</span>
                  <span className="text-sm text-white">Base legal + Jurisprudencia</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-300 mr-2">✓</span>
                  <span className="text-sm text-white">Análisis avanzado</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-300 mr-2">✓</span>
                  <span className="text-sm text-white">Precedentes automáticos</span>
                </li>
                <li className="flex items-start">
                  <span className="text-yellow-300 mr-2">✓</span>
                  <span className="text-sm text-white">Soporte prioritario</span>
                </li>
              </ul>
              <Link
                href="/register"
                className="block w-full bg-white text-indigo-600 py-3 rounded-lg font-semibold text-center hover:bg-gray-100 transition-colors"
              >
                Comenzar Ahora
              </Link>
            </div>

            {/* Team Plan */}
            <div className="bg-white rounded-2xl shadow-xl p-8 hover:scale-105 transition-transform">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Equipo</h3>
                <div className="text-4xl font-bold text-indigo-600 mb-2">$299</div>
                <p className="text-gray-600">Por mes</p>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-sm text-gray-700">Todo lo de Profesional</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-sm text-gray-700">Hasta 10 usuarios</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-sm text-gray-700">Colaboración en tiempo real</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-sm text-gray-700">Panel de administración</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-sm text-gray-700">API access</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-sm text-gray-700">White-label opcional</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span className="text-sm text-gray-700">Soporte dedicado 24/7</span>
                </li>
              </ul>
              <Link
                href="/register"
                className="block w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-semibold text-center hover:from-indigo-700 hover:to-purple-700 transition-all"
              >
                Contactar Ventas
              </Link>
            </div>
          </div>

          {/* Additional Features */}
          <div className="mt-16 bg-white rounded-2xl shadow-xl p-8">
            <h3 className="text-2xl font-bold text-center mb-8 text-gray-900">Todos los planes incluyen:</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-4xl mb-3">🔒</div>
                <h4 className="font-bold text-lg mb-2">Seguridad Total</h4>
                <p className="text-gray-600 text-sm">Encriptación end-to-end y cumplimiento GDPR</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">🚀</div>
                <h4 className="font-bold text-lg mb-2">Actualizaciones Automáticas</h4>
                <p className="text-gray-600 text-sm">Base legal actualizada constantemente</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">📱</div>
                <h4 className="font-bold text-lg mb-2">Acceso Multi-Plataforma</h4>
                <p className="text-gray-600 text-sm">Web, móvil y tablet sincronizados</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
