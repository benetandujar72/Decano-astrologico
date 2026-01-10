import React, { useState, useCallback, useRef } from 'react';
import { Search } from 'lucide-react';

interface HelpSearchBarProps {
  onSearch: (query: string) => void;
}

export default function HelpSearchBar({ onSearch }: HelpSearchBarProps) {
  const [query, setQuery] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Custom debounce to avoid lodash dependency
  const debouncedSearch = useCallback(
    (searchQuery: string) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        onSearch(searchQuery);
      }, 300);
    },
    [onSearch]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <Search className="w-5 h-5 text-slate-400" />
      </div>
      <input
        type="text"
        value={query}
        onChange={handleChange}
        placeholder="Buscar en la ayuda..."
        className="w-full pl-10 pr-10 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
      />
      {query && (
        <button
          onClick={handleClear}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
