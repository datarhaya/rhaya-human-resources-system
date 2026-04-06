// frontend/src/components/OffboardingTab.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../api/client';

export default function OffboardingTab({ userId }) {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.accessLevel <= 2;

  const [offboarding, setOffboarding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    offboardingType: 'RESIGN',
    lastWorkingDay: '',
    resignDate: '',
    resignReason: 'CAREER',
    reasonDetails: ''
  });

  useEffect(() => {
    fetchOffboarding();
  }, [userId]);

  const fetchOffboarding = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/offboarding/employee/${userId}`);
      setOffboarding(res.data.data);
    } catch (error) {
      if (error.response?.status === 404) {
        setOffboarding(null); // No offboarding record
      } else {
        console.error('Fetch offboarding error:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOffboarding = async (e) => {
    e.preventDefault();
    try {
      const res = await apiClient.post('/offboarding', {
        employeeId: userId,
        ...formData
      });
      setOffboarding(res.data.data);
      setShowCreateModal(false);
      alert('Offboarding record created successfully');
    } catch (error) {
      console.error('Create offboarding error:', error);
      alert(error.response?.data?.error || 'Failed to create offboarding record');
    }
  };

  const handleCheckboxChange = async (field, value, notesField = null, notes = '') => {
    try {
      const updates = { [field]: value };
      if (notesField) {
        updates[notesField] = notes;
      }

      const res = await apiClient.put(`/offboarding/${offboarding.id}/checklist`, updates);
      setOffboarding(res.data.data);
    } catch (error) {
      console.error('Update checklist error:', error);
      alert('Failed to update checklist');
    }
  };

  const handleApprove = async (role) => {
    try {
      await apiClient.post(`/offboarding/${offboarding.id}/approve`, { role });
      alert(`${role} approval recorded successfully`);
      fetchOffboarding(); // Refresh data
    } catch (error) {
      console.error('Approve error:', error);
      alert('Failed to record approval');
    }
  };

  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-GB') : '-';

  const ChecklistItem = ({ label, checked, field, notesField, notes }) => {
    const [showNotes, setShowNotes] = useState(false);
    const [noteValue, setNoteValue] = useState(notes || '');

    return (
      <div className="border-b border-gray-200 py-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => handleCheckboxChange(field, e.target.checked, notesField, noteValue)}
              disabled={!isAdmin}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <span className={`text-sm ${checked ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
              {label}
            </span>
          </div>
          
          {isAdmin && (
            <button
              onClick={() => setShowNotes(!showNotes)}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              {showNotes ? 'Hide' : 'Add'} Notes
            </button>
          )}
        </div>

        {showNotes && isAdmin && (
          <div className="mt-2 ml-8">
            <textarea
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              onBlur={() => handleCheckboxChange(field, checked, notesField, noteValue)}
              placeholder="Add notes..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
          </div>
        )}

        {notes && !showNotes && (
          <div className="mt-1 ml-8 text-xs text-gray-500 italic">
            Note: {notes}
          </div>
        )}
      </div>
    );
  };

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Admin Access Only</h3>
          <p className="text-gray-500">Offboarding records are managed by HR/Admin</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading offboarding data...</p>
        </div>
      </div>
    );
  }

  if (!offboarding) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Offboarding Record</h3>
          <p className="text-gray-500 mb-4">This employee doesn't have an offboarding record yet</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Start Offboarding Process
          </button>
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Start Offboarding</h2>
              <form onSubmit={handleCreateOffboarding} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Offboarding Type *
                  </label>
                  <select
                    value={formData.offboardingType}
                    onChange={(e) => setFormData({ ...formData, offboardingType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="RESIGN">Resign</option>
                    <option value="PHK">PHK</option>
                    <option value="CONTRACT_END">Contract End</option>
                    <option value="PENSION">Pension</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Working Day *
                  </label>
                  <input
                    type="date"
                    value={formData.lastWorkingDay}
                    onChange={(e) => setFormData({ ...formData, lastWorkingDay: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {formData.offboardingType === 'RESIGN' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Resign Date
                      </label>
                      <input
                        type="date"
                        value={formData.resignDate}
                        onChange={(e) => setFormData({ ...formData, resignDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Resign Reason
                      </label>
                      <select
                        value={formData.resignReason}
                        onChange={(e) => setFormData({ ...formData, resignReason: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="CAREER">Career Opportunity</option>
                        <option value="ENVIRONMENT">Work Environment</option>
                        <option value="COMPENSATION">Compensation & Benefits</option>
                        <option value="RELOCATION">Relocation</option>
                        <option value="PERSONAL">Personal Reasons</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    {formData.resignReason === 'OTHER' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Details
                        </label>
                        <textarea
                          value={formData.reasonDetails}
                          onChange={(e) => setFormData({ ...formData, reasonDetails: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          rows={3}
                          placeholder="Please specify..."
                        />
                      </div>
                    )}
                  </>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  const getTypeLabel = (type) => {
    const types = {
      RESIGN: 'Resignation',
      PHK: 'Termination (PHK)',
      CONTRACT_END: 'Contract End',
      PENSION: 'Retirement'
    };
    return types[type] || type;
  };

  const getReasonLabel = (reason) => {
    const reasons = {
      CAREER: 'Career Opportunity',
      ENVIRONMENT: 'Work Environment',
      COMPENSATION: 'Compensation & Benefits',
      RELOCATION: 'Relocation',
      PERSONAL: 'Personal Reasons',
      OTHER: 'Other'
    };
    return reasons[reason] || reason;
  };

  const allChecklistComplete = 
    offboarding.handoverCompleted &&
    offboarding.documentationDone &&
    offboarding.accessTransferred &&
    offboarding.laptopReturned &&
    offboarding.idCardReturned &&
    offboarding.emailRevoked &&
    offboarding.otherAssetReturned &&
    offboarding.loanSettled &&
    offboarding.reimbursementClaimed &&
    offboarding.finalPayrollDone;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Offboarding Process</h3>
            <p className="text-sm text-gray-600 mt-1">{offboarding.employee.name}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            offboarding.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
            offboarding.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {offboarding.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Type:</span>
            <span className="ml-2 font-medium">{getTypeLabel(offboarding.offboardingType)}</span>
          </div>
          <div>
            <span className="text-gray-500">Last Working Day:</span>
            <span className="ml-2 font-medium">{formatDate(offboarding.lastWorkingDay)}</span>
          </div>
          {offboarding.resignDate && (
            <div>
              <span className="text-gray-500">Resign Date:</span>
              <span className="ml-2 font-medium">{formatDate(offboarding.resignDate)}</span>
            </div>
          )}
          {offboarding.resignReason && (
            <div>
              <span className="text-gray-500">Reason:</span>
              <span className="ml-2 font-medium">{getReasonLabel(offboarding.resignReason)}</span>
            </div>
          )}
        </div>

        {offboarding.reasonDetails && (
          <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
            <p className="text-sm text-gray-700">{offboarding.reasonDetails}</p>
          </div>
        )}
      </div>

      {/* Checklists */}
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="font-semibold text-gray-900 mb-4">C. Serah Terima Pekerjaan</h4>
        <ChecklistItem
          label="Serah terima pekerjaan kepada pengganti"
          checked={offboarding.handoverCompleted}
          field="handoverCompleted"
          notesField="handoverNotes"
          notes={offboarding.handoverNotes}
        />
        <ChecklistItem
          label="Dokumentasi pekerjaan telah diselesaikan"
          checked={offboarding.documentationDone}
          field="documentationDone"
          notesField="documentationNotes"
          notes={offboarding.documentationNotes}
        />
        <ChecklistItem
          label="Pengalihan akses sistem"
          checked={offboarding.accessTransferred}
          field="accessTransferred"
          notesField="accessNotes"
          notes={offboarding.accessNotes}
        />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="font-semibold text-gray-900 mb-4">D. Pengembalian Aset Perusahaan</h4>
        <ChecklistItem
          label="Laptop / Komputer"
          checked={offboarding.laptopReturned}
          field="laptopReturned"
          notesField="laptopNotes"
          notes={offboarding.laptopNotes}
        />
        <ChecklistItem
          label="ID Card"
          checked={offboarding.idCardReturned}
          field="idCardReturned"
          notesField="idCardNotes"
          notes={offboarding.idCardNotes}
        />
        <ChecklistItem
          label="Email / Akses Sistem"
          checked={offboarding.emailRevoked}
          field="emailRevoked"
          notesField="emailNotes"
          notes={offboarding.emailNotes}
        />
        <ChecklistItem
          label="Lainnya"
          checked={offboarding.otherAssetReturned}
          field="otherAssetReturned"
          notesField="otherAssetNotes"
          notes={offboarding.otherAssetNotes}
        />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="font-semibold text-gray-900 mb-4">E. Kewajiban Administrasi</h4>
        <ChecklistItem
          label="Penyelesaian pinjaman"
          checked={offboarding.loanSettled}
          field="loanSettled"
          notesField="loanNotes"
          notes={offboarding.loanNotes}
        />
        <ChecklistItem
          label="Klaim reimbursement"
          checked={offboarding.reimbursementClaimed}
          field="reimbursementClaimed"
          notesField="reimbursementNotes"
          notes={offboarding.reimbursementNotes}
        />
        <ChecklistItem
          label="Final payroll"
          checked={offboarding.finalPayrollDone}
          field="finalPayrollDone"
          notesField="finalPayrollNotes"
          notes={offboarding.finalPayrollNotes}
        />
      </div>

      {/* Exit Interview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="font-semibold text-gray-900 mb-4">F. Exit Interview</h4>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={offboarding.exitInterviewDone}
              onChange={(e) => handleCheckboxChange('exitInterviewDone', e.target.checked)}
              disabled={!isAdmin}
              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <span className="text-sm text-gray-700">Exit interview completed</span>
          </div>
          
          {isAdmin && (
            <>
              <input
                type="url"
                value={offboarding.exitInterviewLink || ''}
                onChange={(e) => handleCheckboxChange('exitInterviewLink', offboarding.exitInterviewDone, 'exitInterviewLink', e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                value={offboarding.exitInterviewNotes || ''}
                onChange={(e) => handleCheckboxChange('exitInterviewNotes', offboarding.exitInterviewDone, 'exitInterviewNotes', e.target.value)}
                placeholder="Exit interview notes..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </>
          )}
        </div>
      </div>

      {/* Approval Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="font-semibold text-gray-900 mb-4">G. Approval</h4>
        
        {!allChecklistComplete && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ Complete all checklist items before proceeding to approval
            </p>
          </div>
        )}

        <div className="space-y-4">
          {/* Employee Acknowledgment */}
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900">Employee Acknowledgment</span>
              {offboarding.employeeAcknowledged ? (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  ✓ Signed
                </span>
              ) : (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                  Pending
                </span>
              )}
            </div>
            {offboarding.employeeSignedAt && (
              <p className="text-sm text-gray-600">
                Signed on {formatDate(offboarding.employeeSignedAt)}
              </p>
            )}
            {!offboarding.employeeAcknowledged && allChecklistComplete && (
              <button
                onClick={() => handleApprove('EMPLOYEE')}
                className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
              >
                Acknowledge
              </button>
            )}
          </div>

          {/* Supervisor Approval */}
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900">Supervisor Approval</span>
              {offboarding.supervisorApproved ? (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  ✓ Approved
                </span>
              ) : (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                  Pending
                </span>
              )}
            </div>
            {offboarding.supervisor && (
              <p className="text-sm text-gray-600 mb-1">{offboarding.supervisor.name}</p>
            )}
            {offboarding.supervisorSignedAt && (
              <p className="text-sm text-gray-600">
                Approved on {formatDate(offboarding.supervisorSignedAt)}
              </p>
            )}
            {!offboarding.supervisorApproved && allChecklistComplete && (
              <button
                onClick={() => handleApprove('SUPERVISOR')}
                className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
              >
                Approve as Supervisor
              </button>
            )}
          </div>

          {/* HRD Approval */}
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900">HRD Approval</span>
              {offboarding.hrdApproved ? (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  ✓ Approved
                </span>
              ) : (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                  Pending
                </span>
              )}
            </div>
            {offboarding.hrd && (
              <p className="text-sm text-gray-600 mb-1">{offboarding.hrd.name}</p>
            )}
            {offboarding.hrdSignedAt && (
              <p className="text-sm text-gray-600">
                Approved on {formatDate(offboarding.hrdSignedAt)}
              </p>
            )}
            {!offboarding.hrdApproved && allChecklistComplete && (
              <button
                onClick={() => handleApprove('HRD')}
                className="mt-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
              >
                Approve as HRD
              </button>
            )}
          </div>
        </div>

        {offboarding.status === 'COMPLETED' && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800 font-medium">
              ✓ Offboarding completed on {formatDate(offboarding.completedAt)}
            </p>
            <p className="text-sm text-green-700 mt-1">
              Employee account has been deactivated. Employee can still access payslips.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
