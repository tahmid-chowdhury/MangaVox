/**
 * Utility functions for managing favorite manga
 */

// Key for storing favorites in localStorage
const FAVORITES_KEY = 'mangavox_favorites';

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
