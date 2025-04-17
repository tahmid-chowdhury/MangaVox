import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

/**
 * MangaPanel component displays a manga page with interactive dialogue bubbles
 * that can be clicked to play associated audio
 */
const MangaPanel = ({ 
  imageUrl, 
  dialogues, 
  onPlayDialogue, 
  currentPlayingDialogue,
  isAudioLoading,
  panelIndex,
  alt
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [panelDimensions, setPanelDimensions] = useState({ width: 0, height: 0 });
  const panelRef = useRef(null);

  // Track panel dimensions for positioning dialogue markers
  useEffect(() => {
    const updateDimensions = () => {
      if (panelRef.current) {
        setPanelDimensions({
          width: panelRef.current.offsetWidth,
          height: panelRef.current.offsetHeight
        });
      }
    };

    if (imageLoaded) {
      updateDimensions();
      window.addEventListener('resize', updateDimensions);
    }

    return () => window.removeEventListener('resize', updateDimensions);
  }, [imageLoaded]);

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoaded(true);
    setImageError(true);
  };

  // Get absolute position for dialogue markers based on relative position
  const getDialogueMarkerPosition = (position) => {
    if (!position || !panelDimensions.width) return { left: '10%', top: '10%' };

    // Default positions if relative coordinates aren't provided
    const defaultPos = { left: '10%', top: '10%' };
    
    // Calculate absolute positions from relative positions (0-1)
    const left = position.x ? `${position.x * 100}%` : defaultPos.left;
    const top = position.y ? `${position.y * 100}%` : defaultPos.top;
    
    return { left, top };
  };

  // Debug logging to check if dialogues are being received
  useEffect(() => {
    console.log(`MangaPanel ${panelIndex}: Received ${dialogues ? dialogues.length : 0} dialogues`);
    if (dialogues && dialogues.length > 0) {
      console.log('Dialogue sample:', dialogues[0]);
    }
  }, [dialogues, panelIndex]);

  return (
    <div className="relative w-full mb-4 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg">
      {/* Loading state */}
      {!imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-700">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      )}

      {/* Manga panel image */}
      <div ref={panelRef} className="relative">
        <img
          src={imageUrl}
          alt={alt || `Manga panel ${panelIndex + 1}`}
          className="w-full h-auto"
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
        
        {/* Display fallback if image fails to load */}
        {imageError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p>Failed to load image</p>
          </div>
        )}

        {/* Dialogue markers - only show when image is loaded */}
        {imageLoaded && dialogues && dialogues.map((dialogue, index) => {
          const isPlaying = currentPlayingDialogue && 
                            currentPlayingDialogue.text === dialogue.text &&
                            currentPlayingDialogue.characterId === dialogue.characterId;
          
          const isLoading = isAudioLoading && isPlaying;
          const markerPosition = getDialogueMarkerPosition(dialogue.position);
          
          return (
            <div 
              key={index}
              className={`absolute z-10 transform -translate-x-1/2 -translate-y-1/2 ${
                isPlaying ? 'scale-110' : ''
              } transition-all duration-200`}
              style={markerPosition}
            >
              <button
                onClick={() => onPlayDialogue(dialogue)}
                disabled={isAudioLoading}
                className={`flex items-center justify-center h-8 w-8 rounded-full shadow-lg ${
                  isPlaying 
                    ? 'bg-purple-600 text-white ring-4 ring-purple-300 dark:ring-purple-900' 
                    : 'bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-gray-700'
                } transition-all duration-300`}
                title={`${dialogue.characterName || 'Character'}: ${dialogue.text}`}
              >
                {isLoading ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                )}
              </button>

              {/* Tooltip that appears on hover */}
              <div className="absolute left-full ml-2 top-0 hidden group-hover:block bg-white dark:bg-gray-800 p-2 rounded shadow-lg text-sm max-w-xs">
                <p className="font-bold">{dialogue.characterName || 'Character'}</p>
                <p className="text-gray-700 dark:text-gray-300">{dialogue.text}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

MangaPanel.propTypes = {
  imageUrl: PropTypes.string.isRequired,
  dialogues: PropTypes.arrayOf(PropTypes.shape({
    text: PropTypes.string.isRequired,
    characterId: PropTypes.string,
    characterName: PropTypes.string,
    position: PropTypes.shape({
      x: PropTypes.number,
      y: PropTypes.number
    }),
    audioUrl: PropTypes.string
  })),
  onPlayDialogue: PropTypes.func.isRequired,
  currentPlayingDialogue: PropTypes.object,
  isAudioLoading: PropTypes.bool,
  panelIndex: PropTypes.number,
  alt: PropTypes.string
};

export default MangaPanel;
