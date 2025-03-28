import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mangaAPI, voiceAPI } from '../services/api';

function MangaReader() {
  const { mangaId, chapterId } = useParams();
  const navigate = useNavigate();
  
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
  
  const audioRef = useRef(null);
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

  // Extract dialogue when pages are loaded
  useEffect(() => {
    if (pages.length > 0) {
      extractDialogue();
    }
  }, [pages]);
  
  // Process dialogue extraction
  const extractDialogue = async () => {
    try {
      const dialogueData = await mangaAPI.extractDialogue(mangaId, chapterId, pages);
      setDialogue(dialogueData);
      
      // Once we have dialogue, assign voices to characters
      if (dialogueData && dialogueData.dialogue) {
        // Extract unique characters from the dialogue
        // This is a simplified approach; in reality, you'd need more sophisticated parsing
        const characterDialogue = parseDialogue(dialogueData.dialogue);
        const characters = Object.keys(characterDialogue);
        
        if (characters.length > 0) {
          assignVoicesToCharacters(characters);
        }
      }
    } catch (err) {
      console.error('Error extracting dialogue:', err);
      // Don't set error state here to avoid blocking the reader experience
    }
  };
  
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
      const response = await mangaAPI.assignVoices(mangaId, chapterId, characters);
      setVoiceAssignments(response.voiceAssignments);
    } catch (err) {
      console.error('Error assigning voices:', err);
    }
  };
  
  // Play speech for a dialogue
  const playSpeech = async (character, text) => {
    try {
      // Stop current audio if playing
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      // Get the voice ID for this character
      const voiceId = voiceAssignments[character] || voices[0]?.voice_id;
      
      if (!voiceId) {
        console.error('No voice found for character:', character);
        return;
      }
      
      setIsPlaying(true);
      setCurrentSpeech({ character, text });
      
      // Generate speech
      const response = await voiceAPI.generateSpeech(text, voiceId);
      setCurrentAudioUrl(response.audioUrl);
      
      // Play the audio when it's available
      if (audioRef.current) {
        audioRef.current.src = response.audioUrl;
        await audioRef.current.play();
      }
    } catch (err) {
      console.error('Error playing speech:', err);
      setIsPlaying(false);
      setCurrentSpeech(null);
    }
  };
  
  // Handle audio playback ending
  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentSpeech(null);
  };
  
  // Navigate to previous/next page
  const goToPreviousPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1);
    }
  };
  
  const goToNextPage = () => {
    if (currentPageIndex < pages.length - 1) {
      setCurrentPageIndex(currentPageIndex + 1);
    }
  };
  
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
  }, [currentPageIndex, pages.length]);

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
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-purple-600">{title}</h2>
        <p className="text-gray-600">
          Chapter {chapter?.attributes?.chapter || 'Unknown'}: {chapter?.attributes?.title || 'Untitled'}
        </p>
      </div>

      {/* Page Navigation */}
      <div className="flex justify-between mb-4">
        <button
          onClick={goToPreviousPage}
          disabled={currentPageIndex === 0}
          className={`px-4 py-2 rounded-lg ${
            currentPageIndex === 0 
              ? 'bg-gray-300 cursor-not-allowed' 
              : 'bg-purple-600 hover:bg-purple-700 text-white'
          }`}
        >
          Previous
        </button>
        <span className="self-center">
          Page {currentPageIndex + 1} of {pages.length}
        </span>
        <button
          onClick={goToNextPage}
          disabled={currentPageIndex === pages.length - 1}
          className={`px-4 py-2 rounded-lg ${
            currentPageIndex === pages.length - 1 
              ? 'bg-gray-300 cursor-not-allowed' 
              : 'bg-purple-600 hover:bg-purple-700 text-white'
          }`}
        >
          Next
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        {/* Manga Page Display */}
        <div className="flex-1 bg-gray-100 rounded-lg overflow-hidden shadow-lg">
          {currentPage && (
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
          )}
        </div>
        
        {/* Dialogue Panel */}
        <div className="md:w-1/3 lg:w-1/4 bg-white p-4 rounded-lg shadow-lg h-min">
          <h3 className="text-lg font-bold mb-4 text-purple-600">Dialogue</h3>
          
          {isPlaying && currentSpeech && (
            <div className="bg-purple-100 p-3 rounded-lg mb-4">
              <p className="font-semibold text-purple-800">{currentSpeech.character}</p>
              <p className="italic">"{currentSpeech.text}"</p>
            </div>
          )}
          
          {dialogue && dialogue.dialogue ? (
            <div>
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
                        className="text-xs text-purple-600 hover:text-purple-800 mt-1 flex items-center"
                        disabled={isPlaying}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                        Play
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
        className="hidden"
      />
    </div>
  );
}

export default MangaReader;
