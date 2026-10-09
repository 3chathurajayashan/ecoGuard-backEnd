// End-to-end API check. Needs the server running and the demo data seeded:
//   npm run seed -- --reset && npm run serve   (then, in another terminal)   npm run smoke
// Every test talks to the real HTTP API as a real signed-in user of the right role.
import assert from "node:assert/strict";

const BASE = process.env.API_URL || "http://localhost:5001/api";
const PASSWORD = "Eco@12345";

const results = [];
const check = async (name, fn) => {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  ok    ${name}`);
  } catch (error) {
    results.push({ name, ok: false, error });
    console.log(`  FAIL  ${name}\n        ${error.message.split("\n")[0]}`);
  }
};

const call = async (token, method, path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON (e.g. a file download)
  }
  return { status: res.status, data, res };
};

const login = async (email) => {
  const { status, data } = await call(null, "POST", "/auth/signin", { email, password: PASSWORD });
  assert.equal(status, 200, `login ${email} -> ${status}`);
  return { token: data.token, user: data.user };
};

export const section = (title) => console.log(`\n${title}`);

const main = async () => {
  const health = await fetch(`${BASE}/health`).catch(() => null);
  if (!health?.ok) {
    console.error(`Backend is not reachable at ${BASE}. Start it with: npm run serve`);
    process.exit(2);
  }

  section("Auth and roles");
  const ranger = await login("ranger@ecoguard.lk");
  const ranger2 = await login("ranger2@ecoguard.lk");
  const liaison = await login("liaison@ecoguard.lk");
  const manager = await login("manager@ecoguard.lk");
  const researcher = await login("researcher@ecoguard.lk");
  const villager = await login("villager@ecoguard.lk");

  await check("wrong password is rejected", async () => {
    const r = await call(null, "POST", "/auth/signin", { email: "ranger@ecoguard.lk", password: "nope-nope" });
    assert.equal(r.status, 401);
  });
  await check("no token -> 401 on a protected route", async () => {
    assert.equal((await call(null, "GET", "/conflict-alerts")).status, 401);
  });
  await check("garbage token -> 401", async () => {
    assert.equal((await call("abc.def.ghi", "GET", "/conflict-alerts")).status, 401);
  });
  await check("/auth/me returns the signed-in user", async () => {
    const r = await call(ranger.token, "GET", "/auth/me");
    assert.equal(r.data.user.email, "ranger@ecoguard.lk");
    assert.equal(r.data.user.role, "RANGER");
  });
  await check("villager cannot list conflict alerts (403)", async () => {
    assert.equal((await call(villager.token, "GET", "/conflict-alerts")).status, 403);
  });
  await check("ranger cannot create risk zones (403)", async () => {
    assert.equal((await call(ranger.token, "POST", "/risk-zones", {})).status, 403);
  });
  await check("researcher cannot acknowledge alerts (403)", async () => {
    const list = await call(researcher.token, "GET", "/conflict-alerts");
    assert.equal(list.status, 200);
    assert.equal((await call(researcher.token, "PATCH", `/conflict-alerts/${list.data.alerts[0]._id}/acknowledge`)).status, 403);
  });
  await check("sign-up creates a villager account that can sign in", async () => {
    const email = `smoke${Date.now()}@test.lk`;
    const up = await call(null, "POST", "/auth/signup", { firstName: "Smoke", lastName: "Test", email, password: PASSWORD, role: "VILLAGER" });
    assert.equal(up.status, 201);
    assert.equal((await call(null, "POST", "/auth/signin", { email, password: PASSWORD })).status, 200);
  });

  section("Conflict alerts: what the screens read");
  let alerts;
  await check("alert list carries every field the screens show", async () => {
    const r = await call(ranger.token, "GET", "/conflict-alerts");
    assert.equal(r.status, 200);
    alerts = r.data.alerts;
    const e12 = alerts.find((a) => a.sourceAnimal?.identifier === "Elephant E-12");
    assert.ok(e12, "seeded Elephant E-12 alert");
    assert.equal(e12.status, "NEW");
    assert.equal(e12.sourceRiskZone.name, "High-Risk Zone 03");
    assert.equal(e12.locationName, "Near Kumbuk Wewa Village, North Central Province");
    assert.equal(e12.detectedBy, "GPS_COLLAR");
    assert.equal(e12.severity, "HIGH");
    assert.equal(e12.assignedOfficer.firstName, "Kasun");
  });
  await check("alert list attaches the latest response", async () => {
    const inProgress = alerts.find((a) => a.status === "IN_PROGRESS");
    assert.ok(inProgress?.latestResponse?.situationAssessment, "response with situation assessment");
  });
  await check("?active=true hides closed alerts", async () => {
    const r = await call(ranger.token, "GET", "/conflict-alerts?active=true");
    assert.ok(r.data.alerts.length > 0);
    assert.ok(r.data.alerts.every((a) => !["RESOLVED", "FALSE_ALERT", "CANCELLED", "CLOSED"].includes(a.status)));
  });
  await check("?mine=true returns only my alerts", async () => {
    const r = await call(ranger.token, "GET", "/conflict-alerts?mine=true");
    assert.ok(r.data.alerts.every((a) => a.assignedOfficer?.email === "ranger@ecoguard.lk"));
  });

  section("GPS collar pings raise alerts automatically");
  const collars = (await call(manager.token, "GET", "/gps-collars")).data.collars;
  const collarOf = (identifier) => collars.find((c) => c.animalId.identifier === identifier);
  let autoAlert;
  await check("ping outside every zone: tracking only, no alert", async () => {
    const r = await call(ranger.token, "PATCH", `/gps-collars/${collarOf("Leopard L-03")._id}/location`, { latitude: 6.54, longitude: 81.62 });
    assert.equal(r.status, 200);
    assert.equal(r.data.alertCreated, false);
    assert.equal(r.data.insideRiskZone, false);
  });
  await check("invalid coordinates are rejected and raise nothing", async () => {
    const r = await call(ranger.token, "PATCH", `/gps-collars/${collarOf("Leopard L-03")._id}/location`, { latitude: 999, longitude: 81.6 });
    assert.equal(r.status, 400);
  });
  await check("ping inside a risk zone raises an alert with a ranger assigned", async () => {
    const r = await call(ranger.token, "PATCH", `/gps-collars/${collarOf("Elephant E-07")._id}/location`, { latitude: 6.4802, longitude: 81.5502 });
    assert.equal(r.status, 200);
    assert.equal(r.data.alertCreated, true);
    autoAlert = r.data.alert;
    assert.equal(autoAlert.detectedBy, "GPS_COLLAR");
    assert.ok(autoAlert.assignedOfficer, "ranger assigned");
    assert.equal(autoAlert.status, "NEW");
  });
  await check("a second ping in the same zone does not duplicate the alert", async () => {
    const r = await call(ranger.token, "PATCH", `/gps-collars/${collarOf("Elephant E-07")._id}/location`, { latitude: 6.4803, longitude: 81.5503 });
    assert.equal(r.data.alertCreated, false);
    assert.equal(r.data.alert._id, autoAlert._id);
  });
  await check("the responders and managers were notified", async () => {
    const mgr = await call(manager.token, "GET", "/notifications");
    assert.ok(mgr.data.data.some((n) => String(n.alertId) === autoAlert._id), "manager notification");
    const lia = await call(liaison.token, "GET", "/notifications");
    assert.ok(lia.data.data.some((n) => String(n.alertId) === autoAlert._id), "liaison notification");
    const vil = await call(villager.token, "GET", "/notifications");
    assert.ok(!vil.data.data.some((n) => String(n.alertId) === autoAlert._id), "villager must not see staff alerts");
  });

  section("Community reports: verify before any alert goes out");
  let report;
  await check("villager submits a sighting", async () => {
    const r = await call(villager.token, "POST", "/community-reports", {
      reportType: "ANIMAL_SIGHTING",
      latitude: 6.4798,
      longitude: 81.5499,
      description: "Elephant eating crops at the edge of the field.",
      locationName: "Kataragama paddy fields",
    });
    assert.equal(r.status, 201);
    report = r.data.report;
    assert.equal(report.status, "PENDING");
  });
  await check("no alert exists until a liaison officer verifies", async () => {
    const r = await call(liaison.token, "GET", "/conflict-alerts");
    assert.ok(!r.data.alerts.some((a) => a.sourceReport?._id === report._id));
  });
  await check("the liaison officer is told a report needs verification", async () => {
    const r = await call(liaison.token, "GET", "/notifications");
    assert.ok(r.data.data.some((n) => String(n.reportId) === report._id && n.type === "Community Report"));
  });
  await check("villager cannot verify reports (403)", async () => {
    assert.equal((await call(villager.token, "PATCH", `/community-reports/${report._id}/status`, { status: "VERIFIED" })).status, 403);
  });
  await check("villagers only see their own reports", async () => {
    const mine = await call(villager.token, "GET", "/community-reports");
    assert.ok(mine.data.reports.length >= 1);
    assert.ok(mine.data.reports.every((x) => x.reportedBy.email === "villager@ecoguard.lk"));
  });
  let verifiedAlert;
  await check("verifying raises an alert linked to the report", async () => {
    const r = await call(liaison.token, "PATCH", `/community-reports/${report._id}/status`, { status: "VERIFIED" });
    assert.equal(r.status, 200);
    verifiedAlert = r.data.alert;
    assert.ok(verifiedAlert, "alert returned");
    assert.equal(verifiedAlert.detectedBy, "COMMUNITY_REPORT");
    assert.equal(verifiedAlert.locationName, "Kataragama paddy fields");
  });
  await check("the villager is told the report was verified", async () => {
    const r = await call(villager.token, "GET", "/notifications");
    assert.ok(r.data.data.some((n) => n.title === "Your report was verified"));
  });
  await check("dismissing a report raises no alert", async () => {
    const created = await call(villager.token, "POST", "/community-reports", {
      reportType: "OTHER", latitude: 6.5, longitude: 81.7, description: "Something moved in the bushes.",
    });
    const before = (await call(liaison.token, "GET", "/conflict-alerts")).data.count;
    const r = await call(liaison.token, "PATCH", `/community-reports/${created.data.report._id}/status`, { status: "DISMISSED" });
    assert.equal(r.status, 200);
    assert.equal(r.data.alert ?? null, null);
    assert.equal((await call(liaison.token, "GET", "/conflict-alerts")).data.count, before);
  });

  section("Ranger response: acknowledge, respond, close");
  const alertId = autoAlert._id;
  await check("a ranger acknowledges the alert", async () => {
    const r = await call(ranger.token, "PATCH", `/conflict-alerts/${alertId}/acknowledge`);
    assert.equal(r.status, 200);
    assert.equal(r.data.alert.status, "ACKNOWLEDGED");
  });
  await check("acknowledging twice is refused", async () => {
    assert.equal((await call(ranger.token, "PATCH", `/conflict-alerts/${alertId}/acknowledge`)).status, 400);
  });
  let responseId;
  await check("the response is saved and moves the alert to IN_PROGRESS", async () => {
    const r = await call(ranger.token, "POST", "/response-actions", {
      alertId,
      situationAssessment: "Bull elephant moving towards farmland.",
      actionTaken: "Guided back to the forest with flash lights.",
      notes: "Fence is damaged on the east side.",
      photos: ["https://example.com/a.jpg"],
      fieldLocation: "High-Risk Zone 03",
      status: "IN_PROGRESS",
    });
    assert.equal(r.status, 201);
    responseId = r.data.responseAction._id;
    assert.equal(r.data.responseAction.performedBy, ranger.user.id);
    const a = await call(ranger.token, "GET", `/conflict-alerts/${alertId}`);
    assert.equal(a.data.alert.status, "IN_PROGRESS");
    assert.equal(a.data.alert.latestResponse.situationAssessment, "Bull elephant moving towards farmland.");
  });
  await check("closing needs a valid final status", async () => {
    assert.equal((await call(ranger.token, "PATCH", `/conflict-alerts/${alertId}/close`, { finalStatus: "BANANA" })).status, 400);
  });
  await check("the closing form is stored with the alert", async () => {
    const r = await call(ranger.token, "PATCH", `/conflict-alerts/${alertId}/close`, {
      finalStatus: "RESOLVED",
      resolvedAt: new Date().toISOString(),
      remarks: "Elephant has moved back to the forest. Area is safe.",
    });
    assert.equal(r.status, 200);
    assert.equal(r.data.alert.status, "RESOLVED");
    assert.equal(r.data.alert.closure.remarks, "Elephant has moved back to the forest. Area is safe.");
    assert.equal(r.data.alert.closure.closedBy, ranger.user.id);
  });
  await check("closing again is refused", async () => {
    assert.equal((await call(ranger.token, "PATCH", `/conflict-alerts/${alertId}/close`, {})).status, 400);
  });
  await check("photo upload needs a file and is for responders only", async () => {
    const empty = await call(ranger.token, "POST", "/response-actions/photos", {});
    assert.equal(empty.status, 400);
    assert.equal((await call(villager.token, "POST", "/response-actions/photos", {})).status, 403);
  });
  await check("response status can be completed", async () => {
    const r = await call(ranger.token, "PATCH", `/response-actions/${responseId}/status`, { status: "COMPLETED" });
    assert.equal(r.status, 200);
  });

  section("Re-routing when the primary officer is unreachable");
  await check("the alert moves to another ranger and the first is remembered", async () => {
    // a fresh alert from the other elephant
    const ping = await call(ranger.token, "PATCH", `/gps-collars/${collarOf("Elephant E-12")._id}/location`, { latitude: 6.4201, longitude: 81.4902 });
    const fresh = ping.data.alert;
    assert.ok(fresh, "alert from collar ping");
    const was = fresh.assignedOfficer;
    const r = await call(liaison.token, "PATCH", `/conflict-alerts/${fresh._id}/reroute`);
    assert.equal(r.status, 200);
    assert.notEqual(String(r.data.alert.assignedOfficer?._id), String(was));
    assert.ok(r.data.alert.unreachableOfficers.map(String).includes(String(was)));
  });

  section("Notifications inbox");
  await check("read-all clears the unread count", async () => {
    assert.equal((await call(liaison.token, "PATCH", "/notifications/read-all")).status, 200);
    const r = await call(liaison.token, "GET", "/notifications");
    assert.equal(r.data.unread, 0);
  });

  return { ranger, ranger2, liaison, manager, researcher, villager, call, check, section };
};

export const run = main;

const failed = async () => {
  const ctx = await main();
  const extra = ["./smoke.patrol.mjs", "./smoke.analytics.mjs", "./smoke.incidents.mjs"];
  for (const file of extra) {
    try {
      const mod = await import(file);
      await mod.default(ctx);
    } catch (error) {
      if (error.code !== "ERR_MODULE_NOT_FOUND") throw error;
    }
  }
  const bad = results.filter((r) => !r.ok);
  console.log(`\n${results.length - bad.length}/${results.length} checks passed`);
  process.exit(bad.length ? 1 : 0);
};

failed().catch((e) => {
  console.error(e);
  process.exit(1);
});
