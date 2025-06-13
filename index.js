const express = require('express');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');

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
    // NEW: Added callId to the request body
    const { fcmToken, callerUid, callerDeviceId, agoraToken, agoraChannel, callId } = req.body;

    if (!fcmToken || !callerUid || !agoraToken || !agoraChannel || !callId) {
      return res.status(400).send('Missing fcmToken, callerUid, agoraToken, agoraChannel, or callId');
    }

    const message = {
      token: fcmToken,
      notification: {
        title: "Incoming Call",
        body: `Incoming call from ${callerUid}`, // Use callerUid
      },
      data: {
        type: "ring",
        callerUid: callerUid, // The UID of the caller
        callerDeviceId: callerDeviceId, // The device ID of the caller
        "token": agoraToken,
        "channel": agoraChannel,
        "callId": callId // IMPORTANT: Pass the unique call ID
      },
      android: {
        priority: "high",
        notification: {
          channel_id: "incoming_call_channel",
          sound: "ringtone",
          visibility: "public",
          // full_screen_intent: true // Already handled by the client-side PendingIntent
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

// NEW: Endpoint to send "stop_ring" (optional, but good for explicit control)
// Alternatively, rely solely on Firebase activeCall node changes.
// This endpoint would be called by the primary device or server once a call is answered.
/*
app.post('/sendStopRingingNotification', async (req, res) => {
  try {
    const { fcmToken, callId } = req.body;

    if (!fcmToken || !callId) {
      return res.status(400).send('Missing fcmToken or callId');
    }

    const message = {
      token: fcmToken,
      data: {
        type: "stop_ring",
        callId: callId
      }
    };

    const response = await admin.messaging().send(message);
    console.log('FCM Stop Ring Message sent successfully:', response);
    return res.status(200).send('Stop Ring Notification sent');
  } catch (error) {
    console.error('Error sending FCM stop ring:', error);
    return res.status(500).send('Internal Server Error');
  }
});
*/

// Add root GET route
app.get('/', (req, res) => {
  res.send('FCM Server is running');
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
