import { useState } from 'react';

interface FilterSidebarProps {
  filters: any;
  onFiltersChange: (filters: any) => void;
}

const roles = [
  'frontend', 'backend', 'fullstack', 'data', 'devops', 'qa', 'other'
];
const locations = ['Remote', 'New York', 'San Francisco', 'Seattle', 'Austin', 'Boston', 'London'];
const sourceTypes = ['PLATFORM', 'API', 'STATIC', 'DYNAMIC', 'UNKNOWN'];

const FilterSidebar = ({ filters, onFiltersChange }: FilterSidebarProps) => {
  const [localFilters, setLocalFilters] = useState({
    role: filters.role ?? [] as string[],
    location: filters.location ?? [] as string[],
    sourceType: filters.sourceType ?? [] as string[],
    sortBy: filters.sortBy ?? 'newest' as string,
    searchTerm: filters.searchTerm ?? '',
  });

  const handleToggle = (field: 'role' | 'location' | 'sourceType', value: string) => {
    setLocalFilters(prev => {
      const current = prev[field];
      const next = current.includes(value)
        ? current.filter((v: string) => v !== value)
        : [...current, value];
      return { ...prev, [field]: next };
    });
  };

  const handleApply = () => {
    onFiltersChange({
      ...filters,
      role: localFilters.role,
      location: localFilters.location,
      sourceType: localFilters.sourceType,
      sortBy: localFilters.sortBy,
      searchTerm: localFilters.searchTerm,
    });
  };

  const handleReset = () => {
    setLocalFilters({
      role: [],
      location: [],
      sourceType: [],
      sortBy: 'newest',
      searchTerm: '',
    });
    onFiltersChange({
      role: [],
      location: [],
      sourceType: [],
      sortBy: 'newest',
      searchTerm: '',
    });
  };

  return (
    <aside className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
          Filters
        </h3>
      </div>

      {/* Search */}
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
          Search
        </label>
        <input
          type="text"
          value={localFilters.searchTerm}
          onChange={(e) => setLocalFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
          placeholder="Job title..."
          className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Sort */}
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
          Sort By
        </label>
        <select
          value={localFilters.sortBy}
          onChange={(e) => setLocalFilters(prev => ({ ...prev, sortBy: e.target.value }))}
          className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="newest">Newest</option>
          <option value="recentlyUpdated">Recently Updated</option>
          <option value="confidence">Confidence</option>
        </select>
      </div>

      {/* Role */}
      <fieldset>
        <legend className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
          Role
        </legend>
        <div className="space-y-1">
          {roles.map((role) => (
            <label key={role} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={localFilters.role.includes(role)}
                onChange={() => handleToggle('role', role)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{role}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Location */}
      <fieldset>
        <legend className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
          Location
        </legend>
        <div className="space-y-1">
          {locations.map((loc) => (
            <label key={loc} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={localFilters.location.includes(loc)}
                onChange={() => handleToggle('location', loc)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{loc}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Source Type */}
      <fieldset>
        <legend className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
          Source Type
        </legend>
        <div className="space-y-1">
          {sourceTypes.map((st) => (
            <label key={st} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={localFilters.sourceType.includes(st)}
                onChange={() => handleToggle('sourceType', st)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{st}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Actions */}
      <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
        <button
          onClick={handleApply}
          className="w-full py-2 px-4 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
        >
          Apply Filters
        </button>
        <button
          onClick={handleReset}
          className="w-full py-2 px-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          Reset
        </button>
      </div>
    </aside>
  );
};

export default FilterSidebar;