/**
 * API service for MangaVox application
 */

// Base API URL - adjust if your backend is on a different port/host
const API_BASE_URL = '/api';

// Generic error handler for API requests
const handleResponse = async (response) => {
  if (!response.ok) {
    try {
      const errorData = await response.json();
      const errorMessage = errorData.error || `HTTP error ${response.status}`;
      throw new Error(errorMessage);
    } catch (e) {
      // If parsing JSON fails, use a generic error message
      throw new Error(`HTTP error ${response.status}`);
    }
  }
  return response.json();
};

// Manga API endpoints
export const mangaAPI = {
  // Search for manga by title
  search: (query, limit = 20, offset = 0) => 
    fetch(`${API_BASE_URL}/manga/search?query=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`)
      .then(handleResponse),
      
  // Get manga details by ID
  getDetails: (mangaId) =>
    fetch(`${API_BASE_URL}/manga/${mangaId}`)
      .then(handleResponse),
  
  // Get manga chapters
  getChapters: (mangaId, language = 'en', limit = 100, offset = 0) =>
    fetch(`${API_BASE_URL}/manga/${mangaId}/chapters?translatedLanguage=${language}&limit=${limit}&offset=${offset}`)
      .then(handleResponse),
      
  // Get chapter pages
  getChapterPages: (chapterId) =>
    fetch(`${API_BASE_URL}/chapter/${chapterId}/pages`)
      .then(handleResponse),
    
  // Extract dialogue from manga pages  
  extractDialogue: (mangaId, chapterId, pages) =>
    fetch(`${API_BASE_URL}/manga/extract-dialogue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mangaId, chapterId, pages })
    })
    .then(response => {
      // Even if there's an error in processing, we'll handle the response
      // as long as the server returns a valid JSON response
      if (response.status === 200 || response.status === 500) {
        return response.json();
      }
      // For other errors, use our standard error handler
      return handleResponse(response);
    })
    .catch(error => {
      console.error('API error in extractDialogue:', error);
      // Return fallback dialogue even if request completely fails
      return {
        dialogue: "Character 1: I can't seem to read the dialogue in this manga.\nCharacter 2: Let's enjoy the art instead!\nNarrator: The application encountered a network error.",
        error: error.message
      };
    }),
    
  // Assign voices to characters
  assignVoices: (mangaId, chapterId, characters) =>
    fetch(`${API_BASE_URL}/manga/assign-voices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mangaId, chapterId, characters })
    })
    .then(response => {
      // Even if there's an error in processing, we'll handle the response
      // as long as the server returns valid JSON
      if (response.status === 200 || response.status === 500) {
        return response.json();
      }
      // For other errors, use our standard error handler
      return handleResponse(response);
    })
    .catch(error => {
      console.error('API error in assignVoices:', error);
      // Return empty assignments as a fallback
      return {
        voiceAssignments: {},
        error: error.message
      };
    })
};

// Voice and TTS API endpoints
export const voiceAPI = {
  // Get available voices
  getVoices: () =>
    fetch(`${API_BASE_URL}/voices`)
      .then(handleResponse),
      
  // Generate speech from text with abort capability
  generateSpeech: (text, voiceId, signal) =>
    fetch(`${API_BASE_URL}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceId }),
      signal // Add the AbortSignal to allow cancellation
    })
    .then(handleResponse)
    .catch(error => {
      if (error.name === 'AbortError') {
        console.log('TTS request was cancelled');
        throw error; // Re-throw AbortError to be handled by caller
      }
      console.error('Error generating speech:', error);
      throw error;
    })
};

export default {
  manga: mangaAPI,
  voice: voiceAPI
};
