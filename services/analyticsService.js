import Incident from "../Models/Incident.js";
import Patrol from "../Models/Patrol.js";
import WildlifeConflictAlert, { CLOSED_STATUSES } from "../Models/WildlifeConflictAlert.js";
import CommunityReport from "../Models/CommunityReport.js";
import { distanceMetres } from "../utils/geo.js";

export const PARKS = ["Yala National Park"];

export const PERIODS = {
  "1m": { label: "Last 1 Month", months: 1 },
  "3m": { label: "Last 3 Months", months: 3 },
  "6m": { label: "Last 6 Months", months: 6 },
  "12m": { label: "Last 12 Months", months: 12 },
};

export const CATEGORIES = {
  hotspots: "Incident Hotspots",
  coverage: "Patrol Coverage",
  conflict: "Human-Wildlife Conflict Trends",
};

export class AnalyticsError extends Error {
  constructor(message, errors = []) {
    super(message);
    this.errors = errors;
  }
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY = 86400_000;
const SEVERITY_WEIGHT = { Low: 1, Medium: 2, High: 3, Critical: 4, LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
const round1 = (n) => Math.round(n * 10) / 10;

/** Validates criteria and fills in defaults. Throws AnalyticsError listing every problem. */
export function normalizeCriteria(input = {}) {
  const errors = [];
  const park = input.park || PARKS[0];
  const period = input.period || "3m";
  const categories = input.categories ?? Object.keys(CATEGORIES);
  if (!PARKS.includes(park)) errors.push(`park must be one of: ${PARKS.join(", ")}`);
  if (!PERIODS[period]) errors.push(`period must be one of: ${Object.keys(PERIODS).join(", ")}`);
  if (!Array.isArray(categories) || !categories.length) errors.push("Select at least one analysis category");
  else if (categories.some((c) => !CATEGORIES[c])) errors.push(`categories must be from: ${Object.keys(CATEGORIES).join(", ")}`);
  if (errors.length) throw new AnalyticsError("Request validation failed", errors);
  return { park, period, categories: [...new Set(categories)] };
}

const monthsBack = (date, months) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() - months);
  return d;
};

/** Time buckets for the charts: weekly for one month, monthly otherwise. */
function buckets(from, to, period) {
  const out = [];
  if (period === "1m") {
    const total = Math.ceil((to - from) / DAY / 7);
    for (let i = 0; i < total; i++) {
      out.push({
        label: `Wk ${i + 1}`,
        from: new Date(from.getTime() + i * 7 * DAY),
        to: new Date(Math.min(from.getTime() + (i + 1) * 7 * DAY, to.getTime() + 1)),
      });
    }
    return out;
  }
  const cursor = new Date(to.getFullYear(), to.getMonth(), 1);
  const months = PERIODS[period].months;
  const starts = [];
  for (let i = 0; i < months; i++) {
    starts.unshift(new Date(cursor.getFullYear(), cursor.getMonth() - i, 1));
  }
  for (const s of starts) {
    out.push({ label: MONTHS[s.getMonth()], from: s, to: new Date(s.getFullYear(), s.getMonth() + 1, 1) });
  }
  return out;
}

const bucketCounts = (items, getDate, list) =>
  list.map((b) => ({
    label: b.label,
    count: items.filter((i) => {
      const t = getDate(i).getTime();
      return t >= b.from.getTime() && t < b.to.getTime();
    }).length,
  }));

const pctChange = (now, before) => (before === 0 ? (now > 0 ? 100 : 0) : round1(((now - before) / before) * 100));

async function incidentSection(from, to, previousFrom, list) {
  const [current, previous] = await Promise.all([
    Incident.find({ createdAt: { $gte: from, $lte: to } }).lean(),
    Incident.countDocuments({ createdAt: { $gte: previousFrom, $lt: from } }),
  ]);
  const byType = {};
  const bySeverity = { Low: 0, Medium: 0, High: 0, Critical: 0 };
  for (const i of current) {
    byType[i.incidentType] = (byType[i.incidentType] ?? 0) + 1;
    bySeverity[i.severity] = (bySeverity[i.severity] ?? 0) + 1;
  }
  return {
    current,
    section: {
      total: current.length,
      previousTotal: previous,
      changePercent: pctChange(current.length, previous),
      byType: Object.entries(byType)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count),
      bySeverity: Object.entries(bySeverity).map(([severity, count]) => ({ severity, count })),
      byPeriod: bucketCounts(current, (i) => i.createdAt, list),
    },
  };
}

/** Groups incidents into ~1 km grid cells and rates each cell by weighted count. */
function hotspotSection(incidents) {
  const cells = new Map();
  for (const i of incidents) {
    const [lon, lat] = i.location.coordinates;
    const key = `${Math.round(lat / 0.01)}:${Math.round(lon / 0.01)}`;
    const cell = cells.get(key) ?? { score: 0, count: 0, latSum: 0, lonSum: 0, types: {} };
    cell.score += SEVERITY_WEIGHT[i.severity] ?? 1;
    cell.count += 1;
    cell.latSum += lat;
    cell.lonSum += lon;
    cell.types[i.incidentType] = (cell.types[i.incidentType] ?? 0) + 1;
    cells.set(key, cell);
  }
  const max = Math.max(1, ...[...cells.values()].map((c) => c.score));
  const hotspots = [...cells.values()]
    .map((c) => ({
      latitude: Math.round((c.latSum / c.count) * 1e4) / 1e4,
      longitude: Math.round((c.lonSum / c.count) * 1e4) / 1e4,
      incidents: c.count,
      score: c.score,
      level: c.score / max >= 0.66 ? "High" : c.score / max >= 0.33 ? "Medium" : "Low",
      mainType: Object.entries(c.types).sort((a, b) => b[1] - a[1])[0][0],
    }))
    .sort((a, b) => b.score - a.score);
  return {
    hotspots: hotspots.slice(0, 10),
    points: incidents.map((i) => ({
      latitude: i.location.coordinates[1],
      longitude: i.location.coordinates[0],
      severity: i.severity,
      type: i.incidentType,
    })),
  };
}

async function coverageSection(from, to, park) {
  const patrols = await Patrol.find({ startTime: { $gte: from, $lte: to }, status: "COMPLETED" })
    .populate("route")
    .populate("ranger", "firstName lastName")
    .sort({ startTime: -1 })
    .lean();
  const inPark = patrols.filter((p) => !p.route?.parkName || p.route.parkName === park);

  const perRoute = new Map();
  for (const p of inPark) {
    const key = String(p.route._id);
    const r = perRoute.get(key) ?? { route: p.route, patrols: 0, km: 0, coverageSum: 0, latest: p };
    r.patrols += 1;
    r.km += p.totalDistance;
    r.coverageSum += p.coveragePercentage;
    perRoute.set(key, r);
  }

  // For the map: every route point, covered or not in that route's most recent patrol
  const mapPoints = [];
  for (const r of perRoute.values()) {
    for (const pt of r.route.routePoints) {
      const covered = r.latest.waypoints.some((w) => distanceMetres(pt, w) <= 50);
      mapPoints.push({ route: r.route.name, name: pt.name, latitude: pt.latitude, longitude: pt.longitude, covered });
    }
  }

  const totalKm = inPark.reduce((s, p) => s + p.totalDistance, 0);
  return {
    patrols: inPark.length,
    totalKm: round1(totalKm),
    averageCoverage: inPark.length ? round1(inPark.reduce((s, p) => s + p.coveragePercentage, 0) / inPark.length) : 0,
    routes: [...perRoute.values()]
      .map((r) => ({
        route: r.route.name,
        patrols: r.patrols,
        km: round1(r.km),
        averageCoverage: round1(r.coverageSum / r.patrols),
      }))
      .sort((a, b) => a.averageCoverage - b.averageCoverage),
    mapPoints,
    coveredPoints: mapPoints.filter((p) => p.covered).length,
    notCoveredPoints: mapPoints.filter((p) => !p.covered).length,
  };
}

async function conflictSection(from, to, previousFrom, list) {
  const [alerts, previous, reports] = await Promise.all([
    WildlifeConflictAlert.find({ createdAt: { $gte: from, $lte: to } }).populate("sourceRiskZone", "name").lean(),
    WildlifeConflictAlert.countDocuments({ createdAt: { $gte: previousFrom, $lt: from } }),
    CommunityReport.countDocuments({ reportedAt: { $gte: from, $lte: to } }),
  ]);
  const closed = alerts.filter((a) => CLOSED_STATUSES.includes(a.status));
  const acked = alerts.filter((a) => a.acknowledgedAt);
  const avgResponseMinutes = acked.length
    ? Math.max(0, Math.round(acked.reduce((s, a) => s + (a.acknowledgedAt - a.createdAt) / 60000, 0) / acked.length))
    : 0;

  const zones = {};
  for (const a of alerts) {
    const name = a.sourceRiskZone?.name ?? "Unmapped";
    zones[name] = (zones[name] ?? 0) + 1;
  }
  return {
    total: alerts.length,
    previousTotal: previous,
    changePercent: pctChange(alerts.length, previous),
    byPeriod: bucketCounts(alerts, (a) => a.createdAt, list),
    bySeverity: ["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((severity) => ({
      severity,
      count: alerts.filter((a) => a.severity === severity).length,
    })),
    bySource: [
      { source: "GPS collar", count: alerts.filter((a) => a.detectedBy === "GPS_COLLAR").length },
      { source: "Community report", count: alerts.filter((a) => a.detectedBy === "COMMUNITY_REPORT").length },
      { source: "Manual", count: alerts.filter((a) => a.detectedBy === "MANUAL").length },
    ],
    resolvedPercent: alerts.length ? round1((closed.length / alerts.length) * 100) : 0,
    avgResponseMinutes,
    communityReports: reports,
    topZones: Object.entries(zones)
      .map(([zone, count]) => ({ zone, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
  };
}

/** Runs the analysis the researcher or manager asked for. */
export async function analyze(rawCriteria) {
  const criteria = normalizeCriteria(rawCriteria);
  const to = new Date();
  const months = PERIODS[criteria.period].months;
  const list = buckets(monthsBack(to, months), to, criteria.period);
  // The range starts where the first chart bucket starts, so the buckets add up to the totals.
  const from = list[0].from;
  const previousFrom = new Date(from.getTime() - (to.getTime() - from.getTime()));

  const { current: incidents, section: incidentStatistics } = await incidentSection(from, to, previousFrom, list);

  const results = {
    criteria: { ...criteria, periodLabel: PERIODS[criteria.period].label },
    range: { from, to },
    generatedAt: new Date(),
    incidentStatistics,
  };
  if (criteria.categories.includes("hotspots")) results.hotspots = hotspotSection(incidents);
  if (criteria.categories.includes("coverage")) results.patrolCoverage = await coverageSection(from, to, criteria.park);
  if (criteria.categories.includes("conflict")) results.conflictTrends = await conflictSection(from, to, previousFrom, list);
  return results;
}

/** Counts and the latest activity shown on the manager's dashboard. */
export async function overview() {
  const weekAgo = new Date(Date.now() - 7 * DAY);
  const [openAlerts, newIncidents, patrolsWeek, pendingReports, incidents, patrols, alerts] = await Promise.all([
    WildlifeConflictAlert.countDocuments({ status: { $nin: CLOSED_STATUSES } }),
    Incident.countDocuments({ createdAt: { $gte: weekAgo } }),
    Patrol.countDocuments({ startTime: { $gte: weekAgo } }),
    CommunityReport.countDocuments({ status: { $in: ["PENDING", "UNDER_REVIEW"] } }),
    Incident.find().sort({ createdAt: -1 }).limit(3).lean(),
    Patrol.find({ status: "COMPLETED" }).sort({ endTime: -1 }).limit(2).populate("route", "name").lean(),
    WildlifeConflictAlert.find().sort({ createdAt: -1 }).limit(3).populate("sourceAnimal", "identifier").lean(),
  ]);

  const updates = [
    ...incidents.map((i) => ({ kind: "incident", text: `${i.incidentType} reported`, at: i.createdAt })),
    ...patrols.map((p) => ({ kind: "patrol", text: `Patrol data synchronized: ${p.route?.name ?? "patrol"}`, at: p.endTime ?? p.updatedAt })),
    ...alerts.map((a) => ({
      kind: "alert",
      text: `Collar alert: ${a.sourceAnimal?.identifier ?? "Wildlife conflict"}${a.locationName ? ` near ${a.locationName}` : ""}`,
      at: a.createdAt,
    })),
  ]
    .sort((a, b) => b.at - a.at)
    .slice(0, 6);

  return { openAlerts, newIncidents, patrolsWeek, pendingReports, updates };
}

/** The headline sentences shown on the report. */
export function summaryLines(results) {
  const lines = [];
  const s = results.incidentStatistics;
  lines.push(
    `${s.total} incidents were reported in the ${results.criteria.periodLabel.toLowerCase()}, ${
      s.changePercent >= 0 ? "up" : "down"
    } ${Math.abs(s.changePercent)}% on the previous period.`
  );
  if (results.hotspots?.hotspots.length) {
    const h = results.hotspots.hotspots[0];
    lines.push(`The busiest hotspot is near ${h.latitude}, ${h.longitude} with ${h.incidents} incidents, mostly ${h.mainType.toLowerCase()}.`);
  }
  if (results.patrolCoverage) {
    const c = results.patrolCoverage;
    lines.push(`${c.patrols} patrols covered ${c.totalKm} km with an average route coverage of ${c.averageCoverage}%.`);
  }
  if (results.conflictTrends) {
    const c = results.conflictTrends;
    lines.push(
      `${c.total} human-wildlife conflict alerts were raised (${c.changePercent >= 0 ? "up" : "down"} ${Math.abs(c.changePercent)}%); ${c.resolvedPercent}% are resolved.`
    );
  }
  return lines;
}
