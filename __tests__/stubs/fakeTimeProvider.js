export class FakeTimeProvider
{
    #startTimeInMS = 0;
    #passedTimeInMS = 0;
    constructor(startTimeInMS)
    {
        this.#startTimeInMS = startTimeInMS;
    }

    passTime(timeInMS)
    {
        this.#passedTimeInMS += timeInMS;
    }

    setTime(timeInMS)
    {
        this.#startTimeInMS = timeInMS;
        this.#passedTimeInMS = 0;
    }

    getCurrent()
    {
        return new Date(this.#startTimeInMS + this.#passedTimeInMS);
    }
}