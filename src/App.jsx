import React, { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DeveloperMailCenter from './components/DeveloperMailCenter';

// Lazy load public components
const LandingPage = lazy(() => import('./pages/LandingPage'));
const Login = lazy(() => import('./pages/Login'));

// Lazy load secure components
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'));
const EvaluationModule = lazy(() => import('./pages/EvaluationModule'));

// Inner component to access context for DeveloperMailCenter theme syncing
const AppContent = () => {
  const { theme, needsOnboarding, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (needsOnboarding) {
      if (location.pathname !== '/login') {
        navigate('/login');
      }
    } else if (user && (location.pathname === '/' || location.pathname === '/login')) {
      if (user.role === 'student') {
        navigate('/student-dashboard');
      } else if (user.role === 'teacher' || user.role === 'admin') {
        navigate('/teacher-dashboard');
      }
    }
  }, [needsOnboarding, user, location.pathname, navigate]);

  return (
    <div className={`theme-transition min-h-screen flex flex-col justify-between`}>
      <Suspense fallback={
        <div className="flex h-screen items-center justify-center bg-slate-950">
          <div className="relative flex items-center justify-center">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-slate-700 border-t-brand-purple"></div>
            <span className="absolute text-xs font-semibold uppercase text-brand-cyan tracking-wider">Loading...</span>
          </div>
        </div>
      }>
        <Routes>
          {/* Public Paths */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />

          {/* Student Secured Route */}
          <Route
            path="/student-dashboard"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />

          {/* Teacher Secured Route */}
          <Route
            path="/teacher-dashboard"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />

          {/* Admin Dashboard alias — same as teacher dashboard */}
          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />

          {/* Evaluator Secured Route */}
          <Route
            path="/evaluate"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <EvaluationModule />
              </ProtectedRoute>
            }
          />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>

      {/* Outbox simulation overlay */}
      <DeveloperMailCenter theme={theme} />
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
