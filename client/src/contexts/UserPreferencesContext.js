import React, { createContext, useState, useEffect, useContext } from 'react';

const UserPreferencesContext = createContext();

export function UserPreferencesProvider({ children }) {
  // Reading mode: 'page' (default) or 'longstrip'
  const [readingMode, setReadingMode] = useState(() => {
    const saved = localStorage.getItem('readingMode');
    return saved || 'page';
  });
  
  // TTS (Text-to-Speech) settings
  const [ttsSettings, setTtsSettings] = useState(() => {
    const saved = localStorage.getItem('ttsSettings');
    return saved ? JSON.parse(saved) : {
      speed: 1.0,
      pitch: 1.0,
      autoPlay: false,
      voicePreferences: {}
    };
  });
  
  // Update localStorage when preferences change
  useEffect(() => {
    localStorage.setItem('readingMode', readingMode);
  }, [readingMode]);
  
  useEffect(() => {
    localStorage.setItem('ttsSettings', JSON.stringify(ttsSettings));
  }, [ttsSettings]);
  
  const toggleReadingMode = () => {
    setReadingMode(prev => prev === 'page' ? 'longstrip' : 'page');
  };
  
  const updateTTSSettings = (newSettings) => {
    setTtsSettings(prev => ({
      ...prev,
      ...newSettings
    }));
  };
  
  return (
    <UserPreferencesContext.Provider value={{ 
      readingMode, 
      setReadingMode,
      toggleReadingMode,
      ttsSettings,
      updateTTSSettings
    }}>
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  return useContext(UserPreferencesContext);
}
