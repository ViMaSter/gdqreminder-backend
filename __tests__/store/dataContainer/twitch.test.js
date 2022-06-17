import { Twitch } from '../../../services/twitch.js';
import { FakeHTTPClient } from "../../stubs/fakeHTTPClient";

describe("twitch", () => {
    const twitch = new Twitch(FakeHTTPClient, "");
    it("returns true, if current game name contains specified string", async () => {
        expect(await twitch.isSubstringOfGameNameOrStreamTitle("Metroid")).toBeTruthy();
    })
    it("returns false, if current game name contains specified string", async () => {
        expect(await twitch.isSubstringOfGameNameOrStreamTitle("Mario")).toBeFalsy();
    })
    it("returns true, if current stream title contains specified string", async () => {
        expect(await twitch.isSubstringOfGameNameOrStreamTitle("Forward")).toBeTruthy();
    })
    it("returns false, if current stream title contains specified string", async () => {
        expect(await twitch.isSubstringOfGameNameOrStreamTitle("Checkpoint")).toBeFalsy();
    })
})