const defaultStorageKey = "busan-trip-checklist-v1";
const defaultMigrationKey = "busan-trip-checklist-cloud-migrated-v1";

export function syncStatusText(status) {
  if (status === "synced") return "雲端已同步";
  if (status === "offline") return "離線保存";
  return "正在連線";
}

export function singleFlight(task) {
  let inFlight = null;
  return (...args) => {
    if (inFlight) return inFlight;
    try {
      inFlight = Promise.resolve(task(...args));
    } catch (error) {
      inFlight = Promise.reject(error);
    }
    inFlight = inFlight.finally(() => { inFlight = null; });
    return inFlight;
  };
}

function parseStoredItems(storage, storageKey) {
  try {
    return new Set(JSON.parse(storage.getItem(storageKey) ?? "[]"));
  } catch {
    return new Set();
  }
}

export function createChecklistSync({
  storage,
  remote,
  storageKey = defaultStorageKey,
  migrationKey = defaultMigrationKey,
}) {
  let items = parseStoredItems(storage, storageKey);
  let syncStatus = "local";
  let pendingWrites = 0;
  let writeQueue = Promise.resolve();
  let mutationVersion = 0;

  function persist() {
    storage.setItem(storageKey, JSON.stringify([...items]));
  }

  function applyCloud(rows) {
    items = new Set([...rows].filter(([, checked]) => checked).map(([itemId]) => itemId));
    persist();
    syncStatus = "synced";
    return new Set(items);
  }

  async function loadStableCloud() {
    await writeQueue;
    const loadVersion = mutationVersion;
    const rows = await remote.load();
    return mutationVersion === loadVersion ? rows : null;
  }

  async function connect() {
    try {
      let cloudRows = await loadStableCloud();
      if (!cloudRows) cloudRows = await loadStableCloud();
      if (!cloudRows) return new Set(items);
      if (storage.getItem(migrationKey) !== "done") {
        const localItems = [...items];
        for (const itemId of localItems) await remote.save(itemId, true);
        for (const itemId of localItems) cloudRows.set(itemId, true);
        storage.setItem(migrationKey, "done");
        const migratedRows = await loadStableCloud();
        if (!migratedRows) return new Set(items);
        cloudRows = migratedRows;
      }
      return applyCloud(cloudRows);
    } catch {
      syncStatus = "offline";
      return new Set(items);
    }
  }

  function setChecked(itemId, checked) {
    if (checked) items.add(itemId);
    else items.delete(itemId);
    persist();
    mutationVersion += 1;
    pendingWrites += 1;
    syncStatus = "local";
    const operation = writeQueue.then(async () => {
      let succeeded = false;
      try {
        await remote.save(itemId, checked);
        succeeded = true;
      } finally {
        pendingWrites -= 1;
        if (pendingWrites === 0) syncStatus = succeeded ? "synced" : "offline";
      }
      return new Set(items);
    });
    writeQueue = operation.catch(() => {});
    return operation.catch(() => new Set(items));
  }

  async function refresh() {
    try {
      const rows = await loadStableCloud();
      if (!rows) return new Set(items);
      return applyCloud(rows);
    } catch {
      syncStatus = "offline";
      return new Set(items);
    }
  }

  return {
    connect,
    read: () => new Set(items),
    refresh,
    markOffline: () => { syncStatus = "offline"; },
    setChecked,
    status: () => syncStatus,
  };
}
