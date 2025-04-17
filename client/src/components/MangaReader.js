import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { mangaAPI, voiceAPI } from '../services/api';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { useTheme } from '../contexts/ThemeContext';
import { markChapterAsRead } from '../utils/favorites';
import { updateReadingProgress } from '../utils/readingProgress';
import BookmarkButton from './BookmarkButton';

function MangaReader() {
  const { mangaId, chapterId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { readingMode, toggleReadingMode } = useUserPreferences();
  const theme = useTheme();
  
  const [manga, setManga] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [pages, setPages] = useState([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogue, setDialogue] = useState(null);
  const [voiceAssignments, setVoiceAssignments] = useState({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudioUrl, setCurrentAudioUrl] = useState(null);
  const [voices, setVoices] = useState([]);
  const [currentSpeech, setCurrentSpeech] = useState(null);
  const [audioLoading, setAudioLoading] = useState(false);
  
  const audioRef = useRef(null);
  const audioRequestRef = useRef(null);
  const pageRefs = useRef([]);
  
  // Fetch manga details, chapter, and pages on load
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get manga details
        const mangaData = await mangaAPI.getDetails(mangaId);
        setManga(mangaData.data);
        
        // Get chapter pages
        const chapterData = await mangaAPI.getChapterPages(chapterId);
        setChapter(chapterData.chapter);
        setPages(chapterData.pages);
        
        // Get available voices
        const voicesData = await voiceAPI.getVoices();
        setVoices(voicesData.voices);
        
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    
    fetchData();
  }, [mangaId, chapterId]);

  // Define extractDialogue as a useCallback to use it as a dependency
  const extractDialogue = useCallback(async () => {
    try {
      // Add loading state for dialogue
      setDialogue({ loading: true });
      
      // Extract only the URLs from the page objects
      const pageUrls = pages.map(page => page.url);
      
      // Send only the URLs to the server - limit to first 10 pages if too many
      // This helps prevent payload size issues while still providing context
      const pagesToSend = pageUrls.length > 10 ? pageUrls.slice(0, 10) : pageUrls;
      
      const dialogueData = await mangaAPI.extractDialogue(mangaId, chapterId, pagesToSend);
      setDialogue(dialogueData);
      
      // Once we have dialogue, assign voices to characters
      if (dialogueData && dialogueData.dialogue) {
        // Extract unique characters from the dialogue
        const characterDialogue = parseDialogue(dialogueData.dialogue);
        const characters = Object.keys(characterDialogue);
        
        if (characters.length > 0) {
          assignVoicesToCharacters(characters);
        }
        
        // Display error message if there was an API error but we got fallback dialogue
        if (dialogueData.error) {
          console.warn('Using fallback dialogue due to API error:', dialogueData.error);
        }
      }
    } catch (err) {
      console.error('Error extracting dialogue:', err);
      // Set simplified fallback dialogue instead of nothing
      setDialogue({
        dialogue: "Character 1: I can't seem to read the dialogue in this manga.\nCharacter 2: Let's enjoy the art instead!\nNarrator: The application encountered an error processing this chapter."
      });
    }
  }, [mangaId, chapterId, pages]);

  // Extract dialogue when pages are loaded
  useEffect(() => {
    if (pages.length > 0) {
      extractDialogue();
    }
  }, [pages, extractDialogue]);
  
  // Parse page index from query parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const page = parseInt(searchParams.get('page'));
    if (!isNaN(page) && page >= 0 && page < pages.length) {
      setCurrentPageIndex(page);
    }
  }, [location.search, pages.length]);

  // Update reading progress when page changes
  useEffect(() => {
    if (pages.length > 0) {
      updateReadingProgress(mangaId, chapterId, currentPageIndex, pages.length);
    }
  }, [mangaId, chapterId, currentPageIndex, pages.length]);

  // Parse dialogue from LLM response
  const parseDialogue = (dialogueText) => {
    // This is a simplified parser
    // In a real implementation, you'd want a more robust parser
    const characterDialogue = {};
    
    // Split by lines and look for character: dialogue patterns
    const lines = dialogueText.split('\n');
    
    lines.forEach(line => {
      // Look for patterns like "Character: Dialogue" or "Character (actions): Dialogue"
      const match = line.match(/^([^:]+):(.*)/);
      if (match) {
        const character = match[1].trim();
        const speech = match[2].trim();
        
        if (!characterDialogue[character]) {
          characterDialogue[character] = [];
        }
        
        characterDialogue[character].push(speech);
      }
    });
    
    return characterDialogue;
  };
  
  // Assign voices to characters using the API
  const assignVoicesToCharacters = async (characters) => {
    try {
      // Don't try to assign if no characters or if we have no voices
      if (!characters || characters.length === 0 || voices.length === 0) {
        console.log('No characters to assign voices to or no voices available');
        return;
      }
      
      // Limit number of characters to reduce payload size
      const limitedCharacters = characters.length > 15 ? characters.slice(0, 15) : characters;
      
      const response = await mangaAPI.assignVoices(mangaId, chapterId, limitedCharacters);
      
      if (response.error) {
        console.warn('Voice assignment had errors but continued with fallbacks:', response.error);
      }
      
      // Only update if we actually got assignments
      if (response.voiceAssignments && Object.keys(response.voiceAssignments).length > 0) {
        setVoiceAssignments(response.voiceAssignments);
      } else {
        console.warn('No voice assignments returned, using default voices');
        // Create simple round-robin assignments as fallback
        const fallbackAssignments = {};
        characters.forEach((character, index) => {
          if (voices.length > 0) {
            fallbackAssignments[character] = voices[index % voices.length].voice_id;
          }
        });
        setVoiceAssignments(fallbackAssignments);
      }
    } catch (err) {
      console.error('Error assigning voices:', err);
      
      // Create simple round-robin assignments as fallback
      const fallbackAssignments = {};
      characters.forEach((character, index) => {
        if (voices.length > 0) {
          fallbackAssignments[character] = voices[index % voices.length].voice_id;
        }
      });
      setVoiceAssignments(fallbackAssignments);
    }
  };
  
  // Play speech for a dialogue
  const playSpeech = async (character, text) => {
    try {
      // Cancel any previous ongoing audio request
      if (audioRequestRef.current) {
        audioRequestRef.current.abort();
      }

      // Stop current audio if playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = ''; // Clear source to avoid stuck loading states
      }
      
      // Get the voice ID for this character
      const voiceId = voiceAssignments[character] || (voices.length > 0 ? voices[0].voice_id : null);
      
      if (!voiceId) {
        console.error('No voice found for character and no fallback voices available:', character);
        return;
      }
      
      setAudioLoading(true);
      setCurrentSpeech({ character, text });
      
      // Create an AbortController for this request
      const controller = new AbortController();
      audioRequestRef.current = controller;
      
      // Generate speech with abort capability
      const response = await voiceAPI.generateSpeech(text, voiceId, controller.signal);
      
      if (!response || !response.audioUrl) {
        throw new Error('Failed to generate audio');
      }
      
      setCurrentAudioUrl(response.audioUrl);
      
      // Play the audio when it's available
      if (audioRef.current) {
        audioRef.current.src = response.audioUrl;
        
        // Use a promise to handle audio loading
        const playPromise = audioRef.current.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
              setAudioLoading(false);
            })
            .catch(error => {
              // Handle autoplay restrictions or other play errors
              console.error('Error playing audio:', error);
              setIsPlaying(false);
              setAudioLoading(false);
              setCurrentSpeech(null);
            });
        }
      }
    } catch (err) {
      // Ignore AbortError as it's intentional
      if (err.name !== 'AbortError') {
        console.error('Error playing speech:', err);
      }
      setIsPlaying(false);
      setAudioLoading(false);
      setCurrentSpeech(null);
    }
  };
  
  // Handle audio playback ending
  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentSpeech(null);
  };
  
  // Clean up on component unmount - properly handling the ref
  useEffect(() => {
    return () => {
      // Cancel any pending audio request when component unmounts
      if (audioRequestRef.current) {
        audioRequestRef.current.abort();
      }
      
      // Store current audioRef in a variable to avoid the stale closure issue
      const currentAudioRef = audioRef.current;
      
      // Clean up audio element
      if (currentAudioRef) {
        currentAudioRef.pause();
        currentAudioRef.src = '';
      }
    };
  }, []);
  
  // Define navigation functions as callbacks to use them as dependencies
  const goToPreviousPage = useCallback(() => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1);
    }
  }, [currentPageIndex]);
  
  const goToNextPage = useCallback(() => {
    if (currentPageIndex < pages.length - 1) {
      setCurrentPageIndex(currentPageIndex + 1);
    }
  }, [currentPageIndex, pages.length]);
  
  // Handle key presses for navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        goToPreviousPage();
      } else if (e.key === 'ArrowRight') {
        goToNextPage();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [goToPreviousPage, goToNextPage]);

  // Mark chapter as read when loaded
  useEffect(() => {
    if (chapter && manga) {
      const chapterInfo = {
        number: chapter.attributes?.chapter,
        title: chapter.attributes?.title,
        attributes: chapter.attributes
      };
      markChapterAsRead(mangaId, chapterId, chapterInfo);
    }
  }, [chapter, manga, mangaId, chapterId]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
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
        <button 
          onClick={() => navigate(-1)}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
        >
          Go Back
        </button>
      </div>
    );
  }

  // Get title for display
  let title = 'Unknown Title';
  if (manga?.attributes?.title) {
    title = manga.attributes.title.en || Object.values(manga.attributes.title)[0];
  }

  // Get current page
  const currentPage = pages[currentPageIndex];

  return (
    <div className="container mx-auto p-4 dark:bg-gray-900 dark:text-white transition-colors duration-200">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-primary-600 dark:text-primary-400">{title}</h2>
          <p className="text-gray-600 dark:text-gray-300">
            Chapter {chapter?.attributes?.chapter || 'Unknown'}: {chapter?.attributes?.title || 'Untitled'}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Add BookmarkButton */}
          <BookmarkButton 
            mangaId={mangaId}
            chapterId={chapterId}
            pageIndex={currentPageIndex}
            size="normal"
          />
          
          {/* Reading Mode Toggle */}
          <button 
            onClick={toggleReadingMode}
            className="bg-primary-600 hover:bg-primary-700 dark:bg-primary-800 dark:hover:bg-primary-700 text-white px-3 py-1 rounded-md text-sm transition-colors"
          >
            {readingMode === 'page' ? 'Switch to Long Strip' : 'Switch to Page View'}
          </button>
        </div>
      </div>

      {/* Only show page navigation in page mode */}
      {readingMode === 'page' && (
        <div className="flex justify-between mb-4">
          <button
            onClick={goToPreviousPage}
            disabled={currentPageIndex === 0}
            className={`px-4 py-2 rounded-lg ${
              currentPageIndex === 0 
                ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed' 
                : 'bg-primary-600 hover:bg-primary-700 dark:bg-primary-800 dark:hover:bg-primary-700 text-white'
            } transition-colors`}
          >
            Previous
          </button>
          <span className="self-center dark:text-gray-300">
            Page {currentPageIndex + 1} of {pages.length}
          </span>
          <button
            onClick={goToNextPage}
            disabled={currentPageIndex === pages.length - 1}
            className={`px-4 py-2 rounded-lg ${
              currentPageIndex === pages.length - 1 
                ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed' 
                : 'bg-primary-600 hover:bg-primary-700 dark:bg-primary-800 dark:hover:bg-primary-700 text-white'
            } transition-colors`}
          >
            Next
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4">
        {/* Manga Page Display */}
        <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg">
          {readingMode === 'page' ? (
            // Page mode - show current page only
            currentPage && (
              <img
                src={currentPage.url}
                alt={`Page ${currentPageIndex + 1}`}
                className="w-full h-auto"
                ref={el => pageRefs.current[currentPageIndex] = el}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/placeholder-page.jpg';
                }}
              />
            )
          ) : (
            // Long strip mode - show all pages
            <div className="flex flex-col space-y-4 pb-4">
              {pages.map((page, index) => (
                <img
                  key={index}
                  src={page.url}
                  alt={`Page ${index + 1}`}
                  className="w-full h-auto"
                  ref={el => pageRefs.current[index] = el}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/placeholder-page.jpg';
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Dialogue Panel */}
        <div className="md:w-1/3 lg:w-1/4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg h-min">
          <h3 className="text-lg font-bold mb-4 text-primary-600 dark:text-primary-400">Dialogue</h3>
          
          {(isPlaying || audioLoading) && currentSpeech && (
            <div className="bg-purple-100 p-3 rounded-lg mb-4">
              <p className="font-semibold text-purple-800">{currentSpeech.character}</p>
              <p className="italic">"{currentSpeech.text}"</p>
              {audioLoading && (
                <div className="flex items-center mt-2">
                  <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                  <span className="text-xs text-purple-800">Loading audio...</span>
                </div>
              )}
            </div>
          )}
          
          {dialogue && dialogue.loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mr-2"></div>
              <p className="text-gray-500">Extracting dialogue...</p>
            </div>
          ) : dialogue && dialogue.dialogue ? (
            <div className="flex flex-col space-y-4 pb-4">
              {/* Display simplified dialogue */}
              {Object.entries(parseDialogue(dialogue.dialogue)).map(([character, speeches], idx) => (
                <div key={idx} className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold">{character}</span>
                    {voiceAssignments[character] && (
                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                        {voices.find(v => v.voice_id === voiceAssignments[character])?.name || 'Custom Voice'}
                      </span>
                    )}
                  </div>
                  
                  {speeches.map((speech, speechIdx) => (
                    <div key={speechIdx} className="mb-2 pl-4 border-l-2 border-gray-200">
                      <p className="text-sm">{speech}</p>
                      <button
                        onClick={() => playSpeech(character, speech)}
                        className={`text-xs ${
                          isPlaying || audioLoading
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-purple-600 hover:text-purple-800'
                        } mt-1 flex items-center`}
                        disabled={isPlaying || audioLoading}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                        {audioLoading && character === currentSpeech?.character && speech === currentSpeech?.text
                          ? 'Loading...'
                          : 'Play'
                        }
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Extracting dialogue... This may take a moment.</p>
          )}
        </div>
      </div>
      
      {/* Audio element for TTS playback */}
      <audio
        ref={audioRef}
        src={currentAudioUrl}
        onEnded={handleAudioEnded}
        onError={(e) => {
          console.error('Audio element error:', e);
          setIsPlaying(false);
          setAudioLoading(false);
          setCurrentSpeech(null);
        }}
        className="hidden"
      />
    </div>
  );
}

export default MangaReader;
