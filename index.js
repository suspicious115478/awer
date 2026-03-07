const express = require('express');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.json());

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

app.post('/sendRingingNotification', async (req, res) => {
  try {
    const { fcmToken, callerId, agoraToken, agoraChannel } = req.body;

    if (!fcmToken || !callerId) {
      return res.status(400).send('Missing fcmToken or callerId');
    }

    const message = {
      token: fcmToken,

      // ✅ FIX: notification field BILKUL NAHI
      // notification field hoga to Android 2 notifications dikhata hai:
      //   1. FCM ka apna system notification (purana Agora wala)
      //   2. Flutter ka custom full-screen notification
      // Sirf data bhejo — Flutter ka _firebaseMessagingBackgroundHandler handle karega

      // ✅ Sirf data — Flutter background handler trigger hoga
      data: {
        type: "ring",
        callerId: callerId,
        agoraToken: agoraToken || "",   // Java VideoCallActivity ke saath match
        agoraChannel: agoraChannel || "", // Java VideoCallActivity ke saath match
        token: agoraToken || "",          // Flutter fallback
        channel: agoraChannel || "",      // Flutter fallback
      },

      // ✅ Android: high priority taaki killed app bhi wake ho
      android: {
        priority: "high",
        // notification block nahi — data-only message hai
      },

      // ✅ iOS: content-available=1 se background mein trigger hoga
      apns: {
        headers: {
          'apns-priority': '10',
          'apns-push-type': 'background',
        },
        payload: {
          aps: {
            'content-available': 1, // background wakeup
            sound: "ringtone.mp3",
            category: "INCOMING_CALL",
          },
          // Data iOS ke liye bhi payload mein
          type: "ring",
          callerId: callerId,
          agoraToken: agoraToken || "",
          agoraChannel: agoraChannel || "",
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log("✅ FCM sent:", response);
    return res.status(200).send("Notification sent");

  } catch (error) {
    console.error("❌ FCM Error:", error);
    return res.status(500).send("Internal Server Error");
  }
});

app.get('/', (req, res) => res.send('FCM Server is running'));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
