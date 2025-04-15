import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getUpdatedManga } from '../utils/favorites';
import { mangaAPI } from '../services/api';

function RecentlyUpdated() {
  const [updatedManga, setUpdatedManga] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchUpdatedManga = async () => {
      try {
        setLoading(true);
        const updates = getUpdatedManga();
        
        // If no updates, don't bother with API calls
        if (updates.length === 0) {
          setUpdatedManga([]);
          setLoading(false);
          return;
        }
        
        // Fetch manga details for each updated manga
        const detailPromises = updates.map(update => 
          mangaAPI.getDetails(update.mangaId)
            .then(data => ({
              ...update,
              details: data.data
            }))
            .catch(() => null)
        );
        
        const mangaDetails = await Promise.all(detailPromises);
        setUpdatedManga(mangaDetails.filter(Boolean));
      } catch (error) {
        console.error('Error fetching updated manga:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUpdatedManga();
  }, []);
  
  if (loading) {
    return (
      <div className="animate-pulse p-6 bg-gray-100 dark:bg-gray-800 rounded-xl">
        <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div>
        </div>
      </div>
    );
  }
  
  if (updatedManga.length === 0) {
    return null; // Don't show section if no updates
  }
  
  return (
    <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-xl mb-8 transition-colors duration-200">
      <h2 className="text-xl font-bold text-purple-600 dark:text-purple-400 mb-4">Recently Updated</h2>
      
      <div className="space-y-4">
        {updatedManga.map(manga => {
          // Find cover art if available
          const coverArt = manga.details.relationships.find(rel => rel.type === 'cover_art');
          let coverUrl = '/placeholder-manga.jpg'; // Default placeholder
          
          if (coverArt && coverArt.attributes && coverArt.attributes.fileName) {
            coverUrl = `https://uploads.mangadex.org/covers/${manga.mangaId}/${coverArt.attributes.fileName}.256.jpg`;
          }
          
          // Get title in English or first available language
          let title = 'Unknown Title';
          if (manga.details.attributes.title) {
            title = manga.details.attributes.title.en || Object.values(manga.details.attributes.title)[0];
          }
          
          return (
            <div key={manga.mangaId} className="flex items-center bg-white dark:bg-gray-700 rounded-lg overflow-hidden shadow-md transition-colors duration-200">
              <img 
                src={coverUrl} 
                alt={title}
                className="w-16 h-20 object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/placeholder-manga.jpg';
                }}
              />
              <div className="p-4 flex-grow">
                <Link to={`/manga/${manga.mangaId}`} className="font-bold text-purple-600 dark:text-purple-400 hover:underline">
                  {title}
                </Link>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {manga.newChapters.length} new chapter{manga.newChapters.length !== 1 ? 's' : ''}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {manga.newChapters.slice(0, 3).map(chapter => (
                    <Link 
                      key={chapter.id} 
                      to={`/reader/${manga.mangaId}/${chapter.id}`}
                      className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
                    >
                      Ch. {chapter.attributes?.chapter || '?'}
                    </Link>
                  ))}
                  {manga.newChapters.length > 3 && (
                    <span className="text-xs bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-2 py-1 rounded">
                      +{manga.newChapters.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 text-center">
        <Link to="/favorites" className="text-purple-600 dark:text-purple-400 hover:underline text-sm">
          View all favorites →
        </Link>
      </div>
    </div>
  );
}

export default RecentlyUpdated;
