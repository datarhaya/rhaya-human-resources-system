// frontend/src/pages/MyPayslips.jsx

import { useState, useEffect } from 'react';
import apiClient from '../api/client';

export default function MyPayslips() {
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPayslips();
  }, []);

  const fetchPayslips = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/payslips/my-payslips');
      setPayslips(res.data.data);
    } catch (error) {
      console.error('Fetch error:', error);
      alert('Failed to load payslips');
    } finally {
      setLoading(false);
    }
  };

  const downloadPayslip = async (payslipId, fileName) => {
    try {
      const res = await apiClient.get(`/payslips/${payslipId}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download payslip');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">My Payslips</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {payslips.map(p => (
          <div key={p.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold">
                  {new Date(p.year, p.month - 1).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long' 
                  })}
                </h3>
                <p className="text-sm text-gray-500">
                  Uploaded: {new Date(p.uploadedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <button
              onClick={() => downloadPayslip(p.id, p.fileName)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Download PDF
            </button>
          </div>
        ))}
      </div>

      {payslips.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500">No payslips available yet</p>
        </div>
      )}
    </div>
  );
}