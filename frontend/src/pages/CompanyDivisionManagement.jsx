// frontend/src/pages/CompanyDivisionManagement.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import apiClient from "../api/client";
import { Users, X } from "lucide-react";

export default function CompanyDivisionManagement() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const hasCheckedAccess = useRef(false);

  // Tab state
  const [activeTab, setActiveTab] = useState("companies");

  // Data state
  const [plottingCompanies, setPlottingCompanies] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [entityGroups, setEntityGroups] = useState([]);
  const [selectedGroupFilter, setSelectedGroupFilter] = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [modalType, setModalType] = useState("company");
  const [selectedItem, setSelectedItem] = useState(null);

  // ✅ NEW: Employee list modal
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [employeeList, setEmployeeList] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [selectedCompanyName, setSelectedCompanyName] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    groupId: "",
  });

  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Access control
  useEffect(() => {
    if (hasCheckedAccess.current) return;
    if (loading) return;
    if (!user) {
      navigate("/login");
      return;
    }
    if (user.accessLevel > 2) {
      hasCheckedAccess.current = true;
      alert("Access denied. Only System Administrators can access this page.");
      navigate("/");
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
        apiClient.get("/plotting-companies"),
        apiClient.get("/divisions"),
      ]);
      setPlottingCompanies(companiesRes.data.data || []);
      setDivisions(divisionsRes.data.data || []);
    } catch (error) {
      console.error("Fetch error:", error);
      alert(
        "Failed to load data: " +
          (error.response?.data?.error || error.message),
      );
    } finally {
      setDataLoading(false);
    }
  };

  const fetchEntityGroups = async () => {
    try {
      const res = await apiClient.get("/entity-groups");
      setEntityGroups(res.data.data || []);
    } catch (error) {
      console.error("Fetch entity groups error:", error);
    }
  };

  useEffect(() => {
    fetchEntityGroups();
  }, []);

  // ✅ NEW: Fetch employees
  const fetchEmployees = async (companyId, companyName) => {
    try {
      setLoadingEmployees(true);
      setSelectedCompanyName(companyName);
      setShowEmployeeModal(true);

      console.log("🔍 Fetching employees for company ID:", companyId);

      const res = await apiClient.get("/users", {
        params: { plottingCompanyId: companyId },
      });

      console.log("📦 Full API Response:", res);
      console.log("📦 Response data:", res.data);

      // Try multiple response structures
      let employees = [];

      if (res.data.users) {
        employees = res.data.users;
        console.log("✅ Found employees in res.data.users");
      } else if (res.data.data) {
        employees = res.data.data;
        console.log("✅ Found employees in res.data.data");
      } else if (Array.isArray(res.data)) {
        employees = res.data;
        console.log("✅ Found employees in res.data (array)");
      }

      console.log("👥 Final employee list:", employees);
      console.log("👥 Employee count:", employees.length);

      if (employees.length === 0) {
        console.warn("⚠️ No employees found for this company");
      }

      setEmployeeList(employees);
    } catch (error) {
      console.error("❌ Fetch employees error:", error);
      console.error("❌ Error response:", error.response?.data);
      alert(
        "Failed to load employees: " +
          (error.response?.data?.error || error.message),
      );
    } finally {
      setLoadingEmployees(false);
    }
  };

  const resetForm = () => {
    setFormData({ code: "", name: "", description: "", groupId: "" });
    setSelectedItem(null);
  };

  const openCreateModal = (type) => {
    setModalType(type);
    setModalMode("create");
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (item, type) => {
    setModalType(type);
    setModalMode("edit");
    setSelectedItem(item);

    if (type === "company") {
      setFormData({
        code: item.code || "",
        name: item.name || "",
        description: item.description || "",
        groupId: item.groupId || "",
      });
    } else {
      setFormData({
        code: "",
        name: item.name || "",
        description: item.description || "",
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const endpoint =
        modalType === "company" ? "/plotting-companies" : "/divisions";

      if (modalMode === "create") {
        const payload =
          modalType === "company"
            ? {
                code: formData.code.toUpperCase(),
                name: formData.name,
                description: formData.description,
                groupId: formData.groupId || null,
              }
            : { name: formData.name, description: formData.description };

        await apiClient.post(`${endpoint}/create`, payload);
        alert(
          `${modalType === "company" ? "Plotting Company" : "Division"} created successfully!`,
        );
      } else {
        const payload =
          modalType === "company"
            ? {
                code: formData.code.toUpperCase(),
                name: formData.name,
                description: formData.description,
                groupId: formData.groupId || null,
              }
            : { name: formData.name, description: formData.description };

        await apiClient.put(`${endpoint}/${selectedItem.id}`, payload);
        alert(
          `${modalType === "company" ? "Plotting Company" : "Division"} updated successfully!`,
        );
      }

      setShowModal(false);
      fetchData();
      resetForm();
    } catch (error) {
      console.error("Submit error:", error);
      alert(error.response?.data?.error || "Failed to save");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (item, type) => {
    const itemName =
      type === "company" ? `${item.code} - ${item.name}` : item.name;

    if (
      !confirm(
        `Are you sure you want to ${type === "company" ? "deactivate" : "delete"} "${itemName}"?`,
      )
    ) {
      return;
    }

    try {
      const endpoint =
        type === "company" ? "/plotting-companies" : "/divisions";
      await apiClient.delete(`${endpoint}/${item.id}`);
      alert(
        `${type === "company" ? "Plotting Company deactivated" : "Division deleted"} successfully!`,
      );
      fetchData();
    } catch (error) {
      console.error("Delete error:", error);
      alert(error.response?.data?.error || "Failed to delete");
    }
  };

  const filteredCompanies = plottingCompanies.filter((entity) => {
    const matchesSearch =
      entity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entity.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup =
      !selectedGroupFilter || entity.groupId === selectedGroupFilter;
    return matchesSearch && matchesGroup;
  });

  const filteredDivisions = divisions.filter((division) =>
    division.name.toLowerCase().includes(searchTerm.toLowerCase()),
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
          <h1 className="text-3xl font-bold text-gray-900">
            Company & Division Management
          </h1>
          <p className="text-gray-600 mt-2">
            Manage plotting companies and divisions
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab("companies")}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === "companies"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Plotting Companies ({plottingCompanies.length})
              </button>
              <button
                onClick={() => setActiveTab("divisions")}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === "divisions"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Divisions ({divisions.length})
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Search and Add */}
            <div className="flex justify-between items-center mb-6">
              <input
                type="text"
                placeholder={`Search ${activeTab === "companies" ? "companies" : "divisions"}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() =>
                  openCreateModal(
                    activeTab === "companies" ? "company" : "division",
                  )
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                + Add {activeTab === "companies" ? "Company" : "Division"}
              </button>
            </div>

            {/* Companies Table */}
            {activeTab === "companies" && (
              <div className="overflow-x-auto">
                {/* Group Filter */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by Group
                  </label>
                  <select
                    value={selectedGroupFilter}
                    onChange={(e) => setSelectedGroupFilter(e.target.value)}
                    className="w-64 px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">All Groups</option>
                    {entityGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>

                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        GROUP
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Company Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Employees
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredCompanies.length === 0 ? (
                      <tr>
                        <td
                          colSpan="6"
                          className="px-6 py-8 text-center text-gray-500"
                        >
                          No companies found
                        </td>
                      </tr>
                    ) : (
                      filteredCompanies.map((company) => (
                        <tr key={company.id} className="hover:bg-gray-50">
                          {/* Group */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            {company.group ? (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium"
                                style={{
                                  backgroundColor: `${company.group.color}20`,
                                  color: company.group.color,
                                }}
                              >
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{
                                    backgroundColor: company.group.color,
                                  }}
                                />
                                {company.group.code}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">
                                No group
                              </span>
                            )}
                          </td>
                          {/* Code */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              {company.code}
                            </span>
                          </td>
                          {/* Name */}
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {company.name}
                            </div>
                          </td>
                          {/* Description */}
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-500">
                              {company.description || "-"}
                            </div>
                          </td>
                          {/* Employees - Clickable */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            {company._count?.users > 0 ? (
                              <button
                                onClick={() =>
                                  fetchEmployees(company.id, company.name)
                                }
                                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                <Users className="w-4 h-4" />
                                <span className="font-medium">
                                  {company._count.users}
                                </span>
                              </button>
                            ) : (
                              <span className="text-sm text-gray-400">0</span>
                            )}
                          </td>
                          {/* Actions */}
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => openEditModal(company, "company")}
                              className="text-blue-600 hover:text-blue-800 mr-4"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(company, "company")}
                              className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                              disabled={company._count?.users > 0}
                              title={
                                company._count?.users > 0
                                  ? "Cannot deactivate company with employees"
                                  : ""
                              }
                            >
                              Deactivate
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
            {activeTab === "divisions" && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Division Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Employees
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredDivisions.length === 0 ? (
                      <tr>
                        <td
                          colSpan="4"
                          className="px-6 py-8 text-center text-gray-500"
                        >
                          No divisions found
                        </td>
                      </tr>
                    ) : (
                      filteredDivisions.map((division) => (
                        <tr key={division.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {division.name}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-500">
                              {division.description || "-"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-900">
                              {division._count?.users || 0}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() =>
                                openEditModal(division, "division")
                              }
                              className="text-blue-600 hover:text-blue-800 mr-4"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(division, "division")}
                              className="text-red-600 hover:text-red-800 disabled:opacity-50"
                              disabled={division._count?.users > 0}
                              title={
                                division._count?.users > 0
                                  ? "Cannot delete division with employees"
                                  : ""
                              }
                            >
                              Delete
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">
              {modalMode === "create" ? "Create" : "Edit"}{" "}
              {modalType === "company" ? "Plotting Company" : "Division"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {modalType === "company" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Code *
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        code: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                    placeholder="e.g., KGI"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {modalType === "company" ? "Company" : "Division"} Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {modalType === "company" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Entity Group
                  </label>
                  <select
                    value={formData.groupId}
                    onChange={(e) =>
                      setFormData({ ...formData, groupId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No Group</option>
                    {entityGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name} {group.code && `(${group.code})`}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Optional: Assign to a group
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? "Saving..."
                    : modalMode === "create"
                      ? "Create"
                      : "Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee List Modal */}
      {showEmployeeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Employee List
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedCompanyName}
                </p>
              </div>
              <button
                onClick={() => setShowEmployeeModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {loadingEmployees ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : employeeList.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No employees found
                </div>
              ) : (
                <div className="space-y-2">
                  {employeeList.map((employee, index) => (
                    <div
                      key={employee.id}
                      className="flex items-center gap-3 p-2.5 hover:bg-gray-50 rounded-lg border border-gray-100 transition-colors"
                    >
                      {/* Number */}
                      <div className="text-xs font-medium text-gray-400 w-6">
                        {index + 1}.
                      </div>

                      {/* Employee Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-gray-900">
                            {employee.name}
                          </span>
                          {employee.nip && (
                            <span className="text-xs text-gray-400">
                              ({employee.nip})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                          <span>{employee.email}</span>
                          {employee.supervisor && (
                            <>
                              <span className="text-gray-300">•</span>
                              <span className="flex items-center gap-1">
                                <svg
                                  className="w-3 h-3"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                  />
                                </svg>
                                {employee.supervisor.name}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-1.5">
                        {/* Division */}
                        {employee.division && (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded font-medium">
                            {employee.division.name}
                          </span>
                        )}

                        {/* Access Level */}
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded ${
                            employee.accessLevel === 1
                              ? "bg-purple-100 text-purple-800"
                              : employee.accessLevel === 2
                                ? "bg-blue-100 text-blue-800"
                                : employee.accessLevel === 3
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          L{employee.accessLevel}
                        </span>

                        {/* View Details Button */}
                        <button
                          onClick={() => {
                            setShowEmployeeModal(false);
                            // Navigate to user detail page
                            navigate(`/users/${employee.id}`);
                          }}
                          className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded border border-blue-200 hover:border-blue-300 transition-colors"
                          title="View employee details"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Total:{" "}
                  <span className="font-medium">{employeeList.length}</span>{" "}
                  employees
                </div>
                <button
                  onClick={() => setShowEmployeeModal(false)}
                  className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
