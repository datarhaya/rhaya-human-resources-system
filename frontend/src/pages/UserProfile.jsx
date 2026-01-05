// frontend/src/pages/UserProfile.jsx
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import apiClient from '../api/client';
import { Eye, EyeOff } from 'lucide-react';

export default function UserProfile() {
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    phone: '',
    address: ''
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    password: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/users/profile');
      setUser(response.data.data);
      setEditData({
        phone: response.data.data.phone || '',
        address: response.data.data.address || ''
      });
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      alert(t('profile.failedToLoadProfile'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await apiClient.put('/users/profile', editData);
      alert(t('profile.profileUpdated'));
      setEditing(false);
      fetchProfile();
    } catch (error) {
      console.error('Update error:', error);
      alert(error.response?.data?.error || t('profile.failedToUpdate'));
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (passwordData.password !== passwordData.confirmPassword) {
      alert(t('profile.passwordsDoNotMatch'));
      return;
    }

    if (passwordData.password.length < 6) {
      alert(t('profile.passwordTooShort'));
      return;
    }

    try {
      await apiClient.put('/users/profile', {
        currentPassword: passwordData.currentPassword,
        password: passwordData.password
      });
      alert(t('profile.passwordChanged'));
      setChangingPassword(false);
      setPasswordData({
        currentPassword: '',
        password: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Password change error:', error);
      alert(error.response?.data?.error || t('profile.failedToChangePassword'));
    }
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      'PKWTT': 'bg-green-100 text-green-800',
      'PKWT': 'bg-blue-100 text-blue-800',
      'INTERNSHIP': 'bg-purple-100 text-purple-800',
      'FREELANCE': 'bg-yellow-100 text-yellow-800',
      'PROBATION': 'bg-orange-100 text-orange-800',
      'INACTIVE': 'bg-gray-100 text-gray-800'
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">{t('profile.loadingProfile')}</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">{t('profile.failedToLoad')}</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('profile.myProfile')}</h1>
        <p className="text-gray-600 mt-1">{t('profile.viewManage')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="w-32 h-32 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-4xl font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
            <p className="text-gray-600">{user.nip || t('profile.noNip')}</p>
            <span className={`inline-block mt-3 px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(user.employeeStatus)}`}>
              {user.employeeStatus}
            </span>
            
            {/* Quick Stats */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">{t('profile.leaveBalance')}</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {user.leaveBalance?.annualRemaining || 0} {t('profile.days')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">{t('profile.overtimeBalance')}</p>
                  <p className="text-2xl font-bold text-green-600">
                    {user.overtimeBalance?.currentBalance?.toFixed(1) || 0} {t('profile.hours')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
              <h3 className="text-lg font-semibold text-white">{t('profile.personalInformation')}</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.fullName')}</label>
                  <p className="text-gray-900">{user.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.email')}</label>
                  <p className="text-gray-900">{user.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.gender')}</label>
                  <p className="text-gray-900">{user.gender || t('profile.notSpecified')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.dateOfBirth')}</label>
                  <p className="text-gray-900">{formatDate(user.dateOfBirth)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.placeOfBirth')}</label>
                  <p className="text-gray-900">{user.placeOfBirth || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.phone')}</label>
                  {editing ? (
                    <input
                      type="tel"
                      value={editData.phone}
                      onChange={(e) => setEditData({...editData, phone: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  ) : (
                    <p className="text-gray-900">{user.phone || '-'}</p>
                  )}
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.address')}</label>
                  {editing ? (
                    <textarea
                      value={editData.address}
                      onChange={(e) => setEditData({...editData, address: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  ) : (
                    <p className="text-gray-900">{user.address || '-'}</p>
                  )}
                </div>
              </div>

              {editing ? (
                <div className="mt-6 flex space-x-3">
                  <button
                    onClick={handleUpdateProfile}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {t('profile.saveChanges')}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {t('profile.editProfile')}
                </button>
              )}
            </div>
          </div>

          {/* Employment Information */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4">
              <h3 className="text-lg font-semibold text-white">{t('profile.employmentInformation')}</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.employeeId')}</label>
                  <p className="text-gray-900">{user.nip || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.status')}</label>
                  <p className="text-gray-900">{user.employeeStatus}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.division')}</label>
                  <p className="text-gray-900">{user.division?.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.role')}</label>
                  <p className="text-gray-900">{user.role?.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.plottingCompany')}</label>
                  <p className="text-gray-900">{user.plottingCompany || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.joinDate')}</label>
                  <p className="text-gray-900">{formatDate(user.joinDate)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.contractStart')}</label>
                  <p className="text-gray-900">{formatDate(user.contractStartDate)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.contractEnd')}</label>
                  <p className="text-gray-900">{formatDate(user.contractEndDate)}</p>
                </div>
                {user.supervisor && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.supervisor')}</label>
                    <p className="text-gray-900">{user.supervisor.name} ({user.supervisor.email})</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Benefits Information */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
              <h3 className="text-lg font-semibold text-white">{t('profile.benefitsInformation')}</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.bpjsHealth')}</label>
                  <p className="text-gray-900">{user.bpjsHealth || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.bpjsEmployment')}</label>
                  <p className="text-gray-900">{user.bpjsEmployment || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('profile.overtimeRate')}</label>
                  <p className="text-gray-900">
                    {new Intl.NumberFormat('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                      minimumFractionDigits: 0
                    }).format(user.overtimeRate)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">{t('profile.security')}</h3>
              {!changingPassword && (
                <button
                  onClick={() => setChangingPassword(true)}
                  className="px-4 py-1 bg-white text-red-600 rounded text-sm font-medium hover:bg-red-50"
                >
                  {t('profile.changePassword')}
                </button>
              )}
            </div>
            
            {changingPassword ? (
              <form onSubmit={handleChangePassword} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('profile.currentPassword')}
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      required
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                      className="w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
                    >
                      {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('profile.newPassword')}
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={passwordData.password}
                      onChange={(e) => setPasswordData({...passwordData, password: e.target.value})}
                      className="w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('profile.confirmNewPassword')}
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                      className="w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    {t('profile.updatePassword')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChangingPassword(false);
                      setPasswordData({currentPassword: '', password: '', confirmPassword: ''});
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) 
             : (
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">{t('profile.lastPasswordChange')}</p>
                      <p className="text-lg font-medium text-gray-900">
                        {user.lastPasswordChange 
                          ? formatDate(user.lastPasswordChange)
                          : t('profile.never')}
                      </p>
                    </div>
                  </div>
                </div>
              )
            }
          </div>
        </div>
      </div>
    </div>
  );
}