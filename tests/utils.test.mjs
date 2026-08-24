import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as utils from "../js/utils.mjs";
import { tripDays } from "../js/data.mjs";
import { hashPassword, verifyPassword } from "../js/auth.mjs";

const { buildAttractionChecklist, buildGoogleUrl, buildKakaoTaxiUrl, buildKakaoUrl, buildOverviewMatrix, buildOverviewRows, buildRestaurantChecklist, buildTimeline, buildUberUrl, mealDisplayMode } = utils;

test("shared password is accepted only when its SHA-256 hash matches", async () => {
  const expectedHash = await hashPassword("example-password");

  assert.equal(await verifyPassword("example-password", expectedHash), true);
  assert.equal(await verifyPassword("wrong-password", expectedHash), false);
  assert.equal(await verifyPassword("", expectedHash), false);
});

test("the app is configured with the shared password hash", async () => {
  const appSource = readFileSync(new URL("../js/app.mjs", import.meta.url), "utf8");
  const expectedHash = "ae54d4164552347bce0ab77dc1655cad425a78b5fe390a7c3ecd5c62ff12ad91";

  assert.ok(appSource.includes(`const passwordHash = "${expectedHash}"`));
});

const samplePlace = {
  nameKo: "감천문화마을",
  address: "부산 사하구 감내2로 203",
};

test("Kakao link searches the Korean place name and address", () => {
  assert.equal(
    buildKakaoUrl(samplePlace),
    "https://map.kakao.com/link/search/%EA%B0%90%EC%B2%9C%EB%AC%B8%ED%99%94%EB%A7%88%EC%9D%84%20%EB%B6%80%EC%82%B0%20%EC%82%AC%ED%95%98%EA%B5%AC%20%EA%B0%90%EB%82%B42%EB%A1%9C%20203",
  );
});

test("Google link searches the Korean place name and address", () => {
  assert.equal(
    buildGoogleUrl(samplePlace),
    "https://www.google.com/maps/search/?api=1&query=%EA%B0%90%EC%B2%9C%EB%AC%B8%ED%99%94%EB%A7%88%EC%9D%84%20%EB%B6%80%EC%82%B0%20%EC%82%AC%ED%95%98%EA%B5%AC%20%EA%B0%90%EB%82%B42%EB%A1%9C%20203",
  );
});

test("NAVER link searches the Korean place name and address", () => {
  assert.equal(
    utils.buildNaverUrl(samplePlace),
    "https://map.naver.com/p/search/%EA%B0%90%EC%B2%9C%EB%AC%B8%ED%99%94%EB%A7%88%EC%9D%84%20%EB%B6%80%EC%82%B0%20%EC%82%AC%ED%95%98%EA%B5%AC%20%EA%B0%90%EB%82%B42%EB%A1%9C%20203",
  );
});

test("Kakao T link opens the taxi screen", () => {
  assert.equal(buildKakaoTaxiUrl(), "kakaot://taxi");
});

test("Uber link uses current location and prefills the Korean destination", () => {
  const url = new URL(buildUberUrl(samplePlace));

  assert.equal(url.origin + url.pathname, "https://m.uber.com/ul/");
  assert.equal(url.searchParams.get("action"), "setPickup");
  assert.equal(url.searchParams.get("pickup"), "my_location");
  assert.equal(url.searchParams.get("dropoff[nickname]"), samplePlace.nameKo);
  assert.equal(url.searchParams.get("dropoff[formatted_address]"), samplePlace.address);
});

test("place actions include a Kakao T button that copies the destination", () => {
  const appSource = readFileSync(new URL("../js/app.mjs", import.meta.url), "utf8");

  assert.match(appSource, /data-taxi-copy="\$\{place\.address\}"/);
  assert.match(appSource, />Kakao T<\/a>/);
});

test("place actions include an Uber destination button", () => {
  const appSource = readFileSync(new URL("../js/app.mjs", import.meta.url), "utf8");

  assert.match(appSource, /href="\$\{buildUberUrl\(place\)\}"/);
  assert.match(appSource, />Uber<\/a>/);
});

test("place actions use NAVER and omit the Kakao Map button", () => {
  const appSource = readFileSync(new URL("../js/app.mjs", import.meta.url), "utf8");

  assert.match(appSource, /href="\$\{buildNaverUrl\(place\)\}"/);
  assert.match(appSource, />NAVER<\/a>/);
  assert.doesNotMatch(appSource, /href="\$\{buildKakaoUrl\(place\)\}"/);
});

test("place actions show Catchtable only when a restaurant has a confirmed link", () => {
  const appSource = readFileSync(new URL("../js/app.mjs", import.meta.url), "utf8");

  assert.match(appSource, /place\.catchtableUrl\s*\?/);
  assert.match(appSource, /class="place-action place-action--catchtable"/);
  assert.match(appSource, /href="\$\{place\.catchtableUrl\}"/);
  assert.match(appSource, />Catchtable<\/a>/);
});

test("the itinerary includes all seven dates and both return-flight times", () => {
  assert.deepEqual(
    tripDays.map((day) => day.date),
    ["8/30", "8/31", "9/1", "9/2", "9/3", "9/4", "9/5"],
  );
  assert.deepEqual(
    tripDays.at(-1).events.filter(({ title }) => title.includes("起飛")).map(({ time }) => time),
    ["10:00", "10:30"],
  );
});

test("every scheduled place exposes a Korean address for copying", () => {
  for (const day of tripDays) {
    for (const item of [...day.events, ...day.lunch, ...day.dinner]) {
      if (!item.place) continue;
      assert.match(item.place.address, /^부산/);
    }
  }
});

test("meals are inserted into the timeline in chronological order", () => {
  const timeline = buildTimeline({
    events: [
      { time: "09:30", title: "上午景點" },
      { time: "14:00", title: "下午景點" },
      { time: "20:00", title: "夜景" },
    ],
    lunchTime: "12:00",
    dinnerTime: "18:30",
    lunch: [{ title: "午餐餐廳" }],
    dinner: [{ title: "晚餐餐廳" }],
  });

  assert.deepEqual(
    timeline.map(({ time, kind }) => [time, kind ?? "event"]),
    [
      ["09:30", "event"],
      ["12:00", "lunch"],
      ["14:00", "event"],
      ["18:30", "dinner"],
      ["20:00", "event"],
    ],
  );
});

test("empty meal groups do not create blank timeline entries", () => {
  const timeline = buildTimeline({
    events: [{ time: "10:00", title: "起飛" }],
    lunchTime: "12:00",
    dinnerTime: "18:30",
    lunch: [],
    dinner: [],
  });

  assert.deepEqual(timeline.map(({ title }) => title), ["起飛"]);
});

test("the Gijang day does not schedule lunch and shopping simultaneously", () => {
  const gijangDay = tripDays.find((day) => day.date === "9/3");
  const times = buildTimeline(gijangDay).map(({ time }) => time);

  assert.equal(new Set(times).size, times.length);
});

test("the Gijang day keeps Spa Land and removes Club D Oasis", () => {
  const gijangDay = tripDays.find((day) => day.date === "9/3");
  const titles = gijangDay.events.map(({ title }) => title);

  assert.ok(titles.includes("Spa Land"));
  assert.ok(!titles.some((title) => title.includes("Club D")));
});

test("every restaurant is explicitly marked as not reserved", () => {
  const restaurants = tripDays.flatMap((day) => [...day.lunch, ...day.dinner]).filter(({ place }) => place);

  assert.ok(restaurants.length > 0);
  assert.ok(restaurants.every(({ reservationStatus }) => reservationStatus === "尚未訂位"));
});

test("only multi-choice meals use a collapsible list", () => {
  assert.equal(mealDisplayMode([{ title: "唯一選擇" }]), "single");
  assert.equal(mealDisplayMode([{ title: "選擇一" }, { title: "選擇二" }]), "toggle");
});

test("the three final-night dinner choices each have their own address", () => {
  const finalNight = tripDays.find((day) => day.date === "9/4");

  assert.equal(finalNight.dinner.length, 3);
  assert.equal(new Set(finalNight.dinner.map(({ place }) => place.address)).size, 3);
  assert.ok(finalNight.dinner.every(({ place }) => place.address !== "부산 수영구 민락수변로 49"));
});

test("the sky capsule booking preserves its exact admission window", () => {
  const haeundaeDay = tripDays.find((day) => day.date === "9/1");
  const capsule = haeundaeDay.events.find(({ title }) => title === "天空膠囊列車");

  assert.deepEqual(
    { time: capsule.time, endTime: capsule.endTime, fixed: capsule.fixed },
    { time: "09:30", endTime: "10:00", fixed: true },
  );
});

test("the Big3 allocation uses one A attraction and two B attractions", () => {
  const passEvents = tripDays.flatMap((day) => day.events).filter(({ passGroup }) => passGroup);

  assert.deepEqual(
    passEvents.map(({ title, passGroup }) => [title, passGroup]),
    [
      ["松島海上纜車", "B"],
      ["海岸列車回程", "B"],
      ["Spa Land", "A"],
    ],
  );
});

test("separately purchased attractions are not counted as Big3 selections", () => {
  const events = tripDays.flatMap((day) => day.events);
  const expectedLabels = new Map([
    ["Skyline Luge", "另外購票"],
    ["天空膠囊列車", "已購票・固定時間"],
    ["龍宮雲橋", "現場購票"],
  ]);

  for (const [title, ticketLabel] of expectedLabels) {
    const event = events.find((candidate) => candidate.title === title);
    assert.equal(event.passGroup, undefined);
    assert.equal(event.ticketLabel, ticketLabel);
  }
});

test("the Yeongdo day provides Arte Museum as a mapped rainy-day backup", () => {
  const yeongdoDay = tripDays.find((day) => day.date === "9/2");

  assert.deepEqual(
    {
      title: yeongdoDay.weatherBackup.title,
      nameKo: yeongdoDay.weatherBackup.place.nameKo,
      address: yeongdoDay.weatherBackup.place.address,
      ticketLabel: yeongdoDay.weatherBackup.ticketLabel,
    },
    {
      title: "Arte Museum Busan",
      nameKo: "아르떼뮤지엄 부산",
      address: "부산 영도구 해양로247번길 29",
      ticketLabel: "雨天備案・另外購票",
    },
  );
});

test("the September 2 lunch is Badamaru Abalone Porridge near Busan Station", () => {
  const yeongdoDay = tripDays.find((day) => day.date === "9/2");
  const lunch = yeongdoDay.lunch[0];

  assert.deepEqual(
    { title: lunch.title, nameKo: lunch.place.nameKo, address: lunch.place.address },
    {
      title: "大海鮑魚粥・釜山站直營店",
      nameKo: "바다마루전복죽 부산역 직영점",
      address: "부산 동구 중앙대로226번길 3-7 1층",
    },
  );
});

test("notes-card grid styling is scoped to direct rows", () => {
  const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

  assert.match(styles, /\.notes-card\s*>\s*div\s*\{/);
  assert.doesNotMatch(styles, /\.notes-card\s+div\s*\{/);
});

test("daily editorial headlines stay on one line with responsive type", () => {
  const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  const headingRule = styles.match(/\.day-heading h2\s*\{([^}]*)\}/)?.[1] ?? "";

  assert.match(headingRule, /white-space:\s*nowrap/);
  assert.match(headingRule, /clamp\(/);
});

test("the return day sends all four travelers in one charter before two flights", () => {
  const returnDay = tripDays.find((day) => day.date === "9/5");

  assert.deepEqual(
    returnDay.events.map(({ time, title, travelers }) => [time, title, travelers ?? null]),
    [
      ["06:45", "四人共同搭包車", 4],
      ["07:30", "抵達金海機場", 4],
      ["10:00", "第一組起飛", 2],
      ["10:30", "第二組起飛", 2],
    ],
  );
});

test("September 1 offers all three Haeundae pork-soup restaurants with separate addresses", () => {
  const haeundaeDay = tripDays.find((day) => day.date === "9/1");

  assert.deepEqual(
    haeundaeDay.lunch.map(({ title, place }) => [title, place.nameKo, place.address]),
    [
      ["海雲台五福豬肉湯飯", "해운대 오복돼지국밥", "부산 해운대구 구남로 15 1층"],
      ["엄용백 豬肉湯飯・海雲台店", "엄용백 돼지국밥 해운대점", "부산 해운대구 구남로24번길 39 1층"],
      ["水邊最高豬肉湯飯 海雲臺店", "수변최고돼지국밥 해운대점", "부산 해운대구 구남로 39"],
    ],
  );
});

test("Old Mansion uses the verified Jeonpo address", () => {
  const jeonpoDay = tripDays.find((day) => day.date === "9/2");
  const oldMansion = jeonpoDay.dinner.find(({ title }) => title.includes("Old Mansion"));

  assert.equal(oldMansion.place.address, "부산 부산진구 전포대로209번길 17-6 1층");
});

test("optional shopping reminders sit under the nearest itinerary destinations", () => {
  const haeundaeDay = tripDays.find((day) => day.date === "9/1");
  const nampoDay = tripDays.find((day) => day.date === "8/31");
  const seomyeonDay = tripDays.find((day) => day.date === "9/2");
  const mipoReturn = haeundaeDay.events.find(({ title }) => title === "海岸列車回程");
  const nampoStop = nampoDay.events.find(({ title }) => title === "富平罐頭市場");
  const seomyeonStop = seomyeonDay.events.find(({ title }) => title === "西面市區");

  assert.deepEqual(mipoReturn.nearby.map(({ name }) => name), ["老虎冰淇淋大福"]);
  assert.equal(mipoReturn.nearby[0].place.nameKo, "호랑이젤라떡 해운대본점");
  assert.deepEqual(nampoStop.nearby.map(({ name }) => name), ["ept Busan Gwangbok", "永一寢具"]);
  assert.equal(nampoStop.nearby[1].place.nameKo, "영일침구");
  assert.deepEqual(seomyeonStop.nearby.map(({ name }) => name), ["KASINA 田浦", "DAISO 釜山西面 1 號店", "SPAO 西面中央店"]);
  for (const shop of [...nampoStop.nearby, ...seomyeonStop.nearby]) {
    assert.match(shop.place.address, /^부산/);
  }
});

test("nearby shopping reminders render names with Google Map only", () => {
  const appSource = readFileSync(new URL("../js/app.mjs", import.meta.url), "utf8");

  assert.match(appSource, /附近順逛・可去可不去/);
  assert.match(appSource, /event\.nearby\.map/);
  assert.match(appSource, /buildGoogleUrl\(shop\.place\)/);
  assert.match(appSource, />Google Map<\/a>/);
  assert.doesNotMatch(appSource, /actions\(shop\.place\)/);
});

test("confirmed Catchtable restaurants include their jump links", () => {
  const restaurants = tripDays.flatMap((day) => [...day.lunch, ...day.dinner]);
  const tonshou = restaurants.find(({ title }) => title.includes("Tonshou"));
  const oldMansion = restaurants.find(({ title }) => title.includes("Old Mansion"));

  assert.equal(tonshou.place.catchtableUrl, "https://app.catchtable.co.kr/ct/shop/tonshou__gwangan");
  assert.match(oldMansion.place.catchtableUrl, /^https:\/\/www\.catchtable\.net\/discovery\//);
});

test("All Sunday is breakfast on September 4 instead of a dinner choice", () => {
  const gwanganDay = tripDays.find((day) => day.date === "9/4");
  const breakfast = gwanganDay.events.find(({ title }) => title === "All Sunday 廣安店");

  assert.equal(breakfast.time, "09:00");
  assert.equal(breakfast.restaurant, true);
  assert.ok(!gwanganDay.dinner.some(({ title }) => title.includes("All Sunday")));
  assert.ok(buildOverviewRows(tripDays).find(({ date }) => date === "9/4").morning.some(({ title }) => title === "All Sunday 廣安店"));
  assert.ok(buildRestaurantChecklist(tripDays).some(({ title }) => title === "All Sunday 廣安店"));
});

test("restaurant checklist deduplicates repeated choices and excludes generic meals", () => {
  const restaurants = buildRestaurantChecklist(tripDays);

  assert.equal(restaurants.length, 14);
  assert.ok(!restaurants.some(({ title }) => title.includes("自由選") || title === "自理"));
  assert.deepEqual(
    restaurants.find(({ title }) => title === "烤肉的男子 廣安里店").dates,
    ["9/1", "9/3", "9/4"],
  );
});

test("attraction checklist excludes lodging and airports and includes the rainy backup", () => {
  const attractions = buildAttractionChecklist(tripDays);

  assert.ok(!attractions.some(({ title }) => title.includes("機場") || title.includes("入住")));
  const arte = attractions.find(({ title }) => title === "Arte Museum Busan");
  assert.equal(arte.backup, true);
  assert.deepEqual(arte.dates, ["9/2"]);
  assert.deepEqual(
    attractions.find(({ title }) => title === "廣安里沙灘散步").dates,
    ["8/30", "9/4"],
  );
});

test("checklist controls use a conventional square checkbox", () => {
  const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  const checkboxRule = styles.match(/\.checklist-check\s*>\s*span\[aria-hidden\]\s*\{([^}]*)\}/)?.[1] ?? "";

  assert.match(checkboxRule, /border-radius:\s*2px/);
});

test("seven-day overview summarizes every day from the itinerary source", () => {
  const rows = buildOverviewRows(tripDays);

  assert.equal(rows.length, 7);
  assert.deepEqual(
    rows.map(({ date, area }) => [date, area]),
    [
      ["8/30", "抵達釜山"],
      ["8/31", "松島・南浦"],
      ["9/1", "海雲台"],
      ["9/2", "影島・西面"],
      ["9/3", "機張"],
      ["9/4", "廣安里"],
      ["9/5", "回程"],
    ],
  );
});

test("overview keeps meal choices and separates fixed commitments", () => {
  const rows = buildOverviewRows(tripDays);
  const haeundae = rows.find(({ date }) => date === "9/1");

  assert.equal(haeundae.lunch.label, "3 選 1");
  assert.deepEqual(haeundae.lunch.items, ["海雲台五福豬肉湯飯", "엄용백 豬肉湯飯・海雲台店", "水邊最高豬肉湯飯 海雲臺店"]);
  assert.deepEqual(haeundae.fixed, ["09:30–10:00 天空膠囊列車"]);
  assert.ok(haeundae.morning.some((entry) => entry.title === "DIART Coffee" && entry.time === "10:20"));
});

test("overview matrix transposes dates into columns and itinerary sections into rows", () => {
  const matrix = buildOverviewMatrix(buildOverviewRows(tripDays));

  assert.deepEqual(matrix.headers, ["項目", "8/30", "8/31", "9/1", "9/2", "9/3", "9/4", "9/5"]);
  assert.deepEqual(matrix.sections.map(({ label }) => label), ["區域", "上午", "午餐", "下午／晚間", "晚餐", "固定事項"]);
  assert.deepEqual(matrix.sections[0].cells, ["抵達釜山", "松島・南浦", "海雲台", "影島・西面", "機張", "廣安里", "回程"]);
});

test("seven-day overview keeps one complete table with horizontal scrolling only", () => {
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  const appSource = readFileSync(new URL("../js/app.mjs", import.meta.url), "utf8");

  assert.match(appSource, /<table class="overview-table">/);
  assert.doesNotMatch(appSource, /<details class="overview-section">/);
  assert.match(css, /\.overview-table-wrap\s*\{[^}]*overflow-x:\s*auto;[^}]*overflow-y:\s*hidden;/s);
  assert.doesNotMatch(css, /\.overview-table-wrap\s*\{[^}]*(?:height|max-height):/s);
});
