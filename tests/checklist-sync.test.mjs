import test from "node:test";
import assert from "node:assert/strict";
import { createChecklistSync, singleFlight, syncStatusText } from "../js/checklist-sync.mjs";

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test("first cloud connection preserves existing local checks and merges remote checks", async () => {
  const storage = memoryStorage({ "busan-trip-checklist-v1": JSON.stringify(["restaurant:local"]) });
  const writes = [];
  const cloud = new Map([["attraction:cloud", true]]);
  const remote = {
    load: async () => new Map(cloud),
    save: async (itemId, checked) => {
      writes.push([itemId, checked]);
      cloud.set(itemId, checked);
    },
  };
  const sync = createChecklistSync({ storage, remote });

  const items = await sync.connect();

  assert.deepEqual([...items].sort(), ["attraction:cloud", "restaurant:local"]);
  assert.deepEqual(writes, [["restaurant:local", true]]);
  assert.equal(sync.status(), "synced");
});

test("checking and unchecking update local state and the shared cloud row", async () => {
  const storage = memoryStorage();
  const writes = [];
  const remote = {
    load: async () => new Map(),
    save: async (itemId, checked) => writes.push([itemId, checked]),
  };
  const sync = createChecklistSync({ storage, remote });
  await sync.connect();

  await sync.setChecked("restaurant:tonshou", true);
  await sync.setChecked("restaurant:tonshou", false);

  assert.deepEqual(writes, [
    ["restaurant:tonshou", true],
    ["restaurant:tonshou", false],
  ]);
  assert.deepEqual([...sync.read()], []);
});

test("a cloud failure keeps the local choice and reports offline storage", async () => {
  const storage = memoryStorage();
  const remote = {
    load: async () => new Map(),
    save: async () => { throw new Error("network unavailable"); },
  };
  const sync = createChecklistSync({ storage, remote });
  await sync.connect();

  await sync.setChecked("attraction:sky-capsule", true);

  assert.deepEqual([...sync.read()], ["attraction:sky-capsule"]);
  assert.equal(sync.status(), "offline");
});

test("later refresh replaces stale local state with the latest cloud state", async () => {
  const storage = memoryStorage();
  let cloud = new Map([["restaurant:first", true]]);
  const remote = {
    load: async () => cloud,
    save: async () => {},
  };
  const sync = createChecklistSync({ storage, remote });
  await sync.connect();
  cloud = new Map([["attraction:latest", true], ["restaurant:first", false]]);

  const items = await sync.refresh();

  assert.deepEqual([...items], ["attraction:latest"]);
  assert.equal(sync.status(), "synced");
});

test("sync status explains whether the shared list is current or saved locally", () => {
  assert.equal(syncStatusText("synced"), "雲端已同步");
  assert.equal(syncStatusText("offline"), "離線保存");
  assert.equal(syncStatusText("local"), "正在連線");
});

test("rapid changes are written in order while local state updates immediately", async () => {
  const storage = memoryStorage();
  const pending = [];
  const remote = {
    load: async () => new Map(),
    save: (itemId, checked) => new Promise((resolve) => pending.push({ itemId, checked, resolve })),
  };
  const sync = createChecklistSync({ storage, remote });
  await sync.connect();

  const checkedWrite = sync.setChecked("restaurant:a", true);
  const uncheckedWrite = sync.setChecked("restaurant:a", false);

  assert.deepEqual([...sync.read()], []);
  await new Promise((resolve) => queueMicrotask(resolve));
  assert.equal(pending.length, 1);
  assert.equal(pending[0].checked, true);
  pending[0].resolve();
  await checkedWrite;
  await new Promise((resolve) => queueMicrotask(resolve));
  assert.equal(pending.length, 2);
  assert.equal(pending[1].checked, false);
  pending[1].resolve();
  await uncheckedWrite;
  assert.equal(sync.status(), "synced");
});

test("browser network loss marks an established sync as offline", async () => {
  const sync = createChecklistSync({
    storage: memoryStorage(),
    remote: { load: async () => new Map(), save: async () => {} },
  });
  await sync.connect();

  sync.markOffline();

  assert.equal(sync.status(), "offline");
});

test("cloud refresh waits for pending choices so stale rows cannot erase them", async () => {
  const storage = memoryStorage();
  let cloud = new Map();
  let releaseWrite;
  const remote = {
    load: async () => new Map(cloud),
    save: (itemId, checked) => new Promise((resolve) => {
      releaseWrite = () => {
        cloud.set(itemId, checked);
        resolve();
      };
    }),
  };
  const sync = createChecklistSync({ storage, remote });
  await sync.connect();

  const write = sync.setChecked("restaurant:new", true);
  const refresh = sync.refresh();
  await new Promise((resolve) => queueMicrotask(resolve));
  assert.deepEqual([...sync.read()], ["restaurant:new"]);
  releaseWrite();
  await Promise.all([write, refresh]);

  assert.deepEqual([...sync.read()], ["restaurant:new"]);
});

test("single-flight connection reuses one attempt and permits a later retry", async () => {
  let calls = 0;
  let release;
  const connect = singleFlight(() => {
    calls += 1;
    if (calls > 1) return Promise.resolve("reconnected");
    return new Promise((resolve) => {
    release = resolve;
    });
  });

  const first = connect();
  const duplicate = connect();
  assert.equal(calls, 1);
  assert.equal(first, duplicate);
  release("connected");
  await first;
  await connect();

  assert.equal(calls, 2);
});

test("initial cloud load cannot overwrite a choice made while connecting", async () => {
  const storage = memoryStorage({ "busan-trip-checklist-cloud-migrated-v1": "done" });
  let releaseFirstLoad;
  let loads = 0;
  const remote = {
    load: () => {
      loads += 1;
      if (loads === 1) return new Promise((resolve) => { releaseFirstLoad = () => resolve(new Map()); });
      return Promise.resolve(new Map([["restaurant:during-connect", true]]));
    },
    save: async () => {},
  };
  const sync = createChecklistSync({ storage, remote });

  const connecting = sync.connect();
  await new Promise((resolve) => queueMicrotask(resolve));
  sync.setChecked("restaurant:during-connect", true);
  releaseFirstLoad();
  await connecting;

  assert.deepEqual([...sync.read()], ["restaurant:during-connect"]);
  assert.equal(sync.status(), "synced");
});
