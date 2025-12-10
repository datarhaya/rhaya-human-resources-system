// frontend/src/pages/UserProfile.jsx
import { useState, useEffect } from 'react';
import apiClient from '../api/client';

export default function UserProfile() {
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
      alert('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await apiClient.put('/users/profile', editData);
      alert('Profile updated successfully');
      setEditing(false);
      fetchProfile();
    } catch (error) {
      console.error('Update error:', error);
      alert(error.response?.data?.error || 'Failed to update profile');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (passwordData.password !== passwordData.confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    if (passwordData.password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    try {
      await apiClient.put('/users/profile', {
        currentPassword: passwordData.currentPassword,
        password: passwordData.password
      });
      alert('Password changed successfully');
      setChangingPassword(false);
      setPasswordData({
        currentPassword: '',
        password: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Password change error:', error);
      alert(error.response?.data?.error || 'Failed to change password');
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
        <div className="text-lg text-gray-600">Loading profile...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">Failed to load profile</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-600 mt-1">View and manage your personal information</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="w-32 h-32 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-4xl font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
            <p className="text-gray-600">{user.nip || 'No NIP'}</p>
            <span className={`inline-block mt-3 px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(user.employeeStatus)}`}>
              {user.employeeStatus}
            </span>
            
            {/* Quick Stats */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Leave Balance</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {user.leaveBalance?.annualRemaining || 0} days
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Overtime Balance</p>
                  <p className="text-2xl font-bold text-green-600">
                    {user.overtimeBalance?.currentBalance?.toFixed(1) || 0} hours
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
              <h3 className="text-lg font-semibold text-white">Personal Information</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <p className="text-gray-900">{user.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <p className="text-gray-900">{user.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <p className="text-gray-900">{user.gender || 'Not Specified'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <p className="text-gray-900">{formatDate(user.dateOfBirth)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Place of Birth</label>
                  <p className="text-gray-900">{user.placeOfBirth || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
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
                    Save Changes
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
                  Edit Profile
                </button>
              )}
            </div>
          </div>

          {/* Employment Information */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4">
              <h3 className="text-lg font-semibold text-white">Employment Information</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                  <p className="text-gray-900">{user.nip || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <p className="text-gray-900">{user.employeeStatus}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Division</label>
                  <p className="text-gray-900">{user.division?.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <p className="text-gray-900">{user.role?.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plotting Company</label>
                  <p className="text-gray-900">{user.plottingCompany || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Join Date</label>
                  <p className="text-gray-900">{formatDate(user.joinDate)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contract Start</label>
                  <p className="text-gray-900">{formatDate(user.contractStartDate)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contract End</label>
                  <p className="text-gray-900">{formatDate(user.contractEndDate)}</p>
                </div>
                {user.supervisor && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Supervisor</label>
                    <p className="text-gray-900">{user.supervisor.name} ({user.supervisor.email})</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Benefits Information */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
              <h3 className="text-lg font-semibold text-white">Benefits Information</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">BPJS Health</label>
                  <p className="text-gray-900">{user.bpjsHealth || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">BPJS Employment</label>
                  <p className="text-gray-900">{user.bpjsEmployment || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Overtime Rate</label>
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
              <h3 className="text-lg font-semibold text-white">Security</h3>
              {!changingPassword && (
                <button
                  onClick={() => setChangingPassword(true)}
                  className="px-4 py-1 bg-white text-red-600 rounded text-sm font-medium hover:bg-red-50"
                >
                  Change Password
                </button>
              )}
            </div>
            
            {changingPassword ? (
              <form onSubmit={handleChangePassword} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                  <input
                    type="password"
                    required
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={passwordData.password}
                    onChange={(e) => setPasswordData({...passwordData, password: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Update Password
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
                  <p className="text-gray-600">Last password change: <span className="font-medium">Never</span></p>
                </div>
              )
            }
          </div>
        </div>
      </div>
    </div>
  );
}