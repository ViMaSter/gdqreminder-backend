import { jest } from '@jest/globals'
import moment from 'moment';
import { FakeTimeProvider } from '../../services/timeProvider/fakeTimeProvider.js';
import { DataContainer } from '../../store/dataContainer.js';
import { Twitch } from '../../services/twitch.js';
import { FakeHTTPClient } from '../stubs/fakeHTTPClient.js';

const fifteenMinutesBeforeAGDQ2022 = "2022-01-09T16:15:00Z";
const refreshIntervalInMS = 10000;
const speedup = 6 * 60 * 24;

describe("integration", () => {
    const emissionMethod = jest.fn();
    const timeProvider = new FakeTimeProvider(new Date(fifteenMinutesBeforeAGDQ2022).getTime());
    const fakeHTTPClient = new FakeHTTPClient("integration/events/0-agdq2022-is-newest");
    
    const dataContainer = new DataContainer(undefined, fakeHTTPClient, timeProvider, new Twitch(fakeHTTPClient, ""), ()=>{}, emissionMethod);
    const loopWithEvents = new Promise(async (resolve, reject) => {
        const events = {
            "2022-01-11T16:35:00.000Z": () => {
                fakeHTTPClient.setPrefix("integration/events/1-sgdq2022-is-newest");
            },
            "2022-02-10T16:45:00.000Z": () => {
                fakeHTTPClient.setPrefix("integration/events/2-agdq2023-is-newest");
            },
            "2023-01-12T17:20:00.000Z": () => {
                dataContainer.stopLoop();
                resolve(); // end test
            },
        };
        const validations = {
            "2022-01-09T16:20:00.000Z": () => {
                expect(emissionMethod.mock.calls.length).toBe(0);
            },
            "2022-02-12T16:40:00.000Z": () => {
                expect(emissionMethod.mock.calls[0][0].short).toBe("sgdq2022");
            },
            "2023-01-14T16:50:00.000Z": () => {
                expect(emissionMethod.mock.calls[0][0].short).toBe("sgdq2022");
                expect(emissionMethod.mock.calls[1][0].short).toBe("agdq2022");
            },
            "2023-01-14T17:20:00.000Z": () => {
                resolve(); // end test
            }
        };
        const checkForEvents = (now) => {
            timeProvider.passTime(refreshIntervalInMS * speedup);
            Object.keys(events).forEach(key => {
                if (!moment(key).isBefore(now))
                {
                    return;
                }
                events[key]();
                delete events[key];
            });
        }
        const runValidations = (now) => {
            Object.keys(validations).forEach(key => {
                if (!moment(key).isBefore(now))
                {
                    return;
                }
                validations[key]();
                delete validations[key];
            });
            jest.runAllTimers();
        }
        
        try
        {
            jest.useFakeTimers();
            await dataContainer.startLoop({beforeNextCheck: checkForEvents, afterEachCheck: runValidations});
        }
        catch (e)
        {
            reject(e);
        }
    });

    it("emits for each different occasion", async () => {
        await loopWithEvents;
    }, 30000)
})