import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import ErrorBoundary from './components/ErrorBoundary';
import PublicHome from './pages/PublicHome';
import Track from './pages/Track';

// Admin pages (and jsPDF with them) load only when an admin opens them, so a
// driver scanning a key tag downloads just the booking screens.
const AdminLayout = lazy(() => import('./components/AdminLayout'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Vehicles = lazy(() => import('./pages/Vehicles'));
const ManageBookings = lazy(() => import('./pages/ManageBookings'));
const CalendarPage = lazy(() => import('./pages/Calendar'));
const Reports = lazy(() => import('./pages/Reports'));
const SettingsPage = lazy(() => import('./pages/Settings'));

function AdminProtected({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/admin/login" replace />;
  return <AdminLayout>{children}</AdminLayout>;
}

const Loading = () => <div className="empty" style={{ paddingTop: 80 }}>Loading…</div>;

export default function App() {
  return (
    <ErrorBoundary>
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<Loading/>}>
          <Routes>
            <Route path="/" element={<PublicHome />} />
            <Route path="/book/:vehicleId" element={<PublicHome />} />
            <Route path="/track" element={<Track />} />
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
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
    </ErrorBoundary>
  );
}
