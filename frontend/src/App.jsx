import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import StudentSignupPage from './pages/StudentSignupPage';
import { isAuthenticated } from './services/api';

// Import Dashboard Components
import AdminDashboard from './pages/admin/AdminDashboard';
import StudentDashboard from './pages/student/StudentDashboard';
import LecturerDashboard from './pages/lecturer/LecturerDashboard';
import SchedulerDashboard from './pages/scheduler/SchedulerDashboard';
import ResourceDashboard from './pages/resource/ResourceDashboard';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  return isAuthenticated() ? children : <Navigate to="/" replace />;
};

// Forgot Password Placeholder
const ForgotPassword = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
    <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Forgot Password</h2>
      <p className="text-gray-600 mb-6">
        This feature will be available soon. Please contact IT support for password reset.
      </p>
      <a
        href="/"
        className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Back to Login
      </a>
    </div>
  </div>
);

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/signup" element={<StudentSignupPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Protected Routes - Dashboards */}
        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/scheduler/dashboard"
          element={
            <ProtectedRoute>
              <SchedulerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lecturer/dashboard"
          element={
            <ProtectedRoute>
              <LecturerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/resource/dashboard"
          element={
            <ProtectedRoute>
              <ResourceDashboard />
            </ProtectedRoute>
          }
        />

        {/* Fallback Route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

