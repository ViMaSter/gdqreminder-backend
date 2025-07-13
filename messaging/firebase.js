import { getMessaging } from 'firebase-admin/messaging';

export default class Firebase {
    #logger = null;
    constructor(logger)
    {
        this.#logger = logger;
    }
    sendStartMessageForRun(run, reason) {
        const topic = `run.start.${run.id}`;

        const firebaseMessage = {
            notification: {
                title: `GDQ Reminder: ${run.name}`,
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

        let logData = {firebaseMessage, id: run.id, name: run.name, reason};

        this.#logger.info("[FIREBASE] Sending start message for run {id} ({name})... (Reason: {reason})", logData);
        getMessaging().send(firebaseMessage)
            .then((response) => {
                this.#logger.info("[FIREBASE] Successfully sent message for run {id} ({name}): {response} (Reason: {reason})", {...logData, response});
            })
            .catch((error) => {
                this.#logger.info("[FIREBASE] Error sending message for run {id} ({name}): {error} (Error: {error})", {...logData, error});
            });
    }
    sendNewlyAddedForRun(run, reason) {
        const topic = `run.added`;

        const firebaseMessage = {
            notification: {
                title: `GDQ Reminder: ${run.display_name}`,
                body: "Just announced! Check the schedule!"
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

        this.#logger.info("[FIREBASE] Sending run announcement for run {id} ({display_name})...", logData);
        getMessaging().send(firebaseMessage)
            .then((response) => {
                this.#logger.info("[FIREBASE] Successfully sent message for run {id} ({display_name})", {...logData, response});
            })
            .catch((error) => {
                this.#logger.info("[FIREBASE] Error sending message for run {id} ({display_name}): {error} (Error: {error})", {...logData, error});
            });
    }
    sendStartMessageForNewSchedule(event) {
        const topic = `event.schedule`;

        const firebaseMessage = {
            notification: {
                title: `GDQ Reminder: ${event.short} announced!`,
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
                short: event.short
            },
            topic: topic
        };

        let logData = {firebaseMessage, event};

        this.#logger.info("[FIREBASE] Sending message for event {event.short}", logData);
        getMessaging().send(firebaseMessage)
            .then((response) => {
                this.#logger.info("[FIREBASE] Successfully sent message for event {event.short} (Response: {response})", {...logData, response});
            })
            .catch((error) => {
                this.#logger.info("[FIREBASE] Error sending message for event {event.short} (Error: {error})", {...logData, error});
            });
    }
}