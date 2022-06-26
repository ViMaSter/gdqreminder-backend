import moment from 'moment';

export class DataContainer
{
  static EmitReasons = Object.freeze({
    TenMinutesUntilStart: "0",
    TwitchDataMatch: "1",
    StartIsInThePast: "2"
  });

  #data = {
    "eventShortToPK": {},
    "eventOrder": [],
    "events": {},
    "runsWithPK": {},
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
  #emitEvent = null;
  #twitch = null;

  constructor(logger, gotClient, timeProvider, twitch, emitEvent)
  {
    if (logger)
    {
      this.#logger = logger;
    }
    this.#gotClient = gotClient;
    this.#timeProvider = timeProvider;
    this.#emitEvent = emitEvent;
    this.#twitch = twitch;
  }

  async getAllEvents() 
  {
    let events = (await this.#gotClient.get("https://gamesdonequick.com/tracker/api/v1/search/?type=event").json()).filter(e=>e.fields.short.toLowerCase().includes("gdq"));
    events = events.map(event => {
      event.fields.short = event.fields.short.toLowerCase();
      event.fields.startTime = new Date(event.fields.datetime);
      event.fields.pk = event.pk;
      delete event.fields.datetime;
      return event;
    })
    const eventsById = Object.fromEntries(events.map(entry => [entry.pk, entry.fields]));
    this.#data.events = {...this.#data.events, ...eventsById};
    
    const eventShortToPK = Object.fromEntries(events.map(entry => [entry.fields.short, entry.pk]));
    this.#data.eventShortToPK = {...this.#data.eventShortToPK, ...eventShortToPK};

    const eventsInOrder = events.sort((a,b)=>new Date(a.fields.startTime) - new Date(b.fields.startTime)).map(event=>event.fields);
    this.#data.eventOrder = eventsInOrder;
  }
  async getEvent(eventShort)
  {
    const runs = await this.#gotClient.get(`https://gamesdonequick.com/tracker/api/v1/search/?type=run&eventshort=${eventShort}`).json();
    const runsWithPKById = Object.fromEntries(runs.map(entry => {
      entry.fields.pk = entry.pk;

      entry.fields.startTime = new Date(entry.fields.starttime);
      delete entry.fields.starttime;

      entry.fields.endTime = new Date(entry.fields.endtime);
      delete entry.fields.endtime;

      entry.fields.event = eventShort;

      return [entry.pk, entry.fields];
    }));
    this.#data.runsWithPK = {...this.#data.runsWithPK, ...runsWithPKById};

    const runsInOrder = Object.values(runsWithPKById).sort((a,b)=>new Date(a.startTime) - new Date(b.startTime));
    if (!this.#data.eventShortToPK.hasOwnProperty(eventShort))
    {
      await this.getAllEvents();
    }

    const eventPK = this.#data.eventShortToPK[eventShort];

    const eventIndex = this.#data.eventOrder.findIndex(event=>event.short === eventShort);

    this.#data.events[eventPK].runsInOrder = runsInOrder;
    this.#data.eventOrder[eventIndex].runsInOrder = runsInOrder;

    const lastRunOfEvent = runsInOrder?.at(-1);

    if (lastRunOfEvent)
    {
      this.#data.events[eventPK].endTime = new Date(this.#data.runsWithPK[lastRunOfEvent.pk].endTime);
      this.#data.eventOrder[eventIndex].endTime = new Date(this.#data.runsWithPK[lastRunOfEvent.pk].endTime);
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
    return this.getEvent(lastEvent.short);
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
    const event = await this.getEvent(currentEvent.short);
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
    return this.getEvent(firstUpcomingEvent.short);
  }

  async getPreviousRun()
  {
    const currentRun = await this.getCurrentRun();
    const currentEvent = await this.getRelevantEvent();

    if (currentRun != null)
    {
      const previousRunIndex = this.#data.events[currentEvent.pk].runsInOrder.findIndex(run => run.pk == currentRun.pk) - 1;
      if (previousRunIndex < 0)
      {
        return null;
      }
      return this.#data.events[currentEvent.pk].runsInOrder[previousRunIndex];
    }

    if (currentEvent.endTime <= this.#timeProvider.getCurrent())
    {
      return this.#data.events[currentEvent.pk].runsInOrder.at(-1);
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

    const currentEventPK = currentEvent.pk;

    const currentRun = this.#data.events[currentEventPK].runsInOrder.find(run => run.startTime <= this.#timeProvider.getCurrent() && this.#timeProvider.getCurrent() < run.endTime);
    return currentRun;
  }

  async getNextRun()
  {
    const currentRun = await this.getCurrentRun();
    const currentEvent = await this.getRelevantEvent();

    if (currentRun != null)
    {
      const nextRunIndex = this.#data.events[currentEvent.pk].runsInOrder.findIndex(run => run.pk == currentRun.pk) + 1;
      if (nextRunIndex >= this.#data.events[currentEvent.pk].runsInOrder.length)
      {
        return null;
      }
      return this.#data.events[currentEvent.pk].runsInOrder[nextRunIndex];
    }

    if (currentEvent.startTime > this.#timeProvider.getCurrent())
    {
      return this.#data.events[currentEvent.pk].runsInOrder.at(0);
    }

    return null;
  }

  #dataAtLastCheck = {
    timestamp: -1,
    currentlyTrackedRun: null,
    notifiedRuns: []
  };

  async getRunToMonitor()
  {
    const lastCalledAt = this.#dataAtLastCheck.timestamp;
    const now = this.#timeProvider.getCurrent();

    this.#dataAtLastCheck.timestamp = now.getTime();

    if (this.#dataAtLastCheck.currentlyTrackedRun)
    {
      if (!this.#dataAtLastCheck.notifiedRuns.includes(this.#dataAtLastCheck.currentlyTrackedRun.pk))
      {
        return this.#dataAtLastCheck.currentlyTrackedRun;
      }
    }

    if (lastCalledAt == -1)
    {
      this.#logger.info(`[MONITOR]: initial check: ${now.toISOString()}`);
      return;
    }

    let nextRun = this.#dataAtLastCheck.currentlyTrackedRun;
    do {
      if (!this.#dataAtLastCheck.currentlyTrackedRun)
      {
        nextRun = await this.getNextRun();
        if (!nextRun)
        {
          return null;
        }
        break;
      }
      const relevantEvent = await this.getRelevantEvent();
      if (relevantEvent.short != nextRun.event)
      {
        nextRun = relevantEvent.runsInOrder.at(0);
        break;
      }
      const eventOfLastTrackedRun = this.#data.events[this.#data.eventShortToPK[nextRun.event]];
      const nextRunIndex = eventOfLastTrackedRun.runsInOrder.findIndex(run => run.pk == nextRun.pk)+1;
      nextRun = eventOfLastTrackedRun.runsInOrder[nextRunIndex]
      if (!nextRun)
      {
        return;
      }
  
      if (!this.#dataAtLastCheck.notifiedRuns.includes(nextRun.pk))
      {
        break;
      }
      this.#logger.warn(`next run we should be tracking is ${nextRun.pk}, but already informed about it, moving to the next`)
      continue;
    } while(nextRun);

    this.#logger.info(`[MONITOR] run pk: ${nextRun.pk}`);
    this.#dataAtLastCheck.endTimeOfPreviousRun = this.#dataAtLastCheck.currentlyTrackedRun?.endTime;
    this.#dataAtLastCheck.currentlyTrackedRun = nextRun;
    return nextRun;
  }

  async checkTwitch()
  {
    const monitoredRun = await this.getRunToMonitor();
    if (!monitoredRun)
    {
      return;
    }

    if (monitoredRun.pk == this.#data.events[this.#data.eventShortToPK[monitoredRun.event]].runsInOrder[0].pk)
    {
      return;
    }
    
    if (monitoredRun.twitch_name)
    {
      if (await this.#twitch.isSubstringOfGameNameOrStreamTitle(monitoredRun.twitch_name))
      {
        this.#dataAtLastCheck.notifiedRuns.push(monitoredRun.pk);
        this.#emitEvent(monitoredRun, DataContainer.EmitReasons.TwitchDataMatch);
        return;
      }
    }

    if (monitoredRun.display_name)
    {
      if (await this.#twitch.isSubstringOfGameNameOrStreamTitle(monitoredRun.display_name))
      {
        this.#dataAtLastCheck.notifiedRuns.push(monitoredRun.pk);
        this.#emitEvent(monitoredRun, DataContainer.EmitReasons.TwitchDataMatch);
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

    this.#dataAtLastCheck.notifiedRuns.push(monitoredRun.pk);
    this.#emitEvent(monitoredRun, DataContainer.EmitReasons.TenMinutesUntilStart);
  }
  async previousRunHasUpdatedEndTime()
  {
    const monitoredRun = await this.getRunToMonitor();
    if (!monitoredRun)
    {
      return;
    }

    await this.getEvent(monitoredRun.event); // refresh event data
    const previousRunIndex = this.#data.events[this.#data.eventShortToPK[monitoredRun.event]].runsInOrder.findIndex(run => run.pk == monitoredRun.pk) - 1;
    if (previousRunIndex < 0)	
    {
      return;
    }

    const previousRun = this.#data.events[this.#data.eventShortToPK[monitoredRun.event]].runsInOrder[previousRunIndex];
    if (!this.#dataAtLastCheck.endTimeOfPreviousRun)
    {
      this.#dataAtLastCheck.endTimeOfPreviousRun = previousRun.endTime;
      return;
    }
    if (this.#dataAtLastCheck.endTimeOfPreviousRun.getTime() == previousRun.endTime.getTime())
    {
      return;
    }

    this.#dataAtLastCheck.notifiedRuns.push(monitoredRun.pk);
    this.#emitEvent(monitoredRun, DataContainer.EmitReasons.StartIsInThePast);
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
        await this.previousRunHasUpdatedEndTime();
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