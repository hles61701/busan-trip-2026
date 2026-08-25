import { tripDays } from "./data.mjs";
import { buildAttractionChecklist, buildGoogleUrl, buildKakaoTaxiUrl, buildNaverUrl, buildOverviewMatrix, buildOverviewRows, buildRestaurantChecklist, buildTimeline, buildUberUrl, mealDisplayMode, mealDisplayTitle } from "./utils.mjs";
import { createAuthPersistence, verifyPassword } from "./auth.mjs";
import { createChecklistSync, singleFlight, syncStatusText } from "./checklist-sync.mjs";
import { createSupabaseChecklistRemote, ensureAnonymousSession } from "./supabase-checklist.mjs";
import { supabaseConfig } from "./supabase-config.mjs";
import { canDeleteMessage, createMessageBoardRemote, escapeHtml, resolveNickname } from "./message-board.mjs";

const passwordHash = "ae54d4164552347bce0ab77dc1655cad425a78b5fe390a7c3ecd5c62ff12ad91";
const authStorageKey = "busan-trip-auth-v1";
const authPersistence = createAuthPersistence(localStorage, sessionStorage, authStorageKey);
const authGate = document.querySelector("#authGate");
const authForm = document.querySelector("#authForm");
const authError = document.querySelector("#authError");
const passwordInput = document.querySelector("#tripPassword");
const togglePassword = document.querySelector("#togglePassword");
const appShell = document.querySelector("#appShell");

const tabs = document.querySelector("#dayTabs");
const view = document.querySelector("#dayView");
const toast = document.querySelector("#toast");
let activeIndex = 0;
let activeView = "itinerary";
let checklistType = "restaurants";
const checklistStorageKey = "busan-trip-checklist-v1";
let checklistSync = null;
let checklistConnectionStatus = "local";
const nicknameStorageKey = "busan-trip-nickname-v1";
let messageRemote = null;
let messages = [];
let messageStatus = "local";
let messageError = "";
let messageSubmitting = false;
const messageBusyIds = new Set();
const messageDraft = {
  nickname: resolveNickname(localStorage.getItem(nicknameStorageKey)),
  tripDate: "all",
  body: "",
};
let supabaseConnection = null;

async function performSupabaseConnection() {
  if (supabaseConnection) return supabaseConnection;
  if (!window.supabase?.createClient) throw new Error("Supabase library unavailable");
  const client = window.supabase.createClient(supabaseConfig.url, supabaseConfig.publishableKey);
  const session = await ensureAnonymousSession(client);
  if (!session?.user?.id) throw new Error("Anonymous session unavailable");
  supabaseConnection = { client, session };
  return supabaseConnection;
}

const connectSupabase = singleFlight(performSupabaseConnection);

function readChecklist() {
  try {
    return new Set(JSON.parse(localStorage.getItem(checklistStorageKey) ?? "[]"));
  } catch {
    return new Set();
  }
}

function saveChecklist(items) {
  localStorage.setItem(checklistStorageKey, JSON.stringify([...items]));
}

function currentChecklist() {
  return checklistSync?.read() ?? readChecklist();
}

function cloudStatus() {
  return syncStatusText(checklistSync?.status() ?? checklistConnectionStatus);
}

async function performChecklistCloudConnection() {
  checklistConnectionStatus = "local";
  if (activeView === "checklist") renderChecklist({ scrollToTop: false });
  try {
    const { client } = await connectSupabase();
    checklistSync = createChecklistSync({
      storage: localStorage,
      remote: createSupabaseChecklistRemote(client),
    });
    await checklistSync.connect();
  } catch {
    checklistSync = null;
    checklistConnectionStatus = "offline";
  }
  if (activeView === "checklist") renderChecklist({ scrollToTop: false });
}

const connectChecklistCloud = singleFlight(performChecklistCloudConnection);

async function refreshChecklistCloud() {
  if (!checklistSync) return connectChecklistCloud();
  await checklistSync.refresh();
  if (activeView === "checklist") renderChecklist({ scrollToTop: false });
}

function actions(place) {
  if (!place) return "";
  const catchtableAction = place.catchtableUrl
    ? `<a class="place-action place-action--catchtable" href="${place.catchtableUrl}" target="_blank" rel="noreferrer">Catchtable</a>`
    : "";
  return `<p class="address">${place.address}</p>
    <div class="place-actions">
      <button class="place-action place-action--copy" data-copy="${place.address}">複製地址</button>
      <a class="place-action place-action--naver" href="${buildNaverUrl(place)}" target="_blank" rel="noreferrer">NAVER</a>
      <a class="place-action place-action--google" href="${buildGoogleUrl(place)}" target="_blank" rel="noreferrer">Google</a>
      <a class="place-action place-action--taxi" href="${buildKakaoTaxiUrl()}" data-taxi-copy="${place.address}">Kakao T</a>
      <a class="place-action place-action--uber" href="${buildUberUrl(place)}" target="_blank" rel="noreferrer">Uber</a>
      ${catchtableAction}
    </div>`;
}

function renderTabs() {
  tabs.innerHTML = tripDays.map((day, index) => `
    <button class="day-tab ${index === activeIndex ? "is-active" : ""}" data-day="${index}" aria-pressed="${index === activeIndex}">
      <span>${day.weekday}</span><strong>${day.date}</strong>
    </button>`).join("");
}

function eventContent(event) {
  if (!event.kind) {
    const badge = event.passGroup
      ? `<span class="event-status event-status--pass">Big3・${event.passGroup}組</span>`
      : event.ticketLabel
        ? `<span class="event-status ${event.fixed ? "event-status--fixed" : ""}">${event.ticketLabel}</span>`
        : "";
    const nearby = event.nearby?.length
      ? `<aside class="nearby-note"><span>附近順逛・可去可不去</span><ul>${event.nearby.map((shop) => `<li><b>${shop.name}</b><a href="${buildGoogleUrl(shop.place)}" target="_blank" rel="noreferrer">Google Map</a></li>`).join("")}</ul></aside>`
      : "";
    return `<div class="event-title-row"><h3>${event.title}</h3>${badge}</div><p>${event.subtitle}</p>${actions(event.place)}${nearby}`;
  }

  const label = event.kind === "lunch" ? "午餐 · LUNCH" : "晚餐 · DINNER";
  const options = event.options.map((meal, index) => `<div class="timeline-meal-option">
      ${event.options.length > 1 ? `<span class="choice-number">0${index + 1}</span>` : ""}
      <div class="meal-title-row"><h3>${mealDisplayTitle(meal)}</h3>${meal.reservationStatus ? `<span class="reservation-status">${meal.reservationStatus}</span>` : ""}</div>
      <p>${meal.subtitle}</p>${actions(meal.place)}
    </div>`).join("");

  if (mealDisplayMode(event.options) === "single") {
    return `<span class="meal-label meal-label--${event.kind}">${label}</span>${options}`;
  }

  return `<span class="meal-label meal-label--${event.kind}">${label}</span>
    <details class="meal-toggle">
      <summary><span>${event.options.length} 間餐廳可選</span><b>展開選擇</b></summary>
      <div class="meal-toggle__content">${options}</div>
    </details>`;
}

function renderDay() {
  const day = tripDays[activeIndex];
  const weatherBackup = day.weatherBackup ? `<div class="weather-backup">
      <div class="event-title-row"><h3>${day.weatherBackup.title}</h3><span class="event-status">${day.weatherBackup.ticketLabel}</span></div>
      <p>${day.weatherBackup.subtitle}</p>
      ${actions(day.weatherBackup.place)}
    </div>` : "";
  view.innerHTML = `
    <section class="day-heading">
      <div><p class="eyebrow">DAY ${activeIndex + 1} · ${day.kicker}</p><h2>${day.title}</h2></div>
      <span class="pace">${day.pace}</span>
    </section>
    <section class="timeline" aria-label="當日行程">
      ${buildTimeline(day).map((event) => `
        <article class="timeline-item ${event.kind ? `timeline-item--${event.kind}` : ""} ${event.fixed ? "timeline-item--fixed" : ""}">
          <time>${event.endTime ? `${event.time}<span>–${event.endTime}</span>` : event.time}</time>
          <div class="timeline-content">${eventContent(event)}</div>
        </article>`).join("")}
    </section>
    <section class="notes-card">
      <div><span>📷</span><p><strong>值得拍下來</strong>${day.photo}</p></div>
      <div><span>☂</span><div><p><strong>天氣備案</strong>${day.weather}</p>${weatherBackup}</div></div>
    </section>`;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function checklistStatus(item) {
  if (item.backup) return `<span class="event-status">雨天備案</span>`;
  if (item.passGroup) return `<span class="event-status event-status--pass">Big3・${item.passGroup}組</span>`;
  if (item.ticketLabel) return `<span class="event-status">${item.ticketLabel}</span>`;
  if (item.reservationStatus) return `<span class="reservation-status">${item.reservationStatus}</span>`;
  return "";
}

function overviewEvents(items) {
  if (!items.length) return `<span class="overview-empty">—</span>`;
  return items.map((item) => `<div class="overview-entry">
    <time>${item.time}</time><span>${item.title}</span>
    ${item.passGroup ? `<b class="overview-badge">Big3・${item.passGroup}</b>` : ""}
  </div>`).join("");
}

function overviewMeal(meal) {
  if (!meal.items.length) return `<span class="overview-empty">—</span>`;
  return `<span class="overview-choice">${meal.label}</span>${meal.items.map((title) => `<span class="overview-meal">${title}</span>`).join("")}`;
}

function overviewCell(section, cell, day) {
  if (section.key === "area") return `<strong>${cell}</strong><small>${day.pace}</small>`;
  if (section.key === "morning" || section.key === "afternoon") return overviewEvents(cell);
  if (section.key === "lunch" || section.key === "dinner") return overviewMeal(cell);
  return cell.length ? cell.map((item) => `<span class="overview-fixed">${item}</span>`).join("") : `<span class="overview-empty">—</span>`;
}

function renderOverview() {
  const rows = buildOverviewRows(tripDays);
  const matrix = buildOverviewMatrix(rows);
  view.innerHTML = `
    <section class="overview-heading">
      <p class="eyebrow">ORGANIZER · 7 DAYS AT A GLANCE</p>
      <h2>七日行程總覽</h2>
      <p>時間為節奏參考；橘色固定事項不可延誤。點日期可回到當日詳細行程。</p>
    </section>
    <div class="overview-table-wrap" role="region" aria-label="七日行程表" tabindex="0">
      <table class="overview-table">
        <thead><tr><th>項目</th>${rows.map((row, index) => `<th><button data-overview-day="${index}" aria-label="查看 ${row.date} 詳細行程"><span>${row.weekday}</span><strong>${row.date}</strong></button></th>`).join("")}</tr></thead>
        <tbody>${matrix.sections.map((section) => `<tr>
          <th scope="row">${section.label}</th>
          ${section.cells.map((cell, index) => `<td>${overviewCell(section, cell, rows[index])}</td>`).join("")}
        </tr>`).join("")}</tbody>
      </table>
    </div>`;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderChecklist({ scrollToTop = true } = {}) {
  const completed = currentChecklist();
  const items = checklistType === "restaurants"
    ? buildRestaurantChecklist(tripDays)
    : buildAttractionChecklist(tripDays);
  const prefix = checklistType === "restaurants" ? "restaurant" : "attraction";
  const completedCount = items.filter((item) => completed.has(`${prefix}:${item.id}`)).length;

  view.innerHTML = `
    <section class="checklist-heading">
      <p class="eyebrow">SAVE · TASTE · VISIT</p>
      <div class="checklist-heading__row"><h2>旅行 Checklist</h2><span>${completedCount} / ${items.length}</span></div>
      <p class="checklist-sync-status" data-sync-status="${checklistSync?.status() ?? checklistConnectionStatus}">${cloudStatus()}</p>
      <div class="checklist-types" role="group" aria-label="清單分類">
        <button class="checklist-type ${checklistType === "restaurants" ? "is-active" : ""}" data-checklist-type="restaurants">餐廳</button>
        <button class="checklist-type ${checklistType === "attractions" ? "is-active" : ""}" data-checklist-type="attractions">景點</button>
      </div>
    </section>
    <section class="checklist-list" aria-label="${checklistType === "restaurants" ? "餐廳" : "景點"}清單">
      ${items.map((item) => {
        const checkId = `${prefix}:${item.id}`;
        return `<article class="checklist-item ${completed.has(checkId) ? "is-checked" : ""}">
          <label class="checklist-check">
            <input type="checkbox" data-check-id="${checkId}" ${completed.has(checkId) ? "checked" : ""}>
            <span aria-hidden="true"></span>
            <span class="sr-only">標記 ${item.title}</span>
          </label>
          <div class="checklist-item__content">
            <div class="checklist-meta"><span>${item.dates.join("・")}</span>${checklistStatus(item)}</div>
            <h3>${checklistType === "restaurants" ? mealDisplayTitle(item) : item.title}</h3>
            ${actions(item.place)}
          </div>
        </article>`;
      }).join("")}
    </section>`;
  if (scrollToTop) window.scrollTo({ top: 0, behavior: "smooth" });
}

const messageDateOptions = [
  ["all", "全行程"], ["8/30", "8/30"], ["8/31", "8/31"], ["9/1", "9/1"],
  ["9/2", "9/2"], ["9/3", "9/3"], ["9/4", "9/4"], ["9/5", "9/5"],
];

function formatMessageTime(value) {
  return new Intl.DateTimeFormat("zh-TW", {
    month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
}

function messageStatusText() {
  if (messageStatus === "synced") return "雲端已同步";
  if (messageStatus === "offline") return "目前離線，暫時無法留言";
  return "正在連線";
}

function renderMessages({ scrollToTop = true } = {}) {
  const canPost = messageStatus === "synced" && navigator.onLine && Boolean(messageRemote);
  const cards = messages.length
    ? messages.map((message) => `<article class="message-card">
        <div class="message-card__meta">
          <span class="message-card__date">${message.tripDate === "all" ? "全行程" : escapeHtml(message.tripDate)}</span>
          <span class="message-card__author">${escapeHtml(message.nickname)}</span>
          <time datetime="${escapeHtml(message.createdAt)}">${formatMessageTime(message.createdAt)}</time>
        </div>
        <p class="message-card__body">${escapeHtml(message.body)}</p>
        <div class="message-card__actions">
          <button class="message-action message-action--like ${message.liked ? "is-liked" : ""}" type="button" data-message-like="${escapeHtml(message.id)}" aria-pressed="${message.liked}" ${messageBusyIds.has(message.id) ? "disabled" : ""}>${message.liked ? "♥" : "♡"} ${message.likeCount}</button>
          ${canDeleteMessage() ? `<button class="message-action message-action--delete" type="button" data-message-delete="${escapeHtml(message.id)}" ${messageBusyIds.has(message.id) ? "disabled" : ""}>刪除</button>` : ""}
        </div>
      </article>`).join("")
    : `<div class="message-empty">還沒有留言，先留下第一句旅伴提醒吧。</div>`;

  view.innerHTML = `
    <section class="message-heading">
      <p class="eyebrow">TRIP NOTES · JUST FOR US</p>
      <h2>旅伴留言</h2>
      <p>提醒、分工、臨時想去的地方，都放在這裡。</p>
    </section>
    <form class="message-form" id="messageForm">
      <div class="message-form__row">
        <label class="message-field">暱稱
          <input name="nickname" maxlength="20" autocomplete="nickname" value="${escapeHtml(messageDraft.nickname)}" placeholder="怎麼稱呼你？" required>
        </label>
        <label class="message-field">行程日期
          <select name="tripDate">${messageDateOptions.map(([value, label]) => `<option value="${value}" ${messageDraft.tripDate === value ? "selected" : ""}>${label}</option>`).join("")}</select>
        </label>
      </div>
      <label class="message-field">留言
        <textarea name="body" maxlength="500" placeholder="例如：膠囊列車票我保管。" required>${escapeHtml(messageDraft.body)}</textarea>
      </label>
      <div class="message-form__footer">
        <span class="message-count">${messageDraft.body.length} / 500</span>
        <button class="message-submit" type="submit" ${messageSubmitting || !canPost ? "disabled" : ""}>${messageSubmitting ? "發布中…" : "發布留言"}</button>
      </div>
      ${messageError ? `<p class="message-error" role="alert">${escapeHtml(messageError)}</p>` : ""}
    </form>
    <div class="message-board-status"><span>${messageStatusText()}</span><button class="message-refresh" type="button" data-message-refresh>重新整理</button></div>
    <section class="message-list" aria-label="旅伴留言列表">${cards}</section>`;
  if (scrollToTop) window.scrollTo({ top: 0, behavior: "smooth" });
}

async function performMessageConnection() {
  messageStatus = "local";
  if (activeView === "messages") renderMessages({ scrollToTop: false });
  try {
    const { client, session } = await connectSupabase();
    messageRemote = createMessageBoardRemote(client, session.user.id);
    messages = await messageRemote.load();
    messageStatus = "synced";
    messageError = "";
  } catch {
    messageStatus = "offline";
    messageError = "留言板暫時連不上，請稍後再試。";
  }
  if (activeView === "messages") renderMessages({ scrollToTop: false });
}

const connectMessageBoard = singleFlight(performMessageConnection);

async function refreshMessages() {
  if (!messageRemote) return connectMessageBoard();
  try {
    messages = await messageRemote.load();
    messageStatus = "synced";
    messageError = "";
  } catch {
    messageStatus = "offline";
    messageError = "留言更新失敗，請檢查網路。";
  }
  if (activeView === "messages") renderMessages({ scrollToTop: false });
}

function renderView() {
  tabs.hidden = activeView !== "itinerary";
  document.querySelectorAll("[data-view]").forEach((button) => {
    const selected = button.dataset.view === activeView;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  if (activeView === "itinerary") renderDay();
  else if (activeView === "overview") renderOverview();
  else if (activeView === "checklist") renderChecklist();
  else renderMessages();
}

async function copyAddress(value) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
  toast.classList.add("is-visible");
  window.setTimeout(() => toast.classList.remove("is-visible"), 1600);
}

document.addEventListener("click", async (event) => {
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) {
    activeView = viewButton.dataset.view;
    renderView();
    if (activeView === "checklist") refreshChecklistCloud();
    if (activeView === "messages") refreshMessages();
    return;
  }
  const checklistButton = event.target.closest("[data-checklist-type]");
  if (checklistButton) {
    checklistType = checklistButton.dataset.checklistType;
    renderChecklist();
    return;
  }
  const dayButton = event.target.closest("[data-day]");
  if (dayButton) {
    activeIndex = Number(dayButton.dataset.day);
    renderTabs();
    renderDay();
    document.querySelector(`[data-day="${activeIndex}"]`)?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }
  const overviewDay = event.target.closest("[data-overview-day]");
  if (overviewDay) {
    activeIndex = Number(overviewDay.dataset.overviewDay);
    activeView = "itinerary";
    renderTabs();
    renderView();
    return;
  }
  const copyButton = event.target.closest("[data-copy]");
  if (copyButton) copyAddress(copyButton.dataset.copy);
  const taxiButton = event.target.closest("[data-taxi-copy]");
  if (taxiButton) copyAddress(taxiButton.dataset.taxiCopy);
  const refreshButton = event.target.closest("[data-message-refresh]");
  if (refreshButton) {
    await refreshMessages();
    return;
  }
  const likeButton = event.target.closest("[data-message-like]");
  if (likeButton && messageRemote) {
    const message = messages.find(({ id }) => id === likeButton.dataset.messageLike);
    if (!message) return;
    messageBusyIds.add(message.id);
    renderMessages({ scrollToTop: false });
    let actionError = "";
    try {
      if (message.liked) await messageRemote.unlike(message.id);
      else await messageRemote.like(message.id);
    } catch {
      actionError = "按讚更新失敗，請再試一次。";
    } finally {
      messageBusyIds.delete(message.id);
      await refreshMessages();
      if (actionError) {
        messageError = actionError;
        renderMessages({ scrollToTop: false });
      }
    }
    return;
  }
  const deleteButton = event.target.closest("[data-message-delete]");
  if (deleteButton && messageRemote) {
    if (!window.confirm("確定要刪除這則留言嗎？")) return;
    const messageId = deleteButton.dataset.messageDelete;
    messageBusyIds.add(messageId);
    renderMessages({ scrollToTop: false });
    let actionError = "";
    try {
      await messageRemote.remove(messageId);
    } catch {
      actionError = "留言刪除失敗，請再試一次。";
    } finally {
      messageBusyIds.delete(messageId);
      await refreshMessages();
      if (actionError) {
        messageError = actionError;
        renderMessages({ scrollToTop: false });
      }
    }
  }
});

document.addEventListener("input", (event) => {
  if (event.target.matches('#messageForm [name="nickname"]')) {
    messageDraft.nickname = event.target.value;
    localStorage.setItem(nicknameStorageKey, messageDraft.nickname);
  }
  if (event.target.matches('#messageForm [name="body"]')) {
    messageDraft.body = event.target.value;
    const count = document.querySelector(".message-count");
    if (count) count.textContent = `${messageDraft.body.length} / 500`;
  }
});

document.addEventListener("change", async (event) => {
  if (event.target.matches('#messageForm [name="tripDate"]')) {
    messageDraft.tripDate = event.target.value;
    return;
  }
  const checkbox = event.target.closest("[data-check-id]");
  if (!checkbox) return;
  if (checklistSync) {
    const update = checklistSync.setChecked(checkbox.dataset.checkId, checkbox.checked);
    renderChecklist({ scrollToTop: false });
    await update;
    renderChecklist({ scrollToTop: false });
    return;
  }
  const completed = readChecklist();
  if (checkbox.checked) completed.add(checkbox.dataset.checkId);
  else completed.delete(checkbox.dataset.checkId);
  saveChecklist(completed);
  renderChecklist({ scrollToTop: false });
});

document.addEventListener("submit", async (event) => {
  if (event.target.id !== "messageForm") return;
  event.preventDefault();
  if (!navigator.onLine || messageStatus !== "synced" || !messageRemote) {
    messageStatus = "offline";
    messageError = "目前離線，留言內容已保留，連線後再發布。";
    renderMessages({ scrollToTop: false });
    return;
  }
  const nickname = messageDraft.nickname.trim();
  const body = messageDraft.body.trim();
  if (!nickname || !body) {
    messageError = "請填寫暱稱與留言內容。";
    renderMessages({ scrollToTop: false });
    return;
  }
  messageSubmitting = true;
  messageError = "";
  renderMessages({ scrollToTop: false });
  try {
    if (!messageRemote) await connectMessageBoard();
    if (!messageRemote) throw new Error("Message board unavailable");
    await messageRemote.create({ nickname, tripDate: messageDraft.tripDate, body });
    messageDraft.nickname = nickname;
    messageDraft.body = "";
    localStorage.setItem(nicknameStorageKey, nickname);
    await refreshMessages();
  } catch {
    messageStatus = "offline";
    messageError = "留言發布失敗，內容已保留，請稍後再試。";
  } finally {
    messageSubmitting = false;
    if (activeView === "messages") renderMessages({ scrollToTop: false });
  }
});

function unlockApp() {
  authGate.hidden = true;
  appShell.hidden = false;
  document.body.classList.add("is-authenticated");
  renderTabs();
  renderView();
  connectChecklistCloud();
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  refreshChecklistCloud();
  if (activeView === "messages") refreshMessages();
});

window.addEventListener("online", () => {
  refreshChecklistCloud();
  if (activeView === "messages") refreshMessages();
});
window.addEventListener("offline", () => {
  checklistConnectionStatus = "offline";
  checklistSync?.markOffline();
  messageStatus = "offline";
  if (activeView === "checklist") renderChecklist({ scrollToTop: false });
  if (activeView === "messages") renderMessages({ scrollToTop: false });
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const valid = await verifyPassword(passwordInput.value, passwordHash);
  if (!valid) {
    authError.textContent = "密碼不正確，請再試一次。";
    passwordInput.select();
    return;
  }
  authPersistence.remember();
  unlockApp();
});

togglePassword.addEventListener("click", () => {
  const reveal = passwordInput.type === "password";
  passwordInput.type = reveal ? "text" : "password";
  togglePassword.textContent = reveal ? "隱藏" : "顯示";
  togglePassword.setAttribute("aria-label", reveal ? "隱藏密碼" : "顯示密碼");
  passwordInput.focus();
});

document.querySelector("#lockButton").addEventListener("click", () => {
  authPersistence.forget();
  window.location.reload();
});

if (authPersistence.isUnlocked()) unlockApp();
else passwordInput.focus();
