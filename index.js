const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser'); // Import bodyParser for parsing POST request bodies
const admin = require('firebase-admin'); // Import Firebase Admin SDK
const service = require("./service") ;
// Initialize Firebase Admin SDK
let serviceAccount = require(path.join(__dirname, './variables.json'));


app.use(express.static(path.join(__dirname, 'views')));
app.use('/logos', express.static(path.join(__dirname, 'logos')));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});


// Parse JSON bodies
app.use(bodyParser.json());

// Endpoint to store FCM token
app.post('/store-fcm-token', (req, res) => {
    const token = req.body.token;
    const fcmTokensRef = admin.database().ref('fcmTokens');

    // Check if the token already exists
    fcmTokensRef.orderByChild('token').equalTo(token).once('value', snapshot => {
        if (snapshot.exists()) {
            console.log('FCM token already exists');
            res.status(200).send('FCM Token already exists');
        } else {
            // If the token doesn't exist, store it
            fcmTokensRef.push({ token: token })
                .then(() => {
                    console.log('FCM token stored successfully');
                    res.status(200).send('FCM Token received and stored successfully');
                })
                .catch(error => {
                    console.error('Error storing FCM token:', error);
                    res.status(500).send('Error storing FCM Token');
                });
        }
    });
});

// Start server
const PORT = process.env.PORT || 7000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
