/**
 * API service for MangaVox application
 */

// Base API URL - adjust if your backend is on a different port/host
const API_BASE_URL = '/api';

// Generic error handler for API requests
const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error || `HTTP error ${response.status}`;
    throw new Error(errorMessage);
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
    .then(handleResponse),
    
  // Assign voices to characters
  assignVoices: (mangaId, chapterId, characters) =>
    fetch(`${API_BASE_URL}/manga/assign-voices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mangaId, chapterId, characters })
    })
    .then(handleResponse)
};

// Voice and TTS API endpoints
export const voiceAPI = {
  // Get available voices
  getVoices: () =>
    fetch(`${API_BASE_URL}/voices`)
      .then(handleResponse),
      
  // Generate speech from text
  generateSpeech: (text, voiceId) =>
    fetch(`${API_BASE_URL}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceId })
    })
    .then(handleResponse)
};

export default {
  manga: mangaAPI,
  voice: voiceAPI
};
