import { getMessaging } from 'firebase-admin/messaging';

export default class Firebase {
    #logger = null;
    constructor(logger)
    {
        this.#logger = logger;
    }
    sentTestMessage() {
        const vincent = '3961'; // agdq2020 -> A Hat In Time
        const topic = vincent;

        sendStartMessageForRun(topic);
    }
    sendStartMessageForRun(run, reason) {
        const topic = `run.start.${run.id}`;

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

        let logData = {firebaseMessage, id: run.id, display_name: run.display_name, reason};

        this.#logger.info("[FIREBASE] Sending message for run {id} ({display_name})... (Reason: {reason})", logData);
        getMessaging().send(firebaseMessage)
            .then((response) => {
                this.#logger.info("[FIREBASE] Successfully sent message for run {id} ({display_name}): {response} (Reason: {reason})", {...logData, response});
            })
            .catch((error) => {
                this.#logger.info("[FIREBASE] Error sending message for run {id} ({display_name}): {error} (Error: {error})", {...logData, error});
            });
    }
    sendStartMessageForNewSchedule(event, reason) {
        const topic = `event.schedule`;

        const firebaseMessage = {
            notification: {
                title: `GDQ Reminder: ${event.fields.short} announced!`,
                body: "Tap to set your reminders!"
            },
            android: {
                notification: {
                    color: "#00aeef",
                    icon: 'notification'
                }
            },
            data: {
                event: topic,
                short: event.fields.short
            },
            topic: topic
        };

        let logData = {firebaseMessage, event, reason};

        this.#logger.info("[FIREBASE] Sending message for event {event.fields.short}", logData);
        getMessaging().send(firebaseMessage)
            .then((response) => {
                this.#logger.info("[FIREBASE] Successfully sent message for event {event.fields.short} (Response: {response})", {...logData, response});
            })
            .catch((error) => {
                this.#logger.info("[FIREBASE] Error sending message for event {event.fields.short} (Error: {error})", {...logData, error});
            });
    }
}