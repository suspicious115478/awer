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
    const { fcmToken, callerId, agoraToken, agoraChannel } = req.body; // Added agoraToken, agoraChannel

    if (!fcmToken || !callerId) {
      return res.status(400).send('Missing fcmToken or callerId');
    }

    const message = {
      token: fcmToken,
      // The `notification` block is primarily for system tray display when the app is in the background/killed.
      // On Android, the `android` block will take precedence for specific behaviors.
      notification: {
        title: "Incoming Call",
        body: `Incoming call from ${callerId}`,
        // sound: "default" // You can set a default sound here if you want
      },
      data: { // Data payload for custom handling in `onMessageReceived`
        type: "ring",
        callerId: callerId,
        "token": agoraToken || "",
        "channel": agoraChannel || ""
      },
      android: {
        priority: "high", // Keep high priority for timely delivery and heads-up notification
        notification: {
          channel_id: "incoming_call_channel", // IMPORTANT: This must match the channel ID in your Android app
          sound: "ringtone", // Reference your custom sound file (e.g., res/raw/ringtone.ogg)
          // You can also add other properties like icon, color etc.
          // click_action: "FLUTTER_NOTIFICATION_CLICK" // This is for Flutter, but conceptually similar for native Android if you want to route to a specific activity
          visibility: "public", // To show content on lock screen
          // Use `full_screen_intent` for critical alerts like incoming calls
          // This will require additional setup on the Android side (manifest permission)
          // https://developer.android.com/develop/ui/views/notifications/notification-channels#full_screen_intent
          // full_screen_intent: true // Set to true to launch activity directly when device is locked/idle
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
