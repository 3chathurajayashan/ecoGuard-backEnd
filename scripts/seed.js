// Demo data for the dev database (ecoguard_dev). Safe to run repeatedly:
//   npm run seed          adds anything missing
//   npm run seed -- --reset   wipes this app's collections first, then seeds
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

import connectDB from "../config/DB.js";
import Animal from "../Models/Animal.js";
import CommunityReport from "../Models/CommunityReport.js";
import ConflictNotification from "../Models/ConflictNotification.js";
import GPSCollar from "../Models/GPSCollar.js";
import Incident from "../Models/Incident.js";
import Notification from "../Models/Notification.js";
import ResponseAction from "../Models/ResponseAction.js";
import RiskZone from "../Models/RiskZone.js";
import User from "../Models/User.js";
import WildlifeConflictAlert from "../Models/WildlifeConflictAlert.js";
import { seedPatrols } from "./seedPatrols.js";

export const DEMO_PASSWORD = "Eco@12345";

const hoursAgo = (h) => new Date(Date.now() - h * 3600_000);
const daysAgo = (d) => new Date(Date.now() - d * 86400_000);

/** A small square polygon (GeoJSON ring, [lon, lat]) around a centre. */
const square = (lat, lon, half = 0.014) => [
  [
    [lon - half, lat - half],
    [lon + half, lat - half],
    [lon + half, lat + half],
    [lon - half, lat + half],
    [lon - half, lat - half],
  ],
];

const USERS = [
  { firstName: "Kasun", lastName: "Fernando", email: "ranger@ecoguard.lk", role: "RANGER", phoneNumber: "+94771234501" },
  { firstName: "Dilani", lastName: "Jayawardena", email: "ranger2@ecoguard.lk", role: "RANGER", phoneNumber: "+94771234502" },
  { firstName: "Nimal", lastName: "Perera", email: "liaison@ecoguard.lk", role: "COMMUNITY_LIAISON_OFFICER", phoneNumber: "+94771234503" },
  { firstName: "Saman", lastName: "Kumara", email: "manager@ecoguard.lk", role: "PARK_MANAGER", phoneNumber: "+94771234504" },
  { firstName: "Ayesha", lastName: "Silva", email: "researcher@ecoguard.lk", role: "CONSERVATION_RESEARCHER", phoneNumber: "+94771234505" },
  { firstName: "Sirimal", lastName: "Wickrama", email: "villager@ecoguard.lk", role: "VILLAGER", phoneNumber: "+94711234506" },
];

async function seedUsers() {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const out = {};
  for (const u of USERS) {
    out[u.email] =
      (await User.findOne({ email: u.email })) ?? (await User.create({ ...u, password: hash }));
  }
  return out;
}

async function seedConflict(users) {
  const ranger = users["ranger@ecoguard.lk"];
  const ranger2 = users["ranger2@ecoguard.lk"];
  const liaison = users["liaison@ecoguard.lk"];
  const villager = users["villager@ecoguard.lk"];

  // Risk zones (polygons) around Yala National Park
  const zoneDefs = [
    { name: "High-Risk Zone 03", zoneType: "HIGH_RISK_AREA", description: "Near Kumbuk Wewa Village, North Central Province", lat: 6.48, lon: 81.55 },
    { name: "Palatupana Village Border", zoneType: "COMMUNITY_SETTLEMENT", description: "Palatupana village boundary, Hambantota District", lat: 6.42, lon: 81.49 },
    { name: "Tissa Road Corridor", zoneType: "MIGRATION_CORRIDOR", description: "Tissamaharama to Kataragama road crossing", lat: 6.455, lon: 81.51 },
  ];
  const zones = {};
  for (const z of zoneDefs) {
    zones[z.name] =
      (await RiskZone.findOne({ name: z.name })) ??
      (await RiskZone.create({
        name: z.name,
        zoneType: z.zoneType,
        description: z.description,
        boundary: { type: "Polygon", coordinates: square(z.lat, z.lon) },
      }));
  }

  // Animals and their collars (positions are outside every zone, so nothing alerts yet)
  const animalDefs = [
    { identifier: "Elephant E-12", species: "Asian Elephant", riskStatus: "HIGH", lat: 6.52, lon: 81.6 },
    { identifier: "Elephant E-07", species: "Asian Elephant", riskStatus: "MEDIUM", lat: 6.39, lon: 81.44 },
    { identifier: "Leopard L-03", species: "Sri Lankan Leopard", riskStatus: "LOW", lat: 6.37, lon: 81.5 },
  ];
  const animals = {};
  const collars = {};
  for (const a of animalDefs) {
    const animal =
      (await Animal.findOne({ identifier: a.identifier })) ??
      (await Animal.create({ identifier: a.identifier, species: a.species, riskStatus: a.riskStatus }));
    animals[a.identifier] = animal;
    collars[a.identifier] =
      (await GPSCollar.findOne({ animalId: animal._id })) ??
      (await GPSCollar.create({
        animalId: animal._id,
        lastLatitude: a.lat,
        lastLongitude: a.lon,
        lastUpdated: new Date(),
      }));
  }

  if ((await WildlifeConflictAlert.countDocuments()) > 0) return { zones, animals, collars };

  // 1) A new alert nobody has acknowledged yet: the GPS collar of E-12 entered Zone 03
  const zone03 = zones["High-Risk Zone 03"];
  const alertNew = await WildlifeConflictAlert.create({
    latitude: 6.4805,
    longitude: 81.5498,
    severity: "HIGH",
    description: "Elephant E-12 has entered a configured high-risk zone.",
    detectedBy: "GPS_COLLAR",
    locationName: zone03.description,
    sourceAnimal: animals["Elephant E-12"]._id,
    sourceRiskZone: zone03._id,
    assignedOfficer: ranger._id,
  });
  await GPSCollar.updateOne(
    { _id: collars["Elephant E-12"]._id },
    { lastLatitude: 6.4805, lastLongitude: 81.5498, lastUpdated: new Date() }
  );

  // 2) An alert from a verified community report, acknowledged and in progress
  const report = await CommunityReport.create({
    reportType: "ANIMAL_SIGHTING",
    latitude: 6.422,
    longitude: 81.489,
    description: "Two elephants near the paddy fields, one is breaking the fence.",
    locationName: "Palatupana paddy fields",
    reportedBy: villager._id,
    status: "VERIFIED",
    reviewedBy: liaison._id,
    reviewedAt: hoursAgo(5),
    reportedAt: hoursAgo(5.5),
  });
  const alertProgress = await WildlifeConflictAlert.create({
    latitude: 6.422,
    longitude: 81.489,
    severity: "HIGH",
    status: "IN_PROGRESS",
    description: report.description,
    detectedBy: "COMMUNITY_REPORT",
    locationName: "Palatupana paddy fields",
    sourceReport: report._id,
    sourceRiskZone: zones["Palatupana Village Border"]._id,
    assignedOfficer: ranger2._id,
    acknowledgedBy: ranger2._id,
    acknowledgedAt: hoursAgo(4.5),
    createdAt: hoursAgo(5),
  });
  report.alertId = alertProgress._id;
  await report.save();
  await ResponseAction.create({
    alertId: alertProgress._id,
    actionTaken: "Used noise-making devices and flash lights to guide the elephants back towards the forest.",
    situationAssessment: "Two elephants moving towards farmland. No immediate threat to people at the time of arrival.",
    notes: "Fence repaired temporarily with the village committee.",
    fieldLocation: "Palatupana Village Border",
    status: "IN_PROGRESS",
    syncStatus: "SYNCED",
    performedBy: ranger2._id,
    responseTime: hoursAgo(4),
  });

  // 3) A resolved alert from last week
  const alertDone = await WildlifeConflictAlert.create({
    latitude: 6.4552,
    longitude: 81.5108,
    severity: "MEDIUM",
    status: "RESOLVED",
    description: "Elephant E-07 crossed the Tissa road at dusk.",
    detectedBy: "GPS_COLLAR",
    locationName: "Tissamaharama to Kataragama road crossing",
    sourceAnimal: animals["Elephant E-07"]._id,
    sourceRiskZone: zones["Tissa Road Corridor"]._id,
    assignedOfficer: ranger._id,
    acknowledgedBy: ranger._id,
    acknowledgedAt: daysAgo(6.1),
    closedAt: daysAgo(6),
    closure: { finalStatus: "RESOLVED", resolvedAt: daysAgo(6), remarks: "Elephant moved back into the park. Road reopened.", closedBy: ranger._id },
    createdAt: daysAgo(6.2),
  });
  await ResponseAction.create({
    alertId: alertDone._id,
    actionTaken: "Guided the elephant off the road and held traffic for 20 minutes.",
    situationAssessment: "Single bull elephant standing on the road.",
    fieldLocation: "Tissa Road Corridor",
    status: "COMPLETED",
    syncStatus: "SYNCED",
    performedBy: ranger._id,
    responseTime: daysAgo(6.05),
  });

  // Older resolved alerts so the trend charts span several months
  const history = [
    [14, "MEDIUM", "Elephant E-07", "Tissa Road Corridor"],
    [27, "HIGH", "Elephant E-12", "High-Risk Zone 03"],
    [33, "MEDIUM", "Elephant E-07", "Tissa Road Corridor"],
    [48, "HIGH", "Elephant E-12", "High-Risk Zone 03"],
    [55, "LOW", "Leopard L-03", "Palatupana Village Border"],
    [63, "HIGH", "Elephant E-12", "Palatupana Village Border"],
    [78, "MEDIUM", "Elephant E-07", "High-Risk Zone 03"],
    [92, "HIGH", "Elephant E-12", "High-Risk Zone 03"],
    [104, "MEDIUM", "Elephant E-07", "Tissa Road Corridor"],
    [121, "LOW", "Leopard L-03", "Palatupana Village Border"],
    [140, "MEDIUM", "Elephant E-12", "High-Risk Zone 03"],
  ];
  for (const [d, severity, who, zoneName] of history) {
    const z = zones[zoneName];
    await WildlifeConflictAlert.create({
      latitude: 6.42 + (d % 7) * 0.01,
      longitude: 81.49 + (d % 5) * 0.01,
      severity,
      status: "RESOLVED",
      description: `${who} entered ${zoneName}.`,
      detectedBy: "GPS_COLLAR",
      locationName: z.description,
      sourceAnimal: animals[who]._id,
      sourceRiskZone: z._id,
      assignedOfficer: d % 2 ? ranger._id : ranger2._id,
      acknowledgedBy: d % 2 ? ranger._id : ranger2._id,
      acknowledgedAt: new Date(daysAgo(d).getTime() + (8 + (d % 11)) * 60_000),
      closedAt: new Date(daysAgo(d).getTime() + 3 * 3600_000),
      closure: { finalStatus: "RESOLVED", resolvedAt: new Date(daysAgo(d).getTime() + 3 * 3600_000), remarks: "Animal moved back into the park.", closedBy: ranger._id },
      createdAt: daysAgo(d),
    });
  }

  // Two community reports still waiting for the liaison officer
  await CommunityReport.create({
    reportType: "CROP_DAMAGE",
    latitude: 6.4602,
    longitude: 81.5121,
    description: "Crops damaged overnight behind the temple road.",
    locationName: "Temple road",
    reportedBy: villager._id,
    reportedAt: hoursAgo(1),
  });
  await CommunityReport.create({
    reportType: "ANIMAL_SIGHTING",
    latitude: 6.4815,
    longitude: 81.5528,
    description: "A herd of about five elephants at the edge of the paddy fields.",
    locationName: "Kataragama paddy fields",
    reportedBy: villager._id,
    reportedAt: hoursAgo(0.4),
  });

  // Notifications for the unacknowledged alert
  const notice = (user, title, message, extra = {}) => ({
    recipientRole: user.role,
    recipient: user._id,
    type: "Conflict Alert",
    title,
    message,
    alertId: alertNew._id,
    ...extra,
  });
  await Notification.insertMany([
    notice(ranger, "New wildlife conflict alert", "HIGH risk near Near Kumbuk Wewa Village, North Central Province. Kasun Fernando is the primary responder."),
    notice(liaison, "New wildlife conflict alert", "HIGH risk near Near Kumbuk Wewa Village, North Central Province."),
    notice(users["manager@ecoguard.lk"], "New wildlife conflict alert", "HIGH risk near Near Kumbuk Wewa Village, North Central Province."),
    notice(liaison, "Report needs verification", "Sirimal reported animal sighting near Kataragama paddy fields.", {
      alertId: undefined,
      type: "Community Report",
    }),
  ]);
  await ConflictNotification.insertMany(
    [ranger, liaison].map((u) => ({
      alertId: alertNew._id,
      recipient: u._id,
      message: "New wildlife conflict alert: HIGH risk in High-Risk Zone 03",
      status: "SENT",
      sentAt: new Date(),
    }))
  );

  return { zones, animals, collars };
}

/** Past incidents so the ranger's reports list and the analytics have something to show. */
async function seedIncidents(users) {
  if ((await Incident.countDocuments()) > 0) return;
  const ranger = users["ranger@ecoguard.lk"];
  const ranger2 = users["ranger2@ecoguard.lk"];
  const evidence = (name) => [
    { url: `https://images.unsplash.com/${name}?auto=format&fit=crop&q=60&w=600`, resourceType: "image", publicId: `seed/${name}` },
  ];
  const photos = ["photo-1448375240586-882707db888b", "photo-1441974231531-c6227db76b6e", "photo-1425082661705-1834bfd09dca"];
  const defs = [
    { type: "Illegal Snare", lat: 6.462, lon: 81.521, sev: "High", d: 1, by: ranger, text: "Wire snare found near the river, hidden in vegetation. Looks freshly set." },
    { type: "Animal Carcase", lat: 6.445, lon: 81.498, sev: "Medium", d: 3, by: ranger, text: "Carcass of a spotted deer, signs of natural predation, no human activity seen." },
    { type: "Illegal Campsite", lat: 6.431, lon: 81.536, sev: "Medium", d: 5, by: ranger2, text: "Abandoned campsite with a fire pit and food waste at the south ridge." },
    { type: "Poaching Incident", lat: 6.478, lon: 81.547, sev: "Critical", d: 9, by: ranger2, text: "Gunshot heard and fresh vehicle tracks leading to the northern boundary." },
    { type: "Injured Animal", lat: 6.419, lon: 81.512, sev: "High", d: 14, by: ranger, text: "Injured elephant calf limping near the water hole, herd staying close." },
    { type: "Illegal Snare", lat: 6.466, lon: 81.529, sev: "High", d: 22, by: ranger, text: "Two wire snares along an animal trail close to the village boundary." },
    { type: "Animal Carcase", lat: 6.451, lon: 81.505, sev: "Low", d: 33, by: ranger2, text: "Old carcass of a wild boar, decomposed, cause undetermined." },
    { type: "Poaching Incident", lat: 6.484, lon: 81.556, sev: "High", d: 41, by: ranger, text: "Poachers' camp found with traps and dried meat near the eastern edge." },
    { type: "Illegal Snare", lat: 6.463, lon: 81.523, sev: "High", d: 48, by: ranger2, text: "Wire snare line found along the stream bank near the first ranger post." },
    { type: "Injured Animal", lat: 6.437, lon: 81.5, sev: "Medium", d: 57, by: ranger, text: "Injured sambar deer with a leg wound, veterinary team informed." },
    { type: "Illegal Campsite", lat: 6.433, lon: 81.538, sev: "Low", d: 66, by: ranger2, text: "Remains of a small campsite, no people present, area cleared." },
    { type: "Animal Carcase", lat: 6.479, lon: 81.549, sev: "Medium", d: 75, by: ranger, text: "Fresh elephant carcass near the village fence, cause under investigation." },
    { type: "Poaching Incident", lat: 6.481, lon: 81.551, sev: "Critical", d: 88, by: ranger2, text: "Two armed intruders seen at night near the water hole, left before the team arrived." },
    { type: "Illegal Snare", lat: 6.461, lon: 81.52, sev: "High", d: 97, by: ranger, text: "Three snares removed from the north ridge trail, one still holding a hare." },
    { type: "Injured Animal", lat: 6.42, lon: 81.49, sev: "High", d: 112, by: ranger2, text: "Young elephant with a snare wound around the foot, treated on site." },
    { type: "Illegal Campsite", lat: 6.448, lon: 81.512, sev: "Medium", d: 126, by: ranger, text: "Large illegal campsite with fire pits and cut wood near the river bend." },
    { type: "Animal Carcase", lat: 6.46, lon: 81.518, sev: "Low", d: 139, by: ranger2, text: "Decomposed carcass of a water buffalo, no signs of poaching." },
    { type: "Poaching Incident", lat: 6.477, lon: 81.546, sev: "High", d: 152, by: ranger, text: "Shell casings and blood trail found near the northern boundary road." },
  ];
  for (const [i, d] of defs.entries()) {
    await Incident.create({
      incidentType: d.type,
      description: d.text,
      location: { type: "Point", coordinates: [d.lon, d.lat] },
      locationSource: "Automatic GPS",
      evidence: evidence(photos[i % photos.length]),
      reportedBy: d.by._id,
      severity: d.sev,
      syncStatus: "Synchronized",
      createdAt: daysAgo(d.d),
    });
  }
}

const reset = async () => {
  const names = [
    "wildlifeconflictalerts",
    "responseactions",
    "conflictnotifications",
    "notifications",
    "communityreports",
    "gpscollars",
    "animals",
    "riskzones",
    "incidents",
    "patrolroutes",
    "patrolassignments",
    "patrols",
    "analyticsreports",
    "users",
  ];
  const existing = (await mongoose.connection.db.listCollections().toArray()).map((c) => c.name);
  for (const n of names) if (existing.includes(n)) await mongoose.connection.db.dropCollection(n);
  console.log("Reset: dropped this app's collections in", mongoose.connection.name);
};

const main = async () => {
  await connectDB();
  if (process.argv.includes("--reset")) await reset();
  const users = await seedUsers();
  await seedConflict(users);
  await seedIncidents(users);
  await seedPatrols(users);
  console.log(`Seeded database "${mongoose.connection.name}". Demo password for every account: ${DEMO_PASSWORD}`);
  console.table(USERS.map((u) => ({ role: u.role, email: u.email })));
  await mongoose.disconnect();
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
