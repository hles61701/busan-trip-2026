export function placeQuery(place) {
  return `${place.nameKo} ${place.address}`.trim();
}

export function buildKakaoUrl(place) {
  return `https://map.kakao.com/link/search/${encodeURIComponent(placeQuery(place))}`;
}

export function buildGoogleUrl(place) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeQuery(place))}`;
}

export function buildTimeline(day) {
  const meals = [
    day.lunch?.length ? { time: day.lunchTime ?? "12:00", kind: "lunch", title: "午餐", options: day.lunch } : null,
    day.dinner?.length ? { time: day.dinnerTime ?? "18:30", kind: "dinner", title: "晚餐", options: day.dinner } : null,
  ].filter(Boolean);

  return [...day.events, ...meals].sort((a, b) => a.time.localeCompare(b.time));
}

export function mealDisplayMode(meals) {
  return meals.length > 1 ? "toggle" : "single";
}

function overviewMeal(meals = []) {
  return {
    label: meals.length > 1 ? `${meals.length} 選 1` : meals.length === 1 ? "已安排" : "—",
    items: meals.map(({ title }) => title),
  };
}

function overviewEvent(event) {
  return {
    time: event.endTime ? `${event.time}–${event.endTime}` : event.time,
    title: event.title,
    passGroup: event.passGroup,
    ticketLabel: event.ticketLabel,
  };
}

export function buildOverviewRows(days) {
  return days.map((day) => {
    const events = day.events.map(overviewEvent);
    const fixed = day.events
      .filter((event) => event.fixed || /起飛|包車/.test(event.title))
      .map((event) => `${event.endTime ? `${event.time}–${event.endTime}` : event.time} ${event.title}`);

    return {
      date: day.date,
      weekday: day.weekday,
      area: day.kicker,
      pace: day.pace,
      morning: events.filter(({ time }) => time.slice(0, 5) < "12:00"),
      afternoon: events.filter(({ time }) => time.slice(0, 5) >= "12:00"),
      lunch: overviewMeal(day.lunch),
      dinner: overviewMeal(day.dinner),
      fixed,
    };
  });
}

export function buildOverviewMatrix(rows) {
  return {
    headers: ["項目", ...rows.map(({ date }) => date)],
    sections: [
      { key: "area", label: "區域", cells: rows.map(({ area }) => area) },
      { key: "morning", label: "上午", cells: rows.map(({ morning }) => morning) },
      { key: "lunch", label: "午餐", cells: rows.map(({ lunch }) => lunch) },
      { key: "afternoon", label: "下午／晚間", cells: rows.map(({ afternoon }) => afternoon) },
      { key: "dinner", label: "晚餐", cells: rows.map(({ dinner }) => dinner) },
      { key: "fixed", label: "固定事項", cells: rows.map(({ fixed }) => fixed) },
    ],
  };
}

function mergeChecklistItems(entries) {
  const items = new Map();

  for (const entry of entries) {
    const key = `${entry.place.nameKo}|${entry.place.address}`;
    const existing = items.get(key);
    if (existing) {
      if (!existing.dates.includes(entry.date)) existing.dates.push(entry.date);
      continue;
    }
    items.set(key, {
      id: encodeURIComponent(key),
      title: entry.title,
      place: entry.place,
      dates: [entry.date],
      reservationStatus: entry.reservationStatus,
      passGroup: entry.passGroup,
      ticketLabel: entry.ticketLabel,
      backup: entry.backup ?? false,
    });
  }

  return [...items.values()];
}

export function buildRestaurantChecklist(days) {
  const genericTitles = new Set(["自理", "Outlet 內自由選", "廣安里自由選"]);
  const entries = days.flatMap((day) => [...(day.lunch ?? []), ...(day.dinner ?? [])]
    .filter((meal) => meal.place && !genericTitles.has(meal.title))
    .map((meal) => ({ ...meal, date: day.date })));

  return mergeChecklistItems(entries);
}

export function buildAttractionChecklist(days) {
  const excludedPlaces = new Set(["김해국제공항", "광안 KCC 스위첸 하버뷰"]);
  const entries = days.flatMap((day) => {
    const events = day.events
      .filter((event) => event.place && !excludedPlaces.has(event.place.nameKo))
      .map((event) => ({ ...event, date: day.date }));
    const backup = day.weatherBackup
      ? [{ ...day.weatherBackup, date: day.date, backup: true }]
      : [];
    return [...events, ...backup];
  });

  return mergeChecklistItems(entries);
}
