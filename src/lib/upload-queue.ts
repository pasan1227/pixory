/**
 * Framework-free upload scheduling for the photo tray.
 *
 * The upload hook wires this queue to the photo server actions; the queue
 * itself never touches the network. It is fully deterministic — no timers,
 * no clock reads, and no retry backoff (backoff is deliberately deferred
 * until we have real-world failure data; a failed run re-queues immediately)
 * — so every state transition is observable with plain promises in tests.
 *
 * Semantics:
 * - At most `concurrency` tasks run simultaneously. Starting is
 *   synchronous-eager: `enqueue` starts the task immediately if a slot is
 *   free.
 * - Next task selection: highest `priority` number first; FIFO among equal
 *   priorities. Re-queued tasks (auto-retry or manual retry) go to the back
 *   of their priority class.
 * - A rejecting run increments `attempts`; while `attempts <= maxAutoRetries`
 *   the task re-queues automatically, otherwise it becomes "failed".
 * - `retry` resets `attempts` to 0 so a manual retry gets a fresh auto-retry
 *   budget.
 * - Asymmetry by design: `remove` on an unknown id is a no-op (idempotent
 *   removal is friendlier for UI races, e.g. a double-tapped remove button),
 *   but `remove` on a running task throws because the in-flight promise
 *   cannot be cancelled and would settle into a ghost task.
 */

export type UploadTaskStatus = "queued" | "running" | "failed" | "done";

export interface UploadTask {
  id: string;
  priority: number;
  status: UploadTaskStatus;
  attempts: number;
}

export interface UploadQueue {
  enqueue(input: { id: string; priority: number; run: () => Promise<void> }): void;
  retry(id: string): void;
  remove(id: string): void;
  getTasks(): UploadTask[];
  subscribe(listener: () => void): () => void;
}

interface InternalTask extends UploadTask {
  /** Monotonic sequence number; FIFO tie-breaker within a priority class. */
  seq: number;
  run: () => Promise<void>;
}

/** True when `candidate` should be picked over `incumbent`. */
function beats(candidate: InternalTask, incumbent: InternalTask | undefined): boolean {
  if (!incumbent) return true;
  if (candidate.priority !== incumbent.priority) {
    return candidate.priority > incumbent.priority;
  }
  return candidate.seq < incumbent.seq;
}

export function createUploadQueue(options: {
  concurrency: number;
  maxAutoRetries: number;
}): UploadQueue {
  const { concurrency, maxAutoRetries } = options;
  /** Keyed by id; Map iteration order doubles as insertion order for getTasks(). */
  const tasks = new Map<string, InternalTask>();
  const listeners = new Set<() => void>();
  let runningCount = 0;
  let nextSeq = 0;

  function takeSeq(): number {
    const seq = nextSeq;
    nextSeq += 1;
    return seq;
  }

  function notify(): void {
    // Iterate a copy so listeners may (un)subscribe during notification.
    for (const listener of [...listeners]) {
      try {
        listener();
      } catch {
        // A broken listener must never break upload scheduling.
      }
    }
  }

  /** Highest priority first; FIFO (lowest seq) among equal priorities. */
  function pickNext(): InternalTask | undefined {
    let best: InternalTask | undefined;
    for (const task of tasks.values()) {
      if (task.status !== "queued") continue;
      if (beats(task, best)) best = task;
    }
    return best;
  }

  function start(task: InternalTask): void {
    task.status = "running";
    runningCount += 1;
    notify();
    let result: Promise<void>;
    try {
      result = task.run();
    } catch {
      // A run() that throws synchronously counts as a rejection; without this
      // the running-slot count would leak and stall the queue.
      settleRejected(task);
      return;
    }
    result.then(
      () => settleDone(task),
      () => settleRejected(task),
    );
  }

  function startNext(): void {
    while (runningCount < concurrency) {
      const next = pickNext();
      if (!next) return;
      start(next);
    }
  }

  function settleDone(task: InternalTask): void {
    runningCount -= 1;
    task.status = "done";
    notify();
    startNext();
  }

  function settleRejected(task: InternalTask): void {
    runningCount -= 1;
    task.attempts += 1;
    if (task.attempts <= maxAutoRetries) {
      // Automatic retry: back of its priority class, no delay (backoff is
      // deferred — see module doc).
      task.status = "queued";
      task.seq = takeSeq();
    } else {
      task.status = "failed";
    }
    notify();
    startNext();
  }

  function enqueue(input: { id: string; priority: number; run: () => Promise<void> }): void {
    if (tasks.has(input.id)) {
      throw new Error(`Upload task "${input.id}" is already enqueued.`);
    }
    const task: InternalTask = {
      id: input.id,
      priority: input.priority,
      status: "queued",
      attempts: 0,
      seq: takeSeq(),
      run: input.run,
    };
    tasks.set(task.id, task);
    notify();
    // Synchronous-eager: take a free slot immediately.
    startNext();
  }

  function retry(id: string): void {
    const task = tasks.get(id);
    if (!task) {
      throw new Error(`Unknown upload task "${id}".`);
    }
    if (task.status !== "failed") return; // No-op outside "failed".
    // Manual retry grants a fresh auto-retry budget.
    task.attempts = 0;
    task.status = "queued";
    task.seq = takeSeq();
    notify();
    startNext();
  }

  function remove(id: string): void {
    const task = tasks.get(id);
    if (!task) return; // Idempotent removal — see module doc.
    if (task.status === "running") {
      throw new Error(`Upload task "${id}" is running and cannot be removed.`);
    }
    tasks.delete(id);
    notify();
  }

  function getTasks(): UploadTask[] {
    return [...tasks.values()].map((task) => ({
      id: task.id,
      priority: task.priority,
      status: task.status,
      attempts: task.attempts,
    }));
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  return { enqueue, retry, remove, getTasks, subscribe };
}
