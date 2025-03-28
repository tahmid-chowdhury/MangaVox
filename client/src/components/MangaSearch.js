import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { mangaAPI } from '../services/api';

function MangaSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const limit = 20;

  // Function to search manga
  const searchManga = async (query, resetResults = true) => {
    if (!query.trim()) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const currentOffset = resetResults ? 0 : offset;
      const data = await mangaAPI.search(query, limit, currentOffset);
      
      const results = resetResults ? data.data : [...searchResults, ...data.data];
      setSearchResults(results);
      setOffset(currentOffset + limit);
      setHasMore(data.total > currentOffset + limit);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle search form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    searchManga(searchQuery, true);
    setOffset(0);
  };

  // Load more results
  const loadMore = () => {
    searchManga(searchQuery, false);
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6 text-purple-600">Find Your Manga</h2>
      
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 p-3 border-2 border-purple-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
            placeholder="Search manga titles..."
            required
          />
          <button 
            type="submit" 
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-opacity-50"
            disabled={loading}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Error: {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {searchResults.map((manga) => {
          // Find cover art if available
          const coverArt = manga.relationships.find(rel => rel.type === 'cover_art');
          let coverUrl = '/placeholder-manga.jpg'; // Default placeholder
          
          if (coverArt && coverArt.attributes && coverArt.attributes.fileName) {
            coverUrl = `https://uploads.mangadex.org/covers/${manga.id}/${coverArt.attributes.fileName}.256.jpg`;
          }
          
          // Get title in English or first available language
          let title = 'Unknown Title';
          if (manga.attributes.title) {
            title = manga.attributes.title.en || Object.values(manga.attributes.title)[0];
          }
          
          return (
            <Link to={`/manga/${manga.id}`} key={manga.id}>
              <div className="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
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
                  <h3 className="font-bold text-lg mb-2 truncate">{title}</h3>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="bg-purple-100 text-purple-800 text-xs font-semibold rounded px-2 py-1">
                      {manga.attributes.status || 'Unknown'}
                    </span>
                    {manga.attributes.year && (
                      <span className="ml-2">{manga.attributes.year}</span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {searchResults.length > 0 && hasMore && (
        <div className="text-center mt-8">
          <button 
            onClick={loadMore} 
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-opacity-50"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}

      {searchResults.length === 0 && !loading && searchQuery && (
        <div className="text-center text-gray-600 py-8">
          No results found for "{searchQuery}".
        </div>
      )}
    </div>
  );
}

export default MangaSearch;
