import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import OceanLoader from './OceanLoader'

export default function ProtectedRoute({ children }) {
    const { user, loading } = useAuth()

    if (loading) {
        return <OceanLoader message="Checking your credentials…" />
    }

    return user ? children : <Navigate to="/auth" replace />
}
