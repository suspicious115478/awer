const express = require('express');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');

// Initialize Express
const app = express();
app.use(bodyParser.json());

// Load Firebase service account from environment
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // Optionally, if your Realtime Database URL is not the default for the project
  // You might need to specify it here:
  // databaseURL: "https://project-6268143036742335384-default-rtdb.firebaseio.com/"
});

// POST endpoint to send FCM notification
// Now, instead of fcmToken, the client sends targetUserId and targetDeviceId
app.post('/sendRingingNotification', async (req, res) => {
  try {
    // Expect targetUserId and targetDeviceId from the primary controlling app
    const { targetUserId, targetDeviceId, callerId, agoraToken, agoraChannel } = req.body;

    if (!targetUserId || !targetDeviceId || !callerId) {
      return res.status(400).send('Missing targetUserId, targetDeviceId, or callerId in request body.');
    }

    // 1. Fetch the latest FCM token from Firebase Realtime Database
    const fcmTokenPath = `calls/${targetUserId}/secondaryDevices/${targetDeviceId}/fcmToken`;
    const snapshot = await admin.database().ref(fcmTokenPath).once('value');
    const fcmToken = snapshot.val(); // Get the value of the fcmToken

    if (!fcmToken) {
      console.warn(`No FCM token found for user: ${targetUserId}, device: ${targetDeviceId}. Cannot send notification.`);
      return res.status(404).send('FCM token not found for the specified device.');
    }

    const message = {
      token: fcmToken, // Use the fetched token
      notification: {
        title: "Incoming Call",
        body: `Incoming call from ${callerId}`,
      },
      data: { // Data payload for custom handling in `onMessageReceived`
        type: "ring",
        callerId: callerId,
        "token": agoraToken || "",
        "channel": agoraChannel || ""
      },
      android: {
        priority: "high",
        notification: {
          channel_id: "incoming_call_channel", // IMPORTANT: This must match the channel ID in your Android app
          visibility: "public",
        }
      }
    };

    const response = await admin.messaging().send(message);
    console.log('FCM Message sent successfully:', response);
    return res.status(200).send('Notification sent');

  } catch (error) {
    console.error('Error sending FCM:', error);

    // IMPORTANT: Handle 'messaging/registration-token-not-registered' error
    // If the token is no longer valid, remove it from your database to keep data clean
    if (error.code === 'messaging/registration-token-not-registered' || error.code === 'messaging/invalid-argument') {
      const { targetUserId, targetDeviceId } = req.body; // Re-extract if needed
      if (targetUserId && targetDeviceId) {
        const fcmTokenPath = `calls/${targetUserId}/secondaryDevices/${targetDeviceId}/fcmToken`;
        console.warn(`Removing invalid FCM token for user: ${targetUserId}, device: ${targetDeviceId} due to: ${error.code}`);
        await admin.database().ref(fcmTokenPath).remove()
          .then(() => console.log('Invalid token removed from database.'))
          .catch(dbError => console.error('Error removing invalid token from database:', dbError));
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
