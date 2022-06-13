import { getMessaging } from 'firebase-admin/messaging';

export default class Firebase
{
    sentTestMessage() {
        const vincent = 'run.start.3961'; // agdq2020 -> A Hat In Time
        const daniel = 'run.start.5276'; // ???
        const kenzaki = 'run.start.997' // sgdq2011 -> darkwing duck
        const both = 'run.start.5273'; // sgdq2022 -> preshow
        // The topic name can be optionally prefixed with "/topics/".
        const topic = vincent;
        
        const message = {
            notification: {
                title: "Got your nose!",
                body: "👀"
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
      }
}