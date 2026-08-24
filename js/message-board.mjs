export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

export function normalizeMessages(rows, currentUserId) {
  return rows.map((row) => {
    const likes = row.trip_message_likes ?? [];
    return {
      id: row.id,
      nickname: row.nickname,
      tripDate: row.trip_date,
      body: row.body,
      createdAt: row.created_at,
      isOwn: row.user_id === currentUserId,
      liked: likes.some(({ user_id }) => user_id === currentUserId),
      likeCount: likes.length,
    };
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function throwIfError(error) {
  if (error) throw error;
}

export function createMessageBoardRemote(client, currentUserId, tripId = "busan-2026") {
  return {
    async load() {
      const { data, error } = await client
        .from("trip_messages")
        .select("id, user_id, nickname, trip_date, body, created_at, trip_message_likes(user_id)")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false });
      throwIfError(error);
      return normalizeMessages(data ?? [], currentUserId);
    },
    async create({ nickname, tripDate, body }) {
      const { error } = await client.from("trip_messages").insert({
        trip_id: tripId,
        user_id: currentUserId,
        nickname: nickname.trim(),
        trip_date: tripDate,
        body: body.trim(),
      });
      throwIfError(error);
    },
    async remove(messageId) {
      const { error } = await client
        .from("trip_messages")
        .delete()
        .eq("id", messageId)
        .eq("user_id", currentUserId);
      throwIfError(error);
    },
    async like(messageId) {
      const { error } = await client.from("trip_message_likes").insert({
        message_id: messageId,
        user_id: currentUserId,
      });
      throwIfError(error);
    },
    async unlike(messageId) {
      const { error } = await client
        .from("trip_message_likes")
        .delete()
        .eq("message_id", messageId)
        .eq("user_id", currentUserId);
      throwIfError(error);
    },
  };
}
