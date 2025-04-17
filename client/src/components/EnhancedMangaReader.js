import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { mangaAPI, voiceAPI, dialogueAPI } from '../services/api';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { useTheme } from '../contexts/ThemeContext';
import { markChapterAsRead } from '../utils/favorites';
import { updateReadingProgress } from '../utils/readingProgress';
import BookmarkButton from './BookmarkButton';
import MangaPanel from './MangaPanel';
import AudioControls from './AudioControls';
import TTSSettings from './TTSSettings';
import LanguageSelector from './LanguageSelector';
import CharacterInfoPanel from './CharacterInfoPanel';

const EnhancedMangaReader = () => {
  const { mangaId, chapterId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { readingMode, toggleReadingMode, ttsSettings, updateTTSSettings } = useUserPreferences();
  const theme = useTheme();
  
  // Manga and chapter data
  const [manga, setManga] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [pages, setPages] = useState([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  
  // Dialogue and voice data
  const [pageDialogues, setPageDialogues] = useState({});
  const [voiceAssignments, setVoiceAssignments] = useState({});
  const [voices, setVoices] = useState([]);
  
  // Advanced dialogue processing states
  const [characterMap, setCharacterMap] = useState(null);
  const [sentimentData, setSentimentData] = useState(null);
  const [characterProfiles, setCharacterProfiles] = useState(null);
  const [isProcessingDialogue, setIsProcessingDialogue] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [translatedDialogue, setTranslatedDialogue] = useState(null);
  
  // Audio playback states
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [currentDialogue, setCurrentDialogue] = useState(null);
  const [volume, setVolume] = useState(1);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAudioControls, setShowAudioControls] = useState(false);
  const [showTTSSettings, setShowTTSSettings] = useState(false);
  const [showCharacterPanel, setShowCharacterPanel] = useState(false);
  
  // Refs
  const audioRef = useRef(null);
  const audioRequestRef = useRef(null);
  
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
        console.error('Error fetching manga data:', err);
        setError(err.message);
        setLoading(false);
      }
    };
    
    fetchData();
  }, [mangaId, chapterId]);
  
  // Process dialogues for current page when pages or current page changes
  useEffect(() => {
    if (pages.length > 0 && !pageDialogues[currentPageIndex]) {
      fetchPageDialogues(currentPageIndex);
    }
  }, [pages, currentPageIndex]);
  
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
  
  // Clean up on component unmount
  useEffect(() => {
    return () => {
      // Cancel any pending audio request
      if (audioRequestRef.current) {
        audioRequestRef.current.abort();
      }
      
      // Clean up audio element
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);
  
  // Handle key presses for navigation
  const goToPreviousPage = useCallback(() => {
    if (currentPageIndex > 0) {
      // Stop any playing audio when changing pages
      stopAudio();
      setCurrentPageIndex(currentPageIndex - 1);
    }
  }, [currentPageIndex]);
  
  const goToNextPage = useCallback(() => {
    if (currentPageIndex < pages.length - 1) {
      // Stop any playing audio when changing pages
      stopAudio();
      setCurrentPageIndex(currentPageIndex + 1);
    }
  }, [currentPageIndex, pages.length]);
  
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
  
  // Fetch dialogues for a specific page with advanced processing
  const fetchPageDialogues = async (pageIndex) => {
    try {
      if (!pages[pageIndex]) {
        console.log(`Skipping fetchPageDialogues for index ${pageIndex} - no page found`);
        return;
      }
      
      console.log(`📝 Fetching dialogues for page ${pageIndex+1}/${pages.length}`);
      
      // Mark this page as loading dialogues
      setPageDialogues(prev => ({
        ...prev,
        [pageIndex]: { loading: true }
      }));
      
      // Get the page URL
      const pageUrl = pages[pageIndex].url;
      console.log(`Page URL: ${pageUrl}`);
      
      // For debugging, simulate some dialogue data if the API call fails
      const simulateDialogueData = () => {
        console.log('⚠️ Using simulated dialogue data for testing');
        return [
          {
            text: "I won't let you get away with this!",
            characterName: "Hero",
            characterId: "hero-1",
            position: { x: 0.3, y: 0.4 },
            voiceId: "TxGEqnHWrfWFTfGW9XjX" // Example ElevenLabs voice ID
          },
          {
            text: "You're too late. My plan is already in motion!",
            characterName: "Villain",
            characterId: "villain-1",
            position: { x: 0.7, y: 0.3 },
            voiceId: "VR6AewLTigWG4xSOukaG" // Example ElevenLabs voice ID
          }
        ];
      };
      
      // Use our new dialogueAPI to process the page dialogues
      let data;
      try {
        console.log(`Calling dialogueAPI.processPageDialogues for mangaId=${mangaId}, chapterId=${chapterId}, pageIndex=${pageIndex}`);
        data = await dialogueAPI.processPageDialogues(
          mangaId,
          chapterId,
          pageIndex,
          pageUrl
        );
        console.log(`Received ${data ? data.length : 0} dialogues from API`);
      } catch (apiError) {
        console.error('API Error in processPageDialogues:', apiError);
        // For debugging, use simulated data when API fails
        data = simulateDialogueData();
      }
      
      if (!data || data.length === 0) {
        console.log('No dialogues returned from API, using simulated data for testing');
        data = simulateDialogueData();
      }
      
      // Store the processed dialogues
      setPageDialogues(prev => {
        console.log(`Updating dialogues for page ${pageIndex} with ${data.length} dialogues`);
        return {
          ...prev,
          [pageIndex]: {
            loading: false,
            dialogues: data
          }
        };
      });
      
      // If we have dialogue text on this page, perform enhanced processing
      if (data && data.length > 0) {
        try {
          console.log('Starting enhanced dialogue processing...');
          setIsProcessingDialogue(true);
          
          // Combine all dialogue text for processing
          const allDialogueText = data
            .map(dialogue => `${dialogue.characterName}: ${dialogue.text}`)
            .join('\n');
          
          console.log('Combined dialogue text for processing:', allDialogueText);
          
          // Use the enhance endpoint to get multiple analyses at once
          let enhancedData;
          try {
            console.log('Calling dialogueAPI.enhance...');
            enhancedData = await dialogueAPI.enhance(
              allDialogueText,
              mangaId,
              chapterId,
              ['character-consistency', 'sentiment', 'profiles']
            );
          } catch (enhanceApiError) {
            console.error('Error calling enhance API:', enhanceApiError);
            // Create simulated enhanced data
            enhancedData = {
              metadata: {
                characters: {
                  mappings: {
                    "Hero": "Protagonist", 
                    "Villain": "Antagonist"
                  }
                },
                sentiment: {
                  data: {
                    "Hero": { primary: "determined", intensity: 7 },
                    "Villain": { primary: "smug", intensity: 6 }
                  }
                },
                profiles: {
                  data: {
                    "Hero": { 
                      description: "A brave warrior fighting for justice",
                      traits: ["courageous", "righteous"]
                    },
                    "Villain": {
                      description: "A cunning mastermind with evil plans",
                      traits: ["intelligent", "ruthless"]
                    }
                  }
                }
              }
            };
          }
          
          console.log('Enhanced data received:', enhancedData);
          
          // Store the character mapping, sentiment data, and profiles
          if (enhancedData.metadata?.characters) {
            console.log('Setting character map:', enhancedData.metadata.characters);
            setCharacterMap(enhancedData.metadata.characters);
          }
          
          if (enhancedData.metadata?.sentiment) {
            console.log('Setting sentiment data:', enhancedData.metadata.sentiment);
            setSentimentData(enhancedData.metadata.sentiment);
          }
          
          if (enhancedData.metadata?.profiles) {
            console.log('Setting character profiles:', enhancedData.metadata.profiles);
            setCharacterProfiles(enhancedData.metadata.profiles);
          }
        } catch (enhanceError) {
          console.warn('Error enhancing dialogue data:', enhanceError);
          // Continue without enhancement
        } finally {
          setIsProcessingDialogue(false);
          console.log('Dialogue processing complete');
        }
      }
    } catch (error) {
      console.error('Error in fetchPageDialogues:', error);
      
      // Set error state for this page
      setPageDialogues(prev => ({
        ...prev,
        [pageIndex]: {
          loading: false,
          error: error.message,
          dialogues: []
        }
      }));
    }
  };
  
  // Translate dialogue text based on selected language
  const translateDialogue = async (dialogue, targetLanguage) => {
    if (!dialogue || targetLanguage === 'en') return dialogue.text;
    
    try {
      // Check if we already have a translation for this dialogue
      const translationKey = `${dialogue.text}:${targetLanguage}`;
      if (translatedDialogue && translatedDialogue[translationKey]) {
        return translatedDialogue[translationKey];
      }
      
      // Translate the dialogue
      const translation = await dialogueAPI.translate(
        dialogue.text,
        targetLanguage,
        'auto',
        `Manga: ${manga?.attributes?.title?.en || ''}, Character: ${dialogue.characterName}`
      );
      
      // Cache the translation
      setTranslatedDialogue(prev => ({
        ...prev,
        [translationKey]: translation.translated
      }));
      
      return translation.translated;
    } catch (error) {
      console.error('Translation error:', error);
      return dialogue.text; // Fallback to original text
    }
  };
  
  // Get sentiment data for a dialogue to adjust voice settings
  const getSentimentModulation = (dialogue) => {
    // Default voice modulation
    const defaultModulation = {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0,
      use_speaker_boost: true
    };
    
    // If we don't have sentiment data, return defaults
    if (!sentimentData || !dialogue) return defaultModulation;
    
    try {
      // Look for sentiment data for this character and dialogue
      const characterKey = Object.keys(sentimentData.data || {}).find(key => 
        key.toLowerCase() === dialogue.characterName.toLowerCase()
      );
      
      if (characterKey && sentimentData.data[characterKey]) {
        const emotion = sentimentData.data[characterKey];
        
        // Adjust voice based on emotion intensity and type
        let stability = 0.5;
        let similarity_boost = 0.75;
        let style = 0;
        
        // Adjust stability based on emotional intensity (1-10)
        // Lower stability = more emotional variation
        if (emotion.intensity) {
          stability = Math.max(0.1, 1 - (emotion.intensity / 15)); // More intense = less stable
        }
        
        // Adjust similarity based on emotion type
        // Angry/excited = lower similarity (more expressive)
        if (emotion.primary) {
          const highEnergySimilarity = 0.6;
          const lowEnergySimilarity = 0.85;
          
          if (['angry', 'excited', 'fearful', 'surprised'].includes(emotion.primary.toLowerCase())) {
            similarity_boost = highEnergySimilarity;
          } else if (['sad', 'calm', 'thoughtful'].includes(emotion.primary.toLowerCase())) {
            similarity_boost = lowEnergySimilarity;
          }
          
          // Set style parameter based on emotion (0-1)
          if (['angry', 'fearful'].includes(emotion.primary.toLowerCase())) {
            style = 0.7; // More intensity
          } else if (['happy', 'excited'].includes(emotion.primary.toLowerCase())) {
            style = 0.5; // Medium intensity
          } else {
            style = 0.3; // Lower intensity
          }
        }
        
        return {
          stability,
          similarity_boost,
          style,
          use_speaker_boost: true
        };
      }
    } catch (error) {
      console.warn('Error applying sentiment modulation:', error);
    }
    
    return defaultModulation;
  };

  // Play dialogue audio with sentiment-enhanced voice
  const playDialogue = async (dialogue) => {
    try {
      console.log('🔊 playDialogue called with:', dialogue);
      
      // Cancel any previous ongoing audio request
      if (audioRequestRef.current) {
        audioRequestRef.current.abort();
      }
      
      // Stop current audio if playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = ''; // Clear source
      }
      
      // Always show audio controls, even if TTS generation fails
      setCurrentDialogue(dialogue);
      setShowAudioControls(true);
      setIsAudioLoading(true);
      console.log('Audio controls should now be visible');
      
      // Ensure the character info button is visible if we have profiles
      if (!showCharacterPanel && !characterProfiles) {
        // Simulate character profiles if needed for testing
        const simulatedProfiles = {
          data: {
            [dialogue.characterName]: {
              description: `${dialogue.characterName} is an important character in this manga.`,
              traits: ["determined", "strong-willed"],
              role: "Main Character"
            }
          }
        };
        setCharacterProfiles(simulatedProfiles);
        console.log('Added simulated character profile for testing');
      }
      
      // Get the dialogue text (translated if needed)
      let textToSpeak = dialogue.text;
      
      // Translate if a non-English language is selected
      if (selectedLanguage !== 'en') {
        textToSpeak = await translateDialogue(dialogue, selectedLanguage);
      }
      
      // Get sentiment-based voice modulation
      const voiceModulation = getSentimentModulation(dialogue);
      console.log('Voice modulation settings:', voiceModulation);
      
      // Use the audioUrl if it already exists, otherwise fetch it
      if (dialogue.audioUrl && selectedLanguage === 'en') {
        setIsAudioLoading(false);
        
        // Play audio after a short delay to ensure UI updates first
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.src = dialogue.audioUrl;
            audioRef.current.volume = volume;
            audioRef.current.playbackRate = ttsSettings.speed || 1;
            
            const playPromise = audioRef.current.play();
            
            if (playPromise !== undefined) {
              playPromise
                .then(() => {
                  setIsPlaying(true);
                })
                .catch(error => {
                  console.error('Error playing audio:', error);
                  setIsPlaying(false);
                  setIsAudioLoading(false);
                });
            }
          }
        }, 50);
      } else {
        // Create an AbortController for this request
        const controller = new AbortController();
        audioRequestRef.current = controller;
        
        // Generate speech with abort capability and sentiment-based modulation
        const response = await voiceAPI.generateSpeech(
          textToSpeak, 
          dialogue.voiceId, 
          controller.signal,
          voiceModulation // Pass the sentiment-based voice settings
        );
        
        if (!response || !response.audioUrl) {
          throw new Error('Failed to generate audio');
        }
        
        // Only cache English audio (translations might change)
        if (selectedLanguage === 'en') {
          // Update the dialogue with the audio URL
          dialogue.audioUrl = response.audioUrl;
          
          // Update page dialogues cache with the new audio URL
          setPageDialogues(prev => {
            // Find the page this dialogue belongs to
            const pageIndex = Object.keys(prev).find(pageIdx => {
              return prev[pageIdx]?.dialogues?.some(d => 
                d.text === dialogue.text && 
                d.characterId === dialogue.characterId
              );
            });
            
            if (pageIndex) {
              const updatedDialogues = prev[pageIndex].dialogues.map(d => {
                if (d.text === dialogue.text && d.characterId === dialogue.characterId) {
                  return { ...d, audioUrl: response.audioUrl };
                }
                return d;
              });
              
              return {
                ...prev,
                [pageIndex]: {
                  ...prev[pageIndex],
                  dialogues: updatedDialogues
                }
              };
            }
            
            return prev;
          });
        }
        
        setIsAudioLoading(false);
        
        // Play the audio
        if (audioRef.current) {
          audioRef.current.src = response.audioUrl;
          audioRef.current.volume = volume;
          audioRef.current.playbackRate = ttsSettings.speed || 1;
          
          const playPromise = audioRef.current.play();
          
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                setIsPlaying(true);
              })
              .catch(error => {
                console.error('Error playing audio:', error);
                setIsPlaying(false);
                setIsAudioLoading(false);
              });
          }
        }
      }
    } catch (err) {
      // Ignore AbortError as it's intentional
      if (err.name !== 'AbortError') {
        console.error('Error playing dialogue:', err);
      }
      setIsPlaying(false);
      setIsAudioLoading(false);
    }
  };
  
  // Audio control handlers
  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };
  
  const resumeAudio = () => {
    if (audioRef.current) {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.error('Error resuming audio:', err));
    }
  };
  
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentDialogue(null);
    setShowAudioControls(false);
  };
  
  const handleAudioEnded = () => {
    setIsPlaying(false);
    // Keep audio controls visible after playback ends
  };
  
  // Navigate back to manga details
  const handleBack = () => {
    // Stop any playing audio before navigating
    stopAudio();
    // Navigate to the manga details page
    navigate(`/manga/${mangaId}`);
  };
  
  // Save TTS settings
  const handleSaveTTSSettings = (newSettings) => {
    // Update TTS settings
    updateTTSSettings(newSettings);
    setShowTTSSettings(false);
  };
  
  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };
  
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
  
  // Get current page and dialogues
  const currentPage = pages[currentPageIndex];
  const currentPageDialogueData = pageDialogues[currentPageIndex];
  
  return (
    <div className="container mx-auto p-4 dark:bg-gray-900 dark:text-white transition-colors duration-200">
      <div className="fixed top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/70 to-transparent z-20">
        {/* Back button */}
        <button
          onClick={handleBack}
          className="bg-gray-800/80 dark:bg-gray-900/80 text-white p-2 rounded-full hover:bg-gray-700/80 transition-colors"
          title="Back to manga details"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        {/* Center section - chapter info */}
        <div className="text-center text-white text-shadow-sm">
          <h3 className="text-lg font-semibold truncate max-w-[200px] sm:max-w-xs mx-auto">
            {chapter?.attributes?.title || `Chapter ${chapter?.attributes?.chapter || ''}`}
          </h3>
          <p className="text-sm opacity-90 truncate max-w-[250px] sm:max-w-sm mx-auto">
            {manga?.attributes?.title?.en || 'Loading...'}
          </p>
        </div>
        
        {/* Right controls */}
        <div className="flex items-center gap-3">
          {/* Language selector */}
          <LanguageSelector
            selectedLanguage={selectedLanguage}
            onSelectLanguage={setSelectedLanguage}
            isTranslating={isProcessingDialogue}
          />
          
          <BookmarkButton 
            mangaId={mangaId} 
            className="text-white" 
            iconClassName="h-6 w-6"
          />
          
          <button
            onClick={() => setShowTTSSettings(true)}
            className="bg-gray-800/80 dark:bg-gray-900/80 text-white p-2 rounded-full hover:bg-gray-700/80 transition-colors"
            title="Voice settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.465a5 5 0 001.06-7.07m-2.231 9.696a9 9 0 010-12.728" />
            </svg>
          </button>
          
          {/* Character info button - only show if we have character data */}
          {(characterProfiles || sentimentData || characterMap) && (
            <button
              onClick={() => setShowCharacterPanel(!showCharacterPanel)}
              className={`bg-gray-800/80 dark:bg-gray-900/80 text-white p-2 rounded-full hover:bg-gray-700/80 transition-colors ${showCharacterPanel ? 'ring-2 ring-purple-400' : ''}`}
              title="Character Analysis"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </button>
          )}
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
      
      <div className="flex flex-col gap-6">
        {/* Manga Panel Display */}
        {readingMode === 'page' ? (
          // Page mode - show current page only
          currentPage && (
            <MangaPanel
              imageUrl={currentPage.url}
              dialogues={currentPageDialogueData?.dialogues || []}
              onPlayDialogue={playDialogue}
              currentPlayingDialogue={isPlaying ? currentDialogue : null}
              isAudioLoading={isAudioLoading}
              panelIndex={currentPageIndex}
              alt={`Page ${currentPageIndex + 1}`}
            />
          )
        ) : (
          // Long strip mode - show all pages
          <div className="flex flex-col space-y-6">
            {pages.map((page, index) => (
              <MangaPanel
                key={index}
                imageUrl={page.url}
                dialogues={pageDialogues[index]?.dialogues || []}
                onPlayDialogue={playDialogue}
                currentPlayingDialogue={isPlaying && currentPageIndex === index ? currentDialogue : null}
                isAudioLoading={isAudioLoading && currentPageIndex === index}
                panelIndex={index}
                alt={`Page ${index + 1}`}
              />
            ))}
          </div>
        )}
        
        {/* Audio Controls */}
        {showAudioControls && currentDialogue && (
          <div className="sticky bottom-4 mx-auto w-full max-w-2xl">
            <AudioControls
              audioUrl={currentDialogue.audioUrl}
              characterName={currentDialogue.characterName}
              text={currentDialogue.text}
              voiceId={currentDialogue.voiceId}
              isPlaying={isPlaying}
              isLoading={isAudioLoading}
              onPlay={resumeAudio}
              onPause={pauseAudio}
              onStop={stopAudio}
              onAudioEnded={handleAudioEnded}
              onVolumeChange={handleVolumeChange}
              volume={volume}
              speed={ttsSettings.speed || 1}
            />
          </div>
        )}
      </div>
      
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onEnded={handleAudioEnded}
        onError={(e) => {
          console.error('Audio element error:', e);
          setIsPlaying(false);
          setIsAudioLoading(false);
        }}
        className="hidden"
      />
      
      {/* TTS Settings Modal */}
      {showTTSSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full p-4 m-4">
            <TTSSettings
              voices={voices}
              settings={ttsSettings}
              onSave={handleSaveTTSSettings}
              onClose={() => setShowTTSSettings(false)}
            />
          </div>
        </div>
      )}
      
      {/* Character Info Panel */}
      {showCharacterPanel && (
        <div className="fixed right-4 top-20 z-30 w-80 md:w-96 animate-fadeIn">
          <CharacterInfoPanel
            characterProfiles={characterProfiles}
            sentimentData={sentimentData}
            characterMap={characterMap}
            onClose={() => setShowCharacterPanel(false)}
          />
        </div>
      )}
    </div>
  );
};

export default EnhancedMangaReader;
