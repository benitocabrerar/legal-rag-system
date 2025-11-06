export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Legal RAG System</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Sistema de asistencia legal potenciado por IA
          </p>

          <div className="flex gap-4 justify-center">
            <a
              href="/login"
              className="rounded-lg bg-primary px-6 py-3 text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
            >
              Iniciar Sesión
            </a>
            <a
              href="/register"
              className="rounded-lg border border-border px-6 py-3 font-semibold hover:bg-accent transition-colors"
            >
              Registrarse
            </a>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 border rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Búsqueda Semántica</h3>
              <p className="text-sm text-muted-foreground">
                Busca en documentos legales de Ecuador con IA avanzada
              </p>
            </div>
            <div className="p-6 border rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Chat Inteligente</h3>
              <p className="text-sm text-muted-foreground">
                Obtén respuestas precisas basadas en legislación vigente
              </p>
            </div>
            <div className="p-6 border rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Gestión de Casos</h3>
              <p className="text-sm text-muted-foreground">
                Organiza y analiza tus casos legales eficientemente
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
