import { FakeTimeProvider } from "../../stubs/fakeTimeProvider";
import { FakeHTTPClient } from "../../stubs/fakeHTTPClient";
import { DataContainer } from "../../../store/dataContainer"

describe("dataContainer", () => {
    describe("events", () => {
        const triggerInformationEvent = {
            "if a run start is less than 10 minutes away": () => {
                const timeProvider = new FakeTimeProvider(new Date("2022-01-01T00:00:00.000Z"));
            },
            "if the game on twitch matches the name of the next run": () => {
                // use twitch_name first
                // if it doesn't exist, use display_name

            },
            "if the previous run has an end time": () => {

            },
            "if a run start is already in the past": () => {
                // ^ this occurs, if the tracker previously had a start time in >10 minutes and then gets updated because the run has started
                // maybe send a different message?
            }
        };

        describe("can inform", () => {
            Object.entries(triggerInformationEvent).forEach(([description, logic]) => {
                it(`informs ${description}`, () => {
                    logic();
                });
            });
        })

        describe("only informs once", () => {
            Object.entries(triggerInformationEvent).forEach(([description1, logic1]) => {
                Object.entries(triggerInformationEvent).forEach(([description2, logic2]) => {
                    it(`informs '${description1}', ignores '${description2}' after`, () => {
                        logic1();
                        logic2();
                    });
                });
            });
        })
    });
});