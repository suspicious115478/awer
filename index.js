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
      
      // The `notification` block is primarily for system display on both platforms.
      notification: {
        title: "Incoming Call",
        body: notificationBody,
        // sound: "default" 
      },
      
      // Data payload for custom handling when the app is active
      data: { 
        type: "ring",
        callerId: callerId,
        "token": agoraToken || "",
        "channel": agoraChannel || ""
      },
      
      // 🚨 APNS block for reliable iOS Cold-Start Launch (THE FIX)
      apns: {
        headers: {
            // Priority 10 ensures immediate delivery and high-priority app wake-up
            'apns-priority': '10', 
            'apns-push-type': 'alert'
        },
        payload: {
          aps: {
            // The alert content
            alert: {
                title: "Incoming Call",
                body: notificationBody
            },
            // Specify a sound for the call. If you have a custom ringtone, use its name here.
            sound: "default" 
          },
          
          // 🚨 Add the CRITICAL CALL DATA to the APNS payload root
          // These keys (token, channel, callerId) must be at the root to be easily accessible
          // in application:didFinishLaunchingWithOptions: (userInfo dictionary)
          token: agoraToken || "",
          channel: agoraChannel || "",
          callerId: callerId
        }
      },
      
      // Android specific settings (unchanged)
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
