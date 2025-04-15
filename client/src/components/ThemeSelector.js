import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

function ThemeSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const { colorTheme, changeTheme } = useTheme();

  const themes = [
    { id: 'purple', name: 'Purple', color: '#a855f7' },
    { id: 'blue', name: 'Blue', color: '#3b82f6' },
    { id: 'green', name: 'Green', color: '#22c55e' },
    { id: 'red', name: 'Red', color: '#ef4444' },
    { id: 'orange', name: 'Orange', color: '#f97316' },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center text-white hover:text-gray-200 transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div 
          className="w-4 h-4 mr-2 rounded-full border border-white" 
          style={{ backgroundColor: themes.find(theme => theme.id === colorTheme)?.color }}
        ></div>
        <span className="hidden md:inline">Theme</span>
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50"
          role="menu"
          aria-orientation="vertical"
          tabIndex="-1"
        >
          <div className="py-1" role="none">
            {themes.map(theme => (
              <button
                key={theme.id}
                onClick={() => {
                  changeTheme(theme.id);
                  setIsOpen(false);
                }}
                className={`flex items-center px-4 py-2 text-sm w-full text-left
                  ${colorTheme === theme.id 
                    ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400' 
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'} 
                  transition-colors`}
                role="menuitem"
              >
                <div 
                  className="w-4 h-4 mr-2 rounded-full" 
                  style={{ backgroundColor: theme.color }}
                ></div>
                {theme.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Close the dropdown when clicking outside */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        ></div>
      )}
    </div>
  );
}

export default ThemeSelector;
