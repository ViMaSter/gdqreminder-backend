import moment from "moment";

export class EventTracker {
    #logger = null;
    #lastEventID = null;
    #httpClient = null;
    #timeProvider = null;
    #onNextEventScheduleAvailable = null;
    #refreshIntervalInMS = 10000;

    #loopRunning = false;
    constructor(logger, httpClient, timeProvider, onNextEventScheduleAvailable) {
        if (logger)
        {
            this.#logger = logger;
        }
        this.#httpClient = httpClient;
        this.#timeProvider = timeProvider;
        this.#onNextEventScheduleAvailable = onNextEventScheduleAvailable;
    }

    async startLoop(config) {
        if (this.#loopRunning) {
            throw new Error("Loop is already running");
        }
        this.#loopRunning = true;
        const {beforeNextCheck, afterEachCheck, refreshIntervalInMS} = config;
        while (this.#loopRunning) {
            const startAt = moment(this.#timeProvider.getCurrent());
            beforeNextCheck?.(startAt);

            await this.#checkForNewEvents();
            this.#logger.info("[EVENT-LOOP] duration: " + moment.utc(moment(this.#timeProvider.getCurrent()).diff(startAt)).format("HH:mm:ss.SSS"));

            await new Promise(resolve => {
                setTimeout(resolve, refreshIntervalInMS)
                afterEachCheck?.(startAt);
            });
        }
    }

    async #checkForNewEvents() {
        // fetch https://tracker.gamesdonequick.com/tracker/api/v2/events/; if 200, get .results, order descending by datetime, take [0], get {.id, .short}
        this.#logger.info("[EVENT-LOOP] Fetching events");
        const eventRequest = await this.#httpClient.get("https://tracker.gamesdonequick.com/tracker/api/v2/events");
        if (eventRequest.statusCode !== 200) {
            this.#logger.error("[EVENT-LOOP] Failed to fetch events: " + eventRequest.statusCode + "\n" + eventRequest.body);
            return;
        }

        const events = JSON.parse(eventRequest.body);

        const event = events.results.sort((a, b) => new Date(b.datetime) - new Date(a.datetime))[0];
        if (!event) {
            this.#logger.error("[EVENT-LOOP] No events found");
            return;
        }
        this.#logger.info("[EVENT-LOOP] Latest event: {short} ({id}) starting at {datetime}", event);

        // fetch https://tracker.gamesdonequick.com/tracker/api/v2/events/{id}/runs; if 200, get .results.length, call onNextEventScheduleAvailable with .short
        const eventRunsRequest = await this.#httpClient.get(`https://tracker.gamesdonequick.com/tracker/api/v2/events/${event.id}/runs`);
        if (eventRunsRequest.statusCode !== 200) {
            this.#logger.error("[EVENT-LOOP] Failed to fetch event runs: " + eventRunsRequest.statusCode + "\n" + eventRunsRequest.body);
            return;
        }
        const eventRuns = JSON.parse(eventRunsRequest.body);
        if (eventRuns.results.length === 0) {
            this.#logger.error("[EVENT-LOOP] No runs found for event: " + event.short);
            return;
        }
        this.#logger.info("[EVENT-LOOP] Event {short} has {length} runs", {short: event.short, length: eventRuns.results.length});
        if (this.#lastEventID === event.id) {
            this.#logger.info("[EVENT-LOOP] Event ID has not changed, skipping");
            return;
        }
        if (this.#lastEventID === null) {
            this.#logger.info("[EVENT-LOOP] Initial check, skipping");
            this.#lastEventID = event.id;
            return;
        }
        this.#lastEventID = event.id;
        if (!event.short.toLowerCase().includes("gdq")) {
            this.#logger.info("[EVENT-LOOP] Event {short} is not a GDQ event, skipping", {short: event.short});
            return;
        }
        this.#logger.info("[EVENT-LOOP] Event {short} is a GDQ event, calling onNextEventScheduleAvailable", {short: event.short});
        this.#onNextEventScheduleAvailable(event);
    }

    stopLoop() {
        this.#loopRunning = false;
    }
};