import React, { useState } from 'react';
import { useUserPreferences } from '../contexts/UserPreferencesContext';

function TTSSettings() {
  const { ttsSettings, updateTTSSettings } = useUserPreferences();
  const [isOpen, setIsOpen] = useState(false);
  
  const handleSpeedChange = (e) => {
    updateTTSSettings({ speed: parseFloat(e.target.value) });
  };
  
  const handlePitchChange = (e) => {
    updateTTSSettings({ pitch: parseFloat(e.target.value) });
  };
  
  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-primary-600 hover:bg-primary-700 text-white px-3 py-1 rounded-md text-sm flex items-center"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 01.001-7.072m-2.829 9.9a9 9 0 01.001-12.728" />
        </svg>
        Voice Settings
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded shadow-lg p-4 z-10">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Speed
            </label>
            <input 
              type="range" 
              min="0.5" 
              max="2" 
              step="0.1" 
              value={ttsSettings.speed}
              onChange={handleSpeedChange}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>Slower</span>
              <span>{ttsSettings.speed}x</span>
              <span>Faster</span>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Pitch
            </label>
            <input 
              type="range" 
              min="0.5" 
              max="1.5" 
              step="0.1" 
              value={ttsSettings.pitch}
              onChange={handlePitchChange}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>Lower</span>
              <span>{ttsSettings.pitch}</span>
              <span>Higher</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TTSSettings;
