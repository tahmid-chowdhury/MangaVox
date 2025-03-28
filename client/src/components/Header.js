import React, { useState } from 'react';
import { Link } from 'react-router-dom';

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-purple-700 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <Link to="/" className="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
              <path d="M14 6a2 2 0 012-2h2a2 2 0 012 2v8a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" />
            </svg>
            <span className="text-white font-bold text-xl">MangaVox</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-6">
            <Link to="/" className="text-white hover:text-purple-200 transition-colors">
              Home
            </Link>
            <Link to="/search" className="text-white hover:text-purple-200 transition-colors">
              Browse
            </Link>
            <Link to="/favorites" className="text-white hover:text-purple-200 transition-colors">
              Favorites
            </Link>
            <Link to="/about" className="text-white hover:text-purple-200 transition-colors">
              About
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-white"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-purple-600">
            <Link to="/" className="block py-2 text-white hover:text-purple-200 transition-colors">
              Home
            </Link>
            <Link to="/search" className="block py-2 text-white hover:text-purple-200 transition-colors">
              Browse
            </Link>
            <Link to="/favorites" className="block py-2 text-white hover:text-purple-200 transition-colors">
              Favorites
            </Link>
            <Link to="/about" className="block py-2 text-white hover:text-purple-200 transition-colors">
              About
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
