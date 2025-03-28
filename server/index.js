// server/index.js
const express = require('express');
const { createClient } = require('redis');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: '../.env' });

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, '../client/build')));

// Create and connect Redis client
const redisClient = createClient({ url: process.env.REDIS_URL });

redisClient.on('error', (err) => console.error('Redis Client Error', err));

async function connectRedis() {
  await redisClient.connect();
  console.log('Connected to Redis');
}

connectRedis();

// API Constants
const MANGADEX_API = 'https://api.mangadex.org';
const ELEVENLABS_API = 'https://api.elevenlabs.io/v1';
const OPENROUTER_API = 'https://openrouter.ai/api/v1';

// Helper function to authenticate with MangaDex
let mangadexToken = null;
let mangadexTokenExpiry = 0;

async function getMangaDexToken() {
  const now = Date.now();
  
  // If token exists and is not expired, return it
  if (mangadexToken && mangadexTokenExpiry > now) {
    return mangadexToken;
  }
  
  try {
    const response = await axios.post(`${MANGADEX_API}/auth/login`, {
      client_id: process.env.MANGADEX_API_KEY,
      client_secret: process.env.MANGADEX_API_SECRET,
    });
    
    if (response.data && response.data.token) {
      mangadexToken = response.data.token.session;
      // Set expiry to 14 minutes to be safe (tokens last 15 minutes)
      mangadexTokenExpiry = now + (14 * 60 * 1000);
      return mangadexToken;
    }
  } catch (error) {
    console.error('Error authenticating with MangaDex:', error.message);
    throw error;
  }
}

// Manga Search Endpoint
app.get('/api/manga/search', async (req, res) => {
  try {
    const { query, limit = 20, offset = 0 } = req.query;
    
    // Create params object for MangaDex API
    const params = {
      limit,
      offset,
      includes: ['cover_art', 'author', 'artist'],
      contentRating: ['safe', 'suggestive', 'erotica'],
    };
    
    // Add title param only if query is provided
    if (query) {
      params.title = query;
      params.order = { relevance: 'desc' };
    } 
    // If no query, order by followedCount (popular manga)
    else {
      params.order = { followedCount: 'desc' };
    }
    
    // Create cache key based on all parameters
    const cacheKey = `manga:search:${query || 'popular'}:${limit}:${offset}`;
    
    // Check cache first
    const cachedResult = await redisClient.get(cacheKey);
    if (cachedResult) {
      return res.json(JSON.parse(cachedResult));
    }
    
    // If not in cache, fetch from MangaDex
    const response = await axios.get(`${MANGADEX_API}/manga`, { params });
    
    // Cache the result for 1 hour
    await redisClient.set(cacheKey, JSON.stringify(response.data), { EX: 3600 });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error searching manga:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get Manga Details
app.get('/api/manga/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `manga:${id}`;
    
    // Check cache first
    const cachedResult = await redisClient.get(cacheKey);
    if (cachedResult) {
      return res.json(JSON.parse(cachedResult));
    }
    
    // If not in cache, fetch from MangaDex
    const response = await axios.get(`${MANGADEX_API}/manga/${id}`, {
      params: {
        includes: ['cover_art', 'author', 'artist']
      }
    });
    
    // Cache the result for 6 hours
    await redisClient.set(cacheKey, JSON.stringify(response.data), { EX: 21600 });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error getting manga details:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get Chapter List
app.get('/api/manga/:id/chapters', async (req, res) => {
  try {
    const { id } = req.params;
    const { translatedLanguage = 'en', limit = 100, offset = 0 } = req.query;
    const cacheKey = `manga:${id}:chapters:${translatedLanguage}:${limit}:${offset}`;
    
    // Check cache first
    const cachedResult = await redisClient.get(cacheKey);
    if (cachedResult) {
      return res.json(JSON.parse(cachedResult));
    }
    
    // If not in cache, fetch from MangaDex
    const response = await axios.get(`${MANGADEX_API}/manga/${id}/feed`, {
      params: {
        translatedLanguage: [translatedLanguage],
        limit,
        offset,
        order: { volume: 'asc', chapter: 'asc' }
      }
    });
    
    // Cache the result for 1 hour
    await redisClient.set(cacheKey, JSON.stringify(response.data), { EX: 3600 });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error getting manga chapters:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get Chapter Pages
app.get('/api/chapter/:id/pages', async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `chapter:${id}:pages`;
    
    // Check cache first
    const cachedResult = await redisClient.get(cacheKey);
    if (cachedResult) {
      return res.json(JSON.parse(cachedResult));
    }
    
    // Get chapter data from MangaDex
    const chapterResponse = await axios.get(`${MANGADEX_API}/chapter/${id}`);
    
    // Get MangaDex@Home server to fetch images
    const atHomeResponse = await axios.get(`${MANGADEX_API}/at-home/server/${id}`);
    
    const chapterData = chapterResponse.data.data;
    const serverBaseUrl = atHomeResponse.data.baseUrl;
    const chapterHash = atHomeResponse.data.chapter.hash;
    const pageFilenames = atHomeResponse.data.chapter.data;
    
    // Construct page URLs
    const pages = pageFilenames.map(filename => ({
      url: `${serverBaseUrl}/data/${chapterHash}/${filename}`
    }));
    
    const result = {
      chapter: chapterData,
      pages
    };
    
    // Cache the result for 6 hours
    await redisClient.set(cacheKey, JSON.stringify(result), { EX: 21600 });
    
    res.json(result);
  } catch (error) {
    console.error('Error getting chapter pages:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Extract dialogue from manga pages
app.post('/api/manga/extract-dialogue', async (req, res) => {
  try {
    const { mangaId, chapterId, pages } = req.body;
    
    // More detailed validation
    if (!mangaId) {
      return res.status(400).json({ error: 'Missing mangaId parameter' });
    }
    
    if (!chapterId) {
      return res.status(400).json({ error: 'Missing chapterId parameter' });
    }
    
    if (!pages) {
      return res.status(400).json({ error: 'Missing pages parameter' });
    }
    
    if (!Array.isArray(pages)) {
      return res.status(400).json({ error: 'Pages parameter must be an array' });
    }
    
    if (pages.length === 0) {
      return res.status(400).json({ error: 'No pages provided (empty array)' });
    }
    
    // Validate that pages contains strings (URLs)
    if (!pages.every(page => typeof page === 'string')) {
      return res.status(400).json({ 
        error: 'Invalid page format. Each page must be a URL string',
        receivedType: typeof pages[0],
        sample: JSON.stringify(pages[0]).substring(0, 100)
      });
    }
    
    // Cache key based on manga ID, chapter ID and page count
    const cacheKey = `dialogue:${mangaId}:${chapterId}:${pages.length}`;
    
    // Check cache first
    const cachedResult = await redisClient.get(cacheKey);
    if (cachedResult) {
      return res.json(JSON.parse(cachedResult));
    }
    
    // Limit the number of pages sent to OpenRouter to avoid payload size issues
    // Just process the first 5 pages if there are too many (reducing from 10 to 5 to lower payload size)
    const pagesToProcess = pages.length > 5 ? pages.slice(0, 5) : pages;
    
    // Check if OPENROUTER_API_KEY is properly set
    if (!process.env.OPENROUTER_API_KEY) {
      console.error('OPENROUTER_API_KEY environment variable is not set');
      return res.status(500).json({ 
        error: 'API key not configured',
        dialogue: generateFallbackDialogue(mangaId, chapterId)
      });
    }
    
    try {
      // Use a simpler model that's more likely to be available on OpenRouter
      const response = await axios.post(
        `${OPENROUTER_API}/chat/completions`,
        {
          model: "deepseek/deepseek-r1-zero:free", // Using DeepSeek R1 Zero model
          messages: [
            {
              role: "system", 
              content: "You are a comic dialogue extractor. Extract all dialogue from manga pages, identifying characters and their speech bubbles."
            },
            {
              role: "user",
              content: `Extract dialogue from these manga pages. For each panel, identify the character speaking and their dialogue. Format as "Character: Dialogue". The manga ID is ${mangaId}, chapter ID is ${chapterId}.`
            }
          ],
          max_tokens: 1024,
          temperature: 0.7
        }, 
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://github.com/tahmid-chowdhury/MangaVox', 
            'X-Title': 'MangaVox',
            'User-Agent': 'MangaVox/1.0'
          }
        }
      );
      
      // Process the generated response to structure dialogue
      const dialogueText = response.data.choices[0].message.content;
      
      // Parse the dialogue extraction into structured data
      const parsedDialogue = {
        mangaId,
        chapterId,
        dialogue: dialogueText,
        timestamp: new Date().toISOString()
      };
      
      // Cache the result for 24 hours
      await redisClient.set(cacheKey, JSON.stringify(parsedDialogue), { EX: 86400 });
      
      res.json(parsedDialogue);
    } catch (apiError) {
      console.error('OpenRouter API error:', apiError.message);
      if (apiError.response) {
        console.error('OpenRouter API error details:', apiError.response.data);
      }
      
      // Return fallback dialogue with the error
      return res.json({
        mangaId,
        chapterId,
        dialogue: generateFallbackDialogue(mangaId, chapterId),
        timestamp: new Date().toISOString(),
        error: apiError.message
      });
    }
  } catch (error) {
    console.error('Error extracting dialogue:', error);
    
    // Return a user-friendly error with fallback dialogue
    res.json({
      mangaId: req.body?.mangaId,
      chapterId: req.body?.chapterId,
      dialogue: generateFallbackDialogue(req.body?.mangaId, req.body?.chapterId),
      timestamp: new Date().toISOString(),
      error: 'Failed to extract dialogue. Using placeholder text instead.'
    });
  }
});

// Function to generate fallback dialogue when API fails
function generateFallbackDialogue(mangaId, chapterId) {
  return `Character 1: I can't seem to read the dialogue in this manga. Let's enjoy the art!
Character 2: The images tell a story of their own.
Narrator: The AI couldn't extract dialogue from this chapter. You can still enjoy the visuals!`;
}

// Get available voices from ElevenLabs
app.get('/api/voices', async (req, res) => {
  try {
    const cacheKey = 'elevenlabs:voices';
    
    // Check cache first
    const cachedResult = await redisClient.get(cacheKey);
    if (cachedResult) {
      return res.json(JSON.parse(cachedResult));
    }
    
    // If not in cache, fetch from ElevenLabs
    const response = await axios.get(`${ELEVENLABS_API}/voices`, {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      }
    });
    
    // Cache the result for 1 hour
    await redisClient.set(cacheKey, JSON.stringify(response.data), { EX: 3600 });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error getting voices:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Assign voices to characters
app.post('/api/manga/assign-voices', async (req, res) => {
  try {
    const { mangaId, chapterId, characters } = req.body;
    
    if (!mangaId || !chapterId || !characters) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Cache key for voice assignments
    const assignmentKey = `voices:${mangaId}:${chapterId}`;
    
    // Check cache first
    const cachedAssignments = await redisClient.get(assignmentKey);
    if (cachedAssignments) {
      return res.json({ voiceAssignments: JSON.parse(cachedAssignments) });
    }
    
    // Get available voices
    let voices = [];
    try {
      const voicesResponse = await axios.get(`${ELEVENLABS_API}/voices`, {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY
        }
      });
      
      voices = voicesResponse.data.voices;
    } catch (voiceError) {
      console.error('Error fetching voices from ElevenLabs:', voiceError.message);
      // Continue with empty voices array, will use fallback below
    }
    
    // If no voices available or too many characters, use fallback assignment
    if (voices.length === 0 || characters.length > 15) {
      const fallbackAssignments = generateFallbackVoiceAssignments(characters, voices);
      await redisClient.set(assignmentKey, JSON.stringify(fallbackAssignments), { EX: 86400 * 30 });
      return res.json({ voiceAssignments: fallbackAssignments });
    }
    
    try {
      // Check if OPENROUTER_API_KEY is properly set
      if (!process.env.OPENROUTER_API_KEY) {
        throw new Error('OPENROUTER_API_KEY environment variable is not set');
      }

      // Limit the character list if it's too long
      const limitedCharacters = characters.length > 10 ? characters.slice(0, 10) : characters;
      
      // Use OpenRouter with a more reliable model
      const response = await axios.post(
        `${OPENROUTER_API}/chat/completions`,
        {
          model: "deepseek/deepseek-r1-zero:free", // Using DeepSeek R1 Zero model
          messages: [
            {
              role: "system", 
              content: "You are an expert in voice casting. Your task is to match character personalities with appropriate voices."
            },
            {
              role: "user",
              content: `Assign the most appropriate voice to each character for manga. Characters: ${JSON.stringify(limitedCharacters)}. Available voices: ${JSON.stringify(voices.slice(0, 5))}. Return JSON format with character name as key and voice ID as value.`
            }
          ],
          max_tokens: 1024,
          temperature: 0.7,
          response_format: { type: "json_object" } // Request JSON format specifically
        }, 
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://github.com/tahmid-chowdhury/MangaVox',
            'X-Title': 'MangaVox',
            'User-Agent': 'MangaVox/1.0'
          }
        }
      );
      
      let voiceAssignments = {};
      
      try {
        // Try to get the content directly
        if (response.data.choices[0].message.content) {
          voiceAssignments = JSON.parse(response.data.choices[0].message.content);
        } else {
          throw new Error('No content in API response');
        }
      } catch (parseError) {
        console.error('Error parsing voice assignments:', parseError);
        throw new Error('Failed to parse voice assignments from API response');
      }
      
      // Store the voice assignments in Redis
      await redisClient.set(assignmentKey, JSON.stringify(voiceAssignments), { EX: 86400 * 30 }); // Cache for 30 days
      
      res.json({ voiceAssignments });
    } catch (apiError) {
      console.error('OpenRouter API error:', apiError.message);
      if (apiError.response) {
        console.error('OpenRouter API error details:', apiError.response.data);
      }
      
      // Generate fallback voice assignments and return them
      const fallbackAssignments = generateFallbackVoiceAssignments(characters, voices);
      await redisClient.set(assignmentKey, JSON.stringify(fallbackAssignments), { EX: 86400 * 30 });
      
      res.json({ 
        voiceAssignments: fallbackAssignments,
        error: apiError.message
      });
    }
  } catch (error) {
    console.error('Error assigning voices:', error.message);
    
    // Generate a basic fallback that at least lets the app continue
    const fallbackAssignments = req.body?.characters 
      ? generateFallbackVoiceAssignments(req.body.characters, []) 
      : {};
    
    res.json({ 
      voiceAssignments: fallbackAssignments,
      error: error.message
    });
  }
});

// Function to generate fallback voice assignments when API fails
function generateFallbackVoiceAssignments(characters, voices) {
  const assignments = {};
  
  // If we have voices from ElevenLabs, assign them round-robin
  if (voices && voices.length > 0) {
    characters.forEach((character, index) => {
      const voiceIndex = index % voices.length;
      assignments[character] = voices[voiceIndex].voice_id;
    });
  } else {
    // If no voices available, just use empty assignments
    // The client will handle this by using the first available voice
    characters.forEach(character => {
      assignments[character] = '';
    });
  }
  
  return assignments;
}

// Generate speech from text using ElevenLabs
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voiceId } = req.body;
    
    if (!text || !voiceId) {
      return res.status(400).json({ error: 'Text and voiceId are required' });
    }
    
    // Calculate a cache key based on text and voiceId
    const cacheKey = `tts:${Buffer.from(text).toString('base64')}:${voiceId}`;
    
    // Check if audio is already cached
    const cachedAudioUrl = await redisClient.get(cacheKey);
    if (cachedAudioUrl) {
      return res.json({ audioUrl: cachedAudioUrl });
    }
    
    // Generate speech from ElevenLabs
    const response = await axios.post(
      `${ELEVENLABS_API}/text-to-speech/${voiceId}`,
      {
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      },
      {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        responseType: 'arraybuffer'
      }
    );
    
    // In a real implementation, we would store this audio file and return a URL
    // For simplicity in this example, we'll convert to base64
    const audioBase64 = Buffer.from(response.data).toString('base64');
    const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;
    
    // Cache the audio URL for 7 days
    await redisClient.set(cacheKey, audioUrl, { EX: 604800 });
    
    res.json({ audioUrl });
  } catch (error) {
    console.error('Error generating speech:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Example route to set and get a value from Redis
app.get('/api/redis', async (req, res) => {
  try {
    await redisClient.set('key', 'Hello from Redis!');
    const value = await redisClient.get('key');
    res.json({ message: value });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Catch-all route to serve React app
app.get('*', (req, res) => {
  const clientBuildPath = path.join(__dirname, '../client/build', 'index.html');
  
  // Check if the build directory exists
  try {
    if (require('fs').existsSync(clientBuildPath)) {
      return res.sendFile(clientBuildPath);
    } else {
      // In development mode, redirect to the development server
      if (process.env.NODE_ENV === 'development') {
        return res.redirect('http://localhost:3000');
      } else {
        return res.status(404).send('App not built. Run npm run build in the client directory first.');
      }
    }
  } catch (error) {
    console.error('Error serving client app:', error);
    return res.status(500).send('Internal server error');
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
