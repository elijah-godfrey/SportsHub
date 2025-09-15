import { HealthCheck } from '@/features/health'
import { AuthWrapper } from './components/auth/AuthWrapper'

function App() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-8">
        <div className="container mx-auto">
          <h1 className="text-4xl font-bold text-foreground">SportsHub</h1>
          <p className="text-lg text-muted-foreground mt-2">Live sports aggregation platform</p>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-6">Authentication</h2>
          <AuthWrapper />
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-6">System Status</h2>
          <HealthCheck />
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-6">Getting Started</h2>
          <div className="prose max-w-none">
            <p className="text-muted-foreground mb-4">
              This is a minimal implementation following Bulletproof React architecture with modern styling.
            </p>
            <ul className="space-y-2 text-foreground">
              <li className="flex items-center">
                <span className="w-2 h-2 bg-primary rounded-full mr-3"></span>
                Frontend: React + Vite + TypeScript + Tailwind CSS + shadcn/ui
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-primary rounded-full mr-3"></span>
                Backend: Node.js + Fastify + TypeScript + Better Auth
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-primary rounded-full mr-3"></span>
                Architecture: Feature-based organization
              </li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
