const express = require('express');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');

// Initialize Express
const app = express();
app.use(bodyParser.json());

// Load Firebase service account from environment
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// POST endpoint to send FCM notification
app.post('/sendRingingNotification', async (req, res) => {
  try {
    const { fcmToken, callerId, agoraToken, agoraChannel } = req.body;

    if (!fcmToken || !callerId) {
      return res.status(400).send('Missing fcmToken or callerId');
    }

    const message = {
      token: fcmToken,
      // The top-level 'notification' block is correctly removed/commented out.
      data: { // Data payload for custom handling in `onMessageReceived`
        type: "ring",
        callerId: callerId,
        "token": agoraToken || "",
        "channel": agoraChannel || "",
        // --- ADDED: Notification title and body to data payload ---
        "notification_title": "Incoming Call", // Title for the notification
        "notification_body": `Incoming call from ${callerId}` // Body for the notification
      },
      android: {
        priority: "high", // Keep high priority for timely delivery and heads-up notification
        notification: {
          channel_id: "incoming_call_channel", // IMPORTANT: Must match the channel ID in your Android app
          sound: "ringtone", // Reference your custom sound file (e.g., res/raw/ringtone.ogg)
          visibility: "public", // To show content on lock screen
          full_screen_intent: true, // Set to true to launch activity directly when device is locked/idle
          // --- ADDED: Small icon reference for Android ---
          // This should match a drawable resource name in your Android app (e.g., res/drawable/ic_stat_call.png)
          icon: "ic_stat_call"
        }
      }
    };

    const response = await admin.messaging().send(message);
    console.log('FCM Message sent successfully:', response);
    return res.status(200).send('Notification sent');
  } catch (error) {
    console.error('Error sending FCM:', error);
    return res.status(500).send('Internal Server Error');
  }
});

// Add root GET route
app.get('/', (req, res) => {
  res.send('FCM Server is running');
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
