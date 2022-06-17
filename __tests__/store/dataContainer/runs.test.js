import { FakeTimeProvider } from "../../stubs/fakeTimeProvider";
import { FakeHTTPClient } from "../../stubs/fakeHTTPClient";
import { DataContainer } from "../../../store/dataContainer"

describe("dataContainer", () => {
    const runPKs = {
        preShow: 5049,      // "2022-01-09T16:30:00Z" - "2022-01-09T17:07:00Z"
        firstRun: 5050,     // "2022-01-09T17:07:00Z" - "2022-01-09T18:53:00Z"
        secondRun: 5051,    // "2022-01-09T18:53:00Z" - "2022-01-09T20:50:00Z"
        thirdToLast: 5267,  // "2022-01-16T04:44:37Z" - "2022-01-16T05:27:03Z"
        secondToLast: 5185, // "2022-01-16T05:27:03Z" - "2022-01-16T06:51:23Z"
        last: 5186,         // "2022-01-16T06:51:23Z" - "2022-01-16T07:11:23Z"
    }
    
    describe("runs", () => {
        const pointsInTimeAndExpectedResponse = {
            // startup
            "2022-01-09T10:00:00Z": { // pre-show starts at 16:30
                "previous": null,
                "current": null,
                "next": ["preShow", runPKs.preShow]
            },
            "2022-01-09T16:30:00Z": { // pre-show starts at 16:30
                "previous": null,
                "current": ["preShow", runPKs.preShow],
                "next": ["firstRun", runPKs.firstRun]
            },
            "2022-01-09T17:06:00Z": { // next run starts at 17:07
                "previous": null,
                "current": ["preShow", runPKs.preShow],
                "next": ["firstRun", runPKs.firstRun]
            },
            "2022-01-09T17:07:00Z": { // next run has started at 17:07
                "previous": ["preShow", runPKs.preShow],
                "current": ["firstRun", runPKs.firstRun],
                "next": ["secondRun", runPKs.secondRun]
            },
            "2022-01-09T17:08:00Z": { // next run has started at 17:07
                "previous": ["preShow", runPKs.preShow],
                "current": ["firstRun", runPKs.firstRun],
                "next": ["secondRun", runPKs.secondRun]
            },

            // wind-down
            "2022-01-16T06:51:22Z": { // finale starts at 06:51:23
                "previous": ["thirdToLast", runPKs.thirdToLast],
                "current": ["secondToLast", runPKs.secondToLast],
                "next": ["last", runPKs.last]
            },
            "2022-01-16T06:51:23Z": { // finale starts at 06:51:23
                "previous": ["secondToLast", runPKs.secondToLast],
                "current": ["last", runPKs.last],
                "next": null
            },
            "2022-01-16T07:11:22Z": { // finale ends at 07:11:23
                "previous": ["secondToLast", runPKs.secondToLast],
                "current": ["last", runPKs.last],
                "next": null
            },
            "2022-01-16T07:11:23Z": { // finale ends at 07:11:23
                "previous": ["last", runPKs.last],
                "current": null,
                "next": null
            }
        };

        Object.entries(pointsInTimeAndExpectedResponse).forEach(([date, expectedResults]) => {
            describe("at "+date, () => {
                const dataContainer = new DataContainer(FakeHTTPClient, new FakeTimeProvider(new Date(date)));

                Object.entries(expectedResults).forEach(([relativeTime, dataPair]) => {
                    // capitalize first letter of relativeTime
                    const relativeTimeCapitalized = relativeTime.charAt(0).toUpperCase() + relativeTime.slice(1);
                    const name = dataPair ? dataPair[0] : null;
                    const pk = dataPair ? dataPair[1] : null;

                    test(`${relativeTimeCapitalized} run is ${name}`, async () => {
                        const relevantRun = await dataContainer[`get${relativeTimeCapitalized}Run`]();
                        if (pk == null)
                        {
                            expect(relevantRun).toBeNull();
                            return;
                        }

                        
                        expect(relevantRun.pk).toBe(pk)
                    })
                });
            })
        });
    });
});