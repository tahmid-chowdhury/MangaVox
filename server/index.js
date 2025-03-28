// server/index.js
const express = require('express');
const { createClient } = require('redis');

const app = express();
const port = process.env.PORT || 5000;

// Create and connect Redis client
const redisClient = createClient();

redisClient.on('error', (err) => console.error('Redis Client Error', err));

async function connectRedis() {
  await redisClient.connect();
  console.log('Connected to Redis');
}

connectRedis();

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

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
