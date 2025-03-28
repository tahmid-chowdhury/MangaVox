import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { mangaAPI } from '../services/api';
import FavoriteButton from './FavoriteButton';

function MangaDetail() {
  const { id } = useParams();
  const [manga, setManga] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [availableLanguages, setAvailableLanguages] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get manga details
        const mangaData = await mangaAPI.getDetails(id);
        setManga(mangaData.data);
        
        // Get available languages
        if (mangaData.data.attributes.availableTranslatedLanguages) {
          setAvailableLanguages(mangaData.data.attributes.availableTranslatedLanguages);
          
          // Set default language (prefer English if available)
          if (!mangaData.data.attributes.availableTranslatedLanguages.includes('en')) {
            setSelectedLanguage(mangaData.data.attributes.availableTranslatedLanguages[0]);
          }
        }
        
        // Get chapters
        await fetchChapters(id, selectedLanguage);
        
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [id]);
  
  // Fetch chapters when language changes
  useEffect(() => {
    if (manga) {
      fetchChapters(id, selectedLanguage);
    }
  }, [selectedLanguage, id]);
  
  const fetchChapters = async (mangaId, language) => {
    try {
      const chaptersData = await mangaAPI.getChapters(mangaId, language);
      
      // Sort chapters by volume and chapter number
      const sortedChapters = chaptersData.data.sort((a, b) => {
        const volA = a.attributes.volume ? parseFloat(a.attributes.volume) : 0;
        const volB = b.attributes.volume ? parseFloat(b.attributes.volume) : 0;
        
        if (volA !== volB) return volA - volB;
        
        const chA = a.attributes.chapter ? parseFloat(a.attributes.chapter) : 0;
        const chB = b.attributes.chapter ? parseFloat(b.attributes.chapter) : 0;
        
        return chA - chB;
      });
      
      setChapters(sortedChapters);
    } catch (err) {
      console.error('Error fetching chapters:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Error: {error}
        </div>
        <Link to="/" className="text-purple-600 hover:text-purple-800">
          Return to Home
        </Link>
      </div>
    );
  }

  if (!manga) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          Manga not found
        </div>
        <Link to="/" className="text-purple-600 hover:text-purple-800">
          Return to Home
        </Link>
      </div>
    );
  }

  // Find cover art if available
  const coverArt = manga.relationships.find(rel => rel.type === 'cover_art');
  let coverUrl = '/placeholder-manga.jpg'; // Default placeholder
  
  if (coverArt && coverArt.attributes && coverArt.attributes.fileName) {
    coverUrl = `https://uploads.mangadex.org/covers/${manga.id}/${coverArt.attributes.fileName}.512.jpg`;
  }
  
  // Get title in English or first available language
  const title = manga.attributes.title.en || Object.values(manga.attributes.title)[0];
  
  // Get description
  let description = 'No description available.';
  if (manga.attributes.description) {
    description = manga.attributes.description.en || Object.values(manga.attributes.description)[0] || description;
  }
  
  // Group chapters by volume
  const chaptersByVolume = chapters.reduce((acc, chapter) => {
    const volume = chapter.attributes.volume || 'No Volume';
    if (!acc[volume]) {
      acc[volume] = [];
    }
    acc[volume].push(chapter);
    return acc;
  }, {});

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
        <div className="md:flex">
          <div className="md:w-1/3 lg:w-1/4">
            <img 
              src={coverUrl} 
              alt={title}
              className="w-full h-auto"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/placeholder-manga.jpg';
              }}
            />
          </div>
          <div className="p-6 md:w-2/3 lg:w-3/4">
            <div className="flex justify-between items-start">
              <h1 className="text-3xl font-bold text-purple-600 mb-2">{title}</h1>
              <FavoriteButton mangaId={manga.id} size="large" />
            </div>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {manga.attributes.tags.map(tag => (
                <span 
                  key={tag.id} 
                  className="bg-purple-100 text-purple-800 text-xs font-semibold rounded px-2 py-1"
                >
                  {tag.attributes.name.en || Object.values(tag.attributes.name)[0]}
                </span>
              ))}
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <h3 className="font-semibold text-gray-700">Status</h3>
                <p className="capitalize">{manga.attributes.status}</p>
              </div>
              
              {manga.attributes.year && (
                <div>
                  <h3 className="font-semibold text-gray-700">Year</h3>
                  <p>{manga.attributes.year}</p>
                </div>
              )}
              
              <div>
                <h3 className="font-semibold text-gray-700">Content Rating</h3>
                <p className="capitalize">{manga.attributes.contentRating}</p>
              </div>
            </div>
            
            <div className="mb-6">
              <h3 className="font-semibold text-gray-700 mb-2">Description</h3>
              <div className="text-gray-600 max-h-40 overflow-y-auto">
                {description.split('\n').map((paragraph, index) => (
                  paragraph ? <p key={index} className="mb-2">{paragraph}</p> : null
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-purple-600">Chapters</h2>
          
          {availableLanguages.length > 0 && (
            <div>
              <label htmlFor="language-select" className="mr-2 text-gray-700">Language:</label>
              <select
                id="language-select"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="border rounded p-2 focus:outline-none focus:ring-2 focus:ring-purple-600"
              >
                {availableLanguages.map(lang => (
                  <option key={lang} value={lang}>
                    {new Intl.DisplayNames(['en'], { type: 'language' }).of(lang)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        
        {chapters.length === 0 ? (
          <p className="text-gray-500">No chapters available in this language.</p>
        ) : (
          Object.keys(chaptersByVolume).sort((a, b) => {
            // Sort volumes numerically, with "No Volume" at the end
            if (a === 'No Volume') return 1;
            if (b === 'No Volume') return -1;
            return parseFloat(a) - parseFloat(b);
          }).map(volume => (
            <div key={volume} className="mb-6">
              <h3 className="text-lg font-semibold mb-3 border-b pb-2">
                {volume === 'No Volume' ? 'Chapters' : `Volume ${volume}`}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {chaptersByVolume[volume].map(chapter => (
                  <Link 
                    to={`/reader/${manga.id}/${chapter.id}`} 
                    key={chapter.id}
                    className="flex items-center p-3 border rounded hover:bg-purple-50 transition-colors"
                  >
                    <div className="flex-1">
                      <span className="font-medium">
                        Ch. {chapter.attributes.chapter || 'N/A'}
                      </span>
                      {chapter.attributes.title && (
                        <p className="text-sm text-gray-600 truncate">
                          {chapter.attributes.title}
                        </p>
                      )}
                    </div>
                    <div className="text-purple-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default MangaDetail;
