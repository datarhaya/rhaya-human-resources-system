// frontend/src/components/EntityGroupSelector.jsx
import { useState, useEffect } from "react";
import { Building2, Users } from "lucide-react";
import apiClient from "../api/client";

export default function EntityGroupSelector({
  value = { entities: [], groups: [] },
  onChange,
}) {
  const [entities, setEntities] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedEntities, setSelectedEntities] = useState(
    value.entities || [],
  );
  const [selectedGroups, setSelectedGroups] = useState(value.groups || []);
  const [activeTab, setActiveTab] = useState("entities");

  useEffect(() => {
    fetchEntities();
    fetchGroups();
  }, []);

  useEffect(() => {
    setSelectedEntities(value.entities || []);
    setSelectedGroups(value.groups || []);
  }, [value]);

  const fetchEntities = async () => {
    try {
      const res = await apiClient.get("/plotting-companies");
      setEntities(res.data.data || []);
    } catch (error) {
      console.error("Fetch entities error:", error);
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await apiClient.get("/entity-groups");
      setGroups(res.data.data || []);
    } catch (error) {
      console.error("Fetch groups error:", error);
    }
  };

  const handleEntityToggle = (entityId) => {
    const newSelected = selectedEntities.includes(entityId)
      ? selectedEntities.filter((id) => id !== entityId)
      : [...selectedEntities, entityId];

    setSelectedEntities(newSelected);
    onChange({ entities: newSelected, groups: selectedGroups });
  };

  const handleGroupToggle = (groupId) => {
    const newSelected = selectedGroups.includes(groupId)
      ? selectedGroups.filter((id) => id !== groupId)
      : [...selectedGroups, groupId];

    setSelectedGroups(newSelected);
    onChange({ entities: selectedEntities, groups: newSelected });
  };

  const handleSelectAllEntities = () => {
    const allIds = entities.map((e) => e.id);
    setSelectedEntities(allIds);
    onChange({ entities: allIds, groups: selectedGroups });
  };

  const handleClearAllEntities = () => {
    setSelectedEntities([]);
    onChange({ entities: [], groups: selectedGroups });
  };

  const handleSelectAllGroups = () => {
    const allIds = groups.map((g) => g.id);
    setSelectedGroups(allIds);
    onChange({ entities: selectedEntities, groups: allIds });
  };

  const handleClearAllGroups = () => {
    setSelectedGroups([]);
    onChange({ entities: selectedEntities, groups: [] });
  };

  return (
    <div className="border border-gray-300 rounded-lg">
      {/* Tabs */}
      <div className="flex border-b border-gray-300">
        <button
          type="button"
          onClick={() => setActiveTab("entities")}
          className={`flex-1 px-4 py-3 text-sm font-medium ${
            activeTab === "entities"
              ? "bg-blue-50 text-blue-700 border-b-2 border-blue-700"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          <Building2 className="w-4 h-4 inline mr-2" />
          Individual Entities ({selectedEntities.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("groups")}
          className={`flex-1 px-4 py-3 text-sm font-medium ${
            activeTab === "groups"
              ? "bg-blue-50 text-blue-700 border-b-2 border-blue-700"
              : "text-gray-600 hover:bg-gray-50"
          }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Entity Groups ({selectedGroups.length})
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === "entities" ? (
          <div>
            {/* Actions */}
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={handleSelectAllEntities}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Select All
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={handleClearAllEntities}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear All
              </button>
            </div>

            {/* Entity List */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {entities.map((entity) => (
                <label
                  key={entity.id}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedEntities.includes(entity.id)}
                    onChange={() => handleEntityToggle(entity.id)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{entity.name}</div>
                    <div className="text-xs text-gray-500">{entity.code}</div>
                  </div>
                  {entity.group && (
                    <span
                      className="px-2 py-1 text-xs rounded"
                      style={{
                        backgroundColor: `${entity.group.color}20`,
                        color: entity.group.color,
                      }}
                    >
                      {entity.group.name}
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>
        ) : (
          <div>
            {/* Actions */}
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={handleSelectAllGroups}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Select All
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={handleClearAllGroups}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear All
              </button>
            </div>

            {/* Group List */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {groups.map((group) => (
                <label
                  key={group.id}
                  className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedGroups.includes(group.id)}
                    onChange={() => handleGroupToggle(group.id)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: group.color }}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{group.name}</div>
                    <div className="text-xs text-gray-500">
                      {group._count?.companies || 0} entities
                    </div>
                  </div>
                  {group.code && (
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded font-mono">
                      {group.code}
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      {(selectedEntities.length > 0 || selectedGroups.length > 0) && (
        <div className="border-t border-gray-300 p-3 bg-gray-50 text-sm">
          <div className="font-medium text-gray-700 mb-2">Scope Summary:</div>
          <div className="space-y-1 text-gray-600">
            {selectedEntities.length > 0 && (
              <div>• {selectedEntities.length} individual entities</div>
            )}
            {selectedGroups.length > 0 && (
              <div>• {selectedGroups.length} entity groups</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
