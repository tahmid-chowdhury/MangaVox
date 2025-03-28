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
      
  // Get popular manga
  getPopular: (limit = 20, offset = 0) =>
    fetch(`${API_BASE_URL}/manga/search?limit=${limit}&offset=${offset}&order[followedCount]=desc`)
      .then(handleResponse),
      
  // Get manga details by ID
  getDetails: (mangaId) =>
    fetch(`${API_BASE_URL}/manga/${mangaId}`)
      .then(handleResponse),
  
  // Get manga chapters (single page)
  getChapters: (mangaId, language = 'en', limit = 100, offset = 0) =>
    fetch(`${API_BASE_URL}/manga/${mangaId}/chapters?translatedLanguage=${language}&limit=${limit}&offset=${offset}`)
      .then(handleResponse),
  
  // Get ALL manga chapters (handles pagination automatically)
  getAllChapters: async (mangaId, language = 'en') => {
    try {
      let allChapters = [];
      let hasMore = true;
      let offset = 0;
      const limit = 100; // API limit per request
      let totalChapters = 0;
      
      // Show progress in console
      console.log('Starting to fetch all chapters...');
      
      // Fetch chapters until there are no more
      while (hasMore) {
        const response = await fetch(`${API_BASE_URL}/manga/${mangaId}/chapters?translatedLanguage=${language}&limit=${limit}&offset=${offset}`)
          .then(handleResponse);
        
        if (!response || !response.data) {
          throw new Error('Invalid response from API');
        }
        
        // Add fetched chapters to our collection
        allChapters = [...allChapters, ...response.data];
        
        // Get total for logging purposes if this is the first request
        if (offset === 0) {
          totalChapters = response.total;
          console.log(`Found ${totalChapters} total chapters.`);
        }
        
        console.log(`Fetched ${allChapters.length}/${totalChapters} chapters`);
        
        // Check if we need to fetch more chapters
        offset += limit;
        hasMore = response.total > offset && response.data.length === limit;
      }
      
      console.log(`Finished fetching all ${allChapters.length} chapters.`);
      
      // Return in the same format as the original API response
      return {
        result: 'ok',
        data: allChapters,
        limit: allChapters.length,
        offset: 0,
        total: allChapters.length
      };
    } catch (error) {
      console.error('Error fetching all chapters:', error);
      throw error;
    }
  },
      
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
