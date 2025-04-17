import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import ThemeSelector from './ThemeSelector';

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { darkMode, toggleDarkMode } = useTheme();

  return (
    <header className="bg-primary-700 dark:bg-primary-900 shadow-lg transition-colors duration-200">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <Link to="/" className="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              <path d="M14 6a2 2 0 012-2h1a2 2 0 012 2v8a2 2 0 01-2 2h-1a2 2 0 01-2-2V6z" />
            </svg>
            <span className="text-xl font-bold text-white">MangaVox</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/search" className="text-white hover:text-gray-200 transition-colors">
              Search
            </Link>
            <Link to="/bookmarks" className="text-white hover:text-gray-200 transition-colors">
              Bookmarks
            </Link>
            <Link to="/about" className="text-white hover:text-gray-200 transition-colors">
              About
            </Link>
            
            {/* Theme Selector */}
            <ThemeSelector />
            
            {/* Dark Mode Toggle */}
            <button 
              onClick={toggleDarkMode}
              className="text-white hover:text-gray-200 transition-colors"
              aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {darkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-white hover:text-gray-200 focus:outline-none focus:text-gray-200"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 space-y-2 border-t border-primary-600 dark:border-primary-800">
            <Link to="/search" className="block py-2 text-white hover:text-gray-200 transition-colors">
              Search
            </Link>
            <Link to="/bookmarks" className="block py-2 text-white hover:text-gray-200 transition-colors">
              Bookmarks
            </Link>
            <Link to="/about" className="block py-2 text-white hover:text-gray-200 transition-colors">
              About
            </Link>
            
            {/* Theme Selector */}
            <div className="py-2">
              <ThemeSelector />
            </div>
            
            {/* Dark Mode Toggle */}
            <button 
              onClick={toggleDarkMode}
              className="flex items-center py-2 text-white hover:text-gray-200 transition-colors w-full"
            >
              {darkMode ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Light Mode
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                  Dark Mode
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
