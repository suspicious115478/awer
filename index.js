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
    console.log('Received /sendRingingNotification request');
    const { fcmToken, callerId, agoraToken, agoraChannel } = req.body;

    console.log('Request body:', req.body); // Log the incoming request body

    if (!fcmToken || !callerId) {
      console.log('Missing fcmToken or callerId (400)');
      return res.status(400).send('Missing fcmToken or callerId');
    }

    console.log('Attempting to send FCM message to token:', fcmToken);
    const message = {
      token: fcmToken,
      data: {
        type: "ring",
        callerId: callerId,
        "token": agoraToken || "",
        "channel": agoraChannel || "",
        "notification_title": "Incoming Call",
        "notification_body": `Incoming call from ${callerId}`
      },
      android: {
        priority: "high",
        notification: {
          channel_id: "incoming_call_channel",
          sound: "ringtone",
          visibility: "public",
          full_screen_intent: true,
          icon: "ic_stat_call"
        }
      }
    };

    const response = await admin.messaging().send(message);
    console.log('FCM Message sent successfully:', response);
    return res.status(200).send('Notification sent');
  } catch (error) {
    // THIS IS THE CRITICAL PART: Log the full error object!
    console.error('Error sending FCM:', error);
    console.error('Error details:', error.message, error.stack); // Get more details
    return res.status(500).send('Internal Server Error');
  }
});
