import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import { ThemeProvider } from './contexts/ThemeContext';
import { UserPreferencesProvider } from './contexts/UserPreferencesContext';
import './App.css';

// Import your components as pages
import MangaSearch from './components/MangaSearch';
import MangaDetail from './components/MangaDetail';
import MangaReader from './components/MangaReader';
import EnhancedMangaReader from './components/EnhancedMangaReader';
import FavoritesPage from './components/FavoritesPage';

function App() {
  return (
    <ThemeProvider>
      <UserPreferencesProvider>
        <Router>
          <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
            <Header />
            <main className="flex-grow container mx-auto px-4 py-8">
              <Routes>
                <Route path="/" element={<MangaSearch />} />
                <Route path="/manga/:id" element={<MangaDetail />} />
                {/* Legacy chapter route */}
                <Route path="/chapter/:id" element={<MangaReader />} />
                {/* New enhanced manga reader route with both mangaId and chapterId */}
                <Route path="/manga/:mangaId/chapter/:chapterId" element={<EnhancedMangaReader />} />
                <Route path="/search" element={<MangaSearch />} />
                <Route path="/bookmarks" element={<FavoritesPage />} />
                <Route path="/about" element={<div className="p-4">About MangaVox</div>} />
                <Route path="*" element={<div className="p-4">Page not found</div>} />
              </Routes>
            </main>
            <footer className="bg-primary-700 dark:bg-primary-900 text-white p-4 text-center">
              <p>&copy; {new Date().getFullYear()} MangaVox. All rights reserved.</p>
            </footer>
          </div>
        </Router>
      </UserPreferencesProvider>
    </ThemeProvider>
  );
}

export default App;
