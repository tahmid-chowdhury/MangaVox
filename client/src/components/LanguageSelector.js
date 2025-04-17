import React, { useState } from 'react';
import PropTypes from 'prop-types';

/**
 * Language selector component for translating manga dialogue
 */
const LanguageSelector = ({ 
  selectedLanguage, 
  onSelectLanguage, 
  isTranslating,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Common languages for manga/comics
  const languages = [
    { code: 'en', name: 'English' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh', name: 'Chinese' },
    { code: 'fr', name: 'French' },
    { code: 'es', name: 'Spanish' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' }
  ];

  // Get selected language name
  const getSelectedName = () => {
    const lang = languages.find(l => l.code === selectedLanguage);
    return lang ? lang.name : 'Select Language';
  };

  // Handle language selection
  const handleSelect = (code) => {
    if (code !== selectedLanguage) {
      onSelectLanguage(code);
    }
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className || ''}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isTranslating}
        className={`flex items-center space-x-1 px-3 py-1 rounded-md bg-primary-600 hover:bg-primary-700 dark:bg-primary-800 dark:hover:bg-primary-700 text-white text-sm transition-colors ${
          isTranslating ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{getSelectedName()}</span>
        {isTranslating && (
          <svg className="animate-spin ml-1 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-20 py-1">
          {languages.map(lang => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                selectedLanguage === lang.code ? 'bg-purple-100 dark:bg-purple-900 font-medium' : ''
              }`}
            >
              {lang.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

LanguageSelector.propTypes = {
  selectedLanguage: PropTypes.string.isRequired,
  onSelectLanguage: PropTypes.func.isRequired,
  isTranslating: PropTypes.bool,
  className: PropTypes.string
};

export default LanguageSelector;
