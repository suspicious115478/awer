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
  // Optionally, if your Realtime Database URL is not the default for the project
  // You might need to specify it here if it's different from the service account's default:
  // databaseURL: "https://project-6268143036742335384-default-rtdb.firebaseio.com/"
});

// POST endpoint to send FCM notification
app.post('/sendRingingNotification', async (req, res) => {
  try {
    // We now expect fcmToken (from client), targetUserId, targetDeviceId, callerId, agoraToken, agoraChannel
    const { fcmToken, targetUserId, targetDeviceId, callerId, agoraToken, agoraChannel } = req.body;

    // It's crucial for the client to send targetUserId and targetDeviceId for fetching and cleanup
    if (!targetUserId || !targetDeviceId || !callerId) {
      return res.status(400).send('Missing targetUserId, targetDeviceId, or callerId in request body. fcmToken is optional but recommended.');
    }

    let actualFcmToken = fcmToken; // Start with the token provided by the client

    // Attempt to fetch the latest FCM token from Firebase Realtime Database
    // This will override the client-provided fcmToken if a newer one exists
    try {
      const fcmTokenPath = `calls/${targetUserId}/secondaryDevices/${targetDeviceId}/fcmToken`;
      const snapshot = await admin.database().ref(fcmTokenPath).once('value');
      const dbFcmToken = snapshot.val(); // Get the value of the fcmToken from DB

      if (dbFcmToken) {
        // If a token exists in the DB, use it. This ensures we always use the latest one.
        actualFcmToken = dbFcmToken;
        console.log(`Using FCM token from DB for device ${targetDeviceId}. Client provided: ${fcmToken || 'None'}, DB has: ${dbFcmToken}`);
      } else {
        console.warn(`No FCM token found in DB for user: ${targetUserId}, device: ${targetDeviceId}. Will attempt to use client-provided token if available.`);
        // If no token in DB, and client didn't provide one, then we can't proceed
        if (!actualFcmToken) {
            return res.status(404).send('No FCM token available for the specified device (not in DB and not provided by client).');
        }
      }
    } catch (dbError) {
        console.error(`Error fetching FCM token from database for user ${targetUserId}, device ${targetDeviceId}:`, dbError);
        // If DB fetch fails, we'll fall back to the client-provided token.
        if (!actualFcmToken) {
             return res.status(500).send('Failed to retrieve FCM token due to database error and no client token provided.');
        }
    }

    // Double-check that we have an actual FCM token to send to
    if (!actualFcmToken) {
        return res.status(400).send('No FCM token available to send notification.');
    }

    const message = {
      token: actualFcmToken, // Use the (potentially overridden) actual FCM token
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
          // sound: "ringtone", // Reference your custom sound file (e.g., res/raw/ringtone.ogg)
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

    // IMPORTANT: Handle 'messaging/registration-token-not-registered' error
    // If the token is no longer valid, remove it from your database to keep data clean.
    // This relies on targetUserId and targetDeviceId being present in the request body.
    if (error.code === 'messaging/registration-token-not-registered' || error.code === 'messaging/invalid-argument') {
      const { targetUserId, targetDeviceId } = req.body; // Re-extract to be safe
      if (targetUserId && targetDeviceId) {
        const fcmTokenPath = `calls/${targetUserId}/secondaryDevices/${targetDeviceId}/fcmToken`;
        console.warn(`Removing invalid FCM token for user: ${targetUserId}, device: ${targetDeviceId} due to: ${error.code}`);
        await admin.database().ref(fcmTokenPath).remove()
          .then(() => console.log('Invalid token removed from database.'))
          .catch(dbError => console.error('Error removing invalid token from database:', dbError));
      } else {
        console.warn('Could not remove invalid token from database: targetUserId or targetDeviceId missing in request for error handling.');
      }
    }
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
