export class DataContainer
{
  #data = {
    "eventShortToPK": {},
    "eventOrder": [],
    "events": {},
    "runsWithPK": {},
  };

  constructor(gotClient, timeProvider, emitEvent)
  {
    this.gotClient = gotClient;
    this.timeProvider = timeProvider;
    this.emitEvent = emitEvent;
  }

  async getAllEvents() 
  {
    let events = (await this.gotClient.get("https://gamesdonequick.com/tracker/api/v1/search/?type=event").json()).filter(e=>e.fields.short.toLowerCase().includes("gdq"));
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
    if (this.#data.events.hasOwnProperty(eventShort)?.endTime)
    {
        const eventPK = this.#data.eventShortToPK[eventShort];
        return this.#data.events[eventPK];
    }

    const runs = await this.gotClient.get(`https://gamesdonequick.com/tracker/api/v1/search/?type=run&eventshort=${eventShort}`).json();
    const runsWithPKById = Object.fromEntries(runs.map(entry => {
      entry.fields.pk = entry.pk;

      entry.fields.startTime = new Date(entry.fields.starttime);
      delete entry.fields.starttime;

      entry.fields.endTime = new Date(entry.fields.endtime);
      delete entry.fields.endtime;

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

    this.#data.events[eventPK].runOrder = runsInOrder;
    this.#data.eventOrder[eventIndex].runOrder = runsInOrder;

    const lastRunOfEvent = runsInOrder.at(-1);

    this.#data.events[eventPK].endTime = new Date(this.#data.runsWithPK[lastRunOfEvent.pk].endTime);
    this.#data.eventOrder[eventIndex].endTime = new Date(this.#data.runsWithPK[lastRunOfEvent.pk].endTime);

    return this.#data.events[eventPK];
  }

  async getPreviousEvent()
  {
    if (this.#data.eventOrder.length <= 0)
    {
      await this.getAllEvents();
    }

    let eventsStartedBeforeNow = this.#data.eventOrder.filter(event=>new Date(event.startTime) <= this.timeProvider.getCurrent());
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
    const eventsStartedBeforeNow = this.#data.eventOrder.filter(event=>new Date(event.startTime) <= this.timeProvider.getCurrent());
    const currentEvent = eventsStartedBeforeNow.at(-1);
    const event = await this.getEvent(currentEvent.short);
    if (new Date(event.endTime) > this.timeProvider.getCurrent())
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
      if (Math.abs(new Date(nextEvent.startTime) - this.timeProvider.getCurrent()) < Math.abs(new Date(previousEvent.endTime) - this.timeProvider.getCurrent()))
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
    const eventsStartedBeforeNow = this.#data.eventOrder.filter(event=>new Date(event.startTime) > this.timeProvider.getCurrent());
    const firstUpcomingEvent = eventsStartedBeforeNow.at(0);
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
      const previousRunIndex = this.#data.events[currentEvent.pk].runOrder.findIndex(run => run.pk == currentRun.pk) - 1;
      if (previousRunIndex < 0)
      {
        return null;
      }
      return this.#data.events[currentEvent.pk].runOrder[previousRunIndex];
    }

    if (currentEvent.endTime <= this.timeProvider.getCurrent())
    {
      return this.#data.events[currentEvent.pk].runOrder.at(-1);
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

    const currentRun = this.#data.events[currentEventPK].runOrder.find(run => run.startTime <= this.timeProvider.getCurrent() && this.timeProvider.getCurrent() < run.endTime);
    return currentRun;
  }

  async getNextRun()
  {
    const currentRun = await this.getCurrentRun();
    const currentEvent = await this.getRelevantEvent();

    if (currentRun != null)
    {
      const nextRunIndex = this.#data.events[currentEvent.pk].runOrder.findIndex(run => run.pk == currentRun.pk) + 1;
      if (nextRunIndex >= this.#data.events[currentEvent.pk].runOrder.length)
      {
        return null;
      }
      return this.#data.events[currentEvent.pk].runOrder[nextRunIndex];
    }

    if (currentEvent.startTime > this.timeProvider.getCurrent())
    {
      return this.#data.events[currentEvent.pk].runOrder.at(0);
    }

    return null;
  }

  async updateRelevantData()
  {
    console.log("Currently previous event: " + (await this.getNextEvent())?.short);
    console.log("Currently active event: " + (await this.getCurrentEvent())?.short);
    console.log("Currently next event: " + (await this.getPreviousEvent())?.short);
  }
}