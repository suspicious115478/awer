const express = require('express');
const admin = require('firebase-admin');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// Make sure your serviceAccount parsing is correct.
// For production, environment variables are best.
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

app.post('/sendRingingNotification', async (req, res) => {
  try {
    const { fcmToken, callerId, agoraToken, agoraChannel } = req.body;

console.log('Received fcmToken:', fcmToken);
console.log('Received callerId:', callerId);
console.log('Received agoraToken:', agoraToken); // ADD THIS LOG
console.log('Received agoraChannel:', agoraChannel);

    if (!fcmToken || !callerId) {
      return res.status(400).send('Missing fcmToken or callerId');
    }

    const message = {
      token: fcmToken,
      data: { // This is the ONLY payload that triggers onMessageReceived for killed/background apps
        type: "ring",
        callerId: callerId,
        "token": agoraToken || "",
        "channel": agoraChannel || ""
      },
      android: { // Critical for ensuring data-only messages wake up the app
        priority: "high",
        // ABSOLUTELY NO 'notification' OBJECT HERE OR ANYWHERE ELSE IN THE MESSAGE!
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
