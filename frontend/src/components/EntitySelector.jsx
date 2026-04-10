import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import apiClient from "../api/client";

export default function EntitySelector({
  value,
  onChange,
  required = false,
  allowAll = false,
  placeholder = "Select Entity...",
  disabled = false,
  className = "",
}) {
  const { user } = useAuth();
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // ✅ FIX: Only fetch if user is loaded
    if (user && user.id) {
      fetchAccessibleEntities();
    }
  }, [user, retryCount]); // Re-fetch when user loads or retry clicked

  const fetchAccessibleEntities = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log(
        "[EntitySelector] Fetching entities for user:",
        user?.id,
        "Level:",
        user?.accessLevel,
      );

      // ✅ FIX: Different endpoints based on user level
      const endpoint =
        user?.accessLevel === 1
          ? "/plotting-companies" // Level 1: All entities
          : "/users/accessible-entities"; // Level 2: Scoped entities

      const res = await apiClient.get(endpoint);
      const data = res.data.data || [];

      console.log("[EntitySelector] Fetched entities:", data.length);

      setEntities(data);
    } catch (err) {
      console.error("[EntitySelector] Fetch error:", err);
      console.error("[EntitySelector] Error response:", err.response?.data);

      // ✅ FIX: Better error handling
      if (err.response?.status === 403) {
        setError("Access denied. Contact administrator.");
      } else if (err.response?.status === 401) {
        setError("Session expired. Please login again.");
      } else {
        setError("Failed to load entities");
      }

      setEntities([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1); // Trigger re-fetch via useEffect
  };

  // ✅ FIX: Show loading while user data is being fetched
  if (!user || !user.id) {
    return (
      <div className="text-sm text-gray-500 py-2">Loading user data...</div>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <div className="relative">
        <select
          disabled
          className={`bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 w-full ${className}`}
        >
          <option>Loading entities...</option>
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
          <svg
            className="animate-spin w-4 h-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start justify-between">
          <div className="flex items-start flex-1">
            <svg
              className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">{error}</p>
              <p className="text-xs text-red-600 mt-1">
                User Level: {user?.accessLevel} | Scope:{" "}
                {user?.scopeEntityIds?.length || 0}
              </p>
            </div>
          </div>
          <button
            onClick={handleRetry}
            className="ml-2 text-sm text-blue-600 hover:text-blue-700 font-medium underline flex-shrink-0"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show warning if no entities available
  if (entities.length === 0) {
    return (
      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start justify-between">
          <div className="flex items-start flex-1">
            <svg
              className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800">
                No entities available
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                {user?.accessLevel === 1
                  ? "No plotting companies exist in the system. Create one first."
                  : "You don't have access to any entities. Contact your administrator."}
              </p>
            </div>
          </div>
          <button
            onClick={handleRetry}
            className="ml-2 text-sm text-blue-600 hover:text-blue-700 font-medium underline flex-shrink-0"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <select
        value={value || ""}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none ${
          disabled ? "bg-gray-100 cursor-not-allowed" : "bg-white"
        } ${className}`}
      >
        <option value="">{placeholder}</option>

        {/* "All" option for filters */}
        {allowAll && <option value="all">All Entities</option>}

        {/* Entity options */}
        {entities.map((entity) => (
          <option key={entity.id} value={entity.id}>
            {entity.code ? `${entity.code} - ${entity.name}` : entity.name}
          </option>
        ))}
      </select>

      {/* Dropdown arrow */}
      <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
        <svg
          className="w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </div>
  );
}
