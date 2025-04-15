/**
 * Utility for tracking reading progress
 */

const READING_PROGRESS_KEY = 'mangavox_reading_progress';

/**
 * Update reading progress for a manga
 * @param {string} mangaId - The manga ID
 * @param {string} chapterId - The current chapter ID
 * @param {number} pageIndex - The current page index
 * @param {number} totalPages - Total pages in the chapter
 */
export const updateReadingProgress = (mangaId, chapterId, pageIndex, totalPages) => {
  try {
    const progressData = localStorage.getItem(READING_PROGRESS_KEY);
    const progress = progressData ? JSON.parse(progressData) : {};
    
    if (!progress[mangaId]) {
      progress[mangaId] = {};
    }
    
    progress[mangaId][chapterId] = {
      pageIndex,
      totalPages,
      percentage: Math.round((pageIndex / (totalPages - 1)) * 100),
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem(READING_PROGRESS_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error('Error updating reading progress:', error);
  }
};

/**
 * Get reading progress for a manga
 * @param {string} mangaId - The manga ID
 * @param {string} chapterId - The chapter ID
 * @returns {Object|null} Progress data or null if not found
 */
export const getReadingProgress = (mangaId, chapterId) => {
  try {
    const progressData = localStorage.getItem(READING_PROGRESS_KEY);
    const progress = progressData ? JSON.parse(progressData) : {};
    
    if (progress[mangaId] && progress[mangaId][chapterId]) {
      return progress[mangaId][chapterId];
    }
    
    return null;
  } catch (error) {
    console.error('Error getting reading progress:', error);
    return null;
  }
};
