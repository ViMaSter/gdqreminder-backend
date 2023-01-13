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
    sendStartMessageForRun(run, reason) {
        const topic = `run.start.${run.pk}`;

        const firebaseMessage = {
            notification: {
                title: `GDQ Reminder: ${run.display_name}`,
                body: "Live now! Tap and head to Twitch!"
            },
            android: {
                notification: {
                    color: "#00aeef",
                    icon: 'notification'
                }
            },
            data: {
                event: topic
            },
            topic: topic
        };

        let logData = {firebaseMessage, pk: run.pk, display_name: run.display_name, reason};

        this.#logger.info("[FIREBASE] Sending message for run {pk} ({display_name})... (Reason: {reason})", logData);
        getMessaging().send(firebaseMessage)
            .then((response) => {
                this.#logger.info("[FIREBASE] Successfully sent message for run {pk} ({display_name}): {response} (Reason: {reason})", {...logData, response});
            })
            .catch((error) => {
                this.#logger.info("[FIREBASE] Error sending message for run {pk} ({display_name}): {error} (Error: {error})", {...logData, error});
            });
    }
}