import { Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import KanbanBoard from './pages/KanbanBoard'
import ClientsList from './pages/ClientsList'
import ProfilesPage from './pages/ProfilesPage'
import CalendarPage from './pages/CalendarPage'
// import PendingApproval from './pages/PendingApproval'
import AppLayout from './components/layout/AppLayout'
import { AuthProvider, useAuth } from './hooks/useAuth'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, authReady } = useAuth()
  
  if (!authReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F5F5F7] dark:bg-[#0D0D17]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="mt-4 text-[10px] font-black uppercase tracking-widest opacity-40">Verificando Acceso...</p>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// Redirects logged in users away from login page
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { session, authReady } = useAuth()
  
  if (!authReady) return null

  if (session) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

import PublicProposal from './pages/PublicProposal'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        
        {/* Ruta Pública (Magic Link Evaluator) */}
        <Route path="/p/:token" element={<PublicProposal />} />
        
        {/* Rutas Privadas del CRM */}
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pipeline" element={<KanbanBoard />} />
          <Route path="/clients" element={<ClientsList />} />
          <Route path="/users" element={<ProfilesPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          {/* Catch-all para evitar pantalla blanca si se usa /dashboard u otras rutas antiguas */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

export default App
