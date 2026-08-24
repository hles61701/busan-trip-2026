const defaultTripId = "busan-2026";

function throwIfError(error) {
  if (error) throw error;
}

export async function ensureAnonymousSession(client) {
  const { data, error } = await client.auth.getSession();
  throwIfError(error);
  if (data.session) return data.session;
  const result = await client.auth.signInAnonymously();
  throwIfError(result.error);
  return result.data?.session ?? null;
}

export function createSupabaseChecklistRemote(client, tripId = defaultTripId) {
  return {
    async load() {
      const { data, error } = await client
        .from("trip_checklist")
        .select("item_id, checked")
        .eq("trip_id", tripId);
      throwIfError(error);
      return new Map((data ?? []).map(({ item_id, checked }) => [item_id, checked]));
    },
    async save(itemId, checked) {
      const { error } = await client.from("trip_checklist").upsert({
        trip_id: tripId,
        item_id: itemId,
        checked,
        updated_at: new Date().toISOString(),
      }, { onConflict: "trip_id,item_id" });
      throwIfError(error);
    },
  };
}
