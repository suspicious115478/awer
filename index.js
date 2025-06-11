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
      // *** IMPORTANT CHANGE: REMOVED 'notification' PAYLOAD ***
      // notification: { // <--- REMOVE THIS BLOCK
      //   title: "Incoming Call",
      //   body: `Incoming call from ${callerId}`,
      // },
      data: { // <--- This is now the ONLY payload
        type: "ring",
        callerId: callerId,
        "token": agoraToken || "",
        "channel": agoraChannel || ""
      },
      android: {
        priority: "high", // Keep high priority for timely delivery
        // Although the 'notification' block is removed,
        // the channel_id for the Android-specific configuration is still useful
        // as it influences how Android routes the notification built locally.
        notification: {
          channel_id: "incoming_call_channel" // Ensures the channel is used
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

app.get('/', (req, res) => {
  res.send('FCM Server is running');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
