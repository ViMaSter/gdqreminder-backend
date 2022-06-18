import { FakeTimeProvider } from "../../../services/timeProvider/fakeTimeProvider";
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
                const dataContainer = new DataContainer(new FakeHTTPClient("during-pumpkin_jack"), timeProvider, emissionMethod);
    
                await dataContainer.checkFor10MinuteWarning();
                expect(emissionMethod.mock.calls.length).toBe(0);
            };
        })

        const triggerInformationEvent = {
            "if a run start is less than 10 minutes away": async (dataContainer, timeProvider, fakeHTTPClient, emissionMethod, skipValidation = false) => {
                const previousCallCount = emissionMethod.mock.calls.length;
                const pumpkinJackStart = moment("2022-01-11T04:28:00Z");

                timeProvider.setTime(new Date(pumpkinJackStart.clone().subtract(20, 'minutes').toISOString()).getTime());
                await dataContainer.checkFor10MinuteWarning();
                timeProvider.setTime(new Date(pumpkinJackStart.clone().subtract(11, 'minutes').toISOString()));
                await dataContainer.checkFor10MinuteWarning();
                timeProvider.setTime(new Date(pumpkinJackStart.clone().subtract(9, 'minutes').subtract(59, 'seconds').toISOString()));
                await dataContainer.checkFor10MinuteWarning();
                if (!skipValidation)
                {
                    expect(emissionMethod.mock.calls.length).toBe(previousCallCount+1);
                    expect(emissionMethod.mock.calls[previousCallCount][0]).toBe(5083);
                }
            },
            "if the game on twitch matches the name of the next run": async (dataContainer, timeProvider, fakeHTTPClient, emissionMethod, skipValidation = false) => {
                const previousCallCount = emissionMethod.mock.calls.length;

                const pumpkinJackStart = moment("2022-01-11T04:28:00Z");
                const finaleStart = moment("2022-01-16T06:51:23Z");

                timeProvider.setTime(new Date(pumpkinJackStart.clone().subtract(11, 'minutes').toISOString()).getTime());
                await dataContainer.checkTwitch();
                if (!skipValidation)
                {
                    expect(emissionMethod.mock.calls.length).toBe(previousCallCount+1);
                    expect(emissionMethod.mock.calls[previousCallCount][0]).toBe(5083);
                }
                timeProvider.setTime(new Date(finaleStart.clone().subtract(11, 'minutes').toISOString()).getTime());
                await dataContainer.checkTwitch();
                if (!skipValidation)
                {
                    expect(emissionMethod.mock.calls.length).toBe(previousCallCount+1);
                }
                timeProvider.setTime(new Date(pumpkinJackStart.clone().subtract(11, 'minutes').toISOString()).getTime());
                await dataContainer.checkTwitch();
                if (!skipValidation)
                {
                    expect(emissionMethod.mock.calls.length).toBe(previousCallCount+1);
                }
            },
            "if the previous run has a changed end time": async (dataContainer, timeProvider, fakeHTTPClient, emissionMethod, skipValidation = false) => {
                const previousCallCount = emissionMethod.mock.calls.length;
                const pumpkinJackStart = moment("2022-01-11T04:28:00Z");
                timeProvider.setTime(new Date(pumpkinJackStart.clone().subtract(10, "minutes").toISOString()).getTime());
                
                await dataContainer.previousRunHasUpdatedEndTime();
                await dataContainer.previousRunHasUpdatedEndTime();
                fakeHTTPClient.setPrefix("run-before-pumpkin_jack-ended-20-minutes-earlier");
                await dataContainer.previousRunHasUpdatedEndTime();
                await dataContainer.previousRunHasUpdatedEndTime();
                if (!skipValidation)
                {
                    expect(emissionMethod.mock.calls.length).toBe(previousCallCount+1);
                    expect(emissionMethod.mock.calls[previousCallCount][0]).toBe(5083);
                }
            }
        };

        describe("will emit", () => {
            Object.entries(triggerInformationEvent).forEach(([description, logic]) => {
                it(`emits ${description}`, async () => {
                    const timeProvider = new FakeTimeProvider(new Date());
                    const emissionMethod = jest.fn();
                    const fakeHTTPClient = new FakeHTTPClient("during-pumpkin_jack");
                    const dataContainer = new DataContainer(fakeHTTPClient, timeProvider, emissionMethod);
                    await dataContainer.getRunToMonitor();

                    await logic(dataContainer, timeProvider, fakeHTTPClient,emissionMethod);
                });
            });
        })

        describe("only emits once per run", () => {
            Object.entries(triggerInformationEvent).forEach(([description1, logic1]) => {
                Object.entries(triggerInformationEvent).forEach(([description2, logic2]) => {
                    it(`emits '${description1}', ignores '${description2}' after`, async () => {
                        const timeProvider = new FakeTimeProvider(new Date());
                        const emissionMethod = jest.fn();
                        const fakeHTTPClient = new FakeHTTPClient("during-pumpkin_jack");
                        const dataContainer = new DataContainer(fakeHTTPClient, timeProvider, emissionMethod);
                        await dataContainer.getRunToMonitor();
    
                        await logic1(dataContainer, timeProvider, fakeHTTPClient, emissionMethod);
                        const callCount = emissionMethod.mock.calls.length;
                        await logic2(dataContainer, timeProvider, fakeHTTPClient, emissionMethod, true);
                        expect(emissionMethod.mock.calls.length).toBe(callCount);
                    });
                });
            });
        })

        test("full event cycle", async () => {
            const timeProvider = new FakeTimeProvider(new Date("2022-01-01T00:00:00Z"));
            const emissionMethod = jest.fn();
            const fakeHTTPClient = new FakeHTTPClient("during-pumpkin_jack");
            const dataContainer = new DataContainer(fakeHTTPClient, timeProvider, emissionMethod);
            await dataContainer.getRunToMonitor();

            const bufferInMinutes = 30;
            const eventShorts = ["agdq2022", "sgdq2022"];
            for (let j = 0; j < eventShorts.length; ++j)
            {
                const eventShort = eventShorts[j];
                const event = await dataContainer.getEvent(eventShort);
                const eventStartTime = moment(event.startTime).subtract(bufferInMinutes, "minutes");
                const eventEndTime = moment(event.endTime).add(bufferInMinutes, "minutes");

                const duration = moment.duration(eventEndTime.diff(eventStartTime));
                const minutesInAGDQ = Math.ceil(duration.asMinutes());

                timeProvider.setTime(eventStartTime.valueOf());
                for (let i = 0; i < minutesInAGDQ; ++i)
                {
                    timeProvider.passTime(60 * 1000);
                    await dataContainer.checkFor10MinuteWarning();
                    await dataContainer.checkTwitch();
                    await dataContainer.previousRunHasUpdatedEndTime();
                }
                expect(emissionMethod.mock.calls.length).toBe(event.runsInOrder.length);
                emissionMethod.mock.calls = [];
            }

        });
    });
});