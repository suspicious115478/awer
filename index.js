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
    // Add currentUid to the destructured body parameters
    const { fcmToken, callerId, agoraToken, agoraChannel, currentUid } = req.body; 

    if (!fcmToken || !callerId || !currentUid) { // Added currentUid to the validation
      return res.status(400).send('Missing fcmToken, callerId, or currentUid');
    }

    const message = {
      token: fcmToken,
      notification: {
        title: "Incoming Call",
        body: `Incoming call from ${callerId}`,
      },
      data: { // Data payload for custom handling in `onMessageReceived`
        type: "ring",
        callerId: callerId,
        "token": agoraToken || "",
        "channel": agoraChannel || "",
        "currentUid": currentUid // <--- ADD THIS LINE
      },
      android: {
        priority: "high", 
        notification: {
          channel_id: "incoming_call_channel", 
          visibility: "public",
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
