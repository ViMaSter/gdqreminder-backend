import { getMessaging } from 'firebase-admin/messaging';

export default class Firebase {
    #logger = null;
    constructor(logger)
    {
        this.#logger = logger;
    }
    sentTestMessage() {
        const vincent = '3961'; // agdq2020 -> A Hat In Time
        const daniel = '5276'; // ???
        const kenzaki = '997' // sgdq2011 -> darkwing duck
        const both = '5273'; // sgdq2022 -> preshow
        // The topic name can be optionally prefixed with "/topics/".
        const topic = vincent;

        sendStartMessageForRun(topic);
    }
    sendStartMessageForRun(runPK) {
        const topic = `run.start.${runPK}`;

        const message = {
            notification: {
                title: "[LOCAL] "+topic,
                body: "👀"
            },
            android: {
                notification: {
                    color: "#00aeef"
                }
            },
            data: {
                event: topic
            },
            topic: topic
        };

        getMessaging().send(message)
            .then((response) => {
                this.#logger.info('Successfully sent message: ' + response);
            })
            .catch((error) => {
                this.#logger.info('Error sending message: ' + error);
            });
    }
}