// Make sure you have admin initialized somewhere above this function
// const admin = require('firebase-admin');
// admin.initializeApp({ /* your service account config */ });

// Assuming 'app' is your Express app instance
app.post('/sendRingingNotification', (req, res) => {
    const { fcmToken, callerId, agoraToken, agoraChannel } = req.body;

    if (!fcmToken || !callerId || !agoraToken || !agoraChannel) {
        return res.status(400).send('Missing required fields.');
    }

    const message = {
        data: { // This is the ONLY payload that triggers onMessageReceived for killed/background apps
            type: 'ring',
            callerId: callerId,
            token: agoraToken,
            channel: agoraChannel,
        },
        token: fcmToken,
        android: { // Critical for ensuring data-only messages wake up the app
            priority: 'high',
        },
        // IMPORTANT: There MUST BE NO 'notification' OBJECT HERE!
        // If you had a 'notification' object here before, remove it completely.
    };

    admin.messaging().send(message)
        .then((response) => {
            console.log('Successfully sent message:', response);
            res.status(200).send('Notification sent successfully.');
        })
        .catch((error) => {
            console.error('Error sending message:', error);
            res.status(500).send('Error sending notification.');
        });
});
