import { FakeTimeProvider } from "../../stubs/fakeTimeProvider";
import { FakeHTTPClient } from "../../stubs/fakeHTTPClient";
import { DataContainer } from "../../../store/dataContainer"

describe("dataContainer", () => {
    const preShowPK = 5049;      // "2022-01-09T16:30:00Z" - "2022-01-09T17:07:00Z"
    const firstRunPK = 5050;     // "2022-01-09T17:07:00Z" - "2022-01-09T18:53:00Z"
    const secondRunPK = 5051;    // "2022-01-09T18:53:00Z" - "2022-01-09T20:50:00Z"

    const thirdToLastPK = 5267;  // "2022-01-16T04:44:37Z" - "2022-01-16T05:27:03Z"
    const secondToLastPK = 5185; // "2022-01-16T05:27:03Z" - "2022-01-16T06:51:23Z"
    const lastPK = 5186;         // "2022-01-16T06:51:23Z" - "2022-01-16T07:11:23Z"
    
    describe("runs", () => {
        const pointsInTimeAndExpectedResponse = {
            // startup
            "2022-01-09T10:00:00Z": { // pre-show starts at 16:30
                "previous": null,
                "current": null,
                "next": preShowPK
            },
            "2022-01-09T16:30:00Z": { // pre-show starts at 16:30
                "previous": null,
                "current": preShowPK,
                "next": firstRunPK
            },
            "2022-01-11T17:06:00Z": { // next run starts at 17:07
                "previous": null,
                "current": preShowPK,
                "next": firstRunPK
            },
            "2022-01-11T17:07:00Z": { // next run has started at 17:07
                "previous": preShowPK,
                "current": firstRunPK,
                "next": secondRunPK
            },
            "2022-01-11T17:08:00Z": { // next run has started at 17:07
                "previous": preShowPK,
                "current": firstRunPK,
                "next": secondRunPK
            },

            // wind-down
            "2022-01-16T06:51:22Z": { // finale starts at 06:51:23
                "previous": thirdToLastPK,
                "current": secondToLastPK,
                "next": lastPK
            },
            "2022-01-16T06:51:23Z": { // finale starts at 06:51:23
                "previous": secondToLastPK,
                "current": lastPK,
                "next": null
            },
            "2022-01-16T07:11:22Z": { // finale ends at 07:11:23
                "previous": secondToLastPK,
                "current": lastPK,
                "next": null
            },
            "2022-01-16T06:51:23Z": { // finale ends at 07:11:23
                "previous": lastPK,
                "current": null,
                "next": null
            }
        };

        Object.entries(pointsInTimeAndExpectedResponse).forEach(([date, expectedResults]) => {
            describe("during "+date, () => {
                const dataContainer = new DataContainer(new FakeHTTPClient(), new FakeTimeProvider(new Date(date)));

                Object.entries(expectedResults).forEach(([relativeTime, pk]) => {
                    // capitalize first letter of relativeTime
                    const relativeTimeCapitalized = relativeTime.charAt(0).toUpperCase() + relativeTime.slice(1);

                    test(`${relativeTimeCapitalized} run is ${pk}`, async () => {
                        if (pk == null)
                        {
                            expect(await dataContainer[`get${relativeTimeCapitalized}Run`]()).toBeNull();
                            return;
                        }

                        
                        expect((await dataContainer[`get${relativeTimeCapitalized}Run`]()).pk).toBe(pk)
                    })
                });
            })
        });
    });
});