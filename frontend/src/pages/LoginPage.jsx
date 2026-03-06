import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader2, Calendar, Clock } from 'lucide-react';
import { authAPI, setAuthToken, setUser } from '../services/api';

const LoginPage = () => {
  const navigate = useNavigate();
  
  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  // Form validation
  const validateForm = () => {
    if (!formData.email.trim()) {
      setError('University email is required');
      return false;
    }
    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!formData.password) {
      setError('Password is required');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    return true;
  };

  // Handle login submission
  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      // Call login API
      const response = await authAPI.login(formData.email, formData.password);
      
      // Store token and user data
      setAuthToken(response.access_token || response.token);
      setUser(response.user);

      // Redirect based on user role
      const role = response.user.role;
      switch (role) {
        case 'SuperAdmin':
          navigate('/admin/dashboard');
          break;
        case 'Scheduler':
          navigate('/scheduler/dashboard');
          break;
        case 'Lecturer':
          navigate('/lecturer/dashboard');
          break;
        case 'Student':
          navigate('/student/dashboard');
          break;
        case 'ResourceManager':
          navigate('/resource/dashboard');
          break;
        default:
          navigate('/dashboard');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 relative overflow-hidden">
        {/* Decorative background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-center w-full px-12 text-white">
          {/* University Logo Placeholder */}
          <div className="mb-8">
            <div className="w-32 h-32 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
              <Calendar className="w-16 h-16 text-white" />
            </div>
          </div>

          {/* University Name */}
          <h1 className="text-4xl font-bold text-center mb-4">
            Uva Wellassa University
          </h1>

          {/* System Title */}
          <p className="text-xl text-center text-blue-100 mb-8 max-w-md">
            Smart Scheduling & Resource Management System
          </p>

          {/* Decorative Elements */}
          <div className="flex gap-8 mt-12">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-200" />
              </div>
              <div>
                <p className="text-sm text-blue-200">AI-Powered</p>
                <p className="font-semibold">Scheduling</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-200" />
              </div>
              <div>
                <p className="text-sm text-blue-200">Real-Time</p>
                <p className="font-semibold">Updates</p>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative circles */}
        <div className="absolute top-20 right-20 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl"></div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile Header - Only visible on mobile */}
          <div className="lg:hidden mb-8 text-center">
            <div className="inline-flex w-16 h-16 bg-blue-600 rounded-xl items-center justify-center mb-4">
              <Calendar className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">UWU Scheduler</h2>
          </div>

          {/* Welcome Text */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
            <p className="text-gray-600">Sign in to continue to your dashboard</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                University Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your.email@uwu.ac.lk"
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="flex items-center justify-end">
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-8 mb-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">New to the system?</span>
              </div>
            </div>
          </div>

          {/* Student Signup Link */}
          <div className="text-center">
            <p className="text-gray-600 mb-3">
              Are you a student?
            </p>
            <Link
              to="/signup"
              className="inline-flex items-center justify-center w-full py-3 px-4 border-2 border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-all"
            >
              Create Student Account
            </Link>
          </div>

          {/* Info Note */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <p className="text-xs text-gray-600 text-center">
              <span className="font-semibold">Note:</span> Staff accounts are created by System Administrators.
              If you are a lecturer or staff member, please contact IT support.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
