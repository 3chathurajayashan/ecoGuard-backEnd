import assert from "node:assert/strict";

export default async function incidentChecks({ ranger, manager, villager, call, check, section }) {
  section("Incident reporting");

  await check("incident types are public", async () => {
    const r = await call(null, "GET", "/incidents/types");
    assert.equal(r.status, 200);
    assert.equal(r.data.data.length, 6);
    assert.ok(r.data.data.includes("Illegal Snare"));
  });
  await check("a ranger lists their own reports, newest first, with evidence", async () => {
    const r = await call(ranger.token, "GET", "/incidents/my-reports");
    assert.equal(r.status, 200);
    assert.ok(r.data.data.length >= 4);
    assert.ok(r.data.data.every((i) => i.evidence.length >= 1));
    const times = r.data.data.map((i) => new Date(i.createdAt).getTime());
    assert.deepEqual(times, [...times].sort((a, b) => b - a));
  });
  await check("villagers cannot report incidents or read ranger reports (403)", async () => {
    assert.equal((await call(villager.token, "POST", "/incidents", {})).status, 403);
    assert.equal((await call(villager.token, "GET", "/incidents/my-reports")).status, 403);
    assert.equal((await call(villager.token, "GET", "/incidents/map")).status, 403);
  });
  await check("a report without photo evidence is refused", async () => {
    const r = await call(ranger.token, "POST", "/incidents", {
      incidentType: "Illegal Snare",
      description: "A wire snare near the river.",
      latitude: 6.46,
      longitude: 81.52,
    });
    assert.equal(r.status, 400);
    assert.match(r.data.message, /evidence/i);
  });
  await check("the map endpoint gives staff every incident as a GeoJSON point", async () => {
    const r = await call(manager.token, "GET", "/incidents/map");
    assert.equal(r.status, 200);
    assert.ok(r.data.data.length >= 8);
    assert.equal(r.data.data[0].location.type, "Point");
  });

  const clientId = `smoke-${Date.now()}`;
  const queued = {
    clientId,
    incidentType: "Illegal Campsite",
    description: "Abandoned campsite with fire pit near the south ridge.",
    latitude: 6.431,
    longitude: 81.536,
    locationSource: "Automatic GPS",
    severity: "Medium",
  };
  let before;
  await check("offline reports (form values) sync into stored incidents", async () => {
    before = (await call(ranger.token, "GET", "/incidents/my-reports")).data.data.length;
    const r = await call(ranger.token, "POST", "/incidents/sync", { incidents: [queued] });
    assert.equal(r.status, 200);
    assert.equal(r.data.data.successful.length, 1, JSON.stringify(r.data.data.failed));
    assert.equal(r.data.data.successful[0].location.coordinates[0], 81.536);
    assert.equal(r.data.data.successful[0].syncStatus, "Synchronized");
  });
  await check("syncing the same report again does not duplicate it", async () => {
    const r = await call(ranger.token, "POST", "/incidents/sync", { incidents: [queued] });
    assert.equal(r.data.data.successful.length, 1);
    const after = (await call(ranger.token, "GET", "/incidents/my-reports")).data.data.length;
    assert.equal(after, before + 1);
  });
  await check("an invalid queued report is reported as failed, the others still sync", async () => {
    const r = await call(ranger.token, "POST", "/incidents/sync", {
      incidents: [
        { clientId: `${clientId}-bad`, incidentType: "Illegal Snare", description: "short", latitude: 6.3, longitude: 81.5 },
        { clientId: `${clientId}-ok`, incidentType: "Animal Carcase", description: "Carcass of a spotted deer near the tank.", latitude: 6.44, longitude: 81.5 },
      ],
    });
    assert.equal(r.data.data.successful.length, 1);
    assert.equal(r.data.data.failed.length, 1);
    assert.match(r.data.data.failed[0].error, /at least 10 characters/);
  });
  await check("management is notified of a synced incident", async () => {
    const r = await call(manager.token, "GET", "/notifications");
    assert.ok(r.data.data.some((n) => n.type === "Incident Report" && /Illegal Campsite/.test(n.title)));
  });
}
