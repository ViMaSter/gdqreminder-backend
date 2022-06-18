import { Twitch } from '../../../services/twitch.js';
import { FakeHTTPClient } from "../../stubs/fakeHTTPClient";

describe("twitch", () => {
    const twitch = new Twitch(new FakeHTTPClient("during-pumpkin_jack"), "");
    it("returns true, if current game name contains specified string", async () => {
        expect(await twitch.isSubstringOfGameNameOrStreamTitle("Pumpkin Jack")).toBeTruthy();
    })
    it("returns false, if current game name contains specified string", async () => {
        expect(await twitch.isSubstringOfGameNameOrStreamTitle("Mario")).toBeFalsy();
    })
    it("returns true, if current stream title contains specified string", async () => {
        expect(await twitch.isSubstringOfGameNameOrStreamTitle("Benefiting")).toBeTruthy();
    })
    it("returns false, if current stream title contains specified string", async () => {
        expect(await twitch.isSubstringOfGameNameOrStreamTitle("Checkpoint")).toBeFalsy();
    })
    it("returns false, if the stream is offline", async () => {
        const offline = new Twitch(new FakeHTTPClient("twitch-offline"), "");
        expect(await offline.isSubstringOfGameNameOrStreamTitle("Pumpkin Jack")).toBeFalsy();
    })
    it("returns false, if no broadcast info", async () => {
        const offline = new Twitch(new FakeHTTPClient("twitch-missing-broadcast"), "");
        expect(await offline.isSubstringOfGameNameOrStreamTitle("Pumpkin Jack")).toBeFalsy();
    })
})