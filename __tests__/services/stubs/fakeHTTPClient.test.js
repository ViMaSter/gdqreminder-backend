import { FakeHTTPClient, PrefixEmptyError } from '../../stubs/fakeHTTPClient';

describe("FakeHTTPClient", () => {
    test(`[EVENTS] can read files`, async () => {
        const request = new FakeHTTPClient("during-preshow").get("https://gamesdonequick.com/tracker/api/v1/search/?type=event");
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
            const request = new FakeHTTPClient("during-preshow").get("https://gamesdonequick.com/tracker/api/v1/search/?type=run&eventshort=" + eventShort);
            const content = await request.json();
            expect(content.length).toBe(runCount);
        });
    });

    test(`can set folder prefix`, async () => {
        const client = new FakeHTTPClient("httpClientTest/1");
        expect(await client.get("https://google.com").json()).toBe(1);
        client.setPrefix("httpClientTest/2");
        expect(await client.get("https://google.com").json()).toBe(2);
    })

    test(`throws if no error prefix is set`, () => {
        expect(() => new FakeHTTPClient("")).toThrow(new PrefixEmptyError());
        expect(() => new FakeHTTPClient("httpClientTest").setPrefix("")).toThrow(new PrefixEmptyError());
    })
    
})