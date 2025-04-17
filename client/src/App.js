import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './components/HomePage';
import MangaDetail from './components/MangaDetail';
import MangaSearch from './components/MangaSearch';
import Reader from './components/Reader';
import FavoritesPage from './components/FavoritesPage';
import NotFound from './components/NotFound';
import { ThemeProvider } from './contexts/ThemeContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { UserPreferencesProvider } from './contexts/UserPreferencesContext';

function App() {
  return (
    <Router>
      <WebSocketProvider>
        <ThemeProvider>
          <UserPreferencesProvider>
            <LanguageProvider>
              <div className="flex flex-col min-h-screen dark:bg-gray-900 transition-colors duration-200">
                <Header />
                <main className="flex-grow">
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/search" element={<MangaSearch />} />
                    <Route path="/manga/:mangaId" element={<MangaDetail />} />
                    <Route path="/reader/:mangaId/:chapterId" element={<Reader />} />
                    <Route path="/favorites" element={<FavoritesPage />} />
                    <Route path="/404" element={<NotFound />} />
                    <Route path="*" element={<Navigate to="/404" />} />
                  </Routes>
                </main>
                <Footer />
              </div>
            </LanguageProvider>
          </UserPreferencesProvider>
        </ThemeProvider>
      </WebSocketProvider>
    </Router>
  );
}

export default App;
