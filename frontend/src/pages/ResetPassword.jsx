// frontend/src/pages/ResetPassword.jsx
// MOBILE-RESPONSIVE VERSION - Optimized spacing, touch targets, and adaptive layout

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import api from '../api/client';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Password validation state
  const [passwordChecks, setPasswordChecks] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    symbol: false
  });

  // Validate password in real-time
  useEffect(() => {
    const password = formData.newPassword;
    setPasswordChecks({
      length: password.length >= 12,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      symbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    });
  }, [formData.newPassword]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Frontend validation
    if (!formData.newPassword || !formData.confirmPassword) {
      setError('Mohon isi semua field');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Password tidak cocok');
      return;
    }

    // Check all password requirements
    const allChecksPassed = Object.values(passwordChecks).every(check => check);
    if (!allChecksPassed) {
      setError('Password belum memenuhi semua persyaratan');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/reset-password', {
        token,
        newPassword: formData.newPassword
      });

      setSuccess(true);
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login', { 
          state: { message: 'Password berhasil dibuat! Silakan login.' }
        });
      }, 2000);

    } catch (err) {
      console.error('Reset password error:', err);
      
      // Extract detailed error message
      let errorMessage = 'Gagal membuat password';
      
      if (err.response?.data) {
        const errorData = err.response.data;
        
        // Check for validation errors array
        if (errorData.errors && Array.isArray(errorData.errors)) {
          errorMessage = errorData.errors.map(e => e.msg).join(', ');
        } 
        // Check for single error message
        else if (errorData.error) {
          errorMessage = errorData.error;
        }
        // Check for message field
        else if (errorData.message) {
          errorMessage = errorData.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Check if token exists
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100 px-4">
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <XCircle className="w-12 h-12 sm:w-16 sm:h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Link Tidak Valid</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-6">
            Link reset password tidak ditemukan atau sudah kadaluarsa.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition text-sm sm:text-base"
          >
            Kembali ke Login
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100 px-4">
        <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            Password Berhasil Dibuat! 🎉
          </h2>
          <p className="text-sm sm:text-base text-gray-600 mb-4">
            Anda akan dialihkan ke halaman login...
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-100 px-4 py-8">
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg max-w-md w-full">
        {/* Header - Mobile Optimized */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            Buat Password Baru
          </h2>
          <p className="text-xs sm:text-sm text-gray-600">
            Buat password yang kuat untuk akun Anda
          </p>
        </div>

        {/* Error message - Mobile Optimized */}
        {error && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 sm:gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-red-800">Error</p>
              <p className="text-xs sm:text-sm text-red-700 break-words">{error}</p>
            </div>
          </div>
        )}

        {/* Form - Mobile Optimized */}
        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password Baru
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                className="w-full px-3 sm:px-4 py-3 pr-11 sm:pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                placeholder="Masukkan password baru"
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center justify-center w-11 sm:w-12 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Password Requirements - Mobile Optimized */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4">
            <p className="text-xs sm:text-sm font-medium text-gray-700 mb-3">
              Persyaratan Password:
            </p>
            <div className="space-y-2">
              <PasswordCheck 
                label="Minimal 12 karakter" 
                checked={passwordChecks.length} 
              />
              <PasswordCheck 
                label="Huruf besar (A-Z)" 
                checked={passwordChecks.uppercase} 
              />
              <PasswordCheck 
                label="Huruf kecil (a-z)" 
                checked={passwordChecks.lowercase} 
              />
              <PasswordCheck 
                label="Angka (0-9)" 
                checked={passwordChecks.number} 
              />
              <PasswordCheck 
                label="Simbol (!@#$%^&*)" 
                checked={passwordChecks.symbol} 
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Konfirmasi Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-3 sm:px-4 py-3 pr-11 sm:pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                placeholder="Masukkan ulang password baru"
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 flex items-center justify-center w-11 sm:w-12 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            
            {/* Password match indicator */}
            {formData.confirmPassword && (
              <div className="mt-2">
                {formData.newPassword === formData.confirmPassword ? (
                  <p className="text-xs sm:text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Password cocok
                  </p>
                ) : (
                  <p className="text-xs sm:text-sm text-red-600 flex items-center gap-1">
                    <XCircle className="w-4 h-4" />
                    Password tidak cocok
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Submit Button - Mobile Optimized */}
          <button
            type="submit"
            disabled={loading || !Object.values(passwordChecks).every(check => check)}
            className={`w-full py-3 rounded-lg font-medium transition text-sm sm:text-base ${
              loading || !Object.values(passwordChecks).every(check => check)
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Memproses...
              </span>
            ) : (
              'Buat Password'
            )}
          </button>
        </form>

        {/* Help Text - Mobile Optimized */}
        <div className="mt-5 sm:mt-6 text-center">
          <p className="text-xs sm:text-sm text-gray-600">
            Sudah punya akun?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Login di sini
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// Password requirement check component - Mobile Optimized
function PasswordCheck({ label, checked }) {
  return (
    <div className="flex items-center gap-2">
      {checked ? (
        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 text-gray-300 flex-shrink-0" />
      )}
      <span className={`text-xs sm:text-sm ${checked ? 'text-green-700 font-medium' : 'text-gray-600'}`}>
        {label}
      </span>
    </div>
  );
}