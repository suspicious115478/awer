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
    
    // Construct the notification body for the alert banner
    const notificationBody = `Incoming call from ${callerId}`;

    const message = {
      token: fcmToken,
      
      // The `notification` block defines what appears in the notification banner
      notification: {
        title: "Incoming Call",
        body: notificationBody,
        sound: "ringtone.caf"   // 🔔 Custom ringtone (must be bundled in your iOS app)
      },
      
      // Custom data payload for in-app handling
      data: { 
        type: "ring",
        callerId: callerId,
        token: agoraToken || "",
        channel: agoraChannel || ""
      },
      
      // ✅ iOS-specific configuration (APNs)
      apns: {
        headers: {
          'apns-priority': '10',           // Immediate delivery
          'apns-push-type': 'alert'
        },
        payload: {
          aps: {
            alert: {
              title: "Incoming Call",
              body: notificationBody
            },
            // 🔊 This must match the sound file in your app bundle (e.g., ringtone.caf)
            sound: "ringtone.mp3",
            category: "INCOMING_CALL"       // Optional, useful for iOS call UI later
          },
          // Make sure critical info is also accessible on cold start
          token: agoraToken || "",
          channel: agoraChannel || "",
          callerId: callerId
        }
      },

      // ✅ Android-specific configuration
      android: {
        priority: "high",
        notification: {
          channel_id: "incoming_call_channel",
          sound: "ringtone",                // 🔊 Android looks for `res/raw/ringtone.mp3`
          visibility: "public",
          defaultSound: false               // Don’t override custom sound
        }
      }
    };

    const response = await admin.messaging().send(message);
    console.log('✅ FCM Message sent successfully:', response);
    return res.status(200).send('Notification sent');
  } catch (error) {
    console.error('❌ Error sending FCM:', error);
    return res.status(500).send('Internal Server Error');
  }
});

// Root route
app.get('/', (req, res) => {
  res.send('FCM Server is running');
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
