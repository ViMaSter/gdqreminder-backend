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
                const dataContainer = new DataContainer(new FakeHTTPClient(), timeProvider, emissionMethod);
    
                await dataContainer.checkForEmission();
                expect(emissionMethod.mock.calls.length).toBe(0);
            };
        })

        const triggerInformationEvent = {
            "if a run start is less than 10 minutes away": async (dataContainer, timeProvider) => {
                const preShowStart = moment("2022-01-09T16:30:00Z");

                timeProvider.setTime(new Date(preShowStart.clone().subtract(20, 'minutes').toISOString()).getTime());
                await dataContainer.checkForEmission();
                timeProvider.setTime(new Date(preShowStart.clone().subtract(11, 'minutes').toISOString()));
                await dataContainer.checkForEmission();
                timeProvider.setTime(new Date(preShowStart.clone().subtract(9, 'minutes').subtract(59, 'seconds').toISOString()));
                await dataContainer.checkForEmission();
            },
            "if the game on twitch matches the name of the next run": (emissionMethod) => {
                // use twitch_name first
                // if it doesn't exist, use display_name

            },
            "if the previous run has an end time": (emissionMethod) => {

            },
            "if a run start is already in the past": (emissionMethod) => {
                // ^ this occurs, if the tracker previously had a start time in >10 minutes and then gets updated because the run has started
                // maybe send a different message?
            }
        };

        describe("can inform", () => {
            Object.entries(triggerInformationEvent).forEach(([description, logic]) => {
                it(`informs ${description}`, async () => {
                    const timeProvider = new FakeTimeProvider();
                    const emissionMethod = jest.fn();
                    const dataContainer = new DataContainer(new FakeHTTPClient(), timeProvider, emissionMethod);

                    await logic(dataContainer, timeProvider);
                    expect(emissionMethod.mock.calls.length).toBe(1);
                    expect(emissionMethod.mock.calls[0][0]).toBe(5049);
                });
            });
        })

        describe("only informs once", () => {
            Object.entries(triggerInformationEvent).forEach(([description1, logic1]) => {
                Object.entries(triggerInformationEvent).forEach(([description2, logic2]) => {
                    it(`informs '${description1}', ignores '${description2}' after`, async () => {
                        const timeProvider = new FakeTimeProvider();
                        const emissionMethod = jest.fn();
                        const dataContainer = new DataContainer(new FakeHTTPClient(), timeProvider, emissionMethod);
    
                        await logic1(dataContainer, timeProvider);
                        expect(emissionMethod.mock.calls.length).toBe(1);
                        expect(emissionMethod.mock.calls[0][0]).toBe(5049);
                        await logic2(dataContainer, timeProvider);
                        expect(emissionMethod.mock.calls.length).toBe(1);
                    });
                });
            });
        })
    });
});