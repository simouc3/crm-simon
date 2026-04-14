import { Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import KanbanBoard from './pages/KanbanBoard'
import ClientsList from './pages/ClientsList'
import ProfilesPage from './pages/ProfilesPage'
import CalendarPage from './pages/CalendarPage'
import PendingApproval from './pages/PendingApproval'
import AppLayout from './components/layout/AppLayout'
import { AuthProvider, useAuth } from './hooks/useAuth'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuth()
  
  if (loading) return null // Evitar saltos de ruta mientras carga

  if (!session) {
    return <Navigate to="/login" replace />
  }

  // Si no hay perfil aún (ej. no se ha ejecutado el SQL), tratamos como PENDIENTE por seguridad
  if (!profile || profile.role === 'PENDIENTE') {
    return <Navigate to="/pending" replace />
  }

  return <>{children}</>
}

// Redirects logged in users away from login page
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { session, profile, loading } = useAuth()
  
  if (loading) return null

  if (session) {
    // Si no hay perfil o es pendiente, a la espera
    if (!profile || profile.role === 'PENDIENTE') {
      return <Navigate to="/pending" replace />
    }
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
        
        {/* Ruta de Espera (No protegida por el check de rol activo, pero sí por sesión) */}
        <Route path="/pending" element={
          <ProtectedRoute_SessionOnly>
            <PendingApproval />
          </ProtectedRoute_SessionOnly>
        } />
        
        {/* Rutas Privadas del CRM (Bloqueadas para PENDIENTES) */}
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pipeline" element={<KanbanBoard />} />
          <Route path="/clients" element={<ClientsList />} />
          <Route path="/users" element={<ProfilesPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

// Helper para rutas que necesitan sesión pero no necesariamente rol activo
function ProtectedRoute_SessionOnly({ children }: { children: React.ReactNode }) {
  const { session } = useAuth()
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}


export default App
