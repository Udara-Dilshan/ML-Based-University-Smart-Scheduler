import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Loader2, ArrowLeft } from 'lucide-react';
import { authAPI } from '../services/api';
import uwuLogo from '../assets/uwu-logo.jpg';
import campusBg from '../assets/login-bg.jpg';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      await authAPI.forgotPassword(email);
      setSuccess(true);
    } catch (err) {
      console.error('Forgot password error:', err);
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding (Same as Login) */}
      <div
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: `url(${campusBg})` }}
      >
        <div className="absolute inset-0 bg-blue-900/70 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 via-blue-800/70 to-indigo-900/80"></div>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>
        </div>
        <div className="relative z-10 flex flex-col justify-center items-center w-full px-12 text-white">
          <div className="mb-8">
            <div className="w-32 h-32 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20 p-2 overflow-hidden">
              <img src={uwuLogo} alt="Uva Wellassa University Logo" className="w-full h-full object-contain rounded-xl" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-center mb-4">Uva Wellassa University</h1>
          <p className="text-xl text-center text-blue-100 mb-8 max-w-md">Smart Scheduling & Resource Management System</p>
        </div>
        <div className="absolute top-20 right-20 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl"></div>
      </div>

      {/* Right Side - Forgot Password Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile Header */}
          <div className="lg:hidden mb-8 text-center">
            <div className="inline-flex w-16 h-16 bg-white shadow-sm border border-gray-100 rounded-xl items-center justify-center mb-4 p-1">
              <img src={uwuLogo} alt="UWU Logo" className="w-full h-full object-contain rounded-lg" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">UWU Scheduler</h2>
          </div>

          <div className="mb-8">
            <Link to="/login" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Link>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Forgot Password</h2>
            <p className="text-gray-600">Enter your email address and we'll send you a link to reset your password.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {success ? (
            <div className="p-6 bg-green-50 border border-green-200 rounded-lg text-center">
              <h3 className="text-lg font-semibold text-green-800 mb-2">Check your inbox</h3>
              <p className="text-green-700 mb-6">
                If an account exists for {email}, we have sent a password reset link to it.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center justify-center w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Return to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
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
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder="your.email@uwu.ac.lk"
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                    disabled={loading}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending Link...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
