// frontend/src/pages/EntityGroupManagement.jsx
import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Users, Building2, History } from "lucide-react";
import apiClient from "../api/client";

export default function EntityGroupManagement() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/entity-groups");
      setGroups(res.data.data || []);
    } catch (error) {
      console.error("Fetch groups error:", error);
      alert(error.response?.data?.error || "Failed to fetch groups");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (group) => {
    setSelectedGroup(group);
    setShowEditModal(true);
  };

  const handleDelete = async (group) => {
    if (!confirm(`Delete group "${group.name}"?\n\nThis cannot be undone.`)) {
      return;
    }

    try {
      await apiClient.delete(`/entity-groups/${group.id}`);
      alert("Group deleted successfully");
      fetchGroups();
    } catch (error) {
      console.error("Delete error:", error);
      alert(error.response?.data?.error || "Failed to delete group");
    }
  };

  const handleViewAudit = (group) => {
    setSelectedGroup(group);
    setShowAuditModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Entity Groups</h1>
          <p className="text-sm text-gray-600 mt-1">
            Organize entities into groups for better management
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          New Group
        </button>
      </div>

      {/* Groups Grid */}
      {groups.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No groups yet
          </h3>
          <p className="text-gray-600 mb-4">
            Create your first entity group to get started
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Group
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onViewAudit={handleViewAudit}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateGroupModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchGroups();
          }}
        />
      )}

      {showEditModal && selectedGroup && (
        <EditGroupModal
          isOpen={showEditModal}
          group={selectedGroup}
          onClose={() => {
            setShowEditModal(false);
            setSelectedGroup(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedGroup(null);
            fetchGroups();
          }}
        />
      )}

      {showAuditModal && selectedGroup && (
        <AuditLogModal
          isOpen={showAuditModal}
          groupId={selectedGroup.id}
          groupName={selectedGroup.name}
          onClose={() => {
            setShowAuditModal(false);
            setSelectedGroup(null);
          }}
        />
      )}
    </div>
  );
}

// ============================================
// GROUP CARD COMPONENT
// ============================================

function GroupCard({ group, onEdit, onDelete, onViewAudit }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      {/* Color Bar */}
      <div
        className="h-2 rounded-t-lg"
        style={{ backgroundColor: group.color || "#3B82F6" }}
      />

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-gray-900">
                {group.name}
              </h3>
              {group.code && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded font-mono">
                  {group.code}
                </span>
              )}
            </div>
            {group.description && (
              <p className="text-sm text-gray-600 line-clamp-2">
                {group.description}
              </p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
          <div className="flex items-center gap-1">
            <Building2 className="w-4 h-4" />
            <span>{group._count?.companies || 0} entities</span>
          </div>
          {group.manager && (
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span className="truncate">{group.manager.name}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(group)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 text-gray-700 rounded hover:bg-gray-100"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={() => onViewAudit(group)}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 text-gray-700 rounded hover:bg-gray-100"
          >
            <History className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(group)}
            disabled={group._count?.companies > 0}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
            title={
              group._count?.companies > 0
                ? "Cannot delete group with entities"
                : "Delete group"
            }
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// CREATE GROUP MODAL
// ============================================

function CreateGroupModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    color: "#3B82F6",
    managerId: "",
  });
  const [loading, setLoading] = useState(false);
  const [managers, setManagers] = useState([]);

  useEffect(() => {
    fetchManagers();
  }, []);

  const fetchManagers = async () => {
    try {
      const res = await apiClient.get("/users", {
        params: { accessLevel: 2 },
      });
      setManagers(res.data.users || []);
    } catch (error) {
      console.error("Fetch managers error:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name) {
      alert("Group name is required");
      return;
    }

    try {
      setLoading(true);
      await apiClient.post("/entity-groups", {
        ...formData,
        managerId: formData.managerId || null,
      });
      alert("Group created successfully");
      onSuccess();
    } catch (error) {
      console.error("Create error:", error);
      alert(error.response?.data?.error || "Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-4">Create New Group</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Group Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Food & Beverage"
              required
            />
          </div>

          {/* Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Code (Optional)
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value.toUpperCase() })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., FNB"
              maxLength={10}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Brief description of this group"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Color
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={formData.color}
                onChange={(e) =>
                  setFormData({ ...formData, color: e.target.value })
                }
                className="h-10 w-20 rounded border border-gray-300"
              />
              <input
                type="text"
                value={formData.color}
                onChange={(e) =>
                  setFormData({ ...formData, color: e.target.value })
                }
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="#3B82F6"
              />
            </div>
          </div>

          {/* Manager */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Group Manager (Optional)
            </label>
            <select
              value={formData.managerId}
              onChange={(e) =>
                setFormData({ ...formData, managerId: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">No manager</option>
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.name} ({manager.email})
                </option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// EDIT GROUP MODAL
// ============================================

function EditGroupModal({ isOpen, group, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: group.name,
    code: group.code || "",
    description: group.description || "",
    color: group.color || "#3B82F6",
    managerId: group.managerId || "",
  });
  const [loading, setLoading] = useState(false);
  const [managers, setManagers] = useState([]);

  useEffect(() => {
    fetchManagers();
  }, []);

  const fetchManagers = async () => {
    try {
      const res = await apiClient.get("/users", {
        params: { accessLevel: 2 },
      });
      setManagers(res.data.users || []);
    } catch (error) {
      console.error("Fetch managers error:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      await apiClient.put(`/entity-groups/${group.id}`, {
        ...formData,
        managerId: formData.managerId || null,
      });
      alert("Group updated successfully");
      onSuccess();
    } catch (error) {
      console.error("Update error:", error);
      alert(error.response?.data?.error || "Failed to update group");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-4">Edit Group</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Same fields as CreateGroupModal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Group Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Code
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value.toUpperCase() })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              maxLength={10}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Color
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={formData.color}
                onChange={(e) =>
                  setFormData({ ...formData, color: e.target.value })
                }
                className="h-10 w-20 rounded border border-gray-300"
              />
              <input
                type="text"
                value={formData.color}
                onChange={(e) =>
                  setFormData({ ...formData, color: e.target.value })
                }
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Group Manager
            </label>
            <select
              value={formData.managerId}
              onChange={(e) =>
                setFormData({ ...formData, managerId: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">No manager</option>
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// AUDIT LOG MODAL
// ============================================

function AuditLogModal({ isOpen, groupId, groupName, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchAuditLog();
    }
  }, [isOpen, groupId]);

  const fetchAuditLog = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/entity-groups/${groupId}/audit`);
      setLogs(res.data.data || []);
    } catch (error) {
      console.error("Fetch audit log error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActionLabel = (action) => {
    const labels = {
      group_created: "Group Created",
      group_updated: "Group Updated",
      group_deleted: "Group Deleted",
      entity_added: "Entity Added",
      entity_removed: "Entity Removed",
      entity_moved: "Entity Moved",
    };
    return labels[action] || action;
  };

  const getActionColor = (action) => {
    const colors = {
      group_created: "bg-green-100 text-green-800",
      group_updated: "bg-blue-100 text-blue-800",
      group_deleted: "bg-red-100 text-red-800",
      entity_added: "bg-green-100 text-green-800",
      entity_removed: "bg-orange-100 text-orange-800",
      entity_moved: "bg-purple-100 text-purple-800",
    };
    return colors[action] || "bg-gray-100 text-gray-800";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Audit Log - {groupName}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No audit log entries
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="border-l-4 border-blue-500 pl-4 py-2"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action)}`}
                      >
                        {getActionLabel(log.action)}
                      </span>
                      {log.entity && (
                        <span className="ml-2 text-sm font-medium text-gray-900">
                          {log.entity.code} - {log.entity.name}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    by {log.user.name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
