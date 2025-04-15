/**
 * Utility functions for managing favorite manga
 */

// Keys for localStorage
const FAVORITES_KEY = 'mangavox_favorites';
const CHAPTERS_READ_KEY = 'mangavox_chapters_read';
const LATEST_CHAPTERS_KEY = 'mangavox_latest_chapters';

/**
 * Get all favorite manga IDs
 * @returns {Array} Array of manga IDs
 */
export const getFavorites = () => {
  try {
    const favorites = localStorage.getItem(FAVORITES_KEY);
    return favorites ? JSON.parse(favorites) : [];
  } catch (error) {
    console.error('Error retrieving favorites:', error);
    return [];
  }
};

/**
 * Check if a manga is in favorites
 * @param {string} mangaId - The manga ID to check
 * @returns {boolean} True if manga is favorited
 */
export const isFavorite = (mangaId) => {
  const favorites = getFavorites();
  return favorites.includes(mangaId);
};

/**
 * Toggle favorite status for a manga
 * @param {string} mangaId - The manga ID
 * @returns {boolean} New favorite status
 */
export const toggleFavorite = (mangaId) => {
  const favorites = getFavorites();
  const isCurrentlyFavorite = favorites.includes(mangaId);
  
  let newFavorites;
  if (isCurrentlyFavorite) {
    // Remove from favorites if already in list
    newFavorites = favorites.filter(id => id !== mangaId);
  } else {
    // Add to favorites if not in list
    newFavorites = [...favorites, mangaId];
  }
  
  // Save updated favorites
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
    return !isCurrentlyFavorite; // Return new status
  } catch (error) {
    console.error('Error saving favorites:', error);
    return isCurrentlyFavorite; // Return original status on error
  }
};

/**
 * Mark a chapter as read
 * @param {string} mangaId - The manga ID
 * @param {string} chapterId - The chapter ID
 * @param {object} chapterInfo - Chapter information (number, title, etc)
 */
export const markChapterAsRead = (mangaId, chapterId, chapterInfo = {}) => {
  try {
    // Get currently read chapters
    const readChaptersJson = localStorage.getItem(CHAPTERS_READ_KEY);
    const readChapters = readChaptersJson ? JSON.parse(readChaptersJson) : {};
    
    // Initialize the manga entry if it doesn't exist
    if (!readChapters[mangaId]) {
      readChapters[mangaId] = {};
    }
    
    // Add the chapter with timestamp
    readChapters[mangaId][chapterId] = {
      ...chapterInfo,
      readAt: new Date().toISOString()
    };
    
    // Save back to localStorage
    localStorage.setItem(CHAPTERS_READ_KEY, JSON.stringify(readChapters));
  } catch (error) {
    console.error('Error marking chapter as read:', error);
  }
};

/**
 * Check if a chapter has been read
 * @param {string} mangaId - The manga ID
 * @param {string} chapterId - The chapter ID
 * @returns {boolean} True if chapter has been read
 */
export const isChapterRead = (mangaId, chapterId) => {
  try {
    const readChaptersJson = localStorage.getItem(CHAPTERS_READ_KEY);
    const readChapters = readChaptersJson ? JSON.parse(readChaptersJson) : {};
    return !!(readChapters[mangaId] && readChapters[mangaId][chapterId]);
  } catch (error) {
    console.error('Error checking read status:', error);
    return false;
  }
};

/**
 * Update latest chapter information for a manga
 * @param {string} mangaId - The manga ID
 * @param {Object} chapters - The latest available chapters
 */
export const updateLatestChapters = (mangaId, chapters) => {
  try {
    const latestChaptersJson = localStorage.getItem(LATEST_CHAPTERS_KEY);
    const latestChapters = latestChaptersJson ? JSON.parse(latestChaptersJson) : {};
    
    latestChapters[mangaId] = {
      updatedAt: new Date().toISOString(),
      chapters: chapters.slice(0, 5) // Store the 5 most recent chapters
    };
    
    localStorage.setItem(LATEST_CHAPTERS_KEY, JSON.stringify(latestChapters));
  } catch (error) {
    console.error('Error updating latest chapters:', error);
  }
};

/**
 * Get manga with new unread chapters
 * @returns {Array} Array of manga with new chapters
 */
export const getUpdatedManga = () => {
  try {
    const latestChaptersJson = localStorage.getItem(LATEST_CHAPTERS_KEY);
    const readChaptersJson = localStorage.getItem(CHAPTERS_READ_KEY);
    
    if (!latestChaptersJson) return [];
    
    const latestChapters = JSON.parse(latestChaptersJson);
    const readChapters = readChaptersJson ? JSON.parse(readChaptersJson) : {};
    const favorites = getFavorites();
    
    const updatedManga = [];
    
    // Check only favorited manga
    favorites.forEach(mangaId => {
      if (latestChapters[mangaId]) {
        const mangaData = latestChapters[mangaId];
        
        // Check if there are unread chapters
        const hasUnreadChapters = mangaData.chapters.some(chapter => 
          !isChapterRead(mangaId, chapter.id)
        );
        
        if (hasUnreadChapters) {
          updatedManga.push({
            mangaId,
            updatedAt: mangaData.updatedAt,
            newChapters: mangaData.chapters.filter(chapter => 
              !isChapterRead(mangaId, chapter.id)
            )
          });
        }
      }
    });
    
    return updatedManga.sort((a, b) => 
      new Date(b.updatedAt) - new Date(a.updatedAt)
    );
  } catch (error) {
    console.error('Error getting updated manga:', error);
    return [];
  }
};
