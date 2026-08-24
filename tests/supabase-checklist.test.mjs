import test from "node:test";
import assert from "node:assert/strict";
import { createSupabaseChecklistRemote, ensureAnonymousSession } from "../js/supabase-checklist.mjs";

test("anonymous authentication is created only when no session exists", async () => {
  let signIns = 0;
  const signedOutClient = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      signInAnonymously: async () => { signIns += 1; return { error: null }; },
    },
  };
  await ensureAnonymousSession(signedOutClient);
  await ensureAnonymousSession({
    auth: {
      getSession: async () => ({ data: { session: { user: { id: "friend" } } }, error: null }),
      signInAnonymously: async () => { signIns += 1; return { error: null }; },
    },
  });

  assert.equal(signIns, 1);
});

test("remote loads only this trip and converts rows to checklist state", async () => {
  const client = {
    from: () => ({
      select: () => ({
        eq: async (column, value) => {
          assert.equal(column, "trip_id");
          assert.equal(value, "busan-2026");
          return { data: [{ item_id: "restaurant:a", checked: true }], error: null };
        },
      }),
    }),
  };

  const rows = await createSupabaseChecklistRemote(client).load();

  assert.deepEqual([...rows], [["restaurant:a", true]]);
});

test("remote upserts a shared checklist row with its current state", async () => {
  let write;
  let options;
  const client = {
    from: () => ({
      upsert: async (payload, upsertOptions) => {
        write = payload;
        options = upsertOptions;
        return { error: null };
      },
    }),
  };

  await createSupabaseChecklistRemote(client).save("attraction:sky", false);

  assert.equal(write.trip_id, "busan-2026");
  assert.equal(write.item_id, "attraction:sky");
  assert.equal(write.checked, false);
  assert.match(write.updated_at, /^\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual(options, { onConflict: "trip_id,item_id" });
});
