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

      // ✅ ONLY DATA (IMPORTANT)
      data: {
        type: "ring",
        callerId: callerId,
        token: agoraToken || "",
        channel: agoraChannel || "",
      },

      // ✅ ANDROID CONFIG
      android: {
        priority: "high",
      },

      // ✅ iOS CONFIG (optional)
      apns: {
        headers: {
          "apns-priority": "10",
          "apns-push-type": "alert",
        },
        payload: {
          aps: {
            alert: {
              title: "Incoming Call",
              body: notificationBody,
            },
            sound: "default",
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log("✅ FCM sent:", response);

    return res.status(200).send("Notification sent");

  } catch (error) {
    console.error("❌ Error sending FCM:", error);

    // 🔥 HANDLE TOKEN ERROR
    if (error.code === "messaging/registration-token-not-registered") {
      console.log("⚠️ Invalid token — remove from DB");
    }

    return res.status(500).send("Internal Server Error");
  }
});

app.get('/', (req, res) => res.send('FCM Server is running'));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
