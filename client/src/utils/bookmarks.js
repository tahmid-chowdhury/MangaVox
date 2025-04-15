/**
 * Utility for managing bookmarks
 */

const BOOKMARKS_KEY = 'mangavox_bookmarks';

/**
 * Add a bookmark
 * @param {string} mangaId - The manga ID
 * @param {string} chapterId - The chapter ID
 * @param {number} pageIndex - The page index
 * @param {string} note - Optional note for the bookmark
 * @returns {string} ID of the created bookmark
 */
export const addBookmark = (mangaId, chapterId, pageIndex, note = '') => {
  try {
    const bookmarksData = localStorage.getItem(BOOKMARKS_KEY);
    const bookmarks = bookmarksData ? JSON.parse(bookmarksData) : [];
    
    const bookmarkId = `${Date.now()}`;
    const bookmark = {
      id: bookmarkId,
      mangaId,
      chapterId,
      pageIndex,
      note,
      createdAt: new Date().toISOString()
    };
    
    bookmarks.push(bookmark);
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
    
    return bookmarkId;
  } catch (error) {
    console.error('Error adding bookmark:', error);
    return null;
  }
};

/**
 * Get all bookmarks
 * @returns {Array} Array of bookmark objects
 */
export const getBookmarks = () => {
  try {
    const bookmarksData = localStorage.getItem(BOOKMARKS_KEY);
    return bookmarksData ? JSON.parse(bookmarksData) : [];
  } catch (error) {
    console.error('Error retrieving bookmarks:', error);
    return [];
  }
};

/**
 * Get bookmarks for a specific manga
 * @param {string} mangaId - The manga ID
 * @returns {Array} Array of bookmark objects for the manga
 */
export const getMangaBookmarks = (mangaId) => {
  try {
    const bookmarks = getBookmarks();
    return bookmarks.filter(bookmark => bookmark.mangaId === mangaId);
  } catch (error) {
    console.error('Error retrieving manga bookmarks:', error);
    return [];
  }
};

/**
 * Check if a specific page is bookmarked
 * @param {string} mangaId - The manga ID
 * @param {string} chapterId - The chapter ID
 * @param {number} pageIndex - The page index
 * @returns {boolean} True if the page is bookmarked
 */
export const isPageBookmarked = (mangaId, chapterId, pageIndex) => {
  try {
    const bookmarks = getBookmarks();
    return bookmarks.some(
      bookmark => 
        bookmark.mangaId === mangaId && 
        bookmark.chapterId === chapterId && 
        bookmark.pageIndex === pageIndex
    );
  } catch (error) {
    console.error('Error checking bookmark status:', error);
    return false;
  }
};

/**
 * Get bookmark for a specific page
 * @param {string} mangaId - The manga ID
 * @param {string} chapterId - The chapter ID
 * @param {number} pageIndex - The page index
 * @returns {Object|null} Bookmark object or null if not found
 */
export const getPageBookmark = (mangaId, chapterId, pageIndex) => {
  try {
    const bookmarks = getBookmarks();
    return bookmarks.find(
      bookmark => 
        bookmark.mangaId === mangaId && 
        bookmark.chapterId === chapterId && 
        bookmark.pageIndex === pageIndex
    ) || null;
  } catch (error) {
    console.error('Error getting page bookmark:', error);
    return null;
  }
};

/**
 * Remove a bookmark by ID
 * @param {string} bookmarkId - The bookmark ID to remove
 * @returns {boolean} True if successfully removed
 */
export const removeBookmark = (bookmarkId) => {
  try {
    const bookmarks = getBookmarks();
    const filteredBookmarks = bookmarks.filter(bookmark => bookmark.id !== bookmarkId);
    
    if (filteredBookmarks.length !== bookmarks.length) {
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(filteredBookmarks));
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error removing bookmark:', error);
    return false;
  }
};

/**
 * Remove all bookmarks for a manga
 * @param {string} mangaId - The manga ID
 * @returns {number} Number of bookmarks removed
 */
export const removeMangaBookmarks = (mangaId) => {
  try {
    const bookmarks = getBookmarks();
    const mangaBookmarks = bookmarks.filter(bookmark => bookmark.mangaId === mangaId);
    const remainingBookmarks = bookmarks.filter(bookmark => bookmark.mangaId !== mangaId);
    
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(remainingBookmarks));
    
    return mangaBookmarks.length;
  } catch (error) {
    console.error('Error removing manga bookmarks:', error);
    return 0;
  }
};

/**
 * Update a bookmark's note
 * @param {string} bookmarkId - The bookmark ID
 * @param {string} note - New note text
 * @returns {boolean} True if successfully updated
 */
export const updateBookmarkNote = (bookmarkId, note) => {
  try {
    const bookmarks = getBookmarks();
    const bookmarkIndex = bookmarks.findIndex(bookmark => bookmark.id === bookmarkId);
    
    if (bookmarkIndex !== -1) {
      bookmarks[bookmarkIndex].note = note;
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error updating bookmark note:', error);
    return false;
  }
};
