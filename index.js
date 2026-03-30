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

      // ✅ ANDROID: notification field BILKUL NAHI — sirf data
      // Agar notification field hoga to Android OS khud notification dikhayega
      // aur MyFirebaseMessagingService.onMessageReceived() background mein call NAHI hoga
      // Hum chahte hain ki onMessageReceived() call ho taaki hum
      // Accept/Decline buttons wali custom notification dikha sakein

      // ✅ iOS: APNS config unchanged — iOS ka logic bilkul nahi bigda
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
            sound: "ringtone.mp3",
            category: "INCOMING_CALL",
          },
          token: agoraToken || "",
          channel: agoraChannel || "",
          callerId: callerId,
        },
      },

      // ✅ Android: sirf priority high aur channel_id
      // notification block nahi — data-only message
      android: {
        priority: "high",
        // notification block NAHI — ye zaroori hai
        // taaki onMessageReceived() background mein bhi fire ho
      },

      // ✅ Data payload — yahi onMessageReceived() ko milega
      data: {
        type: "ring",
        callerId: callerId,
        token: agoraToken || "",
        channel: agoraChannel || "",
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
