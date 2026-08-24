import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createMessageBoardRemote, escapeHtml, normalizeMessages } from "../js/message-board.mjs";
import * as messageBoard from "../js/message-board.mjs";

test("a first-time visitor starts with anonymous while a saved nickname wins", () => {
  assert.equal(messageBoard.resolveNickname(null), "anonymous");
  assert.equal(messageBoard.resolveNickname("Wei"), "Wei");
});

test("message text is escaped before it is rendered into the page", () => {
  assert.equal(
    escapeHtml(`<img src=x onerror="alert('x')"> & hi`),
    "&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt; &amp; hi",
  );
});

test("database rows become newest-first messages with like and ownership state", () => {
  const rows = [
    {
      id: "older",
      user_id: "friend-a",
      nickname: "Wei",
      trip_date: "9/1",
      body: "膠囊列車票我保管",
      created_at: "2026-08-24T01:00:00.000Z",
      trip_message_likes: [{ user_id: "friend-a" }, { user_id: "friend-b" }],
    },
    {
      id: "newer",
      user_id: "friend-b",
      nickname: "Yu",
      trip_date: "all",
      body: "記得帶轉接頭",
      created_at: "2026-08-24T02:00:00.000Z",
      trip_message_likes: [{ user_id: "friend-a" }],
    },
  ];

  const messages = normalizeMessages(rows, "friend-a");

  assert.deepEqual(messages.map(({ id }) => id), ["newer", "older"]);
  assert.deepEqual(
    messages.map(({ id, isOwn, liked, likeCount, tripDate }) => ({ id, isOwn, liked, likeCount, tripDate })),
    [
      { id: "newer", isOwn: false, liked: true, likeCount: 1, tripDate: "all" },
      { id: "older", isOwn: true, liked: true, likeCount: 2, tripDate: "9/1" },
    ],
  );
});

test("posting trims text and binds the anonymous author to this trip", async () => {
  let inserted;
  const client = {
    from: (table) => {
      assert.equal(table, "trip_messages");
      return { insert: async (payload) => { inserted = payload; return { error: null }; } };
    },
  };
  const remote = createMessageBoardRemote(client, "friend-a");

  await remote.create({ nickname: " Wei ", tripDate: "9/1", body: " 票我保管 " });

  assert.deepEqual(inserted, {
    trip_id: "busan-2026",
    user_id: "friend-a",
    nickname: "Wei",
    trip_date: "9/1",
    body: "票我保管",
  });
});

test("liking and unliking use the user-message pair", async () => {
  const actions = [];
  const client = {
    from: (table) => ({
      insert: async (payload) => { actions.push(["insert", table, payload]); return { error: null }; },
      delete: () => ({
        eq: (firstColumn, firstValue) => ({
          eq: async (secondColumn, secondValue) => {
            actions.push(["delete", table, firstColumn, firstValue, secondColumn, secondValue]);
            return { error: null };
          },
        }),
      }),
    }),
  };
  const remote = createMessageBoardRemote(client, "friend-a");

  await remote.like("message-1");
  await remote.unlike("message-1");

  assert.deepEqual(actions, [
    ["insert", "trip_message_likes", { message_id: "message-1", user_id: "friend-a" }],
    ["delete", "trip_message_likes", "message_id", "message-1", "user_id", "friend-a"],
  ]);
});

test("deleting a message is available to any trip member", async () => {
  let filter;
  const client = {
    from: () => ({
      delete: () => ({
        eq: async (column, value) => {
          filter = [column, value];
          return { error: null };
        },
      }),
    }),
  };

  await createMessageBoardRemote(client, "friend-a").remove("message-1");

  assert.deepEqual(filter, ["id", "message-1"]);
  assert.equal(messageBoard.canDeleteMessage(), true);
});

test("database policies let trip members delete messages while protecting other writes", () => {
  const sql = readFileSync(new URL("../supabase/message-board.sql", import.meta.url), "utf8");

  assert.match(sql, /trip_messages for insert[\s\S]*user_id = \(select auth\.uid\(\)\)/);
  assert.match(sql, /trip_messages for delete[^;]*trip_id = 'busan-2026'/);
  assert.match(sql, /trip_message_likes for insert[\s\S]*user_id = \(select auth\.uid\(\)\)/);
  assert.match(sql, /trip_message_likes for delete[\s\S]*user_id = \(select auth\.uid\(\)\)/);
});

test("offline message posting is disabled and rejected before a request", () => {
  const app = readFileSync(new URL("../js/app.mjs", import.meta.url), "utf8");

  assert.match(app, /messageSubmitting \|\| !canPost \? "disabled"/);
  assert.match(app, /if \(!navigator\.onLine \|\| messageStatus !== "synced" \|\| !messageRemote\)/);
});
