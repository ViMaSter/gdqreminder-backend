import { Twitch } from '../../services/twitch.js';
import { FakeHTTPClient } from "../stubs/fakeHTTPClient";
import { RealTimeProvider } from '../../services/timeProvider/realTimeProvider.js';
import { expect } from '@jest/globals';

let cacheHits = {};
const twitch = new Twitch(new FakeHTTPClient("during-pumpkin_jack"), new RealTimeProvider(), "", null, cacheHits);
await twitch.isSubstringOfGameNameOrStreamTitle("Pumpkin Jack"); // warm up cache

describe("twitch", () => {
    [
        {
            testName: "returns true, if current game name contains specified string",
            searchFor: "Pumpkin Jack",
            expectToFind: true
        },
        {
            testName: "returns true, if current stream title contains specified string",
            searchFor: "Benefiting",
            expectToFind: true
        },
        {
            testName: "returns false, if current game name does not contain specified string",
            searchFor: "Mario",
            expectToFind: false
        },
        {
            testName: "returns false, if current stream title does not contain specified string",
            searchFor: "Checkpoint",
            expectToFind: false
        }
    ].forEach(({ testName, searchFor, expectToFind }) => {
        it(testName, async () => {
            const previousCacheHits = cacheHits["https://gql.twitch.tv/gql"] || 0;
            expect(await twitch.isSubstringOfGameNameOrStreamTitle(searchFor)).toBe(expectToFind);
            expect(cacheHits["https://gql.twitch.tv/gql"]).toBe(previousCacheHits + 1);
        });
    });

    [
        {
            testName: "returns false, if the stream is offline",
            mockData: "twitch-offline"
        },
        {
            testName: "returns false, if no stream info",
            mockData: "twitch-missing-stream"
        },
        {
            testName: "returns false, if no game info",
            mockData: "twitch-missing-game"
        },
        {
            testName: "returns false, if empty game info",
            mockData: "twitch-empty-game"
        }
    ].forEach(({ testName, mockData }) => {
        it(testName, async () => {
            let localCacheHits = {};
            const offline = new Twitch(new FakeHTTPClient(mockData), new RealTimeProvider(), "", null, localCacheHits);
            await offline.fetchTitle(); // warm up cache

            const previousCacheHits = localCacheHits["https://gql.twitch.tv/gql"] || 0;
            expect(await offline.isSubstringOfGameNameOrStreamTitle("Pumpkin Jack")).toBeFalsy();
            expect(localCacheHits["https://gql.twitch.tv/gql"]).toBe(previousCacheHits + 1);
        });
    });
})