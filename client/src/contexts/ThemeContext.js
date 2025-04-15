import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(() => {
    // Get from localStorage or use system preference
    const savedMode = localStorage.getItem('darkMode');
    return savedMode !== null ? JSON.parse(savedMode) : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  
  const [colorTheme, setColorTheme] = useState(() => {
    return localStorage.getItem('colorTheme') || 'purple';
  });
  
  // Initialize WebSocket connection
  useEffect(() => {
    // Build WebSocket URL properly based on current host
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    
    // Connect to the correct WebSocket endpoint
    const ws = new WebSocket(`${protocol}//${host}/websocket`);
    
    // Set a reconnection mechanism
    let reconnectTimeout = null;
    const reconnect = () => {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = setTimeout(() => {
        console.log('Attempting to reconnect WebSocket...');
        setupWebSocket();
      }, 3000);
    };
    
    const setupWebSocket = () => {
      ws.onopen = () => {
        console.log('WebSocket connected');
        clearTimeout(reconnectTimeout);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle theme change message from server
          if (data.type === 'theme_change' && data.theme) {
            console.log('Theme change received:', data.theme);
            setColorTheme(data.theme);
            localStorage.setItem('colorTheme', data.theme);
            
            // Apply theme class to document
            document.documentElement.classList.remove('theme-purple', 'theme-blue', 'theme-green', 'theme-red', 'theme-orange');
            document.documentElement.classList.add(`theme-${data.theme}`);
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reconnect();
      };
      
      ws.onclose = (event) => {
        console.log(`WebSocket disconnected: ${event.code} - ${event.reason}`);
        reconnect();
      };
    };
    
    setupWebSocket();
    
    // Apply initial theme
    document.documentElement.classList.add(`theme-${colorTheme}`);
    
    // Clean up WebSocket on unmount
    return () => {
      clearTimeout(reconnectTimeout);
      if (ws) {
        ws.close();
      }
    };
  }, [colorTheme]); // Add colorTheme to the dependency array
  
  // Effect to handle dark mode changes
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);
  
  // Function to toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(prevMode => !prevMode);
  };
  
  // Function to change color theme
  const changeTheme = async (theme) => {
    // Save to localStorage
    localStorage.setItem('colorTheme', theme);
    setColorTheme(theme);
    
    // Apply theme immediately
    document.documentElement.classList.remove('theme-purple', 'theme-blue', 'theme-green', 'theme-red', 'theme-orange');
    document.documentElement.classList.add(`theme-${theme}`);
    
    // Send theme change to server to broadcast to other clients
    try {
      await fetch('/api/theme/change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ theme }),
      });
    } catch (error) {
      console.error('Error sending theme change to server:', error);
    }
  };
  
  const value = {
    darkMode,
    toggleDarkMode,
    colorTheme,
    changeTheme,
  };
  
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
