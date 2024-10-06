// config/redisClient.js

const redis = require('redis');
const dotenv = require('dotenv');

dotenv.config(); // Load environment variables from .env file

// Create a Redis client
const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379', // Use environment variable or default to localhost
});

// Event listener for successful connection
redisClient.on('connect', () => {
  console.log('Connected to Redis successfully.');
});

// Event listener for connection errors
redisClient.on('error', (err) => {
  console.error('Redis connection error:', err);
});

// Connect to Redis
(async () => {
  try {
    await redisClient.connect();
    console.log('Redis client connected and ready to use.');
  } catch (err) {
    console.error('Failed to connect to Redis:', err);
    // Optional: Exit the process if Redis connection is critical
    // process.exit(1);
  }
})();

module.exports = redisClient;
