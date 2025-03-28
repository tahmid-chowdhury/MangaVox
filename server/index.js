// server/index.js
const express = require('express');
const { createClient } = require('redis');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

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
    const cacheKey = `manga:search:${query}:${limit}:${offset}`;
    
    // Check cache first
    const cachedResult = await redisClient.get(cacheKey);
    if (cachedResult) {
      return res.json(JSON.parse(cachedResult));
    }
    
    // If not in cache, fetch from MangaDex
    const response = await axios.get(`${MANGADEX_API}/manga`, {
      params: {
        title: query,
        limit,
        offset,
        includes: ['cover_art', 'author', 'artist'],
        contentRating: ['safe', 'suggestive', 'erotica'],
        order: { relevance: 'desc' }
      }
    });
    
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
    
    if (!pages || !Array.isArray(pages) || pages.length === 0) {
      return res.status(400).json({ error: 'No pages provided' });
    }
    
    // Cache key based on manga ID, chapter ID and page count
    const cacheKey = `dialogue:${mangaId}:${chapterId}:${pages.length}`;
    
    // Check cache first
    const cachedResult = await redisClient.get(cacheKey);
    if (cachedResult) {
      return res.json(JSON.parse(cachedResult));
    }
    
    // Use OpenRouter's DeepSeek R1 API to extract dialogue
    const response = await axios.post(
      `${OPENROUTER_API}/chat/completions`,
      {
        model: "deepseek-ai/deepseek-coder-33b-instruct",
        messages: [
          {
            role: "system", 
            content: "You are a comic dialogue extractor. Extract all dialogue from manga pages, identifying characters and their speech bubbles."
          },
          {
            role: "user",
            content: `Extract dialogue from these manga pages. For each panel, identify the character speaking and their dialogue. The manga ID is ${mangaId}, chapter ID is ${chapterId}. Page URLs: ${JSON.stringify(pages)}`
          }
        ]
      }, 
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Process the generated response to structure dialogue
    const dialogueText = response.data.choices[0].message.content;
    
    // Parse the dialogue extraction into structured data
    // (In a real implementation, this would be more sophisticated)
    const parsedDialogue = {
      mangaId,
      chapterId,
      dialogue: dialogueText,
      timestamp: new Date().toISOString()
    };
    
    // Cache the result for 24 hours
    await redisClient.set(cacheKey, JSON.stringify(parsedDialogue), { EX: 86400 });
    
    res.json(parsedDialogue);
  } catch (error) {
    console.error('Error extracting dialogue:', error.message);
    res.status(500).json({ error: error.message });
  }
});

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
    
    // Get available voices
    const voicesResponse = await axios.get(`${ELEVENLABS_API}/voices`, {
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      }
    });
    
    const voices = voicesResponse.data.voices;
    
    // Use OpenRouter's DeepSeek R1 to assign voices to characters
    const response = await axios.post(
      `${OPENROUTER_API}/chat/completions`,
      {
        model: "deepseek-ai/deepseek-coder-33b-instruct",
        messages: [
          {
            role: "system", 
            content: "You are an expert in voice casting. Your task is to match character personalities with appropriate voices."
          },
          {
            role: "user",
            content: `Assign the most appropriate voice to each character for manga ID ${mangaId}, chapter ${chapterId}. Characters: ${JSON.stringify(characters)}. Available voices: ${JSON.stringify(voices)}. Return JSON format with character name as key and voice ID as value.`
          }
        ]
      }, 
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const voiceAssignmentText = response.data.choices[0].message.content;
    
    // Extract JSON from response (the LLM might wrap it with text)
    const jsonMatch = voiceAssignmentText.match(/\{[\s\S]*\}/);
    let voiceAssignments = {};
    
    if (jsonMatch) {
      try {
        voiceAssignments = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error('Error parsing voice assignments:', e);
        voiceAssignments = { error: 'Failed to parse voice assignments' };
      }
    }
    
    // Store the voice assignments in Redis
    const assignmentKey = `voices:${mangaId}:${chapterId}`;
    await redisClient.set(assignmentKey, JSON.stringify(voiceAssignments), { EX: 86400 * 30 }); // Cache for 30 days
    
    res.json({ voiceAssignments });
  } catch (error) {
    console.error('Error assigning voices:', error.message);
    res.status(500).json({ error: error.message });
  }
});

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
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
