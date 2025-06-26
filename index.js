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

    // --- CRITICAL CHANGE: REMOVE THE TOP-LEVEL 'notification' BLOCK ---
    const message = {
      token: fcmToken,
      // The 'notification' block is removed to ensure onMessageReceived is always called.
      data: { // Data payload for custom handling in `onMessageReceived`
        // IMPORTANT: Your Android app expects "type": "incoming_call", not "ring"
        type: "incoming_call", // Changed from "ring" to "incoming_call" for consistency
        caller_name: callerId, // Changed from "callerId" to "caller_name" for consistency with Android app
        channel: agoraChannel || "", // Pass channel directly
        token: agoraToken || ""    // Pass token directly
      },
      android: {
        priority: "high", // Keep high priority for timely delivery and heads-up notification
        notification: {
          channel_id: "incoming_call_channel", // This must match your Android channel ID
          // You can define other visual aspects here, but they will be overridden
          // by the custom notification built in MyFirebaseMessagingService.
          // This ensures the channel sound and other properties are correctly applied.
          // sound: "default", // You could set a sound here if you want system default behavior
                               // but your Android service is already setting it.
          // color: "#FF0000",
          // icon: "your_notification_icon",
          visibility: "public", // To show content on lock screen
          // Use `full_screen_intent` for critical alerts like incoming calls.
          // This is a flag for Android 10+ devices.
          // If the app is killed or in background, this helps launch the activity.
          full_screen_intent: { // This structure is for Firebase Admin SDK v10+
             // Firebase Admin SDK automatically handles this if 'android.notification.full_screen_intent' is true
             // For older versions or more direct control, ensure your Android app's
             // PendingIntent is correctly configured.
          }
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
