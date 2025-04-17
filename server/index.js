// server/index.js
const express = require('express');
const { createClient } = require('redis');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
require('dotenv').config({ path: '../.env' });

// Replace any util._extend usage with Object.assign
const util = require('util');
if (util._extend) {
  util._extend = Object.assign;
}

const app = express();
const port = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server with a specific path to match client
const wss = new WebSocket.Server({ 
  server,
  path: '/websocket', // Match the client path
  clientTracking: true,
});

// Track connected clients
const clients = new Set();
let pingInterval = null;

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  console.log(`WebSocket client connected from ${ip}`);
  
  // Add this client to our set
  clients.add(ws);
  
  // Set up alive flag
  ws.isAlive = true;
  
  // Handle pong responses from client
  ws.on('pong', () => {
    ws.isAlive = true;
  });
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('Received message:', data);
      
      // Handle different message types here
      if (data.type === 'heartbeat') {
        ws.send(JSON.stringify({ 
          type: 'heartbeat', 
          timestamp: new Date().toISOString() 
        }));
      }
      
      // Add more message handlers as needed
    } catch (e) {
      console.error('Error processing message:', e);
    }
  });
  
  ws.on('close', (code, reason) => {
    console.log(`WebSocket client disconnected: ${code} - ${reason}`);
    clients.delete(ws);
  });
  
  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
    clients.delete(ws);
  });
  
  // Send a welcome message
  ws.send(JSON.stringify({ 
    type: 'connection', 
    status: 'connected',
    message: 'Connected to MangaVox WebSocket server',
    timestamp: new Date().toISOString() 
  }));
});

// Setup ping interval when server starts
function setupPingInterval() {
  // Clear any existing interval
  if (pingInterval) {
    clearInterval(pingInterval);
  }
  
  // Ping all clients every 15 seconds to keep connections alive
  pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        console.log('Terminating inactive WebSocket connection');
        return ws.terminate();
      }
      
      ws.isAlive = false;
      try {
        ws.ping();
      } catch (e) {
        console.error('Error pinging client:', e);
        ws.terminate();
      }
    });
  }, 15000);
}

// Start the ping interval
setupPingInterval();

// Clean up interval on server shutdown
process.on('SIGINT', () => {
  console.log('Shutting down WebSocket server');
  if (pingInterval) {
    clearInterval(pingInterval);
  }
  wss.close();
  process.exit(0);
});

// Broadcast message to all connected clients
function broadcast(data) {
  const message = JSON.stringify(data);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

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

// LLM Processing Middleware
const llmProcessor = {
  // Default model configuration
  defaultConfig: {
    model: "google/gemini-2.0-flash-001",
    temperature: 0.3,
    top_p: 0.95,
    max_tokens: 1024,
    timeout: 30000,
  },
  
  /**
   * Process text with Gemini 2.0 Flash via OpenRouter
   * @param {string|Object} systemPrompt - Instructions for the AI (string or content object)
   * @param {string|Object|Array} userPrompt - User input to process (string, content object, or array of content objects)
   * @param {Object} options - Additional options like model, temperature, etc.
   * @returns {Promise<Object>} - The AI response
   */
  async process(systemPrompt, userPrompt, options = {}) {
    // Validate API key
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY environment variable not set');
    }
    
    try {
      // Merge default config with provided options
      const config = { ...this.defaultConfig, ...options };
      
      // Prepare messages array
      const messages = [];
      
      // Add system message if provided
      if (systemPrompt) {
        messages.push({ 
          role: "system", 
          content: typeof systemPrompt === 'string' ? systemPrompt : systemPrompt
        });
      }
      
      // Format user prompt correctly based on type
      if (userPrompt) {
        // Case 1: Simple string prompt
        if (typeof userPrompt === 'string') {
          messages.push({ 
            role: "user", 
            content: userPrompt 
          });
        }
        // Case 2: Array of content objects (multimodal input)
        else if (Array.isArray(userPrompt)) {
          messages.push({
            role: "user",
            content: userPrompt
          });
        }
        // Case 3: Single content object
        else {
          messages.push({
            role: "user",
            content: [userPrompt]
          });
        }
      }
      
      // Prepare request payload
      const requestPayload = {
        model: config.model,
        messages: messages,
        max_tokens: config.max_tokens,
        temperature: config.temperature,
        top_p: config.top_p
      };
      
      // Add response_format if specified (using the correct snake_case for API)
      if (config.responseFormat) {
        requestPayload.response_format = config.responseFormat;
      }
      
      // Make request to OpenRouter
      const response = await axios.post(
        `${OPENROUTER_API}/chat/completions`,
        requestPayload,
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://github.com/tahmid-chowdhury/MangaVox',
            'X-Title': 'MangaVox',
            'User-Agent': 'MangaVox/1.0'
          },
          timeout: config.timeout
        }
      );
      
      // Basic validation of response
      if (!response.data?.choices?.[0]?.message?.content) {
        console.error('Invalid OpenRouter response structure:', JSON.stringify(response.data));
        throw new Error('Invalid response structure from LLM API');
      }
      
      return {
        content: response.data.choices[0].message.content,
        usage: response.data.usage,
        model: response.data.model,
        success: true
      };
    } catch (error) {
      console.error(`LLM Processing Error: ${error.message}`);
      if (error.response?.data) {
        console.error('API error details:', error.response.data);
      }
      
      return {
        error: error.message,
        success: false
      };
    }
  },
  
  /**
   * Extract JSON from LLM response text
   * @param {string} text - Text potentially containing JSON
   * @returns {Object|null} - Parsed JSON or null if invalid
   */
  extractJSON(text) {
    try {
      // First try to parse the entire response as JSON
      return JSON.parse(text);
    } catch (e) {
      try {
        // Try to find JSON within the text using regex
        const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      } catch (innerError) {
        console.error('Error extracting JSON from LLM response:', innerError.message);
      }
      return null;
    }
  }
};

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
    
    // If not in cache, fetch from MangaDex with timeout
    const response = await axios.get(`${MANGADEX_API}/manga/${id}/feed`, {
      params: {
        translatedLanguage: [translatedLanguage],
        limit,
        offset,
        order: { volume: 'asc', chapter: 'asc' }
      },
      timeout: 15000 // 15 second timeout
    });
    
    // Cache the result for 1 hour
    await redisClient.set(cacheKey, JSON.stringify(response.data), { EX: 3600 });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error getting manga chapters:', error.message);
    res.status(500).json({ 
      error: error.message,
      message: "Failed to fetch chapters. Please try again later."
    });
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

// Extract dialogue from manga pages with enhanced AI processing
app.post('/api/manga/extract-dialogue', async (req, res) => {
  try {
    const { mangaId, chapterId, pages } = req.body;
    
    // Validation
    if (!mangaId || !chapterId || !pages) {
      return res.status(400).json({ 
        error: 'Missing required parameters. mangaId, chapterId, and pages are required.',
        receivedParams: { mangaId: !!mangaId, chapterId: !!chapterId, pages: !!pages }
      });
    }
    
    if (!Array.isArray(pages)) {
      return res.status(400).json({ error: 'Pages parameter must be an array' });
    }
    
    if (pages.length === 0) {
      return res.status(400).json({ error: 'No pages provided (empty array)' });
    }
    
    // Validate that pages contains strings (URLs)
    if (!pages.every(page => typeof page === 'string' || (typeof page === 'object' && page.url))) {
      return res.status(400).json({ 
        error: 'Invalid page format. Each page must be a URL string or object with url property',
        receivedType: typeof pages[0],
        sample: JSON.stringify(pages[0]).substring(0, 100)
      });
    }
    
    // Normalize pages to always be an array of URLs
    const pageUrls = pages.map(page => typeof page === 'string' ? page : page.url);
    
    // Cache key based on manga ID, chapter ID and page list
    const pageUrlsHash = require('crypto')
      .createHash('md5')
      .update(pageUrls.join(','))
      .digest('hex');
    const cacheKey = `dialogue:${mangaId}:${chapterId}:${pageUrlsHash}`;
    
    // Check cache first
    const cachedResult = await redisClient.get(cacheKey);
    if (cachedResult) {
      console.log(`Using cached dialogue for manga ${mangaId}, chapter ${chapterId}`);
      return res.json(JSON.parse(cachedResult));
    }
    
    // Fetch manga information to provide context to the AI
    let mangaTitle = '';
    let mangaGenres = [];
    let chapterTitle = '';
    
    try {
      // Get manga details for better context
      const mangaDetailsResponse = await axios.get(`${MANGADEX_API}/manga/${mangaId}`);
      const mangaData = mangaDetailsResponse.data.data;
      
      // Extract title in English or first available language
      if (mangaData.attributes?.title) {
        mangaTitle = mangaData.attributes.title.en || Object.values(mangaData.attributes.title)[0] || '';
      }
      
      // Extract genres
      if (mangaData.attributes?.tags) {
        mangaGenres = mangaData.attributes.tags
          .filter(tag => tag.attributes?.group === 'genre')
          .map(tag => tag.attributes?.name?.en || Object.values(tag.attributes?.name || {})[0] || '')
          .filter(Boolean);
      }
      
      // Get chapter info
      const chapterResponse = await axios.get(`${MANGADEX_API}/chapter/${chapterId}`);
      const chapterData = chapterResponse.data.data;
      
      // Extract chapter title and number
      chapterTitle = chapterData.attributes?.title || '';
      const chapterNumber = chapterData.attributes?.chapter || '';
      
      if (chapterNumber && chapterTitle) {
        chapterTitle = `Chapter ${chapterNumber}: ${chapterTitle}`;
      } else if (chapterNumber) {
        chapterTitle = `Chapter ${chapterNumber}`;
      }
    } catch (apiError) {
      console.warn('Error fetching manga/chapter details for AI context:', apiError.message);
      // Continue without the additional context
    }
    
    // Limit the number of pages sent to OpenRouter to avoid payload size issues
    const pagesToProcess = pageUrls.length > 3 ? pageUrls.slice(0, 3) : pageUrls;
    
    // Check if OPENROUTER_API_KEY is properly set
    if (!process.env.OPENROUTER_API_KEY) {
      console.error('OPENROUTER_API_KEY environment variable is not set');
      return res.status(500).json({ 
        error: 'API key not configured',
        dialogue: generateFallbackDialogue(mangaId, chapterId)
      });
    }
    
    try {
      // Create a structured prompt for Gemini 2.0 Flash that will help it better extract dialogue
      const systemPrompt = `You are an expert manga dialogue extractor. Your task is to analyze manga pages and extract all dialogue, identifying characters and their speech. 

Rules:
1. Accurately identify distinct characters and maintain consistent naming
2. Extract dialogue exactly as it appears
3. Include narration text in a format like "Narrator: [text]"
4. For internal thoughts or monologues, use format "Character (thinking): [text]"
5. For sound effects, use "SFX: [sound]"
6. Return the output in a structured format with character names followed by their dialogue
7. When character names aren't explicitly given, use descriptors like "Tall Man" or "Girl with Glasses"`;
      
      // Create a detailed user prompt with context
      let userPrompt = `Extract all dialogue from these manga pages.\n\n`;
      
      // Add manga and chapter context if available
      if (mangaTitle) {
        userPrompt += `Manga title: ${mangaTitle}\n`;
      }
      if (mangaGenres.length > 0) {
        userPrompt += `Genres: ${mangaGenres.join(', ')}\n`;
      }
      if (chapterTitle) {
        userPrompt += `${chapterTitle}\n`;
      }
      
      userPrompt += `\nThe pages are from left to right, top to bottom.\n`;
      userPrompt += `Page URLs (first ${pagesToProcess.length} of ${pageUrls.length} total pages):\n${pagesToProcess.join('\n')}\n\n`;
      userPrompt += `Format your response as:\n"Character Name: Dialogue text"\n\nExample:\nNarrator: The city was quiet that night.\nHero: We need to find the secret entrance!\nVillain: You'll never stop my plan!\nCitizen (thinking): I should get out of here.\nSFX: BOOM!\n\nTry to maintain character consistency across pages. If you can't determine a character's name, use a descriptive identifier.`;

      // Format content array for multimodal input (text + images)
      const userContent = [
        {
          type: "text",
          text: userPrompt
        }
      ];
      
      // Add image URLs as proper image content objects
      // Note: We're only sending a limited number of pages to avoid payload size issues
      for (const pageUrl of pagesToProcess) {
        userContent.push({
          type: "image_url",
          image_url: {
            url: pageUrl
          }
        });
      }
      
      // Use Gemini 2.0 Flash via OpenRouter API with enhanced prompting
      const response = await axios.post(
        `${OPENROUTER_API}/chat/completions`,
        {
          model: "google/gemini-2.0-flash-001",
          messages: [
            {
              role: "system", 
              content: systemPrompt
            },
            {
              role: "user",
              content: userContent
            }
          ],
          max_tokens: 1500,
          temperature: 0.3, // Lower temperature for more consistent output
          top_p: 0.9 // More focused generations
        }, 
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://github.com/tahmid-chowdhury/MangaVox', 
            'X-Title': 'MangaVox',
            'User-Agent': 'MangaVox/1.0'
          },
          timeout: 45000 // 45 second timeout
        }
      );
      
      // Check if response contains expected data
      if (!response.data?.choices?.[0]?.message?.content) {
        console.error('Invalid OpenRouter response structure:', JSON.stringify(response.data));
        throw new Error('Invalid API response structure');
      }
      
      // Extract the dialogue text
      const rawDialogueText = response.data.choices[0].message.content;
      
      // Process the dialogue into a more structured format
      const structuredDialogue = processDialogueText(rawDialogueText, pageUrls.length);
      
      // Create response object with both raw and structured dialogue
      const result = {
        mangaId,
        chapterId,
        mangaTitle,
        chapterTitle,
        pageCount: pageUrls.length,
        dialogue: rawDialogueText,
        structuredDialogue,
        timestamp: new Date().toISOString()
      };
      
      // Cache the result for 24 hours
      await redisClient.set(cacheKey, JSON.stringify(result), { EX: 86400 });
      
      res.json(result);
    } catch (apiError) {
      console.error('OpenRouter API error:', apiError.message);
      if (apiError.response) {
        console.error('OpenRouter API error details:', apiError.response.data);
      }
      
      // Return fallback dialogue with the error
      return res.json({
        mangaId,
        chapterId,
        mangaTitle: mangaTitle || 'Unknown Manga',
        chapterTitle: chapterTitle || 'Unknown Chapter',
        dialogue: generateFallbackDialogue(mangaId, chapterId),
        structuredDialogue: generateFallbackStructuredDialogue(),
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
      structuredDialogue: generateFallbackStructuredDialogue(),
      timestamp: new Date().toISOString(),
      error: 'Failed to extract dialogue. Using placeholder text instead.'
    });
  }
});

// Process dialogue text into a structured format
function processDialogueText(dialogueText, pageCount) {
  if (!dialogueText) return [];
  
  try {
    // Split dialogue by line and process each line
    const lines = dialogueText.split('\n').filter(line => line.trim().length > 0);
    
    // Process each line into structured format
    const dialogueEntries = [];
    let currentPage = 1;
    
    for (const line of lines) {
      // Check for page markers (Page X:) which Gemini might add
      const pageMarker = line.match(/^Page\s+(\d+).*:/i);
      if (pageMarker) {
        currentPage = Math.min(parseInt(pageMarker[1]), pageCount);
        continue;
      }
      
      // Extract character and dialogue
      const match = line.match(/^([^:]+):(.+)$/i);
      
      if (match) {
        const character = match[1].trim();
        const text = match[2].trim();
        
        // Check for thought indicators
        const isThinking = character.includes('(thinking)') || character.includes('(thought)') || character.includes('(thinks)');
        
        // Check for SFX
        const isSoundEffect = character.toLowerCase() === 'sfx';
        
        // Check for narrator
        const isNarrator = character.toLowerCase() === 'narrator';
        
        // Clean up character name (remove thinking annotations)
        let cleanCharacter = character
          .replace(/\(thinking\)|\/\(thought\)|\/\(thinks\)/gi, '')
          .trim();
        
        // Add to dialogue entries
        dialogueEntries.push({
          character: cleanCharacter,
          text,
          type: isThinking ? 'thought' : (isSoundEffect ? 'sfx' : (isNarrator ? 'narration' : 'speech')),
          page: currentPage
        });
      }
    }
    
    return dialogueEntries;
  } catch (error) {
    console.error('Error processing dialogue text:', error);
    return [];
  }
}

// Function to generate fallback dialogue when API fails
function generateFallbackDialogue(mangaId, chapterId) {
  return `Character 1: I can't seem to read the dialogue in this manga. Let's enjoy the art!
Character 2: The images tell a story of their own.
Narrator: The AI couldn't extract dialogue from this chapter. You can still enjoy the visuals!`;
}

// Function to generate fallback structured dialogue
function generateFallbackStructuredDialogue() {
  return [
    {
      character: 'Character 1',
      text: "I can't seem to read the dialogue in this manga. Let's enjoy the art!",
      type: 'speech',
      page: 1
    },
    {
      character: 'Character 2',
      text: 'The images tell a story of their own.',
      type: 'speech',
      page: 1
    },
    {
      character: 'Narrator',
      text: "The AI couldn't extract dialogue from this chapter. You can still enjoy the visuals!",
      type: 'narration',
      page: 1
    }
  ];
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
          model: "google/gemini-2.0-flash-001", // Updated to Google Gemini model
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

// Process character dialogue with voice assignment and TTS
app.post('/api/character/dialogue', async (req, res) => {
  try {
    const { dialogueText, characterId, characterName, mangaId, chapterId } = req.body;
    
    if (!dialogueText || (!characterId && !characterName)) {
      return res.status(400).json({ error: 'Dialogue text and either characterId or characterName are required' });
    }
    
    // Create a unique identifier for this character (prefer ID, fallback to name)
    const characterIdentifier = characterId || `name:${characterName}`;
    
    // Calculate cache key for voice assignment
    const voiceAssignmentCacheKey = `voice:${mangaId}:${characterIdentifier}`;
    
    // Try to get cached voice assignment
    let voiceId = await redisClient.get(voiceAssignmentCacheKey);
    
    // If no cached voice assignment, fetch or assign a voice
    if (!voiceId) {
      try {
        // Check if we have voice assignments for this manga
        const mangaVoicesCacheKey = `manga:${mangaId}:voices`;
        const mangaVoices = await redisClient.get(mangaVoicesCacheKey);
        
        if (mangaVoices) {
          const voiceAssignments = JSON.parse(mangaVoices);
          voiceId = voiceAssignments[characterIdentifier];
        }
        
        // If still no voice ID, fetch available voices and assign one
        if (!voiceId) {
          // Fetch available voices
          const voicesResponse = await axios.get(
            `${ELEVENLABS_API}/voices`,
            {
              headers: {
                'xi-api-key': process.env.ELEVENLABS_API_KEY
              }
            }
          );
          
          const voices = voicesResponse.data.voices || [];
          
          if (voices.length > 0) {
            // Simple algorithm: assign voice based on hash of character identifier
            const characterHash = Buffer.from(characterIdentifier).reduce((sum, byte) => sum + byte, 0);
            voiceId = voices[characterHash % voices.length].voice_id;
            
            // Cache this voice assignment for 30 days
            await redisClient.set(voiceAssignmentCacheKey, voiceId, { EX: 2592000 });
          } else {
            return res.status(500).json({ error: 'No voices available from ElevenLabs' });
          }
        }
      } catch (error) {
        console.error('Error assigning voice:', error.message);
        return res.status(500).json({ error: 'Failed to assign voice to character' });
      }
    }
    
    // Now that we have a voice ID, generate TTS audio
    // Calculate a cache key based on text and voiceId
    const ttsCacheKey = `tts:${Buffer.from(dialogueText).toString('base64')}:${voiceId}`;
    
    // Check if audio is already cached
    const cachedAudioUrl = await redisClient.get(ttsCacheKey);
    if (cachedAudioUrl) {
      return res.json({
        audioUrl: cachedAudioUrl,
        characterId,
        characterName,
        voiceId
      });
    }
    
    // Generate speech from ElevenLabs
    const response = await axios.post(
      `${ELEVENLABS_API}/text-to-speech/${voiceId}`,
      {
        text: dialogueText,
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
    
    // Convert audio to base64
    const audioBase64 = Buffer.from(response.data).toString('base64');
    const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;
    
    // Cache the audio URL for 7 days
    await redisClient.set(ttsCacheKey, audioUrl, { EX: 604800 });
    
    // Return the audio URL along with character info
    res.json({
      audioUrl,
      characterId,
      characterName,
      voiceId
    });
  } catch (error) {
    console.error('Error processing character dialogue:', error);
    res.status(500).json({ error: error.message });
  }
});

// Extract and position dialogues for a specific manga page
app.post('/api/page/dialogues', async (req, res) => {
  try {
    const { mangaId, chapterId, pageNumber, pageUrl } = req.body;
    
    if (!mangaId || !chapterId || pageNumber === undefined || !pageUrl) {
      return res.status(400).json({ 
        error: 'mangaId, chapterId, pageNumber, and pageUrl are required',
        received: { mangaId: !!mangaId, chapterId: !!chapterId, pageNumber: pageNumber !== undefined, pageUrl: !!pageUrl }
      });
    }
    
    // Calculate cache key for this specific page dialogue positioning
    const pageUrlHash = require('crypto')
      .createHash('md5')
      .update(pageUrl)
      .digest('hex');
    const pageCacheKey = `manga:${mangaId}:chapter:${chapterId}:page:${pageNumber}:${pageUrlHash}:dialogues`;
    
    // Check if page dialogues are already cached
    const cachedPageDialogues = await redisClient.get(pageCacheKey);
    if (cachedPageDialogues) {
      console.log(`Using cached dialogues for manga ${mangaId}, chapter ${chapterId}, page ${pageNumber}`);
      return res.json(JSON.parse(cachedPageDialogues));
    }
    
    // First, check if we already have chapter dialogue
    const chapterDialogueCacheKey = `dialogue:${mangaId}:${chapterId}`;
    let chapterDialogue = null;
    
    try {
      const cachedChapterDialogue = await redisClient.get(chapterDialogueCacheKey);
      if (cachedChapterDialogue) {
        chapterDialogue = JSON.parse(cachedChapterDialogue);
      }
    } catch (cacheError) {
      console.warn('Error retrieving cached chapter dialogue:', cacheError.message);
      // Continue without cached dialogue
    }
    
    // If we don't have chapter dialogue, extract it for this page specifically
    if (!chapterDialogue) {
      try {
        // Get chapter details from MangaDex to provide context
        const { data: chapterData } = await axios.get(`${MANGADEX_API}/chapter/${chapterId}`);
        
        // Extract manga ID if not provided
        if (!mangaId && chapterData?.data?.relationships) {
          const mangaRel = chapterData.data.relationships.find(rel => rel.type === 'manga');
          if (mangaRel) {
            mangaId = mangaRel.id;
          }
        }
        
        // Request dialogue extraction specifically for this page
        const extractionResponse = await axios.post(`${req.protocol}://${req.get('host')}/api/manga/extract-dialogue`, {
          mangaId,
          chapterId,
          pages: [pageUrl]
        });
        
        chapterDialogue = extractionResponse.data;
      } catch (extractionError) {
        console.error('Error extracting dialogue for page:', extractionError.message);
        // Create fallback dialogue
        chapterDialogue = {
          mangaId,
          chapterId,
          dialogue: generateFallbackDialogue(mangaId, chapterId),
          structuredDialogue: generateFallbackStructuredDialogue(),
          timestamp: new Date().toISOString()
        };
      }
    }
    
    // Filter and position the dialogue for this specific page
    const pageDialogues = [];
    
    if (chapterDialogue?.structuredDialogue) {
      // Filter dialogue entries that are for this page or have no specific page
      const relevantDialogues = chapterDialogue.structuredDialogue.filter(entry => 
        !entry.page || entry.page === pageNumber || parseInt(entry.page) === parseInt(pageNumber)
      );
      
      // Now use Gemini to position the dialogues on the page
      if (relevantDialogues.length > 0 && process.env.OPENROUTER_API_KEY) {
        try {
          // Prepare a prompt for dialogue positioning
          const systemPrompt = `You are an expert at analyzing manga pages and positioning dialogue on the image. Your task is to determine the x,y coordinates (relative positions from 0-1) of each speech bubble or text element on the manga page.`;
          
          const userPrompt = `Analyze this manga page and determine the relative position of each dialogue element. The URL of the page is: ${pageUrl}

For each of the following dialogue elements, provide x,y coordinates (from 0.0 to 1.0) indicating where the dialogue should be positioned on the image:

${relevantDialogues.map((d, i) => 
            `${i+1}. Character: ${d.character}\nText: "${d.text}"\nType: ${d.type}`
          ).join('\n\n')}

Respond in JSON format only with an array of objects containing character, text, type, and position (with x,y coordinates). Example:
[
  { "character": "Hero", "text": "We need to find the secret entrance!", "type": "speech", "position": { "x": 0.3, "y": 0.4 } },
  { "character": "Villain", "text": "You'll never stop my plan!", "type": "speech", "position": { "x": 0.7, "y": 0.3 } }
]`;
          
          // Format user content for multimodal input (text + image)
          const userContent = [
            {
              type: "text",
              text: userPrompt
            },
            {
              type: "image_url",
              image_url: {
                url: pageUrl
              }
            }
          ];
          
          // Call Gemini 2.0 Flash to position dialogues
          const response = await axios.post(
            `${OPENROUTER_API}/chat/completions`,
            {
              model: "google/gemini-2.0-flash-001",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userContent }
              ],
              max_tokens: 1500,
              temperature: 0.2,
              response_format: { type: "json_object" }
            }, 
            {
              headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://github.com/tahmid-chowdhury/MangaVox', 
                'X-Title': 'MangaVox',
                'User-Agent': 'MangaVox/1.0'
              },
              timeout: 30000
            }
          );
          
          if (response.data?.choices?.[0]?.message?.content) {
            try {
              // Try to parse the JSON response
              const content = response.data.choices[0].message.content;
              const jsonMatch = content.match(/\[\s*\{.*?\}\s*\]/s); // Find JSON array
              
              let positionedDialogues;
              if (jsonMatch) {
                positionedDialogues = JSON.parse(jsonMatch[0]);
              } else {
                const jsonObject = JSON.parse(content);
                positionedDialogues = jsonObject.dialogues || jsonObject;
              }
              
              // Process the positioned dialogues
              if (Array.isArray(positionedDialogues)) {
                for (const positioned of positionedDialogues) {
                  // Find the matching dialogue from our relevant dialogues
                  const matchingDialogue = relevantDialogues.find(d => 
                    d.character === positioned.character && 
                    d.text === positioned.text
                  ) || relevantDialogues.find(d => 
                    d.text.includes(positioned.text) || 
                    positioned.text.includes(d.text)
                  );
                  
                  if (matchingDialogue) {
                    // Create a page dialogue entry with position
                    pageDialogues.push({
                      characterId: matchingDialogue.character.toLowerCase().replace(/\s+/g, '_'),
                      characterName: matchingDialogue.character,
                      text: matchingDialogue.text,
                      type: matchingDialogue.type,
                      position: positioned.position || { x: 0.5, y: 0.5 },
                      pageNumber: parseInt(pageNumber)
                    });
                  }
                }
              }
            } catch (jsonError) {
              console.error('Error parsing positioned dialogues:', jsonError.message);
              // Fall back to simple positioning
            }
          }
        } catch (positioningError) {
          console.error('Error positioning dialogues:', positioningError.message);
          // Continue with fallback positioning
        }
      }
      
      // If we couldn't position dialogues using AI, use simple fallback positioning
      if (pageDialogues.length === 0 && relevantDialogues.length > 0) {
        // Simple fallback: position dialogues in a grid pattern
        const gridSize = Math.ceil(Math.sqrt(relevantDialogues.length));
        const step = 0.8 / gridSize;  // Use 80% of the page
        const margin = 0.1;  // 10% margin on each side
        
        relevantDialogues.forEach((dialogue, index) => {
          const row = Math.floor(index / gridSize);
          const col = index % gridSize;
          
          pageDialogues.push({
            characterId: dialogue.character.toLowerCase().replace(/\s+/g, '_'),
            characterName: dialogue.character,
            text: dialogue.text,
            type: dialogue.type,
            position: {
              x: margin + col * step + step/2,  // Center of cell
              y: margin + row * step + step/2
            },
            pageNumber: parseInt(pageNumber)
          });
        });
      }
    }
    
    // Now process each dialogue to add voice data
    const processedDialogues = [];
    for (const dialogue of pageDialogues) {
      try {
        // If we already have voices assigned in the manga context, use those
        let voiceId = null;
        
        // Otherwise, make a request to the character dialogue endpoint to get a voice
        const dialogueResponse = await axios.post(
          `${req.protocol}://${req.get('host')}/api/character/dialogue`,
          {
            dialogueText: dialogue.text,
            characterId: dialogue.characterId,
            characterName: dialogue.characterName,
            mangaId,
            chapterId
          },
          {
            headers: { 'Content-Type': 'application/json' }
          }
        );
        
        // Add voice data to the dialogue
        processedDialogues.push({
          ...dialogue,
          voiceId: dialogueResponse.data.voiceId,
          audioUrl: dialogueResponse.data.audioUrl
        });
      } catch (dialogueError) {
        console.error(`Error processing dialogue: ${dialogueError.message}`);
        // Continue processing other dialogues even if one fails
        processedDialogues.push({
          ...dialogue,
          error: dialogueError.message
        });
      }
    }
    
    // Cache the processed dialogues for 24 hours
    await redisClient.set(pageCacheKey, JSON.stringify(processedDialogues), { EX: 86400 });
    
    res.json(processedDialogues);
  } catch (error) {
    console.error('Error processing page dialogues:', error);
    res.status(500).json({
      error: error.message,
      pageUrl: req.body?.pageUrl,
      pageNumber: req.body?.pageNumber
    });
  }
});

// Advanced dialogue processing with Gemini 2.0 Flash
app.post('/api/dialogue/process', async (req, res) => {
  try {
    const { dialogue, task, context, options } = req.body;
    
    if (!dialogue) {
      return res.status(400).json({ error: 'Dialogue text is required' });
    }
    
    if (!task) {
      return res.status(400).json({ error: 'Processing task is required' });
    }
    
    // Generate a cache key based on the request
    const cacheKey = `llm:${task}:${Buffer.from(JSON.stringify({ dialogue, context })).toString('base64')}`;
    
    // Check cache first
    const cachedResult = await redisClient.get(cacheKey);
    if (cachedResult) {
      return res.json(JSON.parse(cachedResult));
    }
    
    // Define task-specific prompts and configurations
    let systemPrompt = '';
    let userPrompt = '';
    let processingOptions = {};
    
    // Configure based on requested task
    switch (task) {
      case 'character-mapping':
        systemPrompt = `You are an expert manga character analyzer. Your task is to identify and consistently map character names across dialogue, even when they might be referred to differently.`;
        userPrompt = `Analyze this manga dialogue and create a consistent mapping of character identities.

Dialogue:
${dialogue}

${context ? 'Context: ' + context + '\n\n' : ''}Please create a JSON mapping of character references, with a canonical name for each character, and any alternative names, descriptors, or nicknames used. Include a brief character description if possible.`;
        processingOptions = { 
          responseFormat: { type: "json_object" },
          temperature: 0.2 
        };
        break;
        
      case 'sentiment-analysis':
        systemPrompt = `You are an expert manga dialogue analyst. Your task is to analyze the emotional tone and sentiment of character dialogue.`;
        userPrompt = `Analyze the emotional tone and sentiment in this manga dialogue:

${dialogue}

${context ? 'Context: ' + context + '\n\n' : ''}For each character's dialogue, identify the primary emotion, sentiment (positive, negative, neutral), intensity (1-10), and key emotional triggers. Return the analysis in JSON format.`;
        processingOptions = { 
          responseFormat: { type: "json_object" },
          temperature: 0.3 
        };
        break;
        
      case 'translation':
        const targetLanguage = options?.targetLanguage || 'English';
        systemPrompt = `You are an expert manga translator. Your task is to translate dialogue while preserving cultural nuances, manga-specific expressions, and character speaking styles.`;
        userPrompt = `Translate the following manga dialogue into ${targetLanguage}:

${dialogue}

${context ? 'Context: ' + context + '\n\n' : ''}Important guidelines:
1. Preserve character speaking styles and personality
2. Keep manga-specific expressions and cultural references
3. Maintain honorifics where appropriate
4. Format the translation with the same structure as the original

Return ONLY the translated text without explanations.`;
        processingOptions = { temperature: 0.4 };
        break;
        
      case 'character-profile':
        systemPrompt = `You are an expert manga character profiler. Your task is to create detailed character profiles based on dialogue.`;
        userPrompt = `Based on this manga dialogue, create detailed character profiles:

${dialogue}

${context ? 'Context: ' + context + '\n\n' : ''}For each character, include:
1. Personality traits
2. Speech patterns
3. Relationships with other characters
4. Possible motivations
5. Character archetype

Return the analysis in JSON format with character names as keys.`;
        processingOptions = { 
          responseFormat: { type: "json_object" },
          temperature: 0.4,
          max_tokens: 1500
        };
        break;
        
      default:
        return res.status(400).json({ error: `Unsupported task: ${task}` });
    }
    
    // Merge with any user-provided options
    if (options) {
      processingOptions = { ...processingOptions, ...options };
    }
    
    // Process with LLM
    const result = await llmProcessor.process(systemPrompt, userPrompt, processingOptions);
    
    if (!result.success) {
      throw new Error(result.error || 'LLM processing failed');
    }
    
    // Try to parse JSON for tasks that expect it
    let processedResult = result;
    if (['character-mapping', 'sentiment-analysis', 'character-profile'].includes(task)) {
      const jsonData = llmProcessor.extractJSON(result.content);
      if (jsonData) {
        processedResult = {
          ...result,
          data: jsonData
        };
      }
    }
    
    // Cache the result (1 day for translations, 7 days for other analyses)
    const cacheTTL = task === 'translation' ? 86400 : 604800;
    await redisClient.set(cacheKey, JSON.stringify(processedResult), { EX: cacheTTL });
    
    res.json(processedResult);
  } catch (error) {
    console.error('Error in dialogue processing:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Batch process multiple dialogues with Gemini 2.0 Flash
app.post('/api/dialogue/batch-process', async (req, res) => {
  try {
    const { dialogues, task, context, options } = req.body;
    
    if (!dialogues || !Array.isArray(dialogues)) {
      return res.status(400).json({ error: 'Dialogues array is required' });
    }
    
    if (!task) {
      return res.status(400).json({ error: 'Processing task is required' });
    }
    
    // Process dialogues in chunks to avoid excessive token usage
    const results = [];
    const chunkSize = 10; // Process 10 dialogues at a time
    
    for (let i = 0; i < dialogues.length; i += chunkSize) {
      const dialogueChunk = dialogues.slice(i, i + chunkSize);
      const chunkDialogue = dialogueChunk.join('\n\n');
      
      // Process this chunk
      try {
        const chunkResult = await axios.post(
          `${req.protocol}://${req.get('host')}/api/dialogue/process`,
          {
            dialogue: chunkDialogue,
            task,
            context,
            options
          },
          {
            headers: { 'Content-Type': 'application/json' }
          }
        );
        
        results.push({
          dialogueRange: [i, Math.min(i + chunkSize - 1, dialogues.length - 1)],
          result: chunkResult.data
        });
      } catch (chunkError) {
        console.error(`Error processing dialogue chunk ${i}-${i+chunkSize-1}:`, chunkError.message);
        results.push({
          dialogueRange: [i, Math.min(i + chunkSize - 1, dialogues.length - 1)],
          error: chunkError.message
        });
      }
      
      // Add a small delay between chunks to avoid rate limiting
      if (i + chunkSize < dialogues.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    res.json({
      success: true,
      results,
      summary: {
        totalDialogues: dialogues.length,
        processedChunks: results.length,
        successfulChunks: results.filter(r => !r.error).length,
        failedChunks: results.filter(r => r.error).length
      }
    });
  } catch (error) {
    console.error('Error in batch dialogue processing:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Real-time manga dialogue enhancement with character analysis
app.post('/api/dialogue/enhance', async (req, res) => {
  try {
    const { mangaId, chapterId, dialogue, enhancements = ['character-consistency'] } = req.body;
    
    if (!dialogue) {
      return res.status(400).json({ error: 'Dialogue is required' });
    }
    
    // Cache key based on manga, chapter, dialogue hash, and requested enhancements
    const dialogueHash = require('crypto')
      .createHash('md5')
      .update(dialogue)
      .digest('hex');
    const enhancementsKey = enhancements.sort().join('-');
    const cacheKey = `enhance:${mangaId || 'unknown'}:${chapterId || 'unknown'}:${dialogueHash}:${enhancementsKey}`;
    
    // Check cache first
    const cachedResult = await redisClient.get(cacheKey);
    if (cachedResult) {
      return res.json(JSON.parse(cachedResult));
    }
    
    // Get manga context if IDs are provided
    let mangaContext = '';
    if (mangaId && chapterId) {
      try {
        // Get manga details
        const mangaResponse = await axios.get(`${MANGADEX_API}/manga/${mangaId}`);
        const mangaData = mangaResponse.data.data;
        const mangaTitle = mangaData.attributes?.title?.en || Object.values(mangaData.attributes?.title || {})[0] || 'Unknown Manga';
        
        // Get chapter details
        const chapterResponse = await axios.get(`${MANGADEX_API}/chapter/${chapterId}`);
        const chapterData = chapterResponse.data.data;
        const chapterNumber = chapterData.attributes?.chapter || '';
        const chapterTitle = chapterData.attributes?.title || '';
        
        mangaContext = `Manga: ${mangaTitle}\nChapter: ${chapterNumber}${chapterTitle ? ': ' + chapterTitle : ''}`;
      } catch (contextError) {
        console.warn('Error fetching manga context:', contextError.message);
        // Continue without context
      }
    }
    
    // Process each requested enhancement
    const enhancementResults = {};
    
    for (const enhancement of enhancements) {
      try {
        switch (enhancement) {
          case 'character-consistency':
            // Map character names consistently
            const characterMapping = await axios.post(
              `${req.protocol}://${req.get('host')}/api/dialogue/process`,
              {
                dialogue,
                task: 'character-mapping',
                context: mangaContext
              },
              { headers: { 'Content-Type': 'application/json' } }
            );
            
            enhancementResults['character-consistency'] = characterMapping.data;
            break;
            
          case 'sentiment':
            // Analyze emotions and sentiment
            const sentimentAnalysis = await axios.post(
              `${req.protocol}://${req.get('host')}/api/dialogue/process`,
              {
                dialogue,
                task: 'sentiment-analysis',
                context: mangaContext
              },
              { headers: { 'Content-Type': 'application/json' } }
            );
            
            enhancementResults['sentiment'] = sentimentAnalysis.data;
            break;
            
          case 'profiles':
            // Create character profiles
            const characterProfiles = await axios.post(
              `${req.protocol}://${req.get('host')}/api/dialogue/process`,
              {
                dialogue,
                task: 'character-profile',
                context: mangaContext
              },
              { headers: { 'Content-Type': 'application/json' } }
            );
            
            enhancementResults['profiles'] = characterProfiles.data;
            break;
            
          default:
            enhancementResults[enhancement] = { error: `Unsupported enhancement: ${enhancement}` };
        }
      } catch (enhancementError) {
        console.error(`Error processing ${enhancement}:`, enhancementError.message);
        enhancementResults[enhancement] = { error: enhancementError.message };
      }
    }
    
    // Create the final enhanced dialogue
    let enhancedDialogue = dialogue;
    let dialogueMetadata = {};
    
    // Apply character name consistency if available
    if (enhancementResults['character-consistency']?.data) {
      dialogueMetadata.characters = enhancementResults['character-consistency'].data;
    }
    
    // Add sentiment data if available
    if (enhancementResults['sentiment']?.data) {
      dialogueMetadata.sentiment = enhancementResults['sentiment'].data;
    }
    
    // Add character profiles if available
    if (enhancementResults['profiles']?.data) {
      dialogueMetadata.profiles = enhancementResults['profiles'].data;
    }
    
    const result = {
      original: dialogue,
      enhanced: enhancedDialogue,
      metadata: dialogueMetadata,
      enhancements: Object.keys(enhancementResults),
      results: enhancementResults
    };
    
    // Cache the final result for 7 days
    await redisClient.set(cacheKey, JSON.stringify(result), { EX: 604800 });
    
    res.json(result);
  } catch (error) {
    console.error('Error enhancing dialogue:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Multi-language dialogue translation
app.post('/api/dialogue/translate', async (req, res) => {
  try {
    const { dialogue, sourceLanguage, targetLanguage, mangaId, chapterId } = req.body;
    
    if (!dialogue) {
      return res.status(400).json({ error: 'Dialogue is required' });
    }
    
    if (!targetLanguage) {
      return res.status(400).json({ error: 'Target language is required' });
    }
    
    // Cache key based on dialogue, source and target languages
    const dialogueHash = require('crypto')
      .createHash('md5')
      .update(dialogue)
      .digest('hex');
    const cacheKey = `translation:${dialogueHash}:${sourceLanguage || 'auto'}:${targetLanguage}`;
    
    // Check cache first
    const cachedResult = await redisClient.get(cacheKey);
    if (cachedResult) {
      return res.json(JSON.parse(cachedResult));
    }
    
    // Get manga context if IDs are provided
    let context = '';
    if (mangaId && chapterId) {
      try {
        // Get manga details
        const mangaResponse = await axios.get(`${MANGADEX_API}/manga/${mangaId}`);
        const mangaData = mangaResponse.data.data;
        const mangaTitle = mangaData.attributes?.title?.en || Object.values(mangaData.attributes?.title || {})[0] || 'Unknown Manga';
        
        // Get chapter details
        const chapterResponse = await axios.get(`${MANGADEX_API}/chapter/${chapterId}`);
        const chapterData = chapterResponse.data.data;
        const chapterNumber = chapterData.attributes?.chapter || '';
        const chapterTitle = chapterData.attributes?.title || '';
        
        context = `Manga: ${mangaTitle}\nChapter: ${chapterNumber}${chapterTitle ? ': ' + chapterTitle : ''}`;
      } catch (contextError) {
        console.warn('Error fetching manga context:', contextError.message);
        // Continue without context
      }
    }
    
    // Call the dialogue processing endpoint for translation
    const translationResponse = await axios.post(
      `${req.protocol}://${req.get('host')}/api/dialogue/process`,
      {
        dialogue,
        task: 'translation',
        context,
        options: {
          targetLanguage,
          sourceLanguage: sourceLanguage || 'auto'
        }
      },
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    // Format response
    const result = {
      original: dialogue,
      translated: translationResponse.data.content,
      sourceLanguage: sourceLanguage || 'auto',
      targetLanguage,
      model: translationResponse.data.model
    };
    
    // Cache the translation for 24 hours
    await redisClient.set(cacheKey, JSON.stringify(result), { EX: 86400 });
    
    res.json(result);
  } catch (error) {
    console.error('Error translating dialogue:', error.message);
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

// Theme change endpoint that broadcasts to all clients
app.post('/api/theme/change', async (req, res) => {
  try {
    const { theme } = req.body;
    
    if (!theme) {
      return res.status(400).json({ error: 'Theme is required' });
    }
    
    // Validate theme
    const validThemes = ['purple', 'blue', 'green', 'red', 'orange'];
    if (!validThemes.includes(theme)) {
      return res.status(400).json({ error: 'Invalid theme. Must be one of: ' + validThemes.join(', ') });
    }
    
    // Store the current theme in Redis so new connections can get it
    await redisClient.set('app:current_theme', theme, { EX: 2592000 }); // 30 days
    
    // Broadcast theme change to all connected clients
    broadcast({
      type: 'theme_change',
      theme,
      timestamp: new Date().toISOString()
    });
    
    res.json({ success: true, theme });
  } catch (error) {
    console.error('Error changing theme:', error.message);
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

// Check if the server is running and responding to heartbeat
app.get('/api/heartbeat', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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

server.listen(port, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${port}`);
});
