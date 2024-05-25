const admin = require('firebase-admin');
const cron = require('node-cron');
const path = require('path');

// Logging to ensure the script starts
console.log('Script started');

// Resolving the path to service account credentials
let serviceAccountPath = path.resolve(__dirname, './variables.json');
let serviceAccount = require(serviceAccountPath);

// Initialize Firebase app if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://contesttoday-1bd6c-default-rtdb.firebaseio.com"
  });
}

// Firebase database and messaging services
const db = admin.database();
const messaging = admin.messaging();

// Schedule cron job to run at 6:54 AM every day
cron.schedule('54 6 * * *', () => {
  console.log('Cron job triggered at 6:54 AM');
  sendNotification();
}, {
  timezone: "Asia/Kolkata"
});

// Function to send notification
function sendNotification() {
  console.log('Sending notification');
  // Retrieve FCM tokens from the database
  db.ref('fcmTokens').once('value')
    .then((snapshot) => {
      const tokens = [];
      snapshot.forEach((childSnapshot) => {
        const token = childSnapshot.val().token;
        tokens.push(token);
      });
      if (tokens.length > 0) {
        contestNotifier(tokens);
      } else {
        console.log('No tokens found');
      }
    })
    .catch((error) => {
      console.error('Error fetching tokens:', error);
    });
}

// Function to notify about contests
function contestNotifier(tokens) {
  console.log('Notifying about contests');
  var day = getWeekday(new Date());
  if (day === 'Sunday') {
    sendDailyNotification("LeetCode Weekly Contest", "Starts at 08:00 AM", tokens);
    sendDailyNotification("Geeks For Geeks Contest", "Starts at 07:00 PM", tokens);
  } else if (day === 'Monday') {
    sendDailyNotification("LeetCode Weekly Contest", "Starts at 08:00 AM", tokens);
    sendDailyNotification("Geeks For Geeks Contest", "Starts at 07:00 PM", tokens);
  } else if (day === 'Saturday') {
    if (isDateInList(biweeklySaturdays, new Date()))
      sendDailyNotification("LeetCode Bi-Weekly Contest", "Starts at 08:00 PM", tokens);
  } else if (day === 'Wednesday') {
    sendDailyNotification("CodeChef Contest", "Starts at 08:00 PM", tokens);
  } else if (day === 'Thursday') {
    sendDailyNotification("CodeStudio Contest", "Starts at 8:00 PM", tokens);
  }
  fetchdata(tokens);
}

// Function to get the weekday from a date
function getWeekday(date) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

// Fetching contest data and sending notifications
async function fetchdata(tokens) {
  console.log('Fetching contest data');
  const cfetch = await fetch("https://codeforces.com/api/contest.list");
  const cf = await cfetch.json();
  var map = new Map();
  for (let i = 0; i < cf.result.length; i++) {
    const element = cf.result[i];
    if (element.phase !== "BEFORE") {
      break;
    }
    map.set(element.name, -1 * element.relativeTimeSeconds);
  }
  console.log(map);
  for (const [key, value] of map.entries()) {
    if (value < 86400) {
      var hours = new Date().getHours();
      var nhours = Math.floor(value / (60 * 60));
      var min = Math.floor((value % (60 * 60)) / 60);
      sendDailyNotification(key, `Starts at ${hours + nhours} : ${min}`, tokens);
    }
  }
}

// Function to send daily notifications
function sendDailyNotification(notitle, nobody, tokens) {
  const message = {
    notification: {
      title: notitle,
      body: nobody
    },
    tokens: tokens
  };

  // Send message to all tokens
  return messaging.sendMulticast(message)
    .then((response) => {
      console.log('Successfully sent message to all tokens:', response);
    })
    .catch((error) => {
      console.error('Error sending message to all tokens:', error);
    });
}

// Example function to check if a date is in a list (you need to define biweeklySaturdays)
function isDateInList(list, date) {
  // Implement this function to check if the date is in the list
  return list.some(d => d.getTime() === date.getTime());
}
