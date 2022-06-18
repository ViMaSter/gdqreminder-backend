import { jest } from '@jest/globals'
import moment from 'moment';
import { FakeTimeProvider } from '../../services/timeProvider/fakeTimeProvider';
import { DataContainer } from '../../store/dataContainer';
import { Twitch } from '../../services/twitch.js';
import { FakeHTTPClient } from '../stubs/fakeHTTPClient';

const fifteenMinutesBeforeAGDQ2022 = "2022-01-09T16:15:00Z";
const refreshIntervalInMS = 10000;
const speedup = 30;

describe("integration", () => {
    const emissionMethod = jest.fn();
    const timeProvider = new FakeTimeProvider(new Date(fifteenMinutesBeforeAGDQ2022).getTime());
    const fakeHTTPClient = new FakeHTTPClient("integration/0-before-preshow");
    
    const dataContainer = new DataContainer(fakeHTTPClient, timeProvider, new Twitch(fakeHTTPClient, ""), emissionMethod);
    const loopWithEvents = new Promise(async (resolve, reject) => {
        const events = {
            "2022-01-09T16:35:00.000Z": () => {
                fakeHTTPClient.setPrefix("integration/1-twitch-game-is-nioh2");
            },
            "2022-01-09T16:45:00.000Z": () => {
                fakeHTTPClient.setPrefix("integration/2-twitch-title-contains-metroid-prime-hunters");
            },
            "2022-01-09T17:00:00.000Z": () => {
                fakeHTTPClient.setPrefix("integration/3-dkc2-is-in-the-past");
            },
            "2022-01-09T17:30:00Z": () => {
                dataContainer.stopLoop();
                resolve(); // end test
            }
        };
        const validations = {
            "2022-01-09T16:20:00.000Z": () => {
                expect(emissionMethod.mock.calls[0][0]).toBe(5049);
            },
            "2022-01-09T16:35:00.000Z": () => {
                expect(emissionMethod.mock.calls[1][0]).toBe(5050);
            },
            "2022-01-09T16:45:00.000Z": () => {
                expect(emissionMethod.mock.calls[2][0]).toBe(5051);
            },
            "2022-01-09T17:00:00.000Z": () => {
                expect(emissionMethod.mock.calls[3][0]).toBe(5052);
            },
            "2022-01-09T17:30:00Z": () => {
                resolve(); // end test
            }
        };
        const checkForEvents = (now) => {
            timeProvider.passTime(refreshIntervalInMS * speedup);
            console.log(`[TIME] Passing ${((refreshIntervalInMS * speedup) / 1000)} seconds; now ${timeProvider.getCurrent().toISOString()}`);
            Object.keys(events).forEach(key => {
                if (!moment(key).isBefore(now))
                {
                    return;
                }
                console.log(`[EVENT] at ${key}, as it's ${now.toISOString()}`);
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
                console.log(`[VALIDATION] at ${key}, as it's ${now.toISOString()}`);
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