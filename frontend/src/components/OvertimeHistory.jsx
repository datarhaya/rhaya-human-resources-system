import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '../api';

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  MANAGER_APPROVED: 'bg-blue-100 text-blue-800',
  MANAGER_REJECTED: 'bg-red-100 text-red-800',
  HR_APPROVED: 'bg-green-100 text-green-800',
  HR_REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800'
};

const statusLabels = {
  PENDING: 'Pending Manager',
  MANAGER_APPROVED: 'Pending HR',
  MANAGER_REJECTED: 'Rejected by Manager',
  HR_APPROVED: 'Approved',
  HR_REJECTED: 'Rejected by HR',
  CANCELLED: 'Cancelled'
};

export default function OvertimeHistory() {
  const { data: overtimes, isLoading, error } = useQuery({
    queryKey: ['overtimes'],
    queryFn: async () => {
      const response = await api.get('/overtimes/my-overtimes');
      return response.data;
    }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        Failed to load overtime history: {error.message}
      </div>
    );
  }

  if (!overtimes || overtimes.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <p className="text-gray-600">No overtime submissions yet.</p>
        <p className="text-sm text-gray-500 mt-2">Submit your first overtime above!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Overtime History</h2>
      
      <div className="grid gap-4">
        {overtimes.map((overtime) => (
          <div key={overtime.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Week of {format(new Date(overtime.weekStartDate), 'MMM dd, yyyy')}
                </h3>
                <p className="text-sm text-gray-500">
                  {format(new Date(overtime.weekStartDate), 'MMM dd')} - {format(new Date(overtime.weekEndDate), 'MMM dd, yyyy')}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusColors[overtime.status]}`}>
                {statusLabels[overtime.status]}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-500">Total Hours</p>
                <p className="text-lg font-semibold text-gray-800">{overtime.totalHours.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Hourly Rate</p>
                <p className="text-lg font-semibold text-gray-800">
                  Rp {overtime.hourlyRate?.toLocaleString('id-ID')}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-500">Total Amount</p>
                <p className="text-xl font-bold text-blue-600">
                  Rp {overtime.totalAmount?.toLocaleString('id-ID')}
                </p>
              </div>
            </div>

            {/* Daily breakdown */}
            <div className="border-t pt-4 mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Daily Hours</p>
              <div className="grid grid-cols-7 gap-2">
                {[
                  { day: 'Mon', hours: overtime.mondayHours },
                  { day: 'Tue', hours: overtime.tuesdayHours },
                  { day: 'Wed', hours: overtime.wednesdayHours },
                  { day: 'Thu', hours: overtime.thursdayHours },
                  { day: 'Fri', hours: overtime.fridayHours },
                  { day: 'Sat', hours: overtime.saturdayHours },
                  { day: 'Sun', hours: overtime.sundayHours }
                ].map((item, index) => (
                  <div key={index} className="text-center">
                    <p className="text-xs text-gray-500">{item.day}</p>
                    <p className={`text-sm font-semibold ${item.hours > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                      {item.hours.toFixed(1)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Description */}
            {overtime.description && (
              <div className="border-t pt-4 mb-4">
                <p className="text-sm font-medium text-gray-700 mb-1">Description</p>
                <p className="text-sm text-gray-600">{overtime.description}</p>
              </div>
            )}

            {/* Approval info */}
            {overtime.managerApproval && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Approval History</p>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="text-gray-600">Manager:</span>
                    <span className="font-medium">{overtime.managerApproval.name}</span>
                    <span className="text-gray-500">
                      ({format(new Date(overtime.managerApprovedAt), 'MMM dd, yyyy')})
                    </span>
                  </div>
                  {overtime.managerNotes && (
                    <p className="text-sm text-gray-600 italic">"{overtime.managerNotes}"</p>
                  )}
                  
                  {overtime.hrApproval && (
                    <>
                      <div className="flex items-center space-x-2 text-sm">
                        <span className="text-gray-600">HR:</span>
                        <span className="font-medium">{overtime.hrApproval.name}</span>
                        <span className="text-gray-500">
                          ({format(new Date(overtime.hrApprovedAt), 'MMM dd, yyyy')})
                        </span>
                      </div>
                      {overtime.hrNotes && (
                        <p className="text-sm text-gray-600 italic">"{overtime.hrNotes}"</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Action buttons for pending items */}
            {overtime.status === 'PENDING' && (
              <div className="border-t pt-4 mt-4 flex space-x-3">
                <button
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  onClick={() => {/* TODO: Implement edit */}}
                >
                  Edit
                </button>
                <button
                  className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                  onClick={() => {/* TODO: Implement delete */}}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}