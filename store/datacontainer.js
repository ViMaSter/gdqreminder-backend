export class DataContainer
{
  #data = {
    "eventShorthandToPK": {},
    "eventOrder": [],
    "events": {},
    "runs": {},
  };

  constructor(gotClient)
  {
    this.gotClient = gotClient;
  }

  async getAllEvents() 
  {
    let events = (await gotClient.get("https://gamesdonequick.com/tracker/api/v1/search/?type=event").json()).filter(e=>e.fields.short.toLowerCase().includes("gdq"));
    events = events.map(event => {
      event.fields.startTime = event.fields.datetime;
      delete event.fields.datetime;
      return event;
    })
    const eventsById = Object.fromEntries(events.map(entry => [entry.pk, entry.fields]));
    this.#data.events = {...this.#data.events, ...eventsById};
    
    const eventShorthandToPK = Object.fromEntries(events.map(entry => [entry.fields.short.toLowerCase(), entry.pk]));
    this.#data.eventShorthandToPK = {...this.#data.eventShorthandToPK, ...eventShorthandToPK};

    const runsInOrder = events.sort((a,b)=>new Date(b.fields.starttime) - new Date(a.fields.starttime)).map(event=>event.pk);
    this.#data.eventOrder = runsInOrder;
  }
  async getEvent(eventShorthand)
  {
    eventShorthand = eventShorthand.toLowerCase();
    const runs = await gotClient.get(`https://gamesdonequick.com/tracker/api/v1/search/?type=run&eventshort=${eventShorthand}`).json();
    const runsById = Object.fromEntries(runs.map(entry => [entry.pk, entry.fields]));
    this.#data.runs = {...this.#data.runs, ...runsById};

    const runsInOrder = runs.sort((a,b)=>new Date(b.fields.starttime) - new Date(a.fields.starttime)).map(event=>event.pk);
    if (!this.#data.eventShorthandToPK.hasOwnProperty(eventShorthand))
    {
      await this.getAllEvents();
    }

    let eventPK = this.#data.eventShorthandToPK[eventShorthand];
    if (!this.#data.events.hasOwnProperty(eventPK))
    {
      await this.getAllEvents();
    }
    this.#data.events[eventPK].runOrder = runsInOrder;

    const lastRunOfEventPK = runsInOrder.at(-1);
    this.#data.events[eventPK].startTime = this.#data.events[eventPK].datetime;
    delete this.#data.events[eventPK].datetime;
    this.#data.events[eventPK].endTime = this.#data.runs[lastRunOfEventPK].endtime;

    return this.#data.events[eventPK];
  }

  async getCurrentEvent()
  {
    let events = Object.values(this.#data.events);
    if (events.length <= 0)
    {
      await this.getAllEvents();
      events = Object.values(this.#data.events);
    }
    const eventsStartedBeforeNow = events.filter(event=>new Date(event.startTime) <= new Date());
    const lastEvent = eventsStartedBeforeNow.at(-1);
    const event = this.getEvent(lastEvent.short);
    if (new Date(event.endTime) > new Date())
    {
      return event;
    }

    return null;
  }

  async getPreviousEvent()
  {
    let events = Object.values(this.#data.events);
    if (events.length <= 0)
    {
      await this.getAllEvents();
      events = Object.values(this.#data.events);
    }
    const eventsStartedBeforeNow = events.filter(event=>new Date(event.startTime) <= new Date());
    const lastEvent = eventsStartedBeforeNow.at(-1);
    if (!lastEvent)
    {
      return null;
    }
    return this.getEvent(lastEvent.short);
  }

  async getNextEvent()
  {
    let events = Object.values(this.#data.events);
    if (events.length <= 0)
    {
      await this.getAllEvents();
      events = Object.values(this.#data.events);
    }
    const eventsStartedBeforeNow = events.filter(event=>new Date(event.startTime) > new Date());
    const lastEvent = eventsStartedBeforeNow.at(-1);
    if (!lastEvent)
    {
      return null;
    }
    return this.getEvent(lastEvent.short);
  }

  async updateRelevantData()
  {
    console.log("Currently previous event: " + (await this.getNextEvent())?.short);
    console.log("Currently active event: " + (await this.getCurrentEvent())?.short);
    console.log("Currently next event: " + (await this.getPreviousEvent())?.short);
  }
}