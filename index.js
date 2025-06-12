
// Import the express library
const express = require('express');
// Create an Express application instance
const app = express();

// Define the port the server will listen on.
// process.env.PORT is crucial for deployment platforms like Render,
// as they often provide the port via this environment variable.
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies for POST requests
// This allows you to easily access JSON data sent in the request body.
app.use(express.json());

// --- Routes ---

/**
 * Handles GET requests to the root path '/'.
 * This is a simple endpoint to confirm the server is running.
 */
app.get('/', (req, res) => {
  console.log(`[${new Date().toISOString()}] Received GET request on /`);
  // Send a plain text response
  res.status(200).send('Hello from Dummy Server! This is a GET request.');
});

/**
 * Handles POST requests to the root path '/'.
 * It logs the request and any JSON body received.
 */
app.post('/', (req, res) => {
  console.log(`[${new Date().toISOString()}] Received POST request on /`);
  console.log('Request Body:', req.body); // Log the body for debugging purposes

  // Send a plain text success response
  res.status(200).send('POST request received by Dummy Server! Data logged.');
});

/**
 * Handles all other requests (GET, POST, PUT, DELETE, etc.) to any other path.
 * This acts as a catch-all for undefined routes.
 */
app.all('*', (req, res) => {
  console.log(`[${new Date().toISOString()}] Received ${req.method} request on undefined path: ${req.path}`);
  // Respond with a 404 Not Found status and a message
  res.status(404).send('Not Found: This dummy server only responds to GET/POST on /');
});


// --- Start the server ---

// Make the server listen on the defined PORT
app.listen(PORT, () => {
  console.log(`Dummy server listening on port ${PORT}`);
  console.log(`Access it at: http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop the server.');
});
