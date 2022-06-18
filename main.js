import { initializeApp } from 'firebase-admin/app';
import Firebase from './messaging/firebase.js';
import { DataContainer } from './store/dataContainer.js';
import { FakeTimeProvider } from './services/timeProvider/fakeTimeProvider.js';
import { RealTimeProvider } from './services/timeProvider/realTimeProvider.js';
import got from 'got';
import { Twitch } from './services/twitch.js'
import moment from 'moment';

initializeApp();

const parsedArgs = Object.fromEntries(process.argv
                     .filter(value=>value.startsWith("--"))
                     .map(value => [value.split("=")[0].slice(2), value.split("=")[1]]));

const {startTime, speedup, refreshIntervalInMS} = parsedArgs;
if (!refreshIntervalInMS)
{
  throw new Error("A refresh interval in ms with --refreshIntervalInMS is required");
}

let timeProvider = new RealTimeProvider();
if (!!startTime ^ !!speedup)
{
  throw new Error("[TIMEPROVIDER] You must specify both --startTime and --speedup to use a fake time provider");
}
if (startTime && speedup)
{
  console.warn("[TIMEPROVIDER] Using fake time provider");
  timeProvider = new FakeTimeProvider(new Date(startTime).getTime());
}
const dataContainer = new DataContainer(got, timeProvider, new Twitch(got, "kimne78kx3ncx6brgo4mv6wki5h1ko"), (run) => {
  console.log("[EMISSION] run start: " + run);
  new Firebase().sendStartMessageForRun(run);
});

let config = {
  refreshIntervalInMS
};
if (timeProvider instanceof FakeTimeProvider)
{
  config.beforeNextCheck = () => {
    timeProvider.passTime(refreshIntervalInMS * speedup);
    console.log(`[TIME] Passing ${((refreshIntervalInMS * speedup) / 1000)} seconds; now ${timeProvider.getCurrent().toISOString()}`);
  };
}
await dataContainer.startLoop(config);
