import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';

import EvaluationModule from './pages/EvaluationModule';
import DeveloperMailCenter from './components/DeveloperMailCenter';

// Inner component to access context for DeveloperMailCenter theme syncing
const AppContent = () => {
  const { theme } = useAuth();

  return (
    <div className={`theme-transition min-h-screen flex flex-col justify-between`}>
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
