import { describe, expect, it } from "vitest";

import {
  createUploadQueue,
  type UploadQueue,
  type UploadTask,
} from "@/lib/upload-queue";

interface Deferred {
  promise: Promise<void>;
  resolve: () => void;
  reject: () => void;
}

function createDeferred(): Deferred {
  let resolve: () => void = () => undefined;
  let reject: () => void = () => undefined;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = () => rej(new Error("upload failed"));
  });
  return { promise, resolve, reject };
}

/** Drain the microtask queue so promise reactions inside the queue settle. */
async function flush(): Promise<void> {
  for (let i = 0; i < 8; i += 1) {
    await Promise.resolve();
  }
}

function getTask(queue: UploadQueue, id: string): UploadTask {
  const task = queue.getTasks().find((t) => t.id === id);
  if (!task) throw new Error(`task "${id}" not found`);
  return task;
}

/** Test harness: tasks backed by manually-settled deferreds, start order recorded. */
function createHarness(options: { concurrency: number; maxAutoRetries: number }) {
  const queue = createUploadQueue(options);
  const startOrder: string[] = [];
  const runs = new Map<string, Deferred[]>();

  function enqueue(id: string, priority: number): void {
    if (!runs.has(id)) runs.set(id, []);
    queue.enqueue({
      id,
      priority,
      run: () => {
        startOrder.push(id);
        const deferred = createDeferred();
        const list = runs.get(id);
        if (!list) throw new Error(`no run list for "${id}"`);
        list.push(deferred);
        return deferred.promise;
      },
    });
  }

  function latestRun(id: string): Deferred {
    const list = runs.get(id) ?? [];
    const deferred = list[list.length - 1];
    if (!deferred) throw new Error(`task "${id}" has not run yet`);
    return deferred;
  }

  async function resolveRun(id: string): Promise<void> {
    latestRun(id).resolve();
    await flush();
  }

  async function rejectRun(id: string): Promise<void> {
    latestRun(id).reject();
    await flush();
  }

  const status = (id: string): string => getTask(queue, id).status;
  const attempts = (id: string): number => getTask(queue, id).attempts;
  const runCount = (id: string): number => runs.get(id)?.length ?? 0;

  return { queue, startOrder, enqueue, resolveRun, rejectRun, status, attempts, runCount };
}

describe("createUploadQueue", () => {
  it("runs at most `concurrency` tasks and starts queued work as slots free", async () => {
    const h = createHarness({ concurrency: 2, maxAutoRetries: 0 });
    h.enqueue("a", 1);
    h.enqueue("b", 1);
    h.enqueue("c", 1);

    expect(h.status("a")).toBe("running");
    expect(h.status("b")).toBe("running");
    expect(h.status("c")).toBe("queued");
    expect(h.runCount("c")).toBe(0);

    await h.resolveRun("a");
    expect(h.status("a")).toBe("done");
    expect(h.status("c")).toBe("running");

    await h.resolveRun("b");
    await h.resolveRun("c");
    expect(h.queue.getTasks().map((t) => t.status)).toEqual(["done", "done", "done"]);
  });

  it("keeps done tasks in getTasks() until removed", async () => {
    const h = createHarness({ concurrency: 1, maxAutoRetries: 0 });
    h.enqueue("a", 1);
    await h.resolveRun("a");

    expect(h.status("a")).toBe("done");
    h.queue.remove("a");
    expect(h.queue.getTasks()).toEqual([]);
  });

  it("starts tasks eagerly and synchronously on enqueue when a slot is free", () => {
    const h = createHarness({ concurrency: 1, maxAutoRetries: 0 });
    h.enqueue("a", 1);

    // No flush: the start must have happened synchronously inside enqueue.
    expect(h.startOrder).toEqual(["a"]);
    expect(h.status("a")).toBe("running");
  });

  it("starts tasks FIFO within a priority class", async () => {
    const h = createHarness({ concurrency: 1, maxAutoRetries: 0 });
    h.enqueue("a", 3);
    h.enqueue("b", 3);
    h.enqueue("c", 3);
    h.enqueue("d", 3);

    await h.resolveRun("a");
    await h.resolveRun("b");
    await h.resolveRun("c");
    await h.resolveRun("d");
    expect(h.startOrder).toEqual(["a", "b", "c", "d"]);
  });

  it("lets higher priority jump the line without preempting running tasks", async () => {
    const h = createHarness({ concurrency: 1, maxAutoRetries: 0 });
    h.enqueue("low1", 1);
    h.enqueue("low2", 1);
    h.enqueue("high", 9);

    // No preemption: low1 keeps running, high waits.
    expect(h.status("low1")).toBe("running");
    expect(h.status("high")).toBe("queued");
    expect(h.runCount("high")).toBe(0);

    await h.resolveRun("low1");
    expect(h.status("high")).toBe("running");
    expect(h.status("low2")).toBe("queued");

    await h.resolveRun("high");
    expect(h.status("low2")).toBe("running");
    await h.resolveRun("low2");
    expect(h.startOrder).toEqual(["low1", "high", "low2"]);
  });

  it("auto-retries exactly maxAutoRetries times, counting attempts, then fails", async () => {
    const h = createHarness({ concurrency: 1, maxAutoRetries: 2 });
    h.enqueue("a", 1);
    expect(h.attempts("a")).toBe(0);

    await h.rejectRun("a");
    expect(h.attempts("a")).toBe(1);
    expect(h.status("a")).toBe("running"); // auto-retried immediately

    await h.rejectRun("a");
    expect(h.attempts("a")).toBe(2);
    expect(h.status("a")).toBe("running");

    await h.rejectRun("a");
    expect(h.attempts("a")).toBe(3);
    expect(h.status("a")).toBe("failed");
    // 1 initial run + exactly maxAutoRetries automatic retries.
    expect(h.runCount("a")).toBe(3);
  });

  it("sends auto-retried tasks to the back of their priority class", async () => {
    const h = createHarness({ concurrency: 1, maxAutoRetries: 1 });
    h.enqueue("a", 1);
    h.enqueue("b", 1);
    h.enqueue("c", 1);

    await h.rejectRun("a"); // a re-queues behind b and c
    expect(h.startOrder).toEqual(["a", "b"]);

    await h.resolveRun("b");
    await h.resolveRun("c");
    expect(h.startOrder).toEqual(["a", "b", "c", "a"]);

    await h.resolveRun("a");
    expect(h.status("a")).toBe("done");
    expect(h.attempts("a")).toBe(1);
  });

  it("manual retry resets the attempts budget and the task can then succeed", async () => {
    const h = createHarness({ concurrency: 1, maxAutoRetries: 1 });
    h.enqueue("a", 1);
    await h.rejectRun("a");
    await h.rejectRun("a");
    expect(h.status("a")).toBe("failed");
    expect(h.attempts("a")).toBe(2);
    expect(h.runCount("a")).toBe(2);

    h.queue.retry("a");
    expect(h.attempts("a")).toBe(0); // fresh budget
    expect(h.status("a")).toBe("running");
    expect(h.runCount("a")).toBe(3);

    // With a stale budget this rejection would fail the task; instead it
    // auto-retries because attempts were reset.
    await h.rejectRun("a");
    expect(h.attempts("a")).toBe(1);
    expect(h.status("a")).toBe("running");
    expect(h.runCount("a")).toBe(4);

    await h.resolveRun("a");
    expect(h.status("a")).toBe("done");
  });

  it("retry throws on unknown ids and no-ops for non-failed tasks", async () => {
    const h = createHarness({ concurrency: 1, maxAutoRetries: 0 });
    expect(() => h.queue.retry("ghost")).toThrow();

    h.enqueue("a", 1);
    h.enqueue("b", 1);

    h.queue.retry("a"); // running: no-op
    expect(h.status("a")).toBe("running");
    expect(h.runCount("a")).toBe(1);

    h.queue.retry("b"); // queued: no-op
    expect(h.status("b")).toBe("queued");
    expect(h.runCount("b")).toBe(0);

    await h.resolveRun("a");
    h.queue.retry("a"); // done: no-op
    expect(h.status("a")).toBe("done");
    expect(h.runCount("a")).toBe(1);
    await h.resolveRun("b");
  });

  it("throws when enqueueing a duplicate id in any status", async () => {
    const h = createHarness({ concurrency: 1, maxAutoRetries: 0 });
    h.enqueue("a", 1);
    h.enqueue("b", 1);

    expect(() => h.enqueue("a", 1)).toThrow(); // running
    expect(() => h.enqueue("b", 1)).toThrow(); // queued

    await h.rejectRun("a");
    expect(h.status("a")).toBe("failed");
    expect(() => h.enqueue("a", 1)).toThrow(); // failed

    await h.resolveRun("b");
    expect(() => h.enqueue("b", 1)).toThrow(); // done
  });

  it("remove throws for running, drops queued/done, and no-ops on unknown ids", async () => {
    const h = createHarness({ concurrency: 1, maxAutoRetries: 0 });
    h.enqueue("a", 1);
    h.enqueue("b", 1);

    expect(() => h.queue.remove("a")).toThrow(); // running

    h.queue.remove("b"); // queued: dropped, never runs
    expect(h.queue.getTasks().map((t) => t.id)).toEqual(["a"]);

    expect(() => h.queue.remove("ghost")).not.toThrow(); // unknown: no-op

    await h.resolveRun("a");
    expect(h.runCount("b")).toBe(0);
    h.queue.remove("a"); // done: dropped
    expect(h.queue.getTasks()).toEqual([]);
  });

  it("removes failed tasks", async () => {
    const h = createHarness({ concurrency: 1, maxAutoRetries: 0 });
    h.enqueue("a", 1);
    await h.rejectRun("a");
    expect(h.status("a")).toBe("failed");

    h.queue.remove("a");
    expect(h.queue.getTasks()).toEqual([]);
  });

  it("notifies subscribers on every transition and stops after unsubscribe", async () => {
    const h = createHarness({ concurrency: 1, maxAutoRetries: 0 });
    let calls = 0;
    const unsubscribe = h.queue.subscribe(() => {
      calls += 1;
    });

    h.enqueue("a", 1); // enqueue + queued->running
    expect(calls).toBe(2);

    h.enqueue("b", 1); // enqueue only (no free slot)
    expect(calls).toBe(3);

    await h.resolveRun("a"); // a done + b queued->running
    expect(calls).toBe(5);

    await h.resolveRun("b"); // b done
    expect(calls).toBe(6);

    h.queue.remove("a"); // remove
    expect(calls).toBe(7);

    unsubscribe();
    h.enqueue("c", 1);
    expect(calls).toBe(7);
  });

  it("notifies on auto-retry, failure, and manual retry transitions", async () => {
    const h = createHarness({ concurrency: 1, maxAutoRetries: 1 });
    let calls = 0;
    h.queue.subscribe(() => {
      calls += 1;
    });

    h.enqueue("a", 1); // enqueue + start
    expect(calls).toBe(2);

    await h.rejectRun("a"); // running->queued (auto-retry) + queued->running
    expect(calls).toBe(4);

    await h.rejectRun("a"); // running->failed
    expect(calls).toBe(5);

    h.queue.retry("a"); // failed->queued + queued->running
    expect(calls).toBe(7);

    await h.resolveRun("a"); // running->done
    expect(calls).toBe(8);
  });

  it("a throwing listener breaks neither the queue nor other listeners", async () => {
    const h = createHarness({ concurrency: 1, maxAutoRetries: 0 });
    let calls = 0;
    h.queue.subscribe(() => {
      throw new Error("listener exploded");
    });
    h.queue.subscribe(() => {
      calls += 1;
    });

    h.enqueue("a", 1);
    await h.resolveRun("a");

    expect(h.status("a")).toBe("done");
    expect(calls).toBe(3); // enqueue + start + done
  });

  it("getTasks returns insertion-ordered snapshots that cannot mutate the queue", () => {
    const h = createHarness({ concurrency: 1, maxAutoRetries: 0 });
    h.enqueue("b", 1);
    h.enqueue("a", 5);

    const snapshot = h.queue.getTasks();
    expect(snapshot.map((t) => t.id)).toEqual(["b", "a"]); // insertion order

    snapshot[0].status = "failed";
    snapshot[1].attempts = 99;
    snapshot.pop();

    const fresh = h.queue.getTasks();
    expect(fresh.map((t) => t.id)).toEqual(["b", "a"]);
    expect(fresh[0].status).toBe("running");
    expect(fresh[1].attempts).toBe(0);
    expect(fresh[0]).not.toBe(snapshot[0]); // fresh objects every call
  });

  it("treats a run() that throws synchronously as a rejection", () => {
    const queue = createUploadQueue({ concurrency: 1, maxAutoRetries: 1 });
    let runCalls = 0;
    queue.enqueue({
      id: "a",
      priority: 1,
      run: () => {
        runCalls += 1;
        throw new Error("sync boom");
      },
    });

    // Initial run + one auto-retry, all settled synchronously and
    // deterministically — no flush needed.
    expect(runCalls).toBe(2);
    expect(getTask(queue, "a").status).toBe("failed");
    expect(getTask(queue, "a").attempts).toBe(2);
  });

  it("starts all previews (priority 2) before originals (priority 1) when interleaved", async () => {
    const h = createHarness({ concurrency: 2, maxAutoRetries: 0 });
    h.enqueue("prevA", 2);
    h.enqueue("prevB", 2);
    h.enqueue("origA", 1);
    h.enqueue("prevC", 2);
    h.enqueue("origB", 1);
    h.enqueue("origC", 1);

    expect(h.startOrder).toEqual(["prevA", "prevB"]); // eager slots

    await h.resolveRun("prevA"); // prevC outranks origA despite later enqueue
    await h.resolveRun("prevB");
    await h.resolveRun("prevC");
    await h.resolveRun("origA");
    await h.resolveRun("origB");
    await h.resolveRun("origC");

    expect(h.startOrder).toEqual(["prevA", "prevB", "prevC", "origA", "origB", "origC"]);
    expect(h.queue.getTasks().every((t) => t.status === "done")).toBe(true);
  });
});
