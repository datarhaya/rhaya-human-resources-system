// frontend/src/components/GeneratePayslipModal.jsx
//
// NEW 2-step workflow: Preview → Confirm & Upload
//
// Import in PayslipManagement.jsx:
//   import GeneratePayslipModal from '../components/GeneratePayslipModal';
//
// Usage:
//   <GeneratePayslipModal
//     isOpen={showGenerateModal}
//     onClose={() => setShowGenerateModal(false)}
//     onSuccess={fetchData}
//   />

import { useState } from 'react';
import apiClient from '../api/client';

const MONTHS = [
  { value: 1,  label: 'January'   }, { value: 2,  label: 'February'  },
  { value: 3,  label: 'March'     }, { value: 4,  label: 'April'     },
  { value: 5,  label: 'May'       }, { value: 6,  label: 'June'      },
  { value: 7,  label: 'July'      }, { value: 8,  label: 'August'    },
  { value: 9,  label: 'September' }, { value: 10, label: 'October'   },
  { value: 11, label: 'November'  }, { value: 12, label: 'December'  },
];

export default function GeneratePayslipModal({ isOpen, onClose, onSuccess }) {
  const currentYear  = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [step, setStep] = useState(1); // 1 = upload, 1.5 = sheet select, 2 = preview, 3 = result

  const [form, setForm] = useState({
    year:  currentYear,
    month: currentMonth,
    payDate: '',
    file:  null,
    sendNotifications: true,
  });

  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Step 1.5: sheet selection
  const [sheetData, setSheetData] = useState(null); // { sheets: [], recommended: '' }
  const [selectedSheet, setSelectedSheet] = useState('');

  // Step 2: preview data
  const [previewData, setPreviewData] = useState(null); // { period, employees: [], failed: [] }
  const [employees, setEmployees] = useState([]); // editable list with `checked` property

  // Step 3: result
  const [uploadResult, setUploadResult] = useState(null);

  // PDF viewer
  const [viewingPdf, setViewingPdf] = useState(null); // { name, base64 }

  if (!isOpen) return null;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleFile = (file) => {
    if (!file) return;
    const validExt = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    if (!validExt) {
      alert('Please upload an .xlsx or .xls file');
      return;
    }
    setForm(f => ({ ...f, file }));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  // Step 1 → 1.5: Detect sheets
  const handleDetectSheets = async (e) => {
    e.preventDefault();
    if (!form.file) { alert('Please select an Excel file'); return; }

    setLoading(true);

    try {
      const fd = new FormData();
      fd.append('file', form.file);
      fd.append('month', form.month);

      const res = await apiClient.post('/payslips/detect-sheets', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSheetData(res.data.data);
      setSelectedSheet(res.data.data.recommended || res.data.data.sheets[0]);
      setStep(1.5);

    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message;
      alert(`Failed to read Excel file: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  // Step 1.5 → 2: Generate preview
  const handleGeneratePreview = async (e) => {
    e.preventDefault();
    if (!selectedSheet) { alert('Please select a sheet'); return; }

    setLoading(true);

    try {
      const fd = new FormData();
      fd.append('file', form.file);
      fd.append('sheetName', selectedSheet);
      fd.append('year', form.year);
      fd.append('month', form.month);
      if (form.payDate) fd.append('payDate', form.payDate);

      const res = await apiClient.post('/payslips/generate-preview', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setPreviewData(res.data.data);
      setEmployees(res.data.data.employees); // all checked by default
      setStep(2);

    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message;
      alert(`Preview failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  // Step 2 → 3: Confirm & upload
  const handleConfirmUpload = async () => {
    const selected = employees.filter(e => e.checked);
    if (selected.length === 0) {
      alert('Please select at least one employee');
      return;
    }

    setLoading(true);

    try {
      const res = await apiClient.post('/payslips/confirm-upload', {
        selectedEmployees: selected.map(e => ({
          employeeId: e.employeeId,
          pdfBase64:  e.pdfBase64,
          grossPay:   e.grossPay,
          netPay:     e.netPay,
        })),
        period: previewData.period,
        sendNotifications: form.sendNotifications,
      });

      setUploadResult(res.data);
      setStep(3);
      if (res.data.data?.summary?.uploaded > 0) onSuccess?.();

    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message;
      alert(`Upload failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setForm({
      year: currentYear, month: currentMonth,
      payDate: '', sendNotifications: true, file: null,
    });
    setSheetData(null);
    setSelectedSheet('');
    setPreviewData(null);
    setEmployees([]);
    setUploadResult(null);
    setViewingPdf(null);
    onClose();
  };

  const toggleEmployee = (employeeId) => {
    setEmployees(prev => prev.map(e =>
      e.employeeId === employeeId ? { ...e, checked: !e.checked } : e
    ));
  };

  const toggleAll = () => {
    const allChecked = employees.every(e => e.checked);
    setEmployees(prev => prev.map(e => ({ ...e, checked: !allChecked })));
  };

  const handleCustomFileUpload = async (employeeId, file) => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      alert('Only PDF files are allowed');
      return;
    }

    try {
      // Convert file to base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Replace the PDF in employees list
      setEmployees(prev => prev.map(e =>
        e.employeeId === employeeId
          ? { ...e, pdfBase64: base64, customFile: true }
          : e
      ));

      alert(`Custom file uploaded for ${employees.find(e => e.employeeId === employeeId)?.name}`);
    } catch (err) {
      alert('Failed to read file: ' + err.message);
    }
  };

  const previewPdf = (emp) => {
    setViewingPdf({ name: emp.name, base64: emp.pdfBase64, isCustom: emp.customFile });
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Main modal */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className={`bg-white rounded-xl shadow-2xl ${step === 2 ? 'w-full max-w-6xl' : 'w-full max-w-lg'} my-8`}>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50 rounded-t-xl">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                {step === 1 && 'Generate Payslips from Excel'}
                {step === 1.5 && 'Select Data Sheet'}
                {step === 2 && 'Preview & Confirm Payslips'}
                {step === 3 && 'Upload Complete'}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {step === 1 && 'Step 1: Upload payroll Excel file'}
                {step === 1.5 && 'Step 2: Choose which sheet contains payroll data'}
                {step === 2 && 'Step 3: Review, edit amounts, and confirm'}
                {step === 3 && 'All done!'}
              </p>
            </div>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
          </div>

          {/* Body */}
          <div className="px-6 py-5">

            {/* ── STEP 1: Upload Excel ──────────────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      value={form.year}
                      onChange={e => setForm(f => ({ ...f, year: parseInt(e.target.value) }))}
                      min={2020} max={2100}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Month <span className="text-red-500">*</span></label>
                    <select
                      value={form.month}
                      onChange={e => setForm(f => ({ ...f, month: parseInt(e.target.value) }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {MONTHS.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pay Date <span className="text-gray-400 font-normal">(optional — defaults to 28th)</span>
                  </label>
                  <input
                    type="date"
                    value={form.payDate}
                    onChange={e => setForm(f => ({ ...f, payDate: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payroll Excel File <span className="text-red-500">*</span>
                  </label>
                  <div
                    onDrop={handleDrop}
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onClick={() => document.getElementById('excel-file-input').click()}
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                      ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}
                    `}
                  >
                    <input
                      id="excel-file-input"
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={e => handleFile(e.target.files[0])}
                    />
                    {form.file ? (
                      <div className="flex items-center justify-center gap-2 text-green-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm font-medium">{form.file.name}</span>
                        <span className="text-xs text-gray-400">({(form.file.size / 1024).toFixed(1)} KB)</span>
                      </div>
                    ) : (
                      <>
                        <svg className="w-8 h-8 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-sm text-gray-500">Drop your Excel file here or <span className="text-blue-500 underline">browse</span></p>
                        <p className="text-xs text-gray-400 mt-1">.xlsx or .xls — Format sheet must have data from row 10</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 1.5: Sheet Selection ────────────────────────────────── */}
            {step === 1.5 && sheetData && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>{sheetData.sheets.length} sheet(s)</strong> found in your Excel file.
                    {sheetData.recommended && (
                      <> We recommend <strong>"{sheetData.recommended}"</strong> based on the current month.</>
                    )}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Sheet with Payroll Data <span className="text-red-500">*</span>
                  </label>
                  <div className="grid gap-2">
                    {sheetData.sheets.map(sheet => (
                      <label
                        key={sheet}
                        className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                          selectedSheet === sheet
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="sheet"
                          value={sheet}
                          checked={selectedSheet === sheet}
                          onChange={e => setSelectedSheet(e.target.value)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-800">{sheet}</div>
                          {sheet === sheetData.recommended && (
                            <div className="text-xs text-blue-600 mt-0.5">Recommended for this month</div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600">
                  <strong>Note:</strong> The selected sheet must have employee data starting at row 10,
                  with NIK in column E. See documentation for full format requirements.
                </div>
              </div>
            )}

            {/* ── STEP 2: Preview Table ─────────────────────────────────────── */}
            {step === 2 && previewData && (
              <div className="space-y-4">
                {/* Failed employees alert */}
                {previewData.failed.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm font-semibold text-yellow-800 mb-1">
                      ⚠️ {previewData.failed.length} employee(s) failed to generate
                    </p>
                    <ul className="text-xs text-yellow-700 space-y-0.5 max-h-20 overflow-y-auto">
                      {previewData.failed.map((f, i) => (
                        <li key={i}>• <strong>{f.name}</strong> {f.nik && `(${f.nik})`} — {f.reason}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Summary */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    <strong>{employees.filter(e => e.checked).length}</strong> of <strong>{employees.length}</strong> selected
                  </span>
                  <button onClick={toggleAll} className="text-blue-600 hover:text-blue-700 font-medium">
                    {employees.every(e => e.checked) ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                {/* Table */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr className="text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          <th className="px-3 py-2 w-10">
                            <input type="checkbox" checked={employees.every(e => e.checked)} onChange={toggleAll} className="rounded" />
                          </th>
                          <th className="px-3 py-2">Employee</th>
                          <th className="px-3 py-2">NIK</th>
                          <th className="px-3 py-2 text-right">Gross Pay</th>
                          <th className="px-3 py-2 text-right">Net Pay</th>
                          <th className="px-3 py-2 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {employees.map(emp => (
                          <tr key={emp.employeeId} className={emp.checked ? '' : 'bg-gray-50 opacity-60'}>
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={emp.checked}
                                onChange={() => toggleEmployee(emp.employeeId)}
                                className="rounded"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <div className="font-medium text-gray-800">{emp.name}</div>
                              <div className="text-xs text-gray-500">{emp.position}</div>
                              {emp.deductionWarning && (
                                <div className="text-xs text-red-600 mt-1 font-medium">
                                  {emp.deductionWarning}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2 text-gray-600">{emp.nik}</td>
                            <td className="px-3 py-2 text-right text-gray-700">
                              {emp.grossPayFormatted || `Rp ${emp.grossPay.toLocaleString('id-ID')}`}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-700">
                              {emp.netPayFormatted || `Rp ${emp.netPay.toLocaleString('id-ID')}`}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => previewPdf(emp)}
                                  className="text-blue-600 hover:text-blue-700 text-xs font-medium underline"
                                >
                                  Preview
                                </button>
                                <label className="text-green-600 hover:text-green-700 text-xs font-medium underline cursor-pointer">
                                  Replace
                                  <input
                                    type="file"
                                    accept=".pdf"
                                    className="hidden"
                                    onChange={(e) => handleCustomFileUpload(emp.employeeId, e.target.files[0])}
                                  />
                                </label>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Send notifications toggle */}
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <div
                    onClick={() => setForm(f => ({ ...f, sendNotifications: !f.sendNotifications }))}
                    className={`relative w-10 h-6 rounded-full transition-colors ${form.sendNotifications ? 'bg-blue-500' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.sendNotifications ? 'translate-x-4' : ''}`} />
                  </div>
                  <span className="text-sm text-gray-700">Send email notifications to employees</span>
                </label>
              </div>
            )}

            {/* ── STEP 3: Result ─────────────────────────────────────────────── */}
            {step === 3 && uploadResult && (
              <div className={`rounded-lg p-4 text-sm ${uploadResult.data.summary.failed > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
                <p className={`font-semibold mb-2 ${uploadResult.data.summary.failed > 0 ? 'text-yellow-800' : 'text-green-800'}`}>
                  {uploadResult.data.summary.failed > 0 ? '⚠️' : '✅'} {uploadResult.message}
                </p>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-white rounded p-2">
                    <div className="text-lg font-bold text-green-600">{uploadResult.data.summary.uploaded}</div>
                    <div className="text-xs text-gray-500">Uploaded</div>
                  </div>
                  <div className="bg-white rounded p-2">
                    <div className="text-lg font-bold text-red-500">{uploadResult.data.summary.failed}</div>
                    <div className="text-xs text-gray-500">Failed</div>
                  </div>
                </div>

                {uploadResult.data.failed.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-red-700 mb-1">Failed employees:</p>
                    <ul className="space-y-0.5 max-h-28 overflow-y-auto">
                      {uploadResult.data.failed.map((f, i) => (
                        <li key={i} className="text-xs text-red-600">
                          • <strong>{f.name}</strong> — {f.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
            {step === 1 && (
              <>
                <button onClick={handleClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                  Cancel
                </button>
                <button
                  onClick={handleDetectSheets}
                  disabled={loading || !form.file}
                  className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Reading...
                    </>
                  ) : (
                    'Next: Select Sheet'
                  )}
                </button>
              </>
            )}

            {step === 1.5 && (
              <>
                <button onClick={() => setStep(1)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                  Back
                </button>
                <button
                  onClick={handleGeneratePreview}
                  disabled={loading || !selectedSheet}
                  className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Generating...
                    </>
                  ) : (
                    'Generate Preview'
                  )}
                </button>
              </>
            )}

            {step === 2 && (
              <>
                <button onClick={() => setStep(1.5)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                  Back
                </button>
                <button
                  onClick={handleConfirmUpload}
                  disabled={loading || employees.filter(e => e.checked).length === 0}
                  className="px-5 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Uploading...
                    </>
                  ) : (
                    <>Confirm & Upload ({employees.filter(e => e.checked).length})</>
                  )}
                </button>
              </>
            )}

            {step === 3 && (
              <button onClick={handleClose} className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
                Done
              </button>
            )}
          </div>

        </div>
      </div>

      {/* PDF Viewer Modal */}
      {viewingPdf && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Preview: {viewingPdf.name}</h3>
                {viewingPdf.isCustom && (
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
                    Custom uploaded file
                  </span>
                )}
              </div>
              <button onClick={() => setViewingPdf(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">
                &times;
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                src={`data:application/pdf;base64,${viewingPdf.base64}`}
                className="w-full h-full"
                title="Payslip PDF Preview"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}