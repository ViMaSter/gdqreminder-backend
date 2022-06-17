import { FakeHTTPClient } from '../../stubs/fakeHTTPClient';

describe("FakeHTTPClient", () => {
    test(`[EVENTS] can read files`, async () => {
        const request = FakeHTTPClient.get("https://gamesdonequick.com/tracker/api/v1/search/?type=event");
        const content = await request.json();
        expect(content.length).toBe(36);
    });

    const events = {
        "sgdq2021": 153,
        "agdq2022": 149,
        "sgdq2022": 136,
    };
    Object.entries(events).forEach(([eventShort, runCount]) => {
        test(`[${eventShort}] can read files`, async () => {
            const request = FakeHTTPClient.get("https://gamesdonequick.com/tracker/api/v1/search/?type=run&eventshort=" + eventShort);
            const content = await request.json();
            expect(content.length).toBe(runCount);
        });
    });
    
})