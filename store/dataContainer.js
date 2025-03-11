import moment from 'moment';

export class DataContainer
{
  static EmitReasons = Object.freeze({
    StartInLessThanTenMinutes: "0",
    TwitchDataMatch: "1"
  });

  #data = {
    "eventOrder": [],
    "events": {},
    "runsWithEventID": {},
  };

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
  #gotClient = null;
  #timeProvider = null;
  #onNextRunStarted = null;
  #onNextScheduleReleased = null;
  #twitch = null;

  constructor(logger, gotClient, timeProvider, twitch, onNextRunStarted, onNextScheduleReleased)
  {
    if (logger)
    {
      this.#logger = logger;
    }
    this.#gotClient = gotClient;
    this.#timeProvider = timeProvider;
    this.#onNextRunStarted = onNextRunStarted;
    this.#onNextScheduleReleased = onNextScheduleReleased;
    this.#twitch = twitch;
  }

  async getAllEvents() 
  {
    let events = (await this.#gotClient.get("https://tracker.gamesdonequick.com/tracker/api/v2/events").json()).results.filter(e=>e.short.toLowerCase().includes("gdq"));
    debugger;
    events = events.map(event => {
      event.short = event.short.toLowerCase();
      event.startTime = new Date(event.datetime);
      delete event.datetime;
      return event;
    })
    const eventsById = Object.fromEntries(events.map(entry => [entry.id, entry]));
    this.#data.events = {...this.#data.events, ...eventsById};
    
    const eventsInOrder = events.sort((a,b)=>new Date(a.startTime) - new Date(b.startTime));
    this.#data.eventOrder = eventsInOrder;
  }
  async getEvent(eventID)
  {
    const runs = await this.#gotClient.get(`https://tracker.gamesdonequick.com/tracker/api/v2/events/${eventID}/runs/`).json();

    const runsWithEventIDById = Object.fromEntries(runs.map(entry => {
      entry.startTime = new Date(entry.starttime);
      delete entry.starttime;

      entry.endTime = new Date(entry.endtime);
      delete entry.endtime;

      entry.eventID = eventID;

      return [entry.id, entry];
    }));
    this.#data.runsWithEventID = {...this.#data.runsWithEventID, ...runsWithEventIDById};

    const runsInOrder = Object.values(runsWithEventIDById).sort((a,b)=>new Date(a.startTime) - new Date(b.startTime));
    if (this.#data.eventOrder.length <= 0)
    {
      await this.getAllEvents();
    }

    if (this.#data.events[eventID] && this.#data.events[eventID].runsInOrder && this.#data.events[eventID].runsInOrder.length == 0 && runsInOrder.length > 0)
    {
      this.#onNextScheduleReleased(this.#data.events[eventID]);
    }

    this.#data.events[eventPK].runsInOrder = runsInOrder;
    this.#data.eventOrder[eventIndex].runsInOrder = runsInOrder;

    const lastRunOfEvent = runsInOrder?.at(-1);

    if (lastRunOfEvent)
    {
      this.#data.events[eventPK].endTime = new Date(this.#data.runsWithEventID[lastRunOfEvent.id].endTime);
      this.#data.eventOrder[eventIndex].endTime = new Date(this.#data.runsWithEventID[lastRunOfEvent.id].endTime);
    }

    return this.#data.events[eventPK];
  }

  async getPreviousEvent()
  {
    if (this.#data.eventOrder.length <= 0)
    {
      await this.getAllEvents();
    }

    let eventsStartedBeforeNow = this.#data.eventOrder.filter(event=>new Date(event.startTime) <= this.#timeProvider.getCurrent());
    const currentEvent = await this.getCurrentEvent();
    if (currentEvent?.short)
    {
      eventsStartedBeforeNow = eventsStartedBeforeNow.filter(event=>event.short !== currentEvent.short);
    }
    const lastEvent = eventsStartedBeforeNow.at(-1);
    if (!lastEvent)
    {
      return null;
    }
    return this.getEvent(lastEvent.id);
  }

  async getCurrentEvent()
  {
    if (this.#data.eventOrder.length <= 0)
    {
      await this.getAllEvents();
    }
    const eventsStartedBeforeNow = this.#data.eventOrder.filter(event=>new Date(event.startTime) <= this.#timeProvider.getCurrent());
    if (eventsStartedBeforeNow.length == 0)
    {
      return null;
    }
    const currentEvent = eventsStartedBeforeNow.at(-1);
    const event = await this.getEvent(currentEvent.id);
    if (new Date(event.endTime) > this.#timeProvider.getCurrent())
    {
      return event;
    }

    return null;
  }

  async getRelevantEvent()
  {
    const currentEvent = await this.getCurrentEvent();
    if (currentEvent)
    {
      return currentEvent;
    }

    const previousEvent = await this.getPreviousEvent();
    const nextEvent = await this.getNextEvent();
    if (nextEvent)
    {
      // if time between start time of next event is smaller than time between start time of previous event
      if (Math.abs(new Date(nextEvent.startTime) - this.#timeProvider.getCurrent()) < Math.abs(new Date(previousEvent.endTime) - this.#timeProvider.getCurrent()))
      {
        return nextEvent;
      }
    }

    return previousEvent;
  }

  async getNextEvent()
  {
    if (this.#data.eventOrder.length <= 0)
    {
      await this.getAllEvents();
    }
    const eventsStartingInTheFuture = this.#data.eventOrder.filter(event=>new Date(event.startTime) > this.#timeProvider.getCurrent());
    const firstUpcomingEvent = eventsStartingInTheFuture.at(0);
    if (!firstUpcomingEvent)
    {
      return null;
    }
    return this.getEvent(firstUpcomingEvent.id);
  }

  async getPreviousRun()
  {
    const currentRun = await this.getCurrentRun();
    const currentEvent = await this.getRelevantEvent();

    if (currentRun != null)
    {
      const previousRunIndex = this.#data.events[currentEventid].runsInOrder.findIndex(run => run.id == currentRun.id) - 1;
      if (previousRunIndex < 0)
      {
        return null;
      }
      return this.#data.events[currentEvent.id].runsInOrder[previousRunIndex];
    }

    if (currentEvent.endTime <= this.#timeProvider.getCurrent())
    {
      return this.#data.events[currentEvent.id].runsInOrder.at(-1);
    }

    return null;
  }

  async getCurrentRun()
  {
    const currentEvent = await this.getCurrentEvent();
    if (currentEvent == null)
    {
      return null;
    }

    const currentEventPK = currentEvent.id;

    const currentRun = this.#data.events[currentEventPK].runsInOrder.find(run => run.startTime <= this.#timeProvider.getCurrent() && this.#timeProvider.getCurrent() < run.endTime);
    return currentRun;
  }

  async getNextRun()
  {
    const currentRun = await this.getCurrentRun();
    const currentEvent = await this.getRelevantEvent();

    if (currentRun != null)
    {
      const nextRunIndex = this.#data.events[currentEvent.id].runsInOrder.findIndex(run => run.id == currentRun.id) + 1;
      if (nextRunIndex >= this.#data.events[currentEvent.id].runsInOrder.length)
      {
        return null;
      }
      return this.#data.events[currentEvent.id].runsInOrder[nextRunIndex];
    }

    if (currentEvent.startTime > this.#timeProvider.getCurrent())
    {
      return this.#data.events[currentEvent.id].runsInOrder.at(0);
    }

    return null;
  }

  #dataAtLastCheck = {
    timestamp: -1,
    currentlyTrackedRunPK: null,
    notifiedRuns: []
  };

  async getRunToMonitor()
  {
    const lastCalledAt = this.#dataAtLastCheck.timestamp;
    const now = this.#timeProvider.getCurrent();

    this.#dataAtLastCheck.timestamp = now.getTime();

    if (this.#dataAtLastCheck.currentlyTrackedRunPK)
    {
      await this.getEvent(this.#data.runsWithEventID[this.#dataAtLastCheck.currentlyTrackedRunPK].eventID);
      if (!this.#dataAtLastCheck.notifiedRuns.includes(this.#dataAtLastCheck.currentlyTrackedRunPK))
      {
        return this.#data.runsWithEventID[this.#dataAtLastCheck.currentlyTrackedRunPK];
      }
    }

    if (lastCalledAt == -1)
    {
      this.#logger.info(`[MONITOR]: initial check: ${now.toISOString()}`);
      return;
    }

    let nextRunPK = this.#dataAtLastCheck.currentlyTrackedRunPK;
    do {
      if (!this.#dataAtLastCheck.currentlyTrackedRunPK)
      {
        nextRunPK = (await this.getNextRun())?.id;
        if (!nextRunPK)
        {
          return null;
        }
        break;
      }
      const relevantEvent = await this.getRelevantEvent();
      let nextRunEvent = this.#data.runsWithEventID[nextRunPK].eventID;
      if (relevantEvent.short != nextRunEvent)
      {
        nextRunPK = relevantEvent.runsInOrder.at(0).id;
        break;
      }
      const eventOfLastTrackedRun = this.#data.events[nextRunEvent];
      const nextRunIndex = eventOfLastTrackedRun.runsInOrder.findIndex(run => run.id == nextRunPK)+1;
      nextRunPK = eventOfLastTrackedRun.runsInOrder[nextRunIndex]?.id
      if (!nextRunPK)
      {
        return;
      }
  
      if (!this.#dataAtLastCheck.notifiedRuns.includes(nextRunPK))
      {
        break;
      }
      this.#logger.warn(`next run we should be tracking is ${nextRunPK}, but already informed about it, moving to the next`)
      continue;
    } while(nextRunPK);

    this.#logger.info(`[MONITOR] run pk: ${nextRunPK} (${this.#data.runsWithEventID[nextRunPK].display_name})`);
    this.#dataAtLastCheck.currentlyTrackedRunPK = nextRunPK;
    return this.#data.runsWithEventID[nextRunPK];
  }

  async checkTwitch()
  {
    const monitoredRun = await this.getRunToMonitor();
    if (!monitoredRun)
    {
      return;
    }

    if (monitoredRun.id == this.#data.events[monitoredRun.eventID].runsInOrder[0].id)
    {
      return;
    }
    
    if (monitoredRun.twitch_name)
    {
      if (await this.#twitch.isSubstringOfGameNameOrStreamTitle(monitoredRun.twitch_name))
      {
        this.#dataAtLastCheck.notifiedRuns.push(monitoredRun.id);
        this.#onNextRunStarted(monitoredRun, DataContainer.EmitReasons.TwitchDataMatch);
        return;
      }
    }

    if (monitoredRun.display_name)
    {
      if (await this.#twitch.isSubstringOfGameNameOrStreamTitle(monitoredRun.display_name))
      {
        this.#dataAtLastCheck.notifiedRuns.push(monitoredRun.id);
        this.#onNextRunStarted(monitoredRun, DataContainer.EmitReasons.TwitchDataMatch);
        return;
      }
    }
  }
  
  async checkFor10MinuteWarning()
  {
    const monitoredRun = await this.getRunToMonitor();
    if (!monitoredRun)
    {
      return;
    }
    
    if (!moment(this.#dataAtLastCheck.timestamp).add(10, 'minutes').isAfter(monitoredRun.startTime))
    {
      return;
    }

    this.#dataAtLastCheck.notifiedRuns.push(monitoredRun.id);
    this.#onNextRunStarted(monitoredRun, DataContainer.EmitReasons.StartInLessThanTenMinutes);
  }

  async checkForRunsInNextEvent()
  {
    const nextEvent = await this.getNextEvent();
    if (!nextEvent)
    {
      return;
    }
  }

  #continueLoop = false;
  async startLoop(config) {
    this.#continueLoop = true;
    const {beforeNextCheck, afterEachCheck, refreshIntervalInMS} = config;
    while (this.#continueLoop)
    {
        const startAt = moment(this.#timeProvider.getCurrent());
        beforeNextCheck?.(startAt);
        await this.checkFor10MinuteWarning();
        await this.checkTwitch();
        await this.checkForRunsInNextEvent();
        this.#logger.info("[LOOP] duration: " + moment.utc(moment(this.#timeProvider.getCurrent()).diff(startAt)).format("HH:mm:ss.SSS"));
        await new Promise((resolve) => {
          setTimeout(resolve, refreshIntervalInMS)
          afterEachCheck?.(startAt);
        });
    }
  }

  async stopLoop() {
    this.#continueLoop = false;
  }
}