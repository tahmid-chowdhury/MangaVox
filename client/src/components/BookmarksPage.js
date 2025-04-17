import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getBookmarks, removeBookmark, updateBookmarkNote } from '../utils/bookmarks';
import { mangaAPI } from '../services/api';

function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState([]);
  const [mangaDetails, setMangaDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteText, setEditingNoteText] = useState('');
  
  useEffect(() => {
    const fetchBookmarksData = async () => {
      try {
        setLoading(true);
        
        // Get all bookmarks
        const userBookmarks = getBookmarks();
        
        if (userBookmarks.length === 0) {
          setBookmarks([]);
          setLoading(false);
          return;
        }
        
        // Get unique manga IDs from bookmarks
        const uniqueMangaIds = [...new Set(userBookmarks.map(bookmark => bookmark.mangaId))];
        
        // Fetch manga details for each unique manga
        const fetchedMangaDetails = {};
        await Promise.all(uniqueMangaIds.map(async (mangaId) => {
          try {
            const response = await mangaAPI.getDetails(mangaId);
            fetchedMangaDetails[mangaId] = response.data;
          } catch (err) {
            console.error(`Error fetching manga details for ${mangaId}:`, err);
          }
        }));
        
        // Set the manga details and bookmark
        setMangaDetails(fetchedMangaDetails);
        setBookmarks(userBookmarks);
      } catch (err) {
        console.error('Error fetching bookmarks:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchBookmarksData();
  }, []);
  
  // Group bookmarks by manga
  const bookmarksByManga = bookmarks.reduce((groups, bookmark) => {
    if (!groups[bookmark.mangaId]) {
      groups[bookmark.mangaId] = [];
    }
    groups[bookmark.mangaId].push(bookmark);
    return groups;
  }, {});
  
  // Delete a bookmark
  const handleDeleteBookmark = (bookmarkId) => {
    const removed = removeBookmark(bookmarkId);
    if (removed) {
      setBookmarks(current => current.filter(bookmark => bookmark.id !== bookmarkId));
    }
  };
  
  // Start editing a note
  const handleEditNote = (bookmarkId, currentNote) => {
    setEditingNoteId(bookmarkId);
    setEditingNoteText(currentNote || '');
  };
  
  // Save edited note
  const handleSaveNote = (bookmarkId) => {
    if (updateBookmarkNote(bookmarkId, editingNoteText)) {
      setBookmarks(current => current.map(bookmark => 
        bookmark.id === bookmarkId 
          ? {...bookmark, note: editingNoteText} 
          : bookmark
      ));
    }
    setEditingNoteId(null);
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6 text-primary-600 dark:text-primary-400">Your Bookmarks</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Error: {error}
        </div>
      )}

      {bookmarks.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md text-center transition-colors">
          <p className="text-gray-600 dark:text-gray-400 mb-4">You haven't added any bookmarks yet.</p>
          <Link to="/search" className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-6 rounded-lg transition-colors">
            Browse Manga
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(bookmarksByManga).map(([mangaId, mangaBookmarks]) => {
            const mangaData = mangaDetails[mangaId];
            if (!mangaData) return null;
            
            // Get manga title
            const title = mangaData.attributes.title.en || Object.values(mangaData.attributes.title)[0] || 'Unknown Title';
            
            // Get manga cover
            const coverArt = mangaData.relationships.find(rel => rel.type === 'cover_art');
            let coverUrl = '/placeholder-manga.jpg';
            if (coverArt?.attributes?.fileName) {
              coverUrl = `https://uploads.mangadex.org/covers/${mangaId}/${coverArt.attributes.fileName}.256.jpg`;
            }
            
            return (
              <div key={mangaId} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-colors">
                <div className="flex items-center p-4 border-b dark:border-gray-700">
                  <img 
                    src={coverUrl} 
                    alt={title}
                    className="w-16 h-20 object-cover mr-4"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/placeholder-manga.jpg';
                    }}
                  />
                  <div>
                    <Link to={`/manga/${mangaId}`} className="text-lg font-bold text-primary-600 dark:text-primary-400 hover:underline">
                      {title}
                    </Link>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {mangaBookmarks.length} bookmark{mangaBookmarks.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="space-y-4">
                    {mangaBookmarks.map(bookmark => {
                      // Try to get the chapter information
                      return (
                        <div key={bookmark.id} className="flex flex-col md:flex-row md:items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                          <div className="flex-grow">
                            <Link 
                              to={`/reader/${mangaId}/${bookmark.chapterId}?page=${bookmark.pageIndex}`}
                              className="text-primary-600 dark:text-primary-400 font-medium hover:underline"
                            >
                              Chapter: {bookmark.chapterId.substring(0, 8)}... • Page: {bookmark.pageIndex + 1}
                            </Link>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(bookmark.createdAt).toLocaleDateString()}
                            </p>
                            
                            {editingNoteId === bookmark.id ? (
                              <div className="mt-2">
                                <textarea
                                  value={editingNoteText}
                                  onChange={(e) => setEditingNoteText(e.target.value)}
                                  className="w-full p-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
                                  rows="2"
                                ></textarea>
                                <div className="flex gap-2 mt-1">
                                  <button 
                                    onClick={() => setEditingNoteId(null)}
                                    className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                                  >
                                    Cancel
                                  </button>
                                  <button 
                                    onClick={() => handleSaveNote(bookmark.id)}
                                    className="px-2 py-1 text-xs bg-primary-600 text-white rounded"
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="mt-1">
                                {bookmark.note ? (
                                  <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-2 rounded">
                                    {bookmark.note}
                                  </p>
                                ) : (
                                  <p className="text-xs italic text-gray-500">No note</p>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex gap-2 mt-2 md:mt-0">
                            {editingNoteId !== bookmark.id && (
                              <button
                                onClick={() => handleEditNote(bookmark.id, bookmark.note)}
                                className="p-1 text-gray-600 dark:text-gray-400 hover:text-primary-600"
                                title="Edit note"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteBookmark(bookmark.id)}
                              className="p-1 text-gray-600 dark:text-gray-400 hover:text-red-600"
                              title="Delete bookmark"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default BookmarksPage;
