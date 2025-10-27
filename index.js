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

    const notificationBody = `Incoming call from ${callerId}`;

    const message = {
      token: fcmToken,

      // ✅ only include title/body here — no `sound` key!
      notification: {
        title: "Incoming Call",
        body: notificationBody,
      },

      // Custom data for your app
      data: {
        type: "ring",
        callerId: callerId,
        token: agoraToken || "",
        channel: agoraChannel || "",
      },

      // ✅ iOS-specific APNS configuration
      apns: {
        headers: {
          'apns-priority': '10',
          'apns-push-type': 'alert',
        },
        payload: {
          aps: {
            alert: {
              title: "Incoming Call",
              body: notificationBody,
            },
            sound: "ringtone.caf", // 🔊 Custom ringtone from your app bundle
            category: "INCOMING_CALL",
          },
          token: agoraToken || "",
          channel: agoraChannel || "",
          callerId: callerId,
        },
      },

      // ✅ Android configuration
      android: {
        priority: "high",
        notification: {
          channel_id: "incoming_call_channel",
          sound: "ringtone", // 🔊 must match a file in res/raw/ringtone.mp3
          visibility: "public",
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log("✅ FCM Message sent successfully:", response);
    return res.status(200).send("Notification sent");
  } catch (error) {
    console.error("❌ Error sending FCM:", error);
    return res.status(500).send("Internal Server Error");
  }
});

app.get('/', (req, res) => res.send('FCM Server is running'));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
