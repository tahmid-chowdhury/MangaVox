import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { mangaAPI } from '../services/api';
import { getFavorites } from '../utils/favorites';
import FavoriteButton from './FavoriteButton';

function FavoritesPage() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Get favorite manga IDs from localStorage
    const fetchFavorites = async () => {
      try {
        setLoading(true);
        const favoriteIds = getFavorites();
        
        if (favoriteIds.length === 0) {
          setFavorites([]);
          setLoading(false);
          return;
        }
        
        // Fetch each favorite manga's details
        const mangaPromises = favoriteIds.map(id => mangaAPI.getDetails(id));
        const mangaResults = await Promise.all(mangaPromises.map(p => p.catch(e => null)));
        
        // Filter out any failed requests
        const validManga = mangaResults
          .filter(result => result !== null)
          .map(result => result.data);
        
        setFavorites(validManga);
      } catch (err) {
        console.error('Error fetching favorites:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchFavorites();
  }, []);
  
  // Handle removal of a manga from favorites
  const handleFavoriteRemoved = (mangaId) => {
    setFavorites(currentFavorites => 
      currentFavorites.filter(manga => manga.id !== mangaId)
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 dark:bg-gray-900 transition-colors duration-200">
      <h2 className="text-2xl font-bold mb-6 text-primary-600 dark:text-primary-400">Your Favorite Manga</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 px-4 py-3 rounded mb-4">
          Error: {error}
        </div>
      )}

      {favorites.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md text-center transition-colors">
          <p className="text-gray-600 dark:text-gray-400 mb-4">You haven't added any manga to your favorites yet.</p>
          <Link to="/search" className="bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-600 text-white font-bold py-2 px-6 rounded-lg transition-colors">
            Browse Manga
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {favorites.map((manga) => {
            // Find cover art if available
            const coverArt = manga.relationships.find(rel => rel.type === 'cover_art');
            let coverUrl = '/placeholder-manga.jpg';
            
            if (coverArt && coverArt.attributes && coverArt.attributes.fileName) {
              coverUrl = `https://uploads.mangadex.org/covers/${manga.id}/${coverArt.attributes.fileName}.256.jpg`;
            }
            
            // Get title in English or first available language
            let title = 'Unknown Title';
            if (manga.attributes.title) {
              title = manga.attributes.title.en || Object.values(manga.attributes.title)[0];
            }
            
            return (
              <div key={manga.id} className="relative">
                <Link to={`/manga/${manga.id}`}>
                  <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <img 
                      src={coverUrl} 
                      alt={title}
                      className="w-full h-64 object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/placeholder-manga.jpg';
                      }}
                    />
                    <div className="p-4">
                      <h3 className="font-bold text-lg mb-2 truncate dark:text-gray-100">{title}</h3>
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <span className="bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300 text-xs font-semibold rounded px-2 py-1">
                          {manga.attributes.status || 'Unknown'}
                        </span>
                        {manga.attributes.year && (
                          <span className="ml-2">{manga.attributes.year}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
                <FavoriteButton 
                  mangaId={manga.id} 
                  className="absolute top-2 right-2 bg-white dark:bg-gray-800 rounded-full p-1 shadow-md"
                  size="small"
                  onToggle={() => handleFavoriteRemoved(manga.id)}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default FavoritesPage;
