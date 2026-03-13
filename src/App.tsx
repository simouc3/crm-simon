import { Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import KanbanBoard from './pages/KanbanBoard'
import ClientsList from './pages/ClientsList'
import ProfilesPage from './pages/ProfilesPage'
import CalendarPage from './pages/CalendarPage'
import AppLayout from './components/layout/AppLayout'
import { AuthProvider, useAuth } from './hooks/useAuth'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session } = useAuth()
  if (!session) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

// Redirects logged in users away from login page
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { session } = useAuth()
  if (session) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
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

export default App
