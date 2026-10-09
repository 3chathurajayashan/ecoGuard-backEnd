import assert from "node:assert/strict";

const BASE = process.env.API_URL || "http://localhost:5001/api";

const download = async (token, path) => {
  const res = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  return { status: res.status, type: res.headers.get("content-type"), disposition: res.headers.get("content-disposition"), buf: Buffer.from(await res.arrayBuffer()) };
};

export default async function analyticsChecks({ ranger, manager, researcher, villager, call, check, section }) {
  section("Analytics and reports");

  await check("field staff and villagers cannot use analytics (403)", async () => {
    assert.equal((await call(ranger.token, "GET", "/analytics/options")).status, 403);
    assert.equal((await call(villager.token, "GET", "/analytics/overview")).status, 403);
    assert.equal((await call(null, "POST", "/analytics/analyze", {})).status, 401);
  });
  await check("criteria form options are served", async () => {
    const r = await call(researcher.token, "GET", "/analytics/options");
    assert.equal(r.status, 200);
    assert.deepEqual(r.data.parks, ["Yala National Park"]);
    assert.ok(r.data.periods.some((p) => p.value === "3m" && p.label === "Last 3 Months"));
    assert.deepEqual(r.data.categories.map((c) => c.value), ["hotspots", "coverage", "conflict"]);
    assert.deepEqual(r.data.formats, ["PDF", "CSV", "XLSX"]);
  });
  await check("invalid criteria are rejected with every problem listed", async () => {
    const r = await call(researcher.token, "POST", "/analytics/analyze", { park: "Nowhere", period: "9y", categories: [] });
    assert.equal(r.status, 400);
    assert.equal(r.data.errors.length, 3);
  });

  let results;
  await check("analysis returns statistics, hotspots, coverage and conflict trends", async () => {
    const r = await call(researcher.token, "POST", "/analytics/analyze", { period: "3m" });
    assert.equal(r.status, 200);
    results = r.data.results;
    assert.equal(results.criteria.periodLabel, "Last 3 Months");
    const s = results.incidentStatistics;
    assert.ok(s.total >= 8, `incidents ${s.total}`);
    assert.equal(s.byPeriod.length, 3);
    assert.equal(s.byPeriod.reduce((a, b) => a + b.count, 0), s.total);
    assert.ok(s.byType.length >= 3);
    assert.ok(results.hotspots.hotspots.length >= 1);
    assert.ok(["High", "Medium", "Low"].includes(results.hotspots.hotspots[0].level));
    assert.ok(results.patrolCoverage.patrols >= 4);
    assert.ok(results.patrolCoverage.averageCoverage > 0 && results.patrolCoverage.averageCoverage <= 100);
    assert.ok(results.patrolCoverage.notCoveredPoints >= 1, "a seeded patrol missed a point");
    assert.ok(results.conflictTrends.total >= 10);
    assert.equal(results.conflictTrends.byPeriod.length, 3);
  });
  await check("monthly bucket counts add up to the totals", async () => {
    assert.equal(results.conflictTrends.byPeriod.reduce((a, b) => a + b.count, 0), results.conflictTrends.total);
  });
  await check("a one-month analysis is bucketed by week", async () => {
    const r = await call(manager.token, "POST", "/analytics/analyze", { period: "1m" });
    assert.ok(r.data.results.incidentStatistics.byPeriod.every((b) => /^Wk \d$/.test(b.label)));
  });
  await check("only the chosen categories are analysed", async () => {
    const r = await call(manager.token, "POST", "/analytics/analyze", { categories: ["coverage"] });
    assert.ok(r.data.results.patrolCoverage);
    assert.equal(r.data.results.hotspots, undefined);
    assert.equal(r.data.results.conflictTrends, undefined);
  });
  await check("the manager dashboard overview has counts and recent updates", async () => {
    const r = await call(manager.token, "GET", "/analytics/overview");
    assert.equal(r.status, 200);
    assert.equal(typeof r.data.openAlerts, "number");
    assert.ok(r.data.updates.length >= 3);
    assert.ok(r.data.updates.every((u) => u.text && u.at));
  });

  let report;
  await check("generating a report stores a snapshot", async () => {
    const r = await call(researcher.token, "POST", "/analytics/reports", { criteria: { period: "3m" } });
    assert.equal(r.status, 201);
    report = r.data.report;
    assert.equal(report.status, "GENERATED");
    assert.equal(report.title, "Statistical Conservation Report");
    assert.ok(report.results.incidentStatistics.total >= 8);
  });
  await check("the report list leaves out the heavy results", async () => {
    const r = await call(manager.token, "GET", "/analytics/reports");
    assert.ok(r.data.reports.some((x) => x._id === report._id));
    assert.ok(r.data.reports.every((x) => x.results === undefined));
  });
  await check("updating a report re-runs it with the new criteria", async () => {
    const r = await call(researcher.token, "PUT", `/analytics/reports/${report._id}`, { criteria: { period: "6m" } });
    assert.equal(r.status, 200);
    assert.equal(r.data.report.status, "UPDATED");
    assert.equal(r.data.report.results.criteria.period, "6m");
    assert.equal(r.data.report.results.incidentStatistics.byPeriod.length, 6);
    assert.ok(r.data.report.lastUpdatedAt);
  });

  await check("PDF export is a real PDF file", async () => {
    const f = await download(researcher.token, `/analytics/reports/${report._id}/export?format=PDF`);
    assert.equal(f.status, 200);
    assert.match(f.type, /application\/pdf/);
    assert.match(f.disposition, /Statistical_Conservation_Report\.pdf/);
    assert.equal(f.buf.subarray(0, 5).toString(), "%PDF-");
    assert.match(f.buf.subarray(-6).toString(), /%%EOF/);
    assert.ok(f.buf.length > 1500);
  });
  await check("CSV export has the report sections", async () => {
    const f = await download(manager.token, `/analytics/reports/${report._id}/export?format=csv`);
    assert.equal(f.status, 200);
    const text = f.buf.toString("utf8");
    for (const h of ["Incident Statistics", "Hotspot Findings", "Patrol Coverage Summary", "Human-Wildlife Conflict Trends"]) {
      assert.ok(text.includes(h), `missing ${h}`);
    }
  });
  await check("Excel export is a zip containing a worksheet", async () => {
    const f = await download(manager.token, `/analytics/reports/${report._id}/export?format=XLSX`);
    assert.equal(f.status, 200);
    assert.match(f.type, /spreadsheetml\.sheet/);
    assert.equal(f.buf.subarray(0, 2).toString(), "PK");
    assert.ok(f.buf.includes(Buffer.from("xl/worksheets/sheet1.xml")));
  });
  await check("an unknown export format is refused", async () => {
    assert.equal((await download(manager.token, `/analytics/reports/${report._id}/export?format=DOCX`)).status, 400);
  });
  await check("export is recorded on the report", async () => {
    const r = await call(manager.token, "GET", `/analytics/reports/${report._id}`);
    assert.equal(r.data.report.lastExport.format, "XLSX");
  });
}
