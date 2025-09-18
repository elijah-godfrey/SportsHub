import { HealthCheck } from '@/features/health'
import { AuthWrapper } from './components/auth/AuthWrapper'
import { SoccerDashboard } from '@/features/soccer'

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
          <h2 className="text-2xl font-semibold text-foreground mb-6">Live Soccer Scores</h2>
          <SoccerDashboard />
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-6">Authentication</h2>
          <AuthWrapper />
        </section>

        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-6">System Status</h2>
          <HealthCheck />
        </section>
      </main>
    </div>
  )
}

export default App
