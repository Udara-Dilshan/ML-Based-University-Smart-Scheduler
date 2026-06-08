import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Loader2, Calendar, User, Hash, GraduationCap, Building2, BookOpen } from 'lucide-react';
import { authAPI, academicAPI, setAuthToken, setUser } from '../services/api';
import uwuLogo from '../assets/uwu-logo.jpg';
import campusBg from '../assets/login-bg.jpg';

const StudentSignupPage = () => {
  const navigate = useNavigate();
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    registrationNumber: '',
    batch_id: '',
    password: '',
    confirmPassword: '',
  });

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  // Academic Data State
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [degrees, setDegrees] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [selectedDegree, setSelectedDegree] = useState('');

  useEffect(() => {
    const fetchAcademicData = async () => {
      try {
        const [facs, depts, degs, bats] = await Promise.all([
          academicAPI.getFaculties(),
          academicAPI.getDepartments(),
          academicAPI.getDegrees(),
          academicAPI.getBatches()
        ]);
        setFaculties(facs);
        setDepartments(depts);
        setDegrees(degs);
        setBatches(bats);
      } catch (err) {
        console.error("Failed to fetch academic data:", err);
      }
    };
    fetchAcademicData();
  }, []);

  // Filter data based on selections
  const filteredDegrees = selectedFaculty 
    ? degrees.filter(deg => departments.some(d => d.dept_id === deg.dept_id && d.faculty_id === parseInt(selectedFaculty)))
    : [];
    
  const filteredBatches = selectedDegree
    ? batches.filter(b => b.degree_id === parseInt(selectedDegree))
    : [];

  const handleFacultyChange = (e) => {
    setSelectedFaculty(e.target.value);
    setSelectedDegree('');
    setFormData(prev => ({ ...prev, batch_id: '' }));
  };

  const handleDegreeChange = (e) => {
    setSelectedDegree(e.target.value);
    setFormData(prev => ({ ...prev, batch_id: '' }));
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Form validation
  const validateForm = () => {
    const newErrors = {};

    // First Name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (formData.firstName.length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    }

    // Last Name validation
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (formData.lastName.length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'University email is required';
    } else if (!formData.email.includes('@')) {
      newErrors.email = 'Please enter a valid email address';
    } else if (!formData.email.toLowerCase().includes('uwu.ac.lk')) {
      newErrors.email = 'Please use your UWU email address (@uwu.ac.lk)';
    }

    // Registration Number validation
    if (!formData.registrationNumber.trim()) {
      newErrors.registrationNumber = 'Registration number is required';
    } else if (!/^UWU\/[A-Z]+\/\d{2}\/\d{3}$/i.test(formData.registrationNumber)) {
      newErrors.registrationNumber = 'Invalid format. Use: UWU/ICT/21/001';
    }

    // Batch validation
    if (!formData.batch_id) {
      newErrors.batch_id = 'Batch is required';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number';
    }

    // Confirm Password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle signup submission
  const handleSignup = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});
    setSuccessMessage('');

    try {
      // Prepare data for API
      const signupData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        registration_number: formData.registrationNumber,
        batch_id: parseInt(formData.batch_id),
        password: formData.password,
      };

      // Call signup API
      const response = await authAPI.signup(signupData);
      
      // Show success message
      setSuccessMessage('Account created successfully! Redirecting to login...');

      // If API returns token directly, store it and navigate
      if (response.access_token || response.token) {
        setAuthToken(response.access_token || response.token);
        setUser(response.user);
        
        setTimeout(() => {
          navigate('/student/dashboard');
        }, 1500);
      } else {
        // Otherwise redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/', { state: { message: 'Account created! Please login.' } });
        }, 2000);
      }
    } catch (err) {
      console.error('Signup error:', err);
      
      // Handle validation errors from backend
      if (err.detail && Array.isArray(err.detail)) {
        const backendErrors = {};
        err.detail.forEach(error => {
          const field = error.loc?.[1] || 'general';
          backendErrors[field] = error.msg;
        });
        setErrors(backendErrors);
      } else if (typeof err.detail === 'string') {
        const detailStr = err.detail.toLowerCase();
        if (detailStr.includes('email')) {
          setErrors({ email: err.detail });
        } else if (detailStr.includes('registration number')) {
          setErrors({ registrationNumber: err.detail });
        } else {
          setErrors({ general: err.detail });
        }
      } else {
        setErrors({ 
          general: err.message || 'Signup failed. Please try again.' 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div 
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: `url(${campusBg})` }}
      >
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-blue-900/70 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 via-blue-800/70 to-indigo-900/80"></div>

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
          {/* University Logo */}
          <div className="mb-8">
            <div className="w-32 h-32 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20 p-2 overflow-hidden">
              <img src={uwuLogo} alt="Uva Wellassa University Logo" className="w-full h-full object-contain rounded-xl" />
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

          {/* Welcome Message */}
          <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-xl p-6 max-w-md border border-white/20">
            <h3 className="text-lg font-semibold mb-2">Welcome, Future Student!</h3>
            <p className="text-blue-100 text-sm">
              Create your account to access your personalized timetable, 
              track classes, and stay updated with university events.
            </p>
          </div>
        </div>

        {/* Decorative circles */}
        <div className="absolute top-20 right-20 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl"></div>
      </div>

      {/* Right Side - Signup Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile Header - Only visible on mobile */}
          <div className="lg:hidden mb-8 text-center">
            <div className="inline-flex w-16 h-16 bg-white shadow-sm border border-gray-100 rounded-xl items-center justify-center mb-4 p-1">
              <img src={uwuLogo} alt="UWU Logo" className="w-full h-full object-contain rounded-lg" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">UWU Scheduler</h2>
          </div>

          {/* Welcome Text */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h2>
            <p className="text-gray-600">Register as a student to get started</p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-600">{successMessage}</p>
            </div>
          )}

          {/* General Error Message */}
          {errors.general && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.general}</p>
            </div>
          )}

          {/* Signup Form */}
          <form onSubmit={handleSignup} className="space-y-5">
            {/* Name Fields - Side by Side */}
            <div className="grid grid-cols-2 gap-4">
              {/* First Name */}
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="John"
                    className={`block w-full pl-10 pr-3 py-2.5 border ${
                      errors.firstName ? 'border-red-300' : 'border-gray-300'
                    } rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all`}
                    disabled={loading}
                  />
                </div>
                {errors.firstName && (
                  <p className="mt-1 text-xs text-red-600">{errors.firstName}</p>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Doe"
                  className={`block w-full px-3 py-2.5 border ${
                    errors.lastName ? 'border-red-300' : 'border-gray-300'
                  } rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all`}
                  disabled={loading}
                />
                {errors.lastName && (
                  <p className="mt-1 text-xs text-red-600">{errors.lastName}</p>
                )}
              </div>
            </div>

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
                  placeholder="john.doe@uwu.ac.lk"
                  className={`block w-full pl-10 pr-3 py-2.5 border ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  } rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all`}
                  disabled={loading}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email}</p>
              )}
            </div>

            {/* Registration Number */}
            <div>
              <label htmlFor="registrationNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Registration No.
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Hash className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="registrationNumber"
                  name="registrationNumber"
                  value={formData.registrationNumber}
                  onChange={handleChange}
                  placeholder="UWU/ICT/21/001"
                  className={`block w-full pl-10 pr-3 py-2.5 border ${
                    errors.registrationNumber ? 'border-red-300' : 'border-gray-300'
                  } rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all text-sm`}
                  disabled={loading}
                />
              </div>
              {errors.registrationNumber && (
                <p className="mt-1 text-xs text-red-600">{errors.registrationNumber}</p>
              )}
            </div>

            {/* Faculty Dropdown */}
            <div>
              <label htmlFor="faculty" className="block text-sm font-medium text-gray-700 mb-2">
                Faculty
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building2 className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  id="faculty"
                  value={selectedFaculty}
                  onChange={handleFacultyChange}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                  disabled={loading || faculties.length === 0}
                >
                  <option value="">Select Faculty</option>
                  {faculties.map((fac) => (
                    <option key={fac.faculty_id} value={fac.faculty_id}>{fac.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Degree and Batch Dropdowns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Degree */}
              <div>
                <label htmlFor="degree" className="block text-sm font-medium text-gray-700 mb-2">
                  Degree
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <BookOpen className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    id="degree"
                    value={selectedDegree}
                    onChange={handleDegreeChange}
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all text-sm"
                    disabled={loading || !selectedFaculty}
                  >
                    <option value="">Select Degree</option>
                    {filteredDegrees.map((deg) => (
                      <option key={deg.degree_id} value={deg.degree_id}>{deg.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Batch */}
              <div>
                <label htmlFor="batch_id" className="block text-sm font-medium text-gray-700 mb-2">
                  Batch
                </label>
                <select
                  id="batch_id"
                  name="batch_id"
                  value={formData.batch_id}
                  onChange={handleChange}
                  className={`block w-full px-3 py-2.5 border ${
                    errors.batch_id ? 'border-red-300' : 'border-gray-300'
                  } rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all`}
                  disabled={loading || !selectedDegree}
                >
                  <option value="">Select Batch</option>
                  {filteredBatches.map((batch) => (
                    <option key={batch.batch_id} value={batch.batch_id}>{batch.batch_code}</option>
                  ))}
                </select>
                {errors.batch_id && (
                  <p className="mt-1 text-xs text-red-600">{errors.batch_id}</p>
                )}
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
                  placeholder="••••••••"
                  className={`block w-full pl-10 pr-12 py-2.5 border ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  } rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all`}
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
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={`block w-full pl-10 pr-12 py-2.5 border ${
                    errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                  } rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all`}
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  disabled={loading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Create Account Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Student Account'
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
                <span className="px-2 bg-white text-gray-500">Already have an account?</span>
              </div>
            </div>
          </div>

          {/* Login Link */}
          <div className="text-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center w-full py-3 px-4 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
            >
              Sign In Here
            </Link>
          </div>

          {/* Info Note */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-xs text-gray-600 text-center">
              <span className="font-semibold">Note:</span> Use your official UWU email address. 
              Staff accounts are managed by administrators.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentSignupPage;
