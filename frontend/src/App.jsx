import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import AdminLayout from './components/AdminLayout';
import ErrorBoundary from './components/ErrorBoundary';
import PublicHome from './pages/PublicHome';
import Track from './pages/Track';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import Vehicles from './pages/Vehicles';
import ManageBookings from './pages/ManageBookings';
import CalendarPage from './pages/Calendar';
import Reports from './pages/Reports';
import SettingsPage from './pages/Settings';

function AdminProtected({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/admin/login" replace />;
  return <AdminLayout>{children}</AdminLayout>;
}

export default function App() {
  return (
    <ErrorBoundary>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PublicHome />} />
          <Route path="/track/:code" element={<Track />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminProtected><AdminDashboard /></AdminProtected>} />
          <Route path="/admin/calendar" element={<AdminProtected><CalendarPage /></AdminProtected>} />
          <Route path="/admin/reports" element={<AdminProtected><Reports /></AdminProtected>} />
          <Route path="/admin/settings" element={<AdminProtected><SettingsPage /></AdminProtected>} />
          <Route path="/admin/bookings" element={<AdminProtected><ManageBookings /></AdminProtected>} />
          <Route path="/admin/vehicles" element={<AdminProtected><Vehicles /></AdminProtected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ErrorBoundary>
  );
}
