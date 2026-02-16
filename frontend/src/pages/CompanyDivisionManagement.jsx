// frontend/src/pages/CompanyDivisionManagement.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../api/client';

export default function CompanyDivisionManagement() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const hasCheckedAccess = useRef(false);

  // Tab state
  const [activeTab, setActiveTab] = useState('companies'); // 'companies' or 'divisions'

  // Data state
  const [plottingCompanies, setPlottingCompanies] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [modalType, setModalType] = useState('company'); // 'company' or 'division'
  const [selectedItem, setSelectedItem] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: ''
  });

  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  // Submitting state
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Fetch data
  const fetchData = async () => {
    try {
      setDataLoading(true);
      const [companiesRes, divisionsRes] = await Promise.all([
        apiClient.get('/plotting-companies'),
        apiClient.get('/divisions')
      ]);

      setPlottingCompanies(companiesRes.data.data || []);
      setDivisions(divisionsRes.data.data || []);
    } catch (error) {
      console.error('Fetch error:', error);
      alert('Failed to load data: ' + (error.response?.data?.error || error.message));
    } finally {
      setDataLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: ''
    });
    setSelectedItem(null);
  };

  // Open modals
  const openCreateModal = (type) => {
    setModalType(type);
    setModalMode('create');
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (item, type) => {
    setModalType(type);
    setModalMode('edit');
    setSelectedItem(item);
    
    if (type === 'company') {
      setFormData({
        code: item.code || '',
        name: item.name || '',
        description: item.description || ''
      });
    } else {
      setFormData({
        code: '',
        name: item.name || '',
        description: item.description || ''
      });
    }
    
    setShowModal(true);
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const endpoint = modalType === 'company' ? '/plotting-companies' : '/divisions';
      
      if (modalMode === 'create') {
        const payload = modalType === 'company' 
          ? { code: formData.code.toUpperCase(), name: formData.name, description: formData.description }
          : { name: formData.name, description: formData.description };

        await apiClient.post(`${endpoint}/create`, payload);
        alert(`${modalType === 'company' ? 'Plotting Company' : 'Division'} created successfully!`);
      } else {
        const payload = modalType === 'company'
          ? { code: formData.code.toUpperCase(), name: formData.name, description: formData.description }
          : { name: formData.name, description: formData.description };

        await apiClient.put(`${endpoint}/${selectedItem.id}`, payload);
        alert(`${modalType === 'company' ? 'Plotting Company' : 'Division'} updated successfully!`);
      }

      setShowModal(false);
      fetchData();
      resetForm();
    } catch (error) {
      console.error('Submit error:', error);
      alert(error.response?.data?.error || 'Failed to save');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete/Deactivate
  const handleDelete = async (item, type) => {
    const itemName = type === 'company' ? `${item.code} - ${item.name}` : item.name;
    
    if (!confirm(`Are you sure you want to ${type === 'company' ? 'deactivate' : 'delete'} "${itemName}"?`)) {
      return;
    }

    try {
      const endpoint = type === 'company' ? '/plotting-companies' : '/divisions';
      await apiClient.delete(`${endpoint}/${item.id}`);
      alert(`${type === 'company' ? 'Plotting Company deactivated' : 'Division deleted'} successfully!`);
      fetchData();
    } catch (error) {
      console.error('Delete error:', error);
      alert(error.response?.data?.error || 'Failed to delete');
    }
  };

  // Filter data
  const filteredCompanies = plottingCompanies.filter(company =>
    company.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDivisions = divisions.filter(division =>
    division.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Company & Division Management</h1>
          <p className="text-gray-600 mt-2">Manage plotting companies and divisions</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('companies')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'companies'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Plotting Companies ({plottingCompanies.length})
              </button>
              <button
                onClick={() => setActiveTab('divisions')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'divisions'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Divisions ({divisions.length})
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Search and Add Button */}
            <div className="flex justify-between items-center mb-6">
              <input
                type="text"
                placeholder={`Search ${activeTab === 'companies' ? 'companies' : 'divisions'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => openCreateModal(activeTab === 'companies' ? 'company' : 'division')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                + Add {activeTab === 'companies' ? 'Company' : 'Division'}
              </button>
            </div>

            {/* Plotting Companies Table */}
            {activeTab === 'companies' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employees
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredCompanies.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                          No companies found
                        </td>
                      </tr>
                    ) : (
                      filteredCompanies.map((company) => (
                        <tr key={company.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              {company.code}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{company.name}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-500">{company.description || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900">{company._count?.users || 0}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => openEditModal(company, 'company')}
                              className="text-blue-600 hover:text-blue-800 mr-4"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(company, 'company')}
                              className="text-red-600 hover:text-red-800"
                              disabled={company._count?.users > 0}
                              title={company._count?.users > 0 ? 'Cannot deactivate company with employees' : ''}
                            >
                              {company._count?.users > 0 ? 'Deactivate' : 'Deactivate'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Divisions Table */}
            {activeTab === 'divisions' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Division Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employees
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredDivisions.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                          No divisions found
                        </td>
                      </tr>
                    ) : (
                      filteredDivisions.map((division) => (
                        <tr key={division.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{division.name}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-500">{division.description || '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900">{division._count?.users || 0}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => openEditModal(division, 'division')}
                              className="text-blue-600 hover:text-blue-800 mr-4"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(division, 'division')}
                              className="text-red-600 hover:text-red-800"
                              disabled={division._count?.users > 0}
                              title={division._count?.users > 0 ? 'Cannot delete division with employees' : ''}
                            >
                              {division._count?.users > 0 ? 'Delete' : 'Delete'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {modalMode === 'create' ? 'Create' : 'Edit'} {modalType === 'company' ? 'Plotting Company' : 'Division'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              {/* Code field (only for companies) */}
              {modalType === 'company' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength="10"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    placeholder="e.g., RFI, RG"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Max 10 characters, auto-uppercase</p>
                </div>
              )}

              {/* Name field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {modalType === 'company' ? 'Company Name' : 'Division Name'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder={modalType === 'company' ? 'e.g., PT Rhayakan Film Indonesia' : 'e.g., Human Resources'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Description field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows="3"
                  placeholder="Optional description..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    modalMode === 'create' ? 'Create' : 'Update'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}