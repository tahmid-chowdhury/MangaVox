import React, { useState, useEffect } from 'react';
import { isFavorite, toggleFavorite } from '../utils/favorites';

/**
 * Button component for toggling manga favorite status
 */
function FavoriteButton({ mangaId, className = "", size = "normal", onToggle }) {
  const [isFav, setIsFav] = useState(false);
  
  // Load initial favorite status
  useEffect(() => {
    setIsFav(isFavorite(mangaId));
  }, [mangaId]);
  
  // Handle favorite toggle
  const handleToggleFavorite = (e) => {
    // Prevent event bubbling to parent components
    e.preventDefault();
    e.stopPropagation();
    
    const newStatus = toggleFavorite(mangaId);
    setIsFav(newStatus);
    
    // Call the onToggle callback if provided
    if (onToggle) {
      onToggle(newStatus);
    }
  };
  
  // Determine icon size classes
  const sizeClasses = size === 'small' 
    ? 'h-5 w-5' 
    : (size === 'large' ? 'h-8 w-8' : 'h-6 w-6');
  
  return (
    <button 
      onClick={handleToggleFavorite}
      className={`text-primary-600 hover:text-primary-800 dark:text-primary-500 dark:hover:text-primary-400 ${className}`}
      aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
      title={isFav ? "Remove from favorites" : "Add to favorites"}
    >
      {isFav ? (
        <svg xmlns="http://www.w3.org/2000/svg" className={sizeClasses} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className={sizeClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      )}
    </button>
  );
}

export default FavoriteButton;
