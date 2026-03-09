const express = require('express');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.json());

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// ✅ RINGING NOTIFICATION
app.post('/sendRingingNotification', async (req, res) => {
  try {
    const { fcmToken, callerId, agoraToken, agoraChannel } = req.body;

    if (!fcmToken || !callerId) {
      return res.status(400).send('Missing fcmToken or callerId');
    }

    const message = {
      token: fcmToken,
      data: {
        type: "ring",
        callerId: callerId,
        agoraToken: agoraToken || "",   
        agoraChannel: agoraChannel || "", 
        token: agoraToken || "",         
        channel: agoraChannel || "",      
      },
      android: {
        priority: "high",
      },
      apns: {
        headers: {
          'apns-priority': '10',
          'apns-push-type': 'background',
        },
        payload: {
          aps: {
            'content-available': 1, 
            sound: "ringtone.mp3",
            category: "INCOMING_CALL",
          },
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

// ✅ CANCEL RINGING NOTIFICATION (NEW)
app.post('/cancelCall', async (req, res) => {
  try {
    const { uid, acceptedDeviceId } = req.body;

    if (!uid) {
      return res.status(400).send('Missing uid');
    }

    const snapshot = await admin.database().ref(`calls/${uid}/secondaryDevices`).once('value');
    const secondaryDevices = snapshot.val();

    if (!secondaryDevices) {
      return res.status(200).send("No secondary devices found");
    }

    const tokensToCancel = [];

    // Jisne call uthai (ya reject ki), use chhodkar baaki sabke tokens nikalo
    for (const [deviceId, deviceData] of Object.entries(secondaryDevices)) {
      if (deviceId !== acceptedDeviceId && deviceData.fcmToken) {
        tokensToCancel.push(deviceData.fcmToken);
      }
    }

    if (tokensToCancel.length === 0) {
      return res.status(200).send("No other devices to cancel");
    }

    const message = {
      data: {
        type: "cancel" 
      },
      tokens: tokensToCancel 
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`✅ Cancel FCM sent to ${response.successCount} devices.`);
    return res.status(200).send("Cancel notifications sent");

  } catch (error) {
    console.error("❌ Cancel FCM Error:", error);
    return res.status(500).send("Internal Server Error");
  }
});

app.get('/', (req, res) => res.send('FCM Server is running'));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`🚀 Server running on port ${port}`));
