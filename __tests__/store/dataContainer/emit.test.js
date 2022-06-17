import { FakeTimeProvider } from "../../stubs/fakeTimeProvider";
import { FakeHTTPClient } from "../../stubs/fakeHTTPClient";
import { DataContainer } from "../../../store/dataContainer"
import moment from 'moment';
import { jest } from '@jest/globals'

describe("dataContainer", () => {
    describe("events", () => {
        it("never informs when initially updating", async () => {
            const times = [
                "2022-01-09T16:20:00Z", // 10 minutes before the pre-show,
                "2022-01-09T16:40:00Z", // 10 minutes into the pre-show
                "2022-01-16T07:21:23Z", // 10 minutes after the finale of AGDQ2022
            ]
            
            for await(const time of times) {
                const timeProvider = new FakeTimeProvider(new Date(time));
                const emissionMethod = jest.fn();
                const dataContainer = new DataContainer(new FakeHTTPClient("during-preshow"), timeProvider, emissionMethod);
    
                await dataContainer.checkFor10MinuteWarning();
                expect(emissionMethod.mock.calls.length).toBe(0);
            };
        })

        const triggerInformationEvent = {
            "if a run start is less than 10 minutes away": async (dataContainer, timeProvider, emissionMethod, skipValidation = false) => {
                const previousCallCount = emissionMethod.mock.calls.length;
                const preShowStart = moment("2022-01-09T16:30:00Z");

                timeProvider.setTime(new Date(preShowStart.clone().subtract(20, 'minutes').toISOString()).getTime());
                await dataContainer.checkFor10MinuteWarning();
                timeProvider.setTime(new Date(preShowStart.clone().subtract(11, 'minutes').toISOString()));
                await dataContainer.checkFor10MinuteWarning();
                timeProvider.setTime(new Date(preShowStart.clone().subtract(9, 'minutes').subtract(59, 'seconds').toISOString()));
                await dataContainer.checkFor10MinuteWarning();
                if (!skipValidation)
                {
                    expect(emissionMethod.mock.calls.length).toBe(previousCallCount+1);
                    expect(emissionMethod.mock.calls[previousCallCount][0]).toBe(5049);
                }
            },
            "if the game on twitch matches the name of the next run": async (dataContainer, timeProvider, emissionMethod, skipValidation = false) => {
                const previousCallCount = emissionMethod.mock.calls.length;

                const preShowStart = moment("2022-01-09T16:30:00Z");
                const finaleStart = moment("2022-01-16T06:51:23Z");

                timeProvider.setTime(new Date(preShowStart.clone().subtract(11, 'minutes').toISOString()).getTime());
                await dataContainer.checkTwitch();
                if (!skipValidation)
                {
                    expect(emissionMethod.mock.calls.length).toBe(previousCallCount+1);
                    expect(emissionMethod.mock.calls[previousCallCount][0]).toBe(5049);
                }
                timeProvider.setTime(new Date(finaleStart.clone().subtract(11, 'minutes').toISOString()).getTime());
                await dataContainer.checkTwitch();
                if (!skipValidation)
                {
                    expect(emissionMethod.mock.calls.length).toBe(previousCallCount+1);
                }
                timeProvider.setTime(new Date(preShowStart.clone().subtract(11, 'minutes').toISOString()).getTime());
                await dataContainer.checkTwitch();
                if (!skipValidation)
                {
                    expect(emissionMethod.mock.calls.length).toBe(previousCallCount+1);
                }
            },
            "if the previous run has a changed end time": async (dataContainer, timeProvider, emissionMethod) => {
                throw new Error("not implemented");
            },
            "if the run's start time has moved into the past": async (dataContainer, timeProvider, emissionMethod) => {
                // ^ this occurs, if the tracker previously had a start time in >10 minutes and then gets updated because the run has started
                // maybe send a different message?
                throw new Error("not implemented");
            }
        };

        describe("will emit", () => {
            Object.entries(triggerInformationEvent).forEach(([description, logic]) => {
                it(`emits ${description}`, async () => {
                    const timeProvider = new FakeTimeProvider(new Date());
                    const emissionMethod = jest.fn();
                    const dataContainer = new DataContainer(new FakeHTTPClient("during-preshow"), timeProvider, emissionMethod);
                    await dataContainer.getRunToMonitor();

                    await logic(dataContainer, timeProvider, emissionMethod);
                });
            });
        })

        describe("only emits once per run", () => {
            Object.entries(triggerInformationEvent).forEach(([description1, logic1]) => {
                Object.entries(triggerInformationEvent).forEach(([description2, logic2]) => {
                    it(`emits '${description1}', ignores '${description2}' after`, async () => {
                        const timeProvider = new FakeTimeProvider(new Date());
                        const emissionMethod = jest.fn();
                        const dataContainer = new DataContainer(new FakeHTTPClient("during-preshow"), timeProvider, emissionMethod);
                        await dataContainer.getRunToMonitor();
    
                        await logic1(dataContainer, timeProvider, emissionMethod);
                        const callCount = emissionMethod.mock.calls.length;
                        await logic2(dataContainer, timeProvider, emissionMethod, true);
                        expect(emissionMethod.mock.calls.length).toBe(callCount);
                    });
                });
            });
        })
    });
});