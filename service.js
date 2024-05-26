const admin = require('firebase-admin');
const cron = require('node-cron');
const path = require('path');
const fetch = require('node-fetch');

let serviceAccountPath = path.resolve(__dirname, './variables.json');
let serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://contesttoday-1bd6c-default-rtdb.firebaseio.com"
  });
}

const db = admin.database();
const messaging = admin.messaging();

cron.schedule('10 1 * * *', () => {
  console.log("Cron job started at 01:10 AM Asia/Kolkata timezone");
  sendNotification();
}, {
  timezone: "Asia/Kolkata"  
});

async function sendNotification() {
  try {
    // Retrieve FCM tokens from the database
    const snapshot = await db.ref('fcmTokens').once('value');
    const tokens = [];

    snapshot.forEach((childSnapshot) => {
      const token = childSnapshot.val().token;
      tokens.push(token);
    });

    if (tokens.length > 0) {
      await contestNotifier(tokens);
    } else {
      console.log('No tokens found');
    }
  } catch (error) {
    console.error('Error fetching FCM tokens:', error);
  }
}

async function contestNotifier(tokens) {
  try {
    const day = getWeekday(new Date());
    if (day === 'Sunday') {
      await sendDailyNotification("LeetCode Weekly Contest", "Starts at 08:00 AM", tokens);
      await sendDailyNotification("Geeks For Geeks Contest", "Starts at 07:00 PM", tokens);
    } else if (day === 'Monday') {
      await sendDailyNotification("LeetCode Weekly Contest", "Starts at 08:00 AM", tokens);
      await sendDailyNotification("Geeks For Geeks Contest", "Starts at 07:00 PM", tokens);
    } else if (day === 'Saturday') {
      if (isDateInList(biweeklySaturdays, new Date())) {
        await sendDailyNotification("LeetCode Bi-Weekly Contest", "Starts at 08:00 PM", tokens);
      }
    } else if (day === 'Wednesday') {
      await sendDailyNotification("CodeChef Contest", "Starts at 08:00 PM", tokens);
    } else if (day === 'Thursday') {
      await sendDailyNotification("CodeStudio Contest", "Starts at 8:00PM", tokens);
    }
    await fetchdata(tokens);
  } catch (error) {
    console.error('Error in contestNotifier:', error);
  }
}

function getWeekday(date) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

async function fetchdata(tokens) {
  try {
    const cfetch = await fetch("https://codeforces.com/api/contest.list");
    const cf = await cfetch.json();
    const map = new Map();

    for (let i = 0; i < cf.result.length; i++) {
      const element = cf.result[i];
      if (element.phase !== "BEFORE") {
        break;
      }
      map.set(element.name, -1 * element.relativeTimeSeconds);
    }

    console.log(map);

    for (const [key, value] of map.entries()) {
      if (value < 86400) { // 86400 seconds = 24 hours
        const hours = new Date().getHours();
        const nhours = Math.floor(value / (60 * 60));
        const min = Math.floor((value % (60 * 60)) / 60);
        await sendDailyNotification(key, `Starts at ${hours + nhours}:${min}`, tokens);
      }
    }
  } catch (error) {
    console.error('Error fetching Codeforces data:', error);
  }
}

async function sendDailyNotification(title, body, tokens) {
  const message = {
    notification: {
      title: title,
      body: body
    },
    tokens: tokens
  };

  try {
    const response = await messaging.sendMulticast(message);
    console.log('Successfully sent message to all tokens:', response);
  } catch (error) {
    console.error('Error sending message to all tokens:', error);
  }
}

function generateBiweeklySaturdays(startDate, endDate) {
  let dates = [];
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 14);
  }

  return dates;
}

function isDateInList(dateList, targetDate) {
  return dateList.some(date => {
    return date.toDateString() === targetDate.toDateString();
  });
}

let startDate = new Date('2024-05-25');
let endDate = new Date('2026-05-25');

let biweeklySaturdays = generateBiweeklySaturdays(startDate, endDate);
