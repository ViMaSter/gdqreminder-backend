import { RealTimeProvider } from "../../services/timeProvider";

describe("RealTimeProvider", () => {
    test('real time has a drift of less than 1000ms', () => {
        const provider = new RealTimeProvider();
        const startTime = provider.getTime();
        const currentTime = new Date().getTime();

        expect(currentTime - startTime).toBeLessThan(1000);
    });
})
