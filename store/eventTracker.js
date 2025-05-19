import moment from "moment";

export class EventTracker {
    #logger = {
        error: ()=>{},
        warn: ()=>{},
        help: ()=>{},
        data: ()=>{},
        info: ()=>{},
        debug: ()=>{},
        prompt: ()=>{},
        http: ()=>{},
        verbose: ()=>{},
        input: ()=>{},
        silly: ()=>{},
    };
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

            await new Promise(resolve => {
                setTimeout(resolve, refreshIntervalInMS)
                afterEachCheck?.(startAt);
            });
        }
    }

    async #checkForNewEvents() {
        // fetch https://tracker.gamesdonequick.com/tracker/api/v2/events/; if 200, get .results, order descending by datetime, take [0], get {.id, .short}
        this.#logger.info("Fetching events");
        const eventRequest = await this.#httpClient.get("https://tracker.gamesdonequick.com/tracker/api/v2/events");
        if (eventRequest.statusCode !== 200) {
            this.#logger.error("Failed to fetch events: " + eventRequest.statusCode + "\n" + eventRequest.body);
            return;
        }

        const events = await eventRequest.json();

        const event = events.results.sort((a, b) => new Date(b.datetime) - new Date(a.datetime))[0];
        if (!event) {
            this.#logger.error("No events found");
            return;
        }
        this.#logger.info("Latest event: {short} ({id}) starting at {datetime}", event);

        // fetch https://tracker.gamesdonequick.com/tracker/api/v2/events/{id}/runs; if 200, get .results.length, call onNextEventScheduleAvailable with .short
        const eventRunsRequest = await this.#httpClient.get(`https://tracker.gamesdonequick.com/tracker/api/v2/events/${event.id}/runs`);
        if (eventRunsRequest.statusCode !== 200) {
            this.#logger.error("Failed to fetch event runs: " + eventRunsRequest.statusCode + "\n" + eventRunsRequest.body);
            return;
        }
        const eventRuns = await eventRunsRequest.json();
        if (eventRuns.results.length === 0) {
            this.#logger.error("No runs found for event: " + event.short);
            return;
        }
        this.#logger.info("Event {short} has {length} runs", event.short, eventRuns.results.length);
        if (this.#lastEventID === event.id) {
            this.#logger.info("Event ID has not changed, skipping");
            return;
        }
        if (this.#lastEventID === null) {
            this.#logger.info("Initial check, skipping");
            this.#lastEventID = event.id;
            return;
        }
        this.#lastEventID = event.id;
        this.#logger.info("Event ID has changed, calling onNextEventScheduleAvailable");
        this.#onNextEventScheduleAvailable(event);
    }

    stopLoop() {
        this.#loopRunning = false;
    }
};