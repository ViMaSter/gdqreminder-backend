export class FakeTimeProvider
{
    #passedTimeInMS = 0;
    constructor(startTimeInMS)
    {
        this.startTimeInMS = startTimeInMS;
    }

    passTime(timeInMS)
    {
        this.#passedTimeInMS += timeInMS;
    }

    getCurrent()
    {
        return new Date(this.startTimeInMS + this.#passedTimeInMS);
    }
}