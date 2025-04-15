import React, { useState, useEffect } from 'react';
import { addBookmark, isPageBookmarked, removeBookmark, getPageBookmark } from '../utils/bookmarks';

/**
 * Button component for toggling bookmark status
 */
function BookmarkButton({ mangaId, chapterId, pageIndex, className = "", size = "normal" }) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkId, setBookmarkId] = useState(null);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [note, setNote] = useState('');
  
  // Check if page is bookmarked on mount and when parameters change
  useEffect(() => {
    const checkBookmark = () => {
      const bookmarked = isPageBookmarked(mangaId, chapterId, pageIndex);
      setIsBookmarked(bookmarked);
      
      if (bookmarked) {
        const bookmark = getPageBookmark(mangaId, chapterId, pageIndex);
        if (bookmark) {
          setBookmarkId(bookmark.id);
          setNote(bookmark.note || '');
        }
      } else {
        setBookmarkId(null);
        setNote('');
      }
    };
    
    checkBookmark();
  }, [mangaId, chapterId, pageIndex]);
  
  // Handle bookmark toggle
  const handleToggleBookmark = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isBookmarked && bookmarkId) {
      // Remove bookmark
      const removed = removeBookmark(bookmarkId);
      if (removed) {
        setIsBookmarked(false);
        setBookmarkId(null);
        setNote('');
        setShowNoteInput(false);
      }
    } else {
      // If adding a new bookmark
      setShowNoteInput(true);
    }
  };
  
  // Handle saving a bookmark with note
  const handleSaveBookmark = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const newBookmarkId = addBookmark(mangaId, chapterId, pageIndex, note);
    if (newBookmarkId) {
      setIsBookmarked(true);
      setBookmarkId(newBookmarkId);
      setShowNoteInput(false);
    }
  };
  
  // Determine icon size classes
  const sizeClasses = size === 'small' 
    ? 'h-5 w-5' 
    : (size === 'large' ? 'h-8 w-8' : 'h-6 w-6');
  
  return (
    <div className="relative">
      <button 
        onClick={handleToggleBookmark}
        className={`text-primary-600 hover:text-primary-800 dark:text-primary-500 dark:hover:text-primary-400 ${className}`}
        aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
        title={isBookmarked ? "Remove bookmark" : "Add bookmark"}
      >
        {isBookmarked ? (
          <svg xmlns="http://www.w3.org/2000/svg" className={sizeClasses} viewBox="0 0 20 20" fill="currentColor">
            <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className={sizeClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        )}
      </button>
      
      {showNoteInput && (
        <div className="absolute z-10 mt-2 p-3 bg-white dark:bg-gray-800 rounded-md shadow-lg w-64 right-0">
          <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Add a note (optional):</h4>
          <textarea
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary-600 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows="3"
            placeholder="Your note here..."
          ></textarea>
          <div className="flex justify-end mt-2 gap-2">
            <button
              onClick={() => setShowNoteInput(false)}
              className="px-3 py-1 text-sm bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveBookmark}
              className="px-3 py-1 text-sm bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-600 text-white rounded transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default BookmarkButton;
