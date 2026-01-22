// frontend/src/pages/Login.jsx
// UPDATED: Login with NIP or Email

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../api/client';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useTranslation();
  
  const [formData, setFormData] = useState({
    identifier: '',  // Changed from 'username' to 'identifier'
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setError('');
    setLoading(true);

    try {
      const response = await apiClient.post('/auth/login', formData);
      
      // Only navigate on successful login
      login(response.data.token, response.data.user);
      navigate('/');
    } catch (err) {
      // Handle different error cases
      if (err.response?.status === 401) {
        // Invalid credentials
        setError(err.response.data.error || 'Invalid NIP/Email or password. Please check your credentials and try again.');
      } else if (err.response?.status === 403) {
        // Account deactivated
        setError(err.response.data.error || 'Your account has been deactivated. Please contact HR for assistance.');
      } else if (err.response?.status === 429) {
        // Rate limit exceeded
        setError(err.response.data.error || 'Too many login attempts. Please try again later.');
      } else {
        // Generic error
        setError(err.response?.data?.error || err.message || 'An error occurred during login. Please try again.');
      }
      
      // Log for debugging
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('login.title') || 'Login'}</h1>
          <p className="text-gray-600 mt-2">{t('login.subtitle') || 'Welcome back! Please login to your account.'}</p>
        </div>

        {/* Error Message - Positioned above form */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-red-800 font-medium">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* NIP or Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('login.identifier') || 'NIP or Email'}
            </label>
            <input
              type="text"
              value={formData.identifier}
              onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                error ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder={t('login.enterIdentifier') || 'Enter your NIP or Email'}
              required
              disabled={loading}
              autoComplete="username"
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('login.identifierHelp') || 
               'You can use your NIP (employee ID) or email address'}
            </p>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('login.password') || 'Password'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  error ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder={t('login.enterPassword') || 'Enter your password'}
                required
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none disabled:opacity-50"
                disabled={loading}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Forgot Password Link */}
          <div className="text-right">
            <Link
              to="/forgot-password"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
              tabIndex={loading ? -1 : 0}
            >
              Forgot password?
            </Link>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('login.signingIn') || 'Signing in...'}
              </>
            ) : (
              t('login.signIn') || 'Sign In'
            )}
          </button>
        </form>

        {/* Footer Note */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>By signing in, you agree to our terms and conditions</p>
        </div>
      </div>
    </div>
  );
}