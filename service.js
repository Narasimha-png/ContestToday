const admin = require('firebase-admin');
const cron = require('node-cron');
const path = require('path');

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

cron.schedule('* * * * *', () => {
  sendNotification();
}, {
  timezone: "Asia/Kolkata"  
});

function sendNotification() {
  // Retrieve FCM tokens from the database
  db.ref('fcmTokens').once('value')
    .then((snapshot) => {
      const tokens = [];
      snapshot.forEach((childSnapshot) => {
        const token = childSnapshot.val().token;
        tokens.push(token);
      });
        if( tokens.length > 0 ){
      contestNotifier(tokens) ;
        }
    });
      // Prepare message to send to all tokens
     
}
function contestNotifier(tokens){
  var day = getWeekday(new Date()) ;
  if( day == 'Sunday'){
      sendDailyNotification("LeetCode Weekly Contest" , "Starts at 08:00 AM" , tokens );
      sendDailyNotification("Geeks For Geeks Contest" , "Starts at 07:00 PM"  ) ;
  }
  else if( day == 'Monday'){
      sendDailyNotification("LeetCode Weekly Contest" , "Starts at 08:00 AM", tokens  );
      sendDailyNotification("Geeks For Geeks Contest" , "Starts at 07:00 PM" , tokens  ) ;
  }
  else if( day == 'Saturday' ){
      if(isDateInList(biweeklySaturdays, new Date()))
      sendDailyNotification("LeetCode Bi-Weekly Contest" , "Starts at 08:00 PM", tokens  );
  }
  else if( day == 'Wednesday' ){
      sendDailyNotification("CodeChef Contest" , "Starts at 08:00 PM" , tokens  );
  }
  else if( day == 'Thursday' ){
      sendDailyNotification("CodeStudio Contest" , "Starts at 8:00PM" , tokens  ) ;
  }
  fetchdata( tokens ) ;
}
function getWeekday(date) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}



async function fetchdata(tokens){
  const cfetch =await fetch("https://codeforces.com/api/contest.list") ;
  const cf =await cfetch.json();
  var map = new Map() ;
  for (let i = 0; i < cf.result.length; i++) {
      const element = cf.result[i];
      if (element.phase !== "BEFORE") {
          break;
      }
      map.set(element.name, -1 * element.relativeTimeSeconds);
      
  }
  console.log(map) ;
  map.set("DIV 2 " , 7260)
  for(const [key , value ] of map.entries() ){
     if( value < 86400 ){
      var hours = new Date().getHours() ;
      var nhours =Math.floor(value/(60*60) );
      var min = Math.floor((value % (60*60))/60) ;
      sendDailyNotification(key , `Starts at ${hours+nhours} : ${min}` , tokens ) ;
     }
  }
}
function sendDailyNotification(notitle , nobody , tokens ) {
  const message = {
    notification: {
      title: notitle ,
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
