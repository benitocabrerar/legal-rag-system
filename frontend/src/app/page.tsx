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
      </div>
    </main>
  );
}
