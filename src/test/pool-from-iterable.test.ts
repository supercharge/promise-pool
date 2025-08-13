import { describe, expect, it } from "vitest";
import { PromisePool } from "../index.js";

const pause = (timeout: number) =>
  new Promise((resolve) => setTimeout(resolve, timeout));

const fakeClock = {
  time: 0,
  schedule: [] as [number, () => void][],
  pause: (t: number) =>
    new Promise<void>((resolve) => {
      fakeClock.schedule.push([fakeClock.time + t, resolve]);
    }),
  run: async (): Promise<any> => {
    await pause(0);
    const s = fakeClock.schedule;
    if (s.length === 0) return;
    fakeClock.time += 1;
    for (let i = 0; i < s.length; ) {
      const [t, res] = s[i];
      if (t <= fakeClock.time) {
        res();
        s.splice(i, 1);
      } else {
        i += 1;
      }
    }
    return fakeClock.run();
  },
};

describe("PromisePool iterable", () => {
  it("supports iterable in the static .for method", async () => {
    const { results } = await PromisePool.for("hello")
      .withConcurrency(2)
      .process(async (letter: string) => {
        await pause(10);
        return letter.toUpperCase();
      });
    expect(results.sort()).toEqual([..."EHLLO"]);
  });
  // ...existing tests migrated from pool-from-iterable.test.ts...
});
