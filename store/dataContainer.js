export class DataContainer
{
  #data = {
    "eventShortToPK": {},
    "eventOrder": [],
    "events": {},
    "runs": {},
  };

  constructor(gotClient, timeProvider)
  {
    this.gotClient = gotClient;
    this.timeProvider = timeProvider;
  }

  async getAllEvents() 
  {
    let events = (await this.gotClient.get("https://gamesdonequick.com/tracker/api/v1/search/?type=event").json()).filter(e=>e.fields.short.toLowerCase().includes("gdq"));
    events = events.map(event => {
      event.fields.short = event.fields.short.toLowerCase();
      event.fields.startTime = event.fields.datetime;
      delete event.fields.datetime;
      return event;
    })
    const eventsById = Object.fromEntries(events.map(entry => [entry.pk, entry.fields]));
    this.#data.events = {...this.#data.events, ...eventsById};
    
    const eventShortToPK = Object.fromEntries(events.map(entry => [entry.fields.short, entry.pk]));
    this.#data.eventShortToPK = {...this.#data.eventShortToPK, ...eventShortToPK};

    const eventsInOrder = events.sort((a,b)=>new Date(b.fields.starttime) - new Date(a.fields.starttime)).map(event=>event.fields);
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
    const runsById = Object.fromEntries(runs.map(entry => [entry.pk, entry.fields]));
    this.#data.runs = {...this.#data.runs, ...runsById};

    const runsInOrder = runs.sort((a,b)=>new Date(a.fields.starttime) - new Date(b.fields.starttime)).map(event=>event.pk);
    if (!this.#data.eventShortToPK.hasOwnProperty(eventShort))
    {
      await this.getAllEvents();
    }

    const eventPK = this.#data.eventShortToPK[eventShort];

    const eventIndex = this.#data.eventOrder.findIndex(event=>event.short === eventShort);

    this.#data.events[eventPK].runOrder = runsInOrder;
    this.#data.eventOrder[eventIndex].runOrder = runsInOrder;

    const lastRunOfEventShort = runsInOrder.at(-1);

    this.#data.events[eventPK].endTime = this.#data.runs[lastRunOfEventShort].endtime;
    this.#data.eventOrder[eventIndex].endTime = this.#data.runs[lastRunOfEventShort].endtime;

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

  async updateRelevantData()
  {
    console.log("Currently previous event: " + (await this.getNextEvent())?.short);
    console.log("Currently active event: " + (await this.getCurrentEvent())?.short);
    console.log("Currently next event: " + (await this.getPreviousEvent())?.short);
  }
}