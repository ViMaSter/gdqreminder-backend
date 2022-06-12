export class RealTimeProvider
{
    constructor()
    {
    }

    getTime()
    {
        return new Date().getTime();
    }
}

export class FakeTimeProvider
{
    constructor(startTimeInMS, msThatPassPerSecond)
    {
        this.startTimeInMS = startTimeInMS;
        this.msThatPassPerSecond = msThatPassPerSecond;

        this.createdAt = new Date().getTime();
    }

    getTime()
    {
        const passedMS = new Date().getTime() - this.createdAt;
        const passedSeconds = (passedMS / 1000);

        const calculatedOffsetInMS = passedSeconds * this.msThatPassPerSecond;

        return new Date(this.startTimeInMS + calculatedOffsetInMS);
    }
}