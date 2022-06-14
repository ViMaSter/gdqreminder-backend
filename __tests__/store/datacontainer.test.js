import { FakeTimeProvider } from "../stubs/fakeTimeProvider";
import { FakeHTTPClient } from "../stubs/fakeHTTPClient";
import { DataContainer } from "../../store/dataContainer"

describe("dataContainer", () => {
    const pointsInTimeAndExpectedResponse = {
        "2022-01-01": { // before AGDQ2022 with SGDQ2022 already scheduled afterwards
            "previous": "SGDQ2021",
            "current": null,
            "next": "AGDQ2022"
        },
        "2022-01-11": { // during AGDQ2022 with SGDQ2022 already scheduled afterwards
            "previous": "SGDQ2021",
            "current": "AGDQ2022",
            "next": "SGDQ2022"
        },
        "2022-01-30": { // after  AGDQ2022 with SGDQ2022 already scheduled afterwards
            "previous": "AGDQ2022",
            "current": null,
            "next": "SGDQ2022"
        },

        "2022-06-14": { // before SGDQ2022 with no new event scheduled
            "previous": "AGDQ2022",
            "current": null,
            "next": "SGDQ2022"
        },
        "2022-06-30": { // during SGDQ2022 with no new event scheduled
            "previous": "AGDQ2022",
            "current": "SGDQ2022",
            "next": null
        },
        "2022-08-14": { // after  SGDQ2022 with no new event scheduled
            "previous": "SGDQ2022",
            "current": null,
            "next": null
        } 
    };

    Object.entries(pointsInTimeAndExpectedResponse).forEach(([date, expectedResults]) => {
        describe("during "+date, () => {
            const dataContainer = new DataContainer(new FakeHTTPClient(), new FakeTimeProvider(new Date(date)));

            Object.entries(expectedResults).forEach(([relativeTime, result]) => {
                // capitalize first letter of relativeTime
                const relativeTimeCapitalized = relativeTime.charAt(0).toUpperCase() + relativeTime.slice(1);
                const lowercaseShort = result?.toLowerCase();

                test(`${relativeTimeCapitalized} run is ${lowercaseShort}`, async () => {
                    if (lowercaseShort == null)
                    {
                        expect(await dataContainer[`get${relativeTimeCapitalized}Event`]()).toBeNull();
                        return;
                    }

                    
                    expect((await dataContainer[`get${relativeTimeCapitalized}Event`]()).short).toBe(lowercaseShort)
                })
            });
        })
    });
});