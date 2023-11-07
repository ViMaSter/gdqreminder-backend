import { jest } from '@jest/globals'
import moment from 'moment';
import { FakeTimeProvider } from '../../services/timeProvider/fakeTimeProvider.js';
import { DataContainer } from '../../store/dataContainer.js';
import { Twitch } from '../../services/twitch.js';
import { FakeHTTPClient } from '../stubs/fakeHTTPClient.js';

const fifteenMinutesBeforeAGDQ2022 = "2022-01-09T16:15:00Z";
const refreshIntervalInMS = 10000;
const speedup = 30;

describe("integration", () => {
    const emissionMethod = jest.fn();
    const timeProvider = new FakeTimeProvider(new Date(fifteenMinutesBeforeAGDQ2022).getTime());
    const fakeHTTPClient = new FakeHTTPClient("integration/runs/0-before-preshow");
    
    const dataContainer = new DataContainer(undefined, fakeHTTPClient, timeProvider, new Twitch(fakeHTTPClient, ""), emissionMethod);
    const loopWithEvents = new Promise(async (resolve, reject) => {
        const events = {
            "2022-01-09T16:35:00.000Z": () => {
                fakeHTTPClient.setPrefix("integration/runs/1-twitch-game-is-nioh2");
            },
            "2022-01-09T18:45:00.000Z": () => {
            },
            "2022-01-09T19:00:00.000Z": () => {
                fakeHTTPClient.setPrefix("integration/runs/3-dkc2-is-in-the-past");
            },
            "2022-01-09T19:30:00Z": () => {
                dataContainer.stopLoop();
                resolve(); // end test
            }
        };
        const validations = {
            "2022-01-09T16:20:00.000Z": () => {
                expect(emissionMethod.mock.calls[0][0].pk).toBe(5049);
                expect(emissionMethod.mock.calls[0][1]).toBe(DataContainer.EmitReasons.StartInLessThanTenMinutes);
            },
            "2022-01-09T16:35:00.000Z": () => {
                expect(emissionMethod.mock.calls[1][0].pk).toBe(5050);
                expect(emissionMethod.mock.calls[1][1]).toBe(DataContainer.EmitReasons.TwitchDataMatch);
            },
            "2022-01-09T18:45:00.000Z": () => {
                expect(emissionMethod.mock.calls[2][0].pk).toBe(5051);
                expect(emissionMethod.mock.calls[2][1]).toBe(DataContainer.EmitReasons.StartInLessThanTenMinutes);
            },
            "2022-01-09T19:00:00.000Z": () => {
                expect(emissionMethod.mock.calls[3][0].pk).toBe(5052);
                expect(emissionMethod.mock.calls[3][1]).toBe(DataContainer.EmitReasons.StartInLessThanTenMinutes);
            },
            "2022-01-09T19:30:00Z": () => {
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