// frontend/src/pages/UserManagement.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../api/client';

export default function UserManagement() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const hasCheckedAccess = useRef(false);
  
  // Data state
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [potentialSupervisors, setPotentialSupervisors] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create', 'edit', 'view', 'balance'
  const [selectedUser, setSelectedUser] = useState(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteMode, setDeleteMode] = useState('soft'); // 'soft' or 'hard'
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteConfirmUsername, setDeleteConfirmUsername] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Create new role/division inline
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [isCreatingDivision, setIsCreatingDivision] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newDivisionName, setNewDivisionName] = useState('');
  
  // User form state
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    name: '',
    nip: '',
    phone: '',
    dateOfBirth: '',
    placeOfBirth: '',
    address: '',
    gender: 'Male',           
    roleId: '',
    divisionId: '',
    supervisorId: '',
    accessLevel: '4',
    employeeStatus: 'PKWT',        
    joinDate: '',
    plottingCompany: 'PT Rhayakan Film Indonesia',  
    contractStartDate: '',              
    contractEndDate: '',                
    bpjsHealth: '',
    bpjsEmployment: '',
    overtimeRate: '300000'
  });

  // Balance adjustment state
  const [balanceData, setBalanceData] = useState({
    // Overtime balance
    overtimeHours: '',
    overtimeAction: 'add', // 'add' or 'subtract'
    overtimeReason: '',
    // Leave balance
    leaveYear: new Date().getFullYear(),
    annualQuota: '',
    leaveReason: ''
  });

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDivision, setFilterDivision] = useState('');
  const [filterAccessLevel, setFilterAccessLevel] = useState('');

  // Access control check
  useEffect(() => {
    if (hasCheckedAccess.current) return;
    if (loading) return;
    
    if (!user) {
      navigate('/login');
      return;
    }

    if (user.accessLevel !== 1) {
      hasCheckedAccess.current = true;
      alert('Access denied. Only System Administrators can access this page.');
      navigate('/');
      return;
    }

    hasCheckedAccess.current = true;
    fetchData();
  }, [user, loading, navigate]);

  // Fetch all data
  const fetchData = async () => {
    try {
      setDataLoading(true);
      const [usersRes, rolesRes, divisionsRes] = await Promise.all([
        apiClient.get('/users'),
        apiClient.get('/roles'),
        apiClient.get('/divisions')
      ]);

      const allUsers = usersRes.data.data || [];
      
      // Debug: Check if balance data is present
      console.log('Fetched users:', allUsers.length);
      console.log('Sample user balance data:', allUsers[0] ? {
        name: allUsers[0].name,
        hasOvertimeBalance: !!allUsers[0].overtimeBalance,
        hasLeaveBalance: !!allUsers[0].leaveBalance,
        overtimeBalance: allUsers[0].overtimeBalance,
        leaveBalance: allUsers[0].leaveBalance
      } : 'No users');

      setUsers(allUsers);
      setRoles(rolesRes.data.data || []);
      setDivisions(divisionsRes.data.data || []);
      
      // Filter active users who can be supervisors (access level 1-4)
      const supervisors = allUsers.filter(u => 
        u.accessLevel >= 1 && u.accessLevel <= 4 && u.employeeStatus === 'PKWTT' || u.employeeStatus === 'PKWT'
      );
      setPotentialSupervisors(supervisors);
    } catch (error) {
      console.error('Fetch error:', error);
      console.error('Error details:', error.response?.data);
      alert('Failed to load data: ' + (error.response?.data?.error || error.message));
    } finally {
      setDataLoading(false);
    }
  };

  // Utility functions
  const getAccessLevelLabel = (level) => {
    const labels = {
      1: 'Administrator',
      2: 'Subsidiary HR',
      3: 'Head',
      4: 'Staff',
      5: 'Intern'
    };
    return labels[level] || 'Unknown';
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Filter users based on search and filters
  const filteredUsers = users.filter(u => {
    const matchesSearch = searchTerm === '' || 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.nip && u.nip.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesDivision = filterDivision === '' || u.divisionId === filterDivision;
    const matchesAccessLevel = filterAccessLevel === '' || u.accessLevel.toString() === filterAccessLevel;
    const matchesStatus = filterStatus === '' || u.employeeStatus === filterStatus;  // ⭐ NEW
    
    return matchesSearch && matchesDivision && matchesAccessLevel && matchesStatus;
  });

  // Reset form to initial state
  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      name: '',
      nip: '',
      phone: '',
      dateOfBirth: '',
      placeOfBirth: '',
      address: '',
      gender: 'Male',           
      roleId: '',
      divisionId: '',
      supervisorId: '',
      accessLevel: '4',
      employeeStatus: 'PKWT',        
      joinDate: '',
      plottingCompany: 'PT Rhayakan Film Indonesia',  
      contractStartDate: '',              
      contractEndDate: '',                
      bpjsHealth: '',
      bpjsEmployment: '',
      overtimeRate: '300000'
    });
    setSelectedUser(null);
  };

  const resetBalanceForm = () => {
    setBalanceData({
      overtimeHours: '',
      overtimeAction: 'add',
      overtimeReason: '',
      leaveYear: new Date().getFullYear(),
      annualQuota: '',
      leaveReason: ''
    });
  };

  // Create new role inline
  const handleCreateRole = async () => {
    if (!newRoleName.trim()) {
      alert('Please enter a role name');
      return;
    }

    try {
      const response = await apiClient.post('/roles/create', { 
        name: newRoleName.trim() 
      });

      const newRole = response.data.data;
      const updatedRoles = [...roles, newRole].sort((a, b) => a.name.localeCompare(b.name));
      setRoles(updatedRoles);
      setFormData({ ...formData, roleId: newRole.id });
      setNewRoleName('');
      setIsCreatingRole(false);
      alert('Role created successfully!');
    } catch (error) {
      console.error('Create role error:', error);
      alert(error.response?.data?.error || 'Failed to create role');
    }
  };

  // Create new division inline
  const handleCreateDivision = async () => {
    if (!newDivisionName.trim()) {
      alert('Please enter a division name');
      return;
    }

    try {
      const response = await apiClient.post('/divisions/create', { 
        name: newDivisionName.trim() 
      });

      const newDivision = response.data.data;
      const updatedDivisions = [...divisions, newDivision].sort((a, b) => a.name.localeCompare(b.name));
      setDivisions(updatedDivisions);
      setFormData({ ...formData, divisionId: newDivision.id });
      setNewDivisionName('');
      setIsCreatingDivision(false);
      alert('Division created successfully!');
    } catch (error) {
      console.error('Create division error:', error);
      alert(error.response?.data?.error || 'Failed to create division');
    }
  };

  // Submit user (create or update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const dataToSubmit = {
        ...formData,
        accessLevel: parseInt(formData.accessLevel),
        overtimeRate: parseFloat(formData.overtimeRate || 0),
        dateOfBirth: formData.dateOfBirth || null,
        joinDate: formData.joinDate || null,
        contractStartDate: formData.contractStartDate || null,  
        contractEndDate: formData.contractEndDate || null,      
        gender: formData.gender || 'Not Specified',
        plottingCompany: formData.plottingCompany || 'PT Rhayakan Film indonesia',
        employeeStatus: formData.employeeStatus || 'PROBATION'
      };

      // Remove password if empty (for edit mode)
      if (modalMode === 'edit' && !dataToSubmit.password) {
        delete dataToSubmit.password;
      }

      if (modalMode === 'create') {
        await apiClient.post('/users/create', dataToSubmit);
        alert('User created successfully!');
      } else {
        await apiClient.put(`/users/${selectedUser.id}`, dataToSubmit);
        alert('User updated successfully!');
      }

      setShowModal(false);
      fetchData();
      
      // Reset form
      setFormData({
        username: '',
        email: '',
        password: '',
        name: '',
        nip: '',
        phone: '',
        dateOfBirth: '',
        placeOfBirth: '',
        address: '',
        gender: 'Not Specified',
        roleId: '',
        divisionId: '',
        supervisorId: '',
        accessLevel: '4',
        employeeStatus: 'PROBATION',
        joinDate: '',
        plottingCompany: 'PT Rhayakan Film indonesia',
        contractStartDate: '',
        contractEndDate: '',
        bpjsHealth: '',
        bpjsEmployment: '',
        overtimeRate: '300000'
      });

    } catch (error) {
      console.error('Submit error:', error);
      alert(error.response?.data?.error || 'Failed to save user');
    }
  };

  // Adjust balance
  const handleAdjustBalance = async (e) => {
    e.preventDefault();

    try {
      const adjustments = {};

      // Overtime balance adjustment
      if (balanceData.overtimeHours) {
        if (!balanceData.overtimeReason.trim()) {
          alert('Please provide a reason for overtime adjustment');
          return;
        }

        const hours = parseFloat(balanceData.overtimeHours);
        if (isNaN(hours) || hours <= 0) {
          alert('Please enter a valid number of hours');
          return;
        }

        const amount = balanceData.overtimeAction === 'add' ? hours : -hours;
        
        adjustments.overtime = {
          amount,
          reason: balanceData.overtimeReason
        };
      }

      // Leave balance adjustment
      if (balanceData.annualQuota) {
        if (!balanceData.leaveReason.trim()) {
          alert('Please provide a reason for leave adjustment');
          return;
        }

        const quota = parseInt(balanceData.annualQuota);
        if (isNaN(quota) || quota < 0) {
          alert('Please enter a valid annual quota');
          return;
        }

        adjustments.leave = {
          year: balanceData.leaveYear,
          annualQuota: quota,
          reason: balanceData.leaveReason
        };
      }

      if (Object.keys(adjustments).length === 0) {
        alert('Please fill in at least one adjustment');
        return;
      }

      await apiClient.post(`/users/${selectedUser.id}/adjust-balance`, adjustments);
      
      alert('Balance adjusted successfully!');
      setShowModal(false);
      fetchData();
      resetBalanceForm();
    } catch (error) {
      console.error('Adjust balance error:', error);
      alert(error.response?.data?.error || 'Failed to adjust balance');
    }
  };

  const openDeleteModal = (user) => {
    setUserToDelete(user);
    
    if (user.employeeStatus === 'Inactive') {
      setDeleteMode('hard');
    } else {
      setDeleteMode('soft');
    }
    
    setDeleteConfirmUsername('');
    setShowDeleteModal(true);
  };

  // Handle delete action
  const handleDelete = async () => {
    if (!userToDelete) return;

    try {
      if (deleteMode === 'soft') {
        // Soft delete (deactivate)
        await apiClient.put(`/users/${userToDelete.id}/deactivate`);
        alert(`User ${userToDelete.name} has been deactivated`);
      } else {
        // Hard delete (permanent)
        if (deleteConfirmUsername !== userToDelete.username) {
          alert('Username confirmation does not match!');
          return;
        }

        if (!confirm(
          `⚠️ FINAL WARNING!\n\n` +
          `This will PERMANENTLY delete ${userToDelete.name} and ALL their data.\n\n` +
          `This action CANNOT be undone!\n\n` +
          `Are you absolutely sure?`
        )) {
          return;
        }

        await apiClient.delete(`/users/${userToDelete.id}/permanent`, {
          data: { confirmUsername: deleteConfirmUsername }
        });
        alert(`User ${userToDelete.name} has been permanently deleted`);
      }

      setShowDeleteModal(false);
      setUserToDelete(null);
      setDeleteConfirmUsername('');
      fetchData();

    } catch (error) {
      console.error('Delete error:', error);
      alert(error.response?.data?.error || 'Failed to delete user');
    }
  };

  // Modal openers
  const openCreateModal = () => {
    setModalMode('create');
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setModalMode('edit');
    setSelectedUser(user);
    
    setFormData({
      username: user.username || '',
      email: user.email || '',
      password: '', // Don't load password
      name: user.name || '',
      nip: user.nip || '',
      phone: user.phone || '',
      dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
      placeOfBirth: user.placeOfBirth || '',
      address: user.address || '',
      gender: user.gender || 'Not Specified',                        
      roleId: user.roleId || '',
      divisionId: user.divisionId || '',
      supervisorId: user.supervisorId || '',
      accessLevel: user.accessLevel?.toString() || '4',
      employeeStatus: user.employeeStatus || 'PROBATION',            
      joinDate: user.joinDate ? new Date(user.joinDate).toISOString().split('T')[0] : '',
      plottingCompany: user.plottingCompany || 'PT Rhayakan Film indonesia',  
      contractStartDate: user.contractStartDate ? new Date(user.contractStartDate).toISOString().split('T')[0] : '',  
      contractEndDate: user.contractEndDate ? new Date(user.contractEndDate).toISOString().split('T')[0] : '',        
      bpjsHealth: user.bpjsHealth || '',
      bpjsEmployment: user.bpjsEmployment || '',
      overtimeRate: user.overtimeRate?.toString() || '300000'
    });
    setShowModal(true);
  };

  const openViewModal = (userToView) => {
    console.log('Opening view for user:', {
      name: userToView.name,
      overtimeBalance: userToView.overtimeBalance,
      leaveBalance: userToView.leaveBalance
    });
    setModalMode('view');
    setSelectedUser(userToView);
    setShowModal(true);
  };

  const openBalanceModal = (userToAdjust) => {
    console.log('Opening balance adjustment for user:', {
      name: userToAdjust.name,
      overtimeBalance: userToAdjust.overtimeBalance,
      leaveBalance: userToAdjust.leaveBalance
    });
    setModalMode('balance');
    setSelectedUser(userToAdjust);
    resetBalanceForm();
    setShowModal(true);
  };

  const getStatusBadgeColor = (status) => {
    const statusColors = {
      'PKWTT': 'bg-green-100 text-green-800',
      'PKWT': 'bg-blue-100 text-blue-800',
      'INTERNSHIP': 'bg-purple-100 text-purple-800',
      'FREELANCE': 'bg-yellow-100 text-yellow-800',
      'PROBATION': 'bg-orange-100 text-orange-800',
      'INACTIVE': 'bg-gray-100 text-gray-800',
      // Legacy support
      'Active': 'bg-green-100 text-green-800',
      'Inactive': 'bg-gray-100 text-gray-800'
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  // Loading state
  if (loading || dataLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-blue-600 mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage system users and access levels
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create User
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, username, email, or NIP..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Division Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Division</label>
            <select
              value={filterDivision}
              onChange={(e) => setFilterDivision(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Divisions</option>
              {divisions.map(div => (
                <option key={div.id} value={div.id}>{div.name}</option>
              ))}
            </select>
          </div>

          {/* Access Level Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Access Level</label>
            <select
              value={filterAccessLevel}
              onChange={(e) => setFilterAccessLevel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Levels</option>
              <option value="1">Level 1 - Admin</option>
              <option value="2">Level 2 - HR</option>
              <option value="3">Level 3 - Manager</option>
              <option value="4">Level 4 - Staff</option>
              <option value="5">Level 5 - Intern</option>
            </select>
          </div>

          {/* Employee Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="PKWTT">PKWTT</option>
              <option value="PKWT">PKWT</option>
              <option value="INTERNSHIP">Internship</option>
              <option value="FREELANCE">Freelance</option>
              <option value="PROBATION">Probation</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>
      </div>


      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Access Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Division
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {searchTerm || filterDivision || filterAccessLevel
                        ? 'Try adjusting your filters'
                        : 'Get started by creating a new user'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-semibold text-sm">
                            {u.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{u.name}</div>
                          {u.nip && <div className="text-xs text-gray-500">NIP: {u.nip}</div>}
                          {u.supervisor && (
                            <div className="text-xs text-gray-500">
                              Reports to: {u.supervisor.name}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{u.email}</div>
                      <div className="text-xs text-gray-500">@{u.username}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 font-medium">
                        Level {u.accessLevel} - {getAccessLevelLabel(u.accessLevel)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{u.division?.name || 'N/A'}</div>
                      <div className="text-xs text-gray-500">{u.role?.name || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${getStatusBadgeColor(u.employeeStatus)}`}>
                        {u.employeeStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {/* View Button */}
                        <button
                          onClick={() => openViewModal(u)}
                          className="text-blue-600 hover:text-blue-900 transition-colors"
                          title="View Details"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => openEditModal(u)}
                          className="text-green-600 hover:text-green-900 transition-colors"
                          title="Edit User"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>

                        {/* Adjust Balance Button */}
                        <button
                          onClick={() => openBalanceModal(u)}
                          className="text-purple-600 hover:text-purple-900 transition-colors"
                          title="Adjust Balance"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => openDeleteModal(u)}  // ⭐ CHANGED
                          className="text-red-600 hover:text-red-900 transition-colors"
                          title="Delete User"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== MODAL - RENDERED INLINE (NOT AS NESTED COMPONENT) ===== */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* VIEW MODE */}
              {modalMode === 'view' && selectedUser && (
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">User Details</h2>
                    <button
                      onClick={() => setShowModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* View mode content - keep as is */}
                  <div className="space-y-6">
                  {/* Avatar and Basic Info */}
                    <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                      <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-2xl">
                          {selectedUser.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{selectedUser.name}</h3>
                        <p className="text-sm text-gray-600">{selectedUser.email}</p>
                        <p className="text-sm text-gray-600">@{selectedUser.username}</p>
                      </div>
                    </div>

                    {/* Personal Information */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Gender</label>
                        <p className="text-gray-900">{selectedUser.gender || 'Not Specified'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">NIP</label>
                        <p className="text-gray-900">{selectedUser.nip || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Phone</label>
                        <p className="text-gray-900">{selectedUser.phone || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Date of Birth</label>
                        <p className="text-gray-900">{formatDate(selectedUser.dateOfBirth)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Place of Birth</label>
                        <p className="text-gray-900">{selectedUser.placeOfBirth || 'N/A'}</p>
                      </div>
                      <div className="col-span-2">
                        <label className="text-sm font-medium text-gray-500">Address</label>
                        <p className="text-gray-900">{selectedUser.address || 'N/A'}</p>
                      </div>
                    </div>

                    {/* Employment Info */}
                    <div className="border-t pt-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Employment Information</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Role</label>
                          <p className="text-gray-900">{selectedUser.role?.name || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Division</label>
                          <p className="text-gray-900">{selectedUser.division?.name || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Access Level</label>
                          {/* <p className="text-gray-900">Level {selectedUser.accessLevel} - {getAccessLevelLabel(selectedUser.accessLevel)}</p> */}
                          <p className="text-gray-900">Level {selectedUser.accessLevel} - {getAccessLevelLabel(selectedUser.accessLevel)}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Status</label>
                          <p className="text-gray-900">{selectedUser.employeeStatus}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Plotting Company</label>
                          <p className="text-gray-900">{selectedUser.plottingCompany || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Contract Start</label>
                          <p className="text-gray-900">{formatDate(selectedUser.contractStartDate)}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Contract End</label>
                          <p className="text-gray-900">{formatDate(selectedUser.contractEndDate)}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Join Date</label>
                          <p className="text-gray-900">{formatDate(selectedUser.joinDate)}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Supervisor</label>
                          <p className="text-gray-900">{selectedUser.supervisor?.name || 'None'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Overtime Rate</label>
                          <p className="text-gray-900">{formatCurrency(selectedUser.overtimeRate || 0)}</p>
                        </div>
                      </div>
                    </div>

                    {/* BPJS Info */}
                    <div className="border-t pt-4">
                      <h4 className="font-semibold text-gray-900 mb-3">BPJS Information</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">BPJS Health</label>
                          <p className="text-gray-900">{selectedUser.bpjsHealth || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">BPJS Employment</label>
                          <p className="text-gray-900">{selectedUser.bpjsEmployment || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Balances */}
                    <div className="border-t pt-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Current Balances</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {/* Overtime Balance */}
                        <div className="p-4 bg-purple-50 rounded-lg">
                          <label className="text-sm font-medium text-purple-700">Overtime Balance</label>
                          <p className="text-2xl font-bold text-purple-900">
                            {selectedUser.overtimeBalance?.currentBalance != null 
                              ? selectedUser.overtimeBalance.currentBalance.toFixed(1) 
                              : '0.0'} hours
                          </p>
                          {selectedUser.overtimeBalance?.pendingHours > 0 && (
                            <p className="text-xs text-purple-600 mt-1">
                              Pending: {selectedUser.overtimeBalance.pendingHours.toFixed(1)} hours
                            </p>
                          )}
                        </div>

                        {/* Leave Balance */}
                        <div className="p-4 bg-green-50 rounded-lg">
                          <label className="text-sm font-medium text-green-700">
                            Leave Balance {new Date().getFullYear()}
                          </label>
                          {console.log('selectedUser Data:', selectedUser.leaveBalance)}
                          <p className="text-2xl font-bold text-green-900">
                            {selectedUser.leaveBalance?.annualRemaining != null 
                              ? selectedUser.leaveBalance.annualRemaining 
                              : '0'} days
                          </p>
                          <p className="text-xs text-green-600 mt-1">
                            Quota: {selectedUser.leaveBalance?.annualQuota != null 
                              ? selectedUser.leaveBalance.annualQuota 
                              : '0'} days
                            {selectedUser.leaveBalance?.annualUsed > 0 && 
                              ` (Used: ${selectedUser.leaveBalance.annualUsed})`
                            }
                          </p>
                        </div>
                      </div>
                      
                      {/* Show message if no balance data */}
                      {!selectedUser.overtimeBalance && !selectedUser.leaveBalance && (
                        <p className="text-sm text-gray-500 mt-2 italic">
                          No balance data available. Balance will be created upon first overtime/leave request.
                        </p>
                      )}
                    </div>

                  </div>
                </div>
              )}

              {/* BALANCE ADJUSTMENT MODE */}
              {modalMode === 'balance' && selectedUser && (
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Adjust Balance</h2>
                      <p className="text-sm text-gray-600 mt-1">{selectedUser.name}</p>
                    </div>
                    <button
                      onClick={() => setShowModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <form onSubmit={handleAdjustBalance} className="space-y-6">
                    {/* Current Balances Display */}
                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-xs text-gray-600">Current Overtime</p>
                        <p className="text-lg font-bold text-gray-900">
                          {selectedUser.overtimeBalance?.currentBalance?.toFixed(1) || '0.0'} hours
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Current Leave Quota {new Date().getFullYear()}</p>
                        <p className="text-lg font-bold text-gray-900">
                          {selectedUser.leaveBalance?.annualQuota || 0} days
                          <span className="text-sm text-gray-600 ml-2">
                            ({selectedUser.leaveBalance?.annualRemaining || 0} remaining)
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Overtime Balance Adjustment */}
                    <div className="border-l-4 border-purple-500 pl-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Overtime Balance Adjustment</h3>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
                          <select
                            value={balanceData.overtimeAction}
                            onChange={(e) => setBalanceData({...balanceData, overtimeAction: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="add">Add Hours</option>
                            <option value="subtract">Subtract Hours</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Hours</label>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={balanceData.overtimeHours}
                            onChange={(e) => setBalanceData({...balanceData, overtimeHours: e.target.value})}
                            placeholder="e.g., 8"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Reason {balanceData.overtimeHours && <span className="text-red-500">*</span>}
                        </label>
                        <textarea
                          value={balanceData.overtimeReason}
                          onChange={(e) => setBalanceData({...balanceData, overtimeReason: e.target.value})}
                          rows="2"
                          placeholder="Why are you adjusting this balance?"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    {/* Leave Balance Adjustment */}
                    <div className="border-l-4 border-green-500 pl-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Leave Balance Adjustment</h3>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                          <select
                            value={balanceData.leaveYear}
                            onChange={(e) => setBalanceData({...balanceData, leaveYear: parseInt(e.target.value)})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                          >
                            <option value={new Date().getFullYear() - 1}>{new Date().getFullYear() - 1}</option>
                            <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                            <option value={new Date().getFullYear() + 1}>{new Date().getFullYear() + 1}</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Annual Quota (days)</label>
                          <input
                            type="number"
                            min="0"
                            max="30"
                            value={balanceData.annualQuota}
                            onChange={(e) => setBalanceData({...balanceData, annualQuota: e.target.value})}
                            placeholder="e.g., 14"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Reason {balanceData.annualQuota && <span className="text-red-500">*</span>}
                        </label>
                        <textarea
                          value={balanceData.leaveReason}
                          onChange={(e) => setBalanceData({...balanceData, leaveReason: e.target.value})}
                          rows="2"
                          placeholder="Why are you adjusting this quota?"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    </div>

                    {/* Submit Buttons */}
                    <div className="flex space-x-3 pt-4 border-t">
                      <button
                        type="button"
                        onClick={() => setShowModal(false)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                      >
                        Adjust Balance
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* CREATE/EDIT MODE */}
              {(modalMode === 'create' || modalMode === 'edit') && (
                <div>
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {modalMode === 'create' ? 'Create New User' : 'Edit User'}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Account Information */}
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Account Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Username <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.username}
                          onChange={(e) => setFormData({...formData, username: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Password {modalMode === 'create' && <span className="text-red-500">*</span>}
                          {modalMode === 'edit' && <span className="text-gray-500 text-xs">(leave blank to keep current)</span>}
                        </label>
                        <input
                          type="password"
                          required={modalMode === 'create'}
                          value={formData.password}
                          onChange={(e) => setFormData({...formData, password: e.target.value})}
                          placeholder={modalMode === 'edit' ? 'Leave blank to keep current password' : ''}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Personal Information */}
                  <div className="border-l-4 border-green-500 pl-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Personal Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">NIP</label>
                        <input
                          type="text"
                          value={formData.nip}
                          onChange={(e) => setFormData({...formData, nip: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                        <input
                          type="text"
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                        <input
                          type="date"
                          value={formData.dateOfBirth}
                          onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Place of Birth</label>
                        <input
                          type="text"
                          value={formData.placeOfBirth}
                          onChange={(e) => setFormData({...formData, placeOfBirth: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      {/* Gender */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                        <select
                          value={formData.gender}
                          onChange={(e) => setFormData({...formData, gender: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Not Specified">Not Specified</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                        <textarea
                          value={formData.address}
                          onChange={(e) => setFormData({...formData, address: e.target.value})}
                          rows="2"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Employment Information */}
                  <div className="border-l-4 border-purple-500 pl-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Employment Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Role */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Role <span className="text-red-500">*</span>
                        </label>
                        {isCreatingRole ? (
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              value={newRoleName}
                              onChange={(e) => setNewRoleName(e.target.value)}
                              placeholder="Enter role name"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={handleCreateRole}
                              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                              Add
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsCreatingRole(false);
                                setNewRoleName('');
                              }}
                              className="px-3 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex space-x-2">
                            <select
                              required
                              value={formData.roleId}
                              onChange={(e) => setFormData({...formData, roleId: e.target.value})}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select Role</option>
                              {roles.map(role => (
                                <option key={role.id} value={role.id}>{role.name}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => setIsCreatingRole(true)}
                              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                              title="Create new role"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Division */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Division <span className="text-red-500">*</span>
                        </label>
                        {isCreatingDivision ? (
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              value={newDivisionName}
                              onChange={(e) => setNewDivisionName(e.target.value)}
                              placeholder="Enter division name"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                            />
                            <button
                              type="button"
                              onClick={handleCreateDivision}
                              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                              Add
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsCreatingDivision(false);
                                setNewDivisionName('');
                              }}
                              className="px-3 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex space-x-2">
                            <select
                              required
                              value={formData.divisionId}
                              onChange={(e) => setFormData({...formData, divisionId: e.target.value})}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select Division</option>
                              {divisions.map(div => (
                                <option key={div.id} value={div.id}>{div.name}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => setIsCreatingDivision(true)}
                              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                              title="Create new division"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Access Level <span className="text-red-500">*</span>
                        </label>
                        <select
                          required
                          value={formData.accessLevel}
                          onChange={(e) => setFormData({...formData, accessLevel: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="1">Level 1 - System Administrator</option>
                          <option value="2">Level 2 - Subsidiary HR</option>
                          <option value="3">Level 3 - Manager</option>
                          <option value="4">Level 4 - Staff</option>
                          <option value="5">Level 5 - Intern</option>
                        </select>
                      </div>

                      {/* Plotting Company */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Plotting Company
                        </label>
                        <select
                          value={formData.plottingCompany}
                          onChange={(e) => setFormData({...formData, plottingCompany: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg"
                        >
                          <option value="PT Rhayakan Film indonesia">PT Rhayakan Film indonesia</option>
                          <option value="PT Lihat Dengar Rhayakan">PT Lihat Dengar Rhayakan</option>
                          <option value="PT Rhayakan Cerita Indonesia">PT Rhayakan Cerita Indonesia</option>
                          <option value="PT Dengarkan Ceritakan Rhayakan">PT Dengarkan Ceritakan Rhayakan</option>
                          <option value="PT Rhayakan Sinema Indonesia">PT Rhayakan Sinema Indonesia</option>
                          <option value="PT Gambar Besar Bercerita">PT Gambar Besar Bercerita</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Supervisor</label>
                        <select
                          value={formData.supervisorId}
                          onChange={(e) => setFormData({...formData, supervisorId: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">No Supervisor</option>
                          {potentialSupervisors
                            .filter(s => !selectedUser || s.id !== selectedUser.id)
                            .map(sup => (
                              <option key={sup.id} value={sup.id}>
                                {sup.name} - {getAccessLevelLabel(sup.accessLevel)}
                              </option>
                            ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Join Date</label>
                        <input
                          type="date"
                          value={formData.joinDate}
                          onChange={(e) => setFormData({...formData, joinDate: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      {/* Contract Start Date */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Contract Start Date
                        </label>
                        <input
                          type="date"
                          value={formData.contractStartDate}
                          onChange={(e) => setFormData({...formData, contractStartDate: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>

                      {/* Contract End Date */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Contract End Date
                        </label>
                        <input
                          type="date"
                          value={formData.contractEndDate}
                          onChange={(e) => setFormData({...formData, contractEndDate: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>
                      {/* Employee Status */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Employee Status <span className="text-red-500">*</span>
                        </label>
                        <select
                          required
                          value={formData.employeeStatus}
                          onChange={(e) => setFormData({...formData, employeeStatus: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg"
                        >
                          <option value="PKWTT">PKWTT (Permanent)</option>
                          <option value="PKWT">PKWT (Contract)</option>
                          <option value="INTERNSHIP">Internship</option>
                          <option value="FREELANCE">Freelance</option>
                          <option value="PROBATION">Probation</option>
                          <option value="INACTIVE">Inactive</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Overtime Rate (IDR/hour)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={formData.overtimeRate}
                          onChange={(e) => setFormData({...formData, overtimeRate: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* BPJS Information */}
                  <div className="border-l-4 border-orange-500 pl-4">
                    <h3 className="font-semibold text-gray-900 mb-3">BPJS Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">BPJS Health Number</label>
                        <input
                          type="text"
                          value={formData.bpjsHealth}
                          onChange={(e) => setFormData({...formData, bpjsHealth: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">BPJS Employment Number</label>
                        <input
                          type="text"
                          value={formData.bpjsEmployment}
                          onChange={(e) => setFormData({...formData, bpjsEmployment: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submit Buttons */}
                  <div className="flex space-x-3 pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      {modalMode === 'create' ? 'Create User' : 'Update User'}
                    </button>
                  </div>
                </form>
              </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Delete User: {userToDelete.name}
            </h2>

            {/* User Info */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Username: <span className="font-medium">{userToDelete.username}</span></p>
              <p className="text-sm text-gray-600">Email: <span className="font-medium">{userToDelete.email}</span></p>
              <p className="text-sm text-gray-600">Division: <span className="font-medium">{userToDelete.division?.name || 'N/A'}</span></p>
            </div>

            {/* Delete Mode Selection */}
            <div className="mb-4">
              {userToDelete.employeeStatus === 'Inactive' && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 font-medium">
                    ⚠️ This user is already inactive. Only permanent deletion is available.
                  </p>
                </div>
              )}
              <p className="text-sm font-medium text-gray-700 mb-3">Choose deletion method:</p>
              
              {/* Soft Delete Option */}
              <label className="flex items-start p-3 border-2 rounded-lg mb-3 cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="deleteMode"
                  value="soft"
                  checked={deleteMode === 'soft'}
                  onChange={(e) => setDeleteMode(e.target.value)}
                  disabled={userToDelete.employeeStatus === 'Inactive'}  // ⭐ ADD THIS
                  className="mt-1 mr-3"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    Deactivate (Recommended)
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Set status to "Inactive". User cannot login but all data is preserved.
                    Can be reactivated later if needed.
                  </p>
                </div>
              </label>

              {/* Hard Delete Option */}
              <label className="flex items-start p-3 border-2 border-red-300 rounded-lg cursor-pointer hover:bg-red-50 transition-colors">
                <input
                  type="radio"
                  name="deleteMode"
                  value="hard"
                  checked={deleteMode === 'hard'}
                  onChange={(e) => setDeleteMode(e.target.value)}
                  className="mt-1 mr-3"
                />
                <div className="flex-1">
                  <p className="font-medium text-red-900 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Permanent Delete
                  </p>
                  <p className="text-sm text-red-700 mt-1">
                    ⚠️ Completely remove user and ALL associated data from database.
                    This action <strong>CANNOT</strong> be undone!
                  </p>
                </div>
              </label>
            </div>

            {/* Confirmation for Hard Delete */}
            {deleteMode === 'hard' && (
              <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                <p className="text-sm font-bold text-red-900 mb-2 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Security Confirmation Required
                </p>
                <p className="text-xs text-red-700 mb-2">
                  Type the username exactly as shown below:
                </p>
                <p className="font-mono font-bold text-sm bg-white px-2 py-1 rounded border border-red-300 mb-3">
                  {userToDelete.username}
                </p>
                <input
                  type="text"
                  value={deleteConfirmUsername}
                  onChange={(e) => setDeleteConfirmUsername(e.target.value)}
                  placeholder={`Type "${userToDelete.username}" to confirm`}
                  className="w-full px-3 py-2 border-2 border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  autoComplete="off"
                />
                {deleteConfirmUsername && deleteConfirmUsername !== userToDelete.username && (
                  <p className="text-xs text-red-600 mt-1">
                    ❌ Username does not match
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setUserToDelete(null);
                  setDeleteConfirmUsername('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteMode === 'hard' && deleteConfirmUsername !== userToDelete.username}
                className={`flex-1 px-4 py-2 rounded-lg text-white font-medium transition-colors ${
                  deleteMode === 'soft'
                    ? 'bg-orange-600 hover:bg-orange-700'
                    : 'bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed'
                }`}
              >
                {deleteMode === 'soft' ? 'Deactivate User' : 'Permanently Delete'}
              </button>
            </div>

            {/* Warning Footer */}
            {deleteMode === 'hard' && (
              <div className="mt-4 p-2 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-xs text-yellow-800 text-center">
                  ⚠️ This will delete: user profile, overtime records, leave records, and all associated data
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

