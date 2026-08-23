import { tripDays } from "./data.mjs";
import { buildAttractionChecklist, buildGoogleUrl, buildKakaoUrl, buildOverviewMatrix, buildOverviewRows, buildRestaurantChecklist, buildTimeline, mealDisplayMode } from "./utils.mjs";
import { verifyPassword } from "./auth.mjs";

const passwordHash = "ae54d4164552347bce0ab77dc1655cad425a78b5fe390a7c3ecd5c62ff12ad91";
const authStorageKey = "busan-trip-auth-v1";
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

function actions(place) {
  if (!place) return "";
  return `<p class="address">${place.address}</p>
    <div class="place-actions">
      <button class="place-action place-action--copy" data-copy="${place.address}">複製地址</button>
      <a class="place-action place-action--kakao" href="${buildKakaoUrl(place)}" target="_blank" rel="noreferrer">Kakao</a>
      <a class="place-action place-action--google" href="${buildGoogleUrl(place)}" target="_blank" rel="noreferrer">Google</a>
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
    return `<div class="event-title-row"><h3>${event.title}</h3>${badge}</div><p>${event.subtitle}</p>${actions(event.place)}`;
  }

  const label = event.kind === "lunch" ? "午餐 · LUNCH" : "晚餐 · DINNER";
  const options = event.options.map((meal, index) => `<div class="timeline-meal-option">
      ${event.options.length > 1 ? `<span class="choice-number">0${index + 1}</span>` : ""}
      <div class="meal-title-row"><h3>${meal.title}</h3>${meal.reservationStatus ? `<span class="reservation-status">${meal.reservationStatus}</span>` : ""}</div>
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
    <section class="overview-sections" aria-label="七日行程表">
      ${matrix.sections.map((section) => `<details class="overview-section">
        <summary><span>${section.label}</span><b>展開</b></summary>
        <div class="overview-section__table-wrap" role="region" aria-label="${section.label}七日內容" tabindex="0">
          <div class="overview-section__grid">
            ${rows.map((row, index) => `<button class="overview-section__date" data-overview-day="${index}" aria-label="查看 ${row.date} 詳細行程"><span>${row.weekday}</span><strong>${row.date}</strong></button>`).join("")}
            ${section.cells.map((cell, index) => `<div class="overview-section__cell">${overviewCell(section, cell, rows[index])}</div>`).join("")}
          </div>
        </div>
      </details>`).join("")}
    </section>`;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderChecklist({ scrollToTop = true } = {}) {
  const completed = readChecklist();
  const items = checklistType === "restaurants"
    ? buildRestaurantChecklist(tripDays)
    : buildAttractionChecklist(tripDays);
  const prefix = checklistType === "restaurants" ? "restaurant" : "attraction";
  const completedCount = items.filter((item) => completed.has(`${prefix}:${item.id}`)).length;

  view.innerHTML = `
    <section class="checklist-heading">
      <p class="eyebrow">SAVE · TASTE · VISIT</p>
      <div class="checklist-heading__row"><h2>旅行 Checklist</h2><span>${completedCount} / ${items.length}</span></div>
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
            <h3>${item.title}</h3>
            ${actions(item.place)}
          </div>
        </article>`;
      }).join("")}
    </section>`;
  if (scrollToTop) window.scrollTo({ top: 0, behavior: "smooth" });
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
  else renderChecklist();
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

document.addEventListener("click", (event) => {
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) {
    activeView = viewButton.dataset.view;
    renderView();
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
});

document.addEventListener("change", (event) => {
  const checkbox = event.target.closest("[data-check-id]");
  if (!checkbox) return;
  const completed = readChecklist();
  if (checkbox.checked) completed.add(checkbox.dataset.checkId);
  else completed.delete(checkbox.dataset.checkId);
  saveChecklist(completed);
  renderChecklist({ scrollToTop: false });
});

function unlockApp() {
  authGate.hidden = true;
  appShell.hidden = false;
  document.body.classList.add("is-authenticated");
  renderTabs();
  renderView();
}

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const valid = await verifyPassword(passwordInput.value, passwordHash);
  if (!valid) {
    authError.textContent = "密碼不正確，請再試一次。";
    passwordInput.select();
    return;
  }
  sessionStorage.setItem(authStorageKey, "unlocked");
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
  sessionStorage.removeItem(authStorageKey);
  window.location.reload();
});

if (sessionStorage.getItem(authStorageKey) === "unlocked") unlockApp();
else passwordInput.focus();
