const express = require('express');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');

// Initialize Express
const app = express();
app.use(bodyParser.json());

// --- Firebase Service Account Initialization ---
let serviceAccount;
try {
  // Attempt to load from environment variable (RECOMMENDED for deployment)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    console.log('Firebase service account loaded from environment variable.');
  } else {
    // FALLBACK for local development: Load from a file (make sure this file is NOT public!)
    // IMPORTANT: Replace './path/to/your-service-account-key.json' with your actual path
    // For production, always use environment variables.
    try {
      serviceAccount = require('./your-service-account-key.json');
      console.warn('WARNING: Firebase service account loaded from local file. Use environment variable for production!');
    } catch (fileError) {
      console.error('ERROR: Could not load Firebase service account from file. Ensure "your-service-account-key.json" exists and is correct.');
      throw new Error('Firebase service account not found or invalid.');
    }
  }
} catch (parseError) {
  console.error('ERROR: Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON environment variable. It might be malformed JSON.');
  console.error('Parse Error Details:', parseError.message);
  process.exit(1); // Exit process if initialization fails
}

// Initialize Firebase Admin SDK
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log('Firebase Admin SDK initialized successfully.');
} catch (initError) {
  console.error('ERROR: Failed to initialize Firebase Admin SDK.');
  console.error('Initialization Error Details:', initError.message);
  process.exit(1); // Exit process if initialization fails
}


// POST endpoint to send FCM notification
app.post('/sendRingingNotification', async (req, res) => {
  try {
    console.log('Received /sendRingingNotification request.');
    const { fcmToken, callerId, agoraToken, agoraChannel } = req.body;

    console.log('Request body received:', req.body); // Log the full request body for debugging

    // Basic input validation
    if (!fcmToken || !callerId) {
      console.log('Validation Error: Missing fcmToken or callerId (HTTP 400)');
      return res.status(400).send('Missing fcmToken or callerId');
    }

    // Construct the FCM message payload
    const message = {
      token: fcmToken, // The FCM registration token of the target device

      // Removed the top-level 'notification' block entirely.
      // Android prefers the 'android' block for specific behaviors and
      // the 'data' payload for custom handling when the app is active/killed.

      data: { // Data payload for custom handling in `onMessageReceived` on the Android app
        type: "ring", // Custom type to identify the notification's purpose
        callerId: callerId, // ID of the caller
        "token": agoraToken || "", // Agora token for the call
        "channel": agoraChannel || "", // Agora channel for the call
        // --- ADDED: Notification title and body to data payload ---
        // These will be parsed by your Android app to build the notification UI.
        "notification_title": "Incoming Call",
        "notification_body": `Incoming call from ${callerId}`
      },

      android: {
        priority: "high", // Ensures timely delivery and heads-up notification behavior
        notification: {
          channel_id: "incoming_call_channel", // IMPORTANT: Must match the channel ID in your Android app
          sound: "ringtone", // References your custom sound file (e.g., res/raw/ringtone.ogg)
          visibility: "public", // To show notification content on the lock screen
          full_screen_intent: true, // Set to true to trigger the full-screen intent (IncomingCallActivity)
          // --- ADDED: Small icon reference for Android ---
          // This should match a drawable resource name in your Android app (e.g., res/drawable/ic_stat_call.png)
          icon: "ic_stat_call"
        }
      }
    };

    console.log('Attempting to send FCM message with payload:', JSON.stringify(message, null, 2));

    // Send the message using Firebase Admin SDK
    const response = await admin.messaging().send(message);
    console.log('FCM Message sent successfully:', response);
    return res.status(200).send('Notification sent');

  } catch (error) {
    // --- ENHANCED ERROR LOGGING ---
    console.error('----------------------------------------------------');
    console.error('ERROR during /sendRingingNotification request:');
    console.error('Error message:', error.message);
    console.error('Error name:', error.name);
    console.error('Error code (if Firebase Messaging error):', error.code);
    console.error('Error stack:', error.stack);
    console.error('Request body that caused error (if available):', req.body);
    console.error('----------------------------------------------------');

    return res.status(500).send('Internal Server Error'); // Return 500 for unhandled errors
  }
});

// Add a simple root GET route to check if the server is running
app.get('/', (req, res) => {
  res.send('FCM Server is running and ready to send notifications.');
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Access at: http://localhost:${port}`);
});
