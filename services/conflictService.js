import Animal from "../Models/Animal.js";
import CommunityReport from "../Models/CommunityReport.js";
import ConflictNotification from "../Models/ConflictNotification.js";
import Notification from "../Models/Notification.js";
import RiskZone from "../Models/RiskZone.js";
import User from "../Models/User.js";
import WildlifeConflictAlert, { CLOSED_STATUSES } from "../Models/WildlifeConflictAlert.js";

const HIGH_RISK_ZONE_TYPES = ["HIGH_RISK_AREA", "COMMUNITY_SETTLEMENT"];
const SEVERITY_ORDER = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const maxSeverity = (a, b) => (SEVERITY_ORDER.indexOf(a) >= SEVERITY_ORDER.indexOf(b) ? a : b);

/** Sends an in-app notification (and a conflict-notification record) to each user. */
export async function notifyUsers(users, { title, message, alertId = null, reportId = null, type = "Conflict Alert" }) {
  const unique = [...new Map(users.filter(Boolean).map((u) => [String(u._id), u])).values()];
  if (!unique.length) return;

  await Notification.insertMany(
    unique.map((user) => ({
      recipientRole: user.role,
      recipient: user._id,
      type,
      title,
      message,
      alertId,
      reportId,
    }))
  );

  if (alertId) {
    await ConflictNotification.insertMany(
      unique.map((user) => ({
        alertId,
        recipient: user._id,
        message: `${title}: ${message}`,
        status: "SENT",
        sentAt: new Date(),
      }))
    );
  }
}

/** The ranger with the fewest open alerts, skipping anyone in `excludeIds`. */
export async function pickRanger(excludeIds = []) {
  const rangers = await User.find({
    role: "RANGER",
    isActive: true,
    _id: { $nin: excludeIds },
  });
  if (!rangers.length) return null;

  const loads = await WildlifeConflictAlert.aggregate([
    { $match: { status: { $nin: CLOSED_STATUSES }, assignedOfficer: { $in: rangers.map((r) => r._id) } } },
    { $group: { _id: "$assignedOfficer", open: { $sum: 1 } } },
  ]);
  const load = new Map(loads.map((l) => [String(l._id), l.open]));
  return [...rangers].sort((a, b) => (load.get(String(a._id)) ?? 0) - (load.get(String(b._id)) ?? 0))[0];
}

/**
 * Creates an alert, assigns the least busy ranger and notifies the people who must respond:
 * the assigned ranger, every liaison officer and every park manager.
 */
export async function raiseAlert({
  latitude,
  longitude,
  severity = "MEDIUM",
  description = "",
  detectedBy = "MANUAL",
  locationName = "",
  sourceAnimal = null,
  sourceRiskZone = null,
  sourceReport = null,
}) {
  const ranger = await pickRanger();

  const alert = await WildlifeConflictAlert.create({
    latitude,
    longitude,
    severity,
    description,
    detectedBy,
    locationName,
    sourceAnimal,
    sourceRiskZone,
    sourceReport,
    assignedOfficer: ranger?._id ?? null,
  });

  const [liaisons, managers] = await Promise.all([
    User.find({ role: "COMMUNITY_LIAISON_OFFICER", isActive: true }),
    User.find({ role: "PARK_MANAGER", isActive: true }),
  ]);

  const place = locationName || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  await notifyUsers([ranger, ...liaisons, ...managers], {
    title: "New wildlife conflict alert",
    message: `${severity} risk near ${place}.${ranger ? ` ${ranger.firstName} ${ranger.lastName} is the primary responder.` : ""}`,
    alertId: alert._id,
  });

  return alert;
}

/**
 * Called after a collar reports a new position. If the animal is inside a risk zone and no open
 * alert exists for that animal and zone, an alert is raised.
 */
export async function evaluateCollarLocation(collar, latitude, longitude) {
  const animal = await Animal.findById(collar.animalId);
  const zones = await RiskZone.findContaining(latitude, longitude);

  if (!zones.length) {
    return { insideZones: [], alert: null, created: false };
  }

  const zone = zones.find((z) => HIGH_RISK_ZONE_TYPES.includes(z.zoneType)) ?? zones[0];

  const existing = await WildlifeConflictAlert.findOne({
    sourceAnimal: collar.animalId,
    sourceRiskZone: zone._id,
    status: { $nin: CLOSED_STATUSES },
  });
  if (existing) {
    return { insideZones: zones, alert: existing, created: false };
  }

  const zoneSeverity = HIGH_RISK_ZONE_TYPES.includes(zone.zoneType) ? "HIGH" : "MEDIUM";
  const severity = maxSeverity(zoneSeverity, animal?.riskStatus ?? "LOW");

  const alert = await raiseAlert({
    latitude,
    longitude,
    severity,
    detectedBy: "GPS_COLLAR",
    locationName: zone.description?.trim() || zone.name,
    description: `${animal?.identifier ?? "A tracked animal"} has entered ${zone.name}.`,
    sourceAnimal: collar.animalId,
    sourceRiskZone: zone._id,
  });

  return { insideZones: zones, alert, created: true };
}

/** A liaison officer verifies (raises an alert) or dismisses (archives) a community report. */
export async function reviewCommunityReport(report, status, reviewer) {
  report.status = status;
  report.reviewedBy = reviewer.id;
  report.reviewedAt = new Date();

  let alert = null;

  if (status === "VERIFIED" && !report.alertId) {
    const zones = await RiskZone.findContaining(report.latitude, report.longitude);
    const zone = zones.find((z) => HIGH_RISK_ZONE_TYPES.includes(z.zoneType)) ?? zones[0] ?? null;

    const byType = { HUMAN_INJURY: "CRITICAL", LIVESTOCK_ATTACK: "HIGH" }[report.reportType] ?? "MEDIUM";
    const severity = zone && HIGH_RISK_ZONE_TYPES.includes(zone.zoneType) ? maxSeverity(byType, "HIGH") : byType;

    alert = await raiseAlert({
      latitude: report.latitude,
      longitude: report.longitude,
      severity,
      detectedBy: "COMMUNITY_REPORT",
      locationName: report.locationName || zone?.description?.trim() || zone?.name || "",
      description: report.description,
      sourceReport: report._id,
      sourceRiskZone: zone?._id ?? null,
    });
    report.alertId = alert._id;
  }

  await report.save();

  if (report.reportedBy) {
    const reporter = await User.findById(report.reportedBy);
    await notifyUsers([reporter], {
      title: status === "VERIFIED" ? "Your report was verified" : "Your report was reviewed",
      message:
        status === "VERIFIED"
          ? "Rangers have been alerted. Thank you for reporting."
          : status === "DISMISSED"
            ? "Your report could not be confirmed, so no alert was raised."
            : `Your report is now ${status.toLowerCase().replace(/_/g, " ")}.`,
      reportId: report._id,
      type: "Community Report",
    });
  }

  return { report, alert };
}

/** The primary officer cannot be reached: hand the alert to the next available ranger. */
export async function rerouteAlert(alert, actor) {
  if (alert.assignedOfficer && !alert.unreachableOfficers.some((id) => String(id) === String(alert.assignedOfficer))) {
    alert.unreachableOfficers.push(alert.assignedOfficer);
  }

  let next = await pickRanger(alert.unreachableOfficers);
  if (!next) {
    next = await User.findOne({
      role: "COMMUNITY_LIAISON_OFFICER",
      isActive: true,
      _id: { $nin: alert.unreachableOfficers },
    });
  }

  alert.assignedOfficer = next?._id ?? null;
  await alert.save();

  if (next) {
    await notifyUsers([next], {
      title: "Alert re-routed to you",
      message: "The primary officer could not be reached. Please acknowledge this alert.",
      alertId: alert._id,
    });
  }
  const managers = await User.find({ role: "PARK_MANAGER", isActive: true });
  await notifyUsers(managers, {
    title: "Alert re-routed",
    message: next
      ? `${actor.firstName ?? "An officer"} re-routed an alert to ${next.firstName} ${next.lastName}.`
      : "An alert has no reachable officer left.",
    alertId: alert._id,
  });

  return { alert, next };
}

/** Everyone involved hears when an alert is closed. */
export async function notifyClosed(alert, actorId) {
  const recipients = await User.find({
    isActive: true,
    $or: [
      { role: { $in: ["COMMUNITY_LIAISON_OFFICER", "PARK_MANAGER"] } },
      { _id: alert.assignedOfficer },
    ],
  });
  await notifyUsers(
    recipients.filter((u) => String(u._id) !== String(actorId)),
    {
      title: "Conflict alert closed",
      message: `An alert near ${alert.locationName || "the reported location"} was closed as ${alert.status.replace(/_/g, " ").toLowerCase()}.`,
      alertId: alert._id,
    }
  );
}
