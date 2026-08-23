# Busan Mobile Itinerary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first, framework-free Busan itinerary page from the supplied Excel workbook.

**Architecture:** Static HTML loads structured itinerary data and small rendering utilities from ES modules. CSS provides the responsive travel-journal presentation; browser APIs handle address copying and outbound map links.

**Tech Stack:** HTML5, CSS3, vanilla JavaScript ES modules, Node.js built-in test runner.

**Spec:** `docs/superpowers/specs/2026-08-23-busan-mobile-itinerary-design.md`

## Global Constraints

- No React or external runtime dependencies.
- Mobile-first at 390px.
- No parking information.
- Do not deploy before user approval.

---

### Task 1: Data and map helpers

**Files:**
- Create: `tests/utils.test.mjs`
- Create: `js/utils.mjs`
- Create: `js/data.mjs`

**Interfaces:**
- Produces: `buildKakaoUrl(place)`, `buildGoogleUrl(place)`, and `tripDays`.

- [ ] Write failing tests for URL encoding and complete seven-day data.
- [ ] Run `node --test` and confirm the missing-module failure.
- [ ] Implement the helpers and itinerary data.
- [ ] Run `node --test` and confirm all tests pass.

### Task 2: Mobile interface

**Files:**
- Create: `index.html`
- Create: `styles.css`
- Create: `js/app.mjs`

**Interfaces:**
- Consumes: `tripDays`, `buildKakaoUrl(place)`, `buildGoogleUrl(place)`.
- Produces: interactive date navigation, itinerary cards, meal cards, and location actions.

- [ ] Add the semantic page shell and browser smoke assertions.
- [ ] Implement itinerary rendering and event delegation.
- [ ] Apply the sea-breeze travel-journal visual system.
- [ ] Verify at mobile width and fix overflow or readability defects.

### Task 3: Final verification and preview handoff

**Files:**
- Modify only files found defective during verification.

- [ ] Run the complete automated test suite.
- [ ] Test every interactive control in a local browser.
- [ ] Capture a 390px mobile screenshot.
- [ ] Reconcile the implementation against every spec requirement.

