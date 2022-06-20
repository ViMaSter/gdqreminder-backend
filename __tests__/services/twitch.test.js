import { Twitch } from '../../services/twitch.js';
import { FakeHTTPClient } from "../stubs/fakeHTTPClient";

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
    it("returns false, if no stream info", async () => {
        const offline = new Twitch(new FakeHTTPClient("twitch-missing-stream"), "");
        expect(await offline.isSubstringOfGameNameOrStreamTitle("Pumpkin Jack")).toBeFalsy();
    })
    it("returns false, if no game info", async () => {
        const offline = new Twitch(new FakeHTTPClient("twitch-missing-game"), "");
        expect(await offline.isSubstringOfGameNameOrStreamTitle("Pumpkin Jack")).toBeFalsy();
    })
    it("returns false, if empty game info", async () => {
        const offline = new Twitch(new FakeHTTPClient("twitch-empty-game"), "");
        expect(await offline.isSubstringOfGameNameOrStreamTitle("Pumpkin Jack")).toBeFalsy();
    })
})