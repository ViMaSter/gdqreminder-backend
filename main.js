const { initializeApp } = require('firebase-admin/app');
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();

// The topic name can be optionally prefixed with "/topics/".
const topic = 'run.start.3302';

const message = {
    notification: {
        title: "Diese Notification sollte blau sein.",
        body: "GDQ Blau, to be exact. 🤓"
    },
    android: {
        notification: {
            color: "#00aeef"
        }
    },
    data: {
        event: "run.start.3302"
    },
    topic: topic
};

// Send a message to devices subscribed to the provided topic.
getMessaging().send(message)
  .then((response) => {
    // Response is a message ID string.
    console.log('Successfully sent message:', response);
  })
  .catch((error) => {
    console.log('Error sending message:', error);
  });