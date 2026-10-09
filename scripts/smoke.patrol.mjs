import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

export default async function patrolChecks({ ranger, ranger2, manager, researcher, villager, call, check, section }) {
  section("Patrols: assignment, tracking and sync");

  let assignment;
  await check("a ranger sees their assigned route with its map points", async () => {
    const r = await call(ranger.token, "GET", "/patrol-assignments/mine");
    assert.equal(r.status, 200);
    assignment = r.data.assignment;
    assert.equal(assignment.route.name, "North Ridge Trail");
    assert.equal(assignment.route.expectedWaypoints, 5);
    assert.equal(assignment.route.distanceKm, 12.4);
    assert.equal(assignment.status, "ASSIGNED");
  });
  await check("villagers cannot read patrol routes (403)", async () => {
    assert.equal((await call(villager.token, "GET", "/patrol-routes")).status, 403);
  });
  await check("rangers cannot create routes or assignments (403)", async () => {
    assert.equal((await call(ranger.token, "POST", "/patrol-routes", {})).status, 403);
    assert.equal((await call(ranger.token, "POST", "/patrol-assignments", {})).status, 403);
  });
  await check("a manager cannot start a patrol (403)", async () => {
    assert.equal((await call(manager.token, "POST", "/patrols/start", {})).status, 403);
  });

  let newRoute;
  await check("the manager plans a route (validation lists every problem)", async () => {
    const bad = await call(manager.token, "POST", "/patrol-routes", { name: "", startPoint: { latitude: 200 } });
    assert.equal(bad.status, 400);
    assert.ok(bad.data.errors.length >= 3);
    const ok = await call(manager.token, "POST", "/patrol-routes", {
      name: `Smoke Trail ${Date.now()}`,
      parkName: "Yala National Park",
      startPoint: { name: "Gate", latitude: 6.40, longitude: 81.41 },
      endPoint: { name: "Tank", latitude: 6.42, longitude: 81.43 },
      distanceKm: 3.1,
      estimatedDurationMinutes: 70,
      routePoints: [
        { name: "Gate", latitude: 6.40, longitude: 81.41 },
        { name: "Tank", latitude: 6.42, longitude: 81.43 },
      ],
    });
    assert.equal(ok.status, 201);
    newRoute = ok.data.route;
    assert.equal(newRoute.expectedWaypoints, 2);
  });

  let ranger2Assignment;
  await check("the manager assigns it and the ranger is notified", async () => {
    // first finish ranger2's seeded assignment so the new one becomes their current route
    const seeded = (await call(ranger2.token, "GET", "/patrol-assignments/mine")).data.assignment;
    assert.ok(seeded);
    const r = await call(manager.token, "POST", "/patrol-assignments", {
      rangerId: ranger2.user.id,
      routeId: newRoute._id,
    });
    assert.equal(r.status, 201);
    ranger2Assignment = r.data.assignment;
    const inbox = await call(ranger2.token, "GET", "/notifications");
    assert.ok(inbox.data.data.some((n) => n.title === "New patrol assigned"));
    const mine = await call(ranger2.token, "GET", "/patrol-assignments/mine");
    assert.equal(mine.data.assignment._id, ranger2Assignment._id, "newest assignment is the current one");
  });
  await check("assigning to a non-ranger or unknown route is refused", async () => {
    assert.equal((await call(manager.token, "POST", "/patrol-assignments", { rangerId: villager.user.id, routeId: newRoute._id })).status, 404);
    assert.equal((await call(manager.token, "POST", "/patrol-assignments", { rangerId: ranger2.user.id, routeId: "nope" })).status, 400);
  });

  const patrolId = randomUUID();
  const t0 = Date.now() - 70 * 60_000;
  const auto = (lat, lon, minutes) => ({
    waypointId: randomUUID(),
    latitude: lat,
    longitude: lon,
    altitude: 38,
    timestamp: new Date(t0 + minutes * 60_000).toISOString(),
    type: "AUTOMATIC",
  });

  await check("starting a patrol records it and marks the assignment in progress", async () => {
    const r = await call(ranger2.token, "POST", "/patrols/start", {
      patrolId,
      assignmentId: ranger2Assignment._id,
      startTime: new Date(t0).toISOString(),
      latitude: 6.40,
      longitude: 81.41,
    });
    assert.equal(r.status, 201);
    assert.equal(r.data.patrol.status, "IN_PROGRESS");
    const mine = await call(ranger2.token, "GET", "/patrol-assignments/mine");
    assert.equal(mine.data.assignment.status, "IN_PROGRESS");
  });
  await check("another ranger cannot start a patrol on this assignment (403)", async () => {
    const r = await call(ranger.token, "POST", "/patrols/start", { patrolId: randomUUID(), assignmentId: ranger2Assignment._id });
    assert.equal(r.status, 403);
  });
  const live = auto(6.41, 81.42, 30);
  await check("live GPS points are added once, duplicates ignored", async () => {
    const first = await call(ranger2.token, "POST", `/patrols/${patrolId}/waypoints`, { waypoints: [live] });
    assert.equal(first.status, 200);
    assert.equal(first.data.added, 1);
    const again = await call(ranger2.token, "POST", `/patrols/${patrolId}/waypoints`, { waypoints: [live] });
    assert.equal(again.data.added, 0);
  });
  await check("a manual waypoint needs a description; bad coordinates are refused", async () => {
    const noDesc = await call(ranger2.token, "POST", `/patrols/${patrolId}/waypoints`, {
      waypoints: [{ ...auto(6.41, 81.42, 31), type: "MANUAL", description: "  " }],
    });
    assert.equal(noDesc.status, 400);
    assert.match(noDesc.data.errors.join(" "), /description is required/);
    const badLat = await call(ranger2.token, "POST", `/patrols/${patrolId}/waypoints`, { waypoints: [auto(95, 81.42, 31)] });
    assert.equal(badLat.status, 400);
  });

  const manual = {
    ...auto(6.412, 81.424, 40),
    type: "MANUAL",
    category: "Animal Sighting",
    description: "Elephant tracks near the tank (GPS unavailable)",
  };
  const finished = {
    patrolId,
    assignmentId: ranger2Assignment._id,
    startTime: new Date(t0).toISOString(),
    endTime: new Date(t0 + 70 * 60_000).toISOString(),
    status: "COMPLETED",
    syncStatus: "PENDING_SYNC",
    totalDistance: 3.4,
    waypoints: [auto(6.40, 81.41, 0), live, manual, auto(6.42, 81.43, 68)],
  };
  await check("only COMPLETED patrols can be synchronised", async () => {
    const r = await call(ranger2.token, "POST", "/patrols/sync", { ...finished, status: "IN_PROGRESS" });
    assert.equal(r.status, 400);
  });
  await check("end before start is refused", async () => {
    const r = await call(ranger2.token, "POST", "/patrols/sync", { ...finished, endTime: new Date(t0 - 1000).toISOString() });
    assert.equal(r.status, 400);
  });
  await check("a ranger cannot sync a patrol onto someone else's assignment (403)", async () => {
    const r = await call(ranger.token, "POST", "/patrols/sync", { ...finished, patrolId: randomUUID() });
    assert.equal(r.status, 403);
  });
  await check("sync stores the patrol with full route coverage", async () => {
    const r = await call(ranger2.token, "POST", "/patrols/sync", finished);
    assert.equal(r.status, 200);
    assert.equal(r.data.result, "SYNCED");
    assert.equal(r.data.coverage.coveragePercentage, 100);
    assert.equal(r.data.coverage.neglectedPoints.length, 0);
  });
  await check("sending the same patrol again does not duplicate it", async () => {
    const beforeRes = await call(manager.token, "GET", "/patrols");
    assert.equal(beforeRes.status, 200);
    const before = beforeRes.data.count;
    assert.equal(typeof before, "number");
    const r = await call(ranger2.token, "POST", "/patrols/sync", finished);
    assert.equal(r.status, 200);
    const after = await call(manager.token, "GET", "/patrols");
    assert.equal(after.data.count, before);
    assert.equal(after.data.patrols.filter((p) => p.patrolId === patrolId).length, 1);
  });
  await check("the finished assignment is no longer the ranger's current route", async () => {
    const mine = await call(ranger2.token, "GET", "/patrol-assignments/mine");
    // the seeded Forest Ridge assignment is still open, the smoke one is done
    assert.notEqual(mine.data.assignment?._id, ranger2Assignment._id);
  });
  await check("the manager is told the patrol finished", async () => {
    const inbox = await call(manager.token, "GET", "/notifications");
    assert.ok(inbox.data.data.some((n) => n.title === "Patrol completed" && /Smoke Trail/.test(n.message)));
  });
  await check("the stored patrol keeps the manual waypoint and its category", async () => {
    const list = await call(manager.token, "GET", "/patrols");
    const p = list.data.patrols.find((x) => x.patrolId === patrolId);
    assert.ok(p);
    assert.equal(p.waypoints.length, 4);
    const m = p.waypoints.find((w) => w.type === "MANUAL");
    assert.equal(m.category, "Animal Sighting");
    assert.equal(p.syncStatus, "SYNCED");
  });
  await check("a ranger lists only their own patrols; researchers see all", async () => {
    const mine = await call(ranger.token, "GET", "/patrols");
    assert.ok(mine.data.patrols.every((p) => p.ranger._id === ranger.user.id));
    const all = await call(researcher.token, "GET", "/patrols");
    assert.ok(all.data.patrols.some((p) => p.ranger._id === ranger2.user.id));
  });
  await check("coverage report names the points that were missed", async () => {
    const seeded = (await call(manager.token, "GET", "/patrols")).data.patrols.find((p) => p.coveragePercentage < 100);
    assert.ok(seeded, "a seeded patrol with a missed point");
    const r = await call(manager.token, "GET", `/patrols/${seeded.patrolId}/coverage`);
    assert.equal(r.status, 200);
    assert.ok(r.data.neglectedPoints.length >= 1);
    assert.equal(r.data.coveragePercentage, seeded.coveragePercentage);
  });
}
