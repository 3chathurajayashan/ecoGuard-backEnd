import { randomUUID } from "node:crypto";

import Patrol from "../Models/Patrol.js";
import PatrolAssignment from "../Models/PatrolAssignment.js";
import PatrolRoute from "../Models/PatrolRoute.js";

const daysAgo = (d) => new Date(Date.now() - d * 86400_000);

// Routes inside Yala National Park. The "North Ridge Trail" matches the patrol wireframes.
const ROUTES = [
  {
    name: "North Ridge Trail",
    parkName: "Yala National Park",
    startPoint: { name: "Ranger Station", latitude: 6.3693, longitude: 81.5188 },
    endPoint: { name: "River Bend", latitude: 6.3881, longitude: 81.5399 },
    distanceKm: 12.4,
    estimatedDurationMinutes: 240,
    routePoints: [
      { name: "Ranger Station", latitude: 6.3693, longitude: 81.5188 },
      { name: "North Ridge Lookout", latitude: 6.3748, longitude: 81.5262 },
      { name: "Elephant Valley", latitude: 6.3801, longitude: 81.5315 },
      { name: "Acacia Plains", latitude: 6.3846, longitude: 81.5358 },
      { name: "River Bend", latitude: 6.3881, longitude: 81.5399 },
    ],
  },
  {
    name: "Forest Ridge Patrol",
    parkName: "Yala National Park",
    startPoint: { name: "Eastern Gate", latitude: 6.3412, longitude: 81.5611 },
    endPoint: { name: "Lookout Point", latitude: 6.3555, longitude: 81.5742 },
    distanceKm: 5.2,
    estimatedDurationMinutes: 120,
    routePoints: [
      { name: "Eastern Gate", latitude: 6.3412, longitude: 81.5611 },
      { name: "Ridge Crossing", latitude: 6.348, longitude: 81.5675 },
      { name: "Lookout Point", latitude: 6.3555, longitude: 81.5742 },
    ],
  },
  {
    name: "River Boundary Patrol",
    parkName: "Yala National Park",
    startPoint: { name: "South Station", latitude: 6.3105, longitude: 81.4912 },
    endPoint: { name: "River Crossing", latitude: 6.3301, longitude: 81.5088 },
    distanceKm: 8.4,
    estimatedDurationMinutes: 180,
    routePoints: [
      { name: "South Station", latitude: 6.3105, longitude: 81.4912 },
      { name: "Old Bridge", latitude: 6.3198, longitude: 81.5001 },
      { name: "River Crossing", latitude: 6.3301, longitude: 81.5088 },
    ],
  },
];

/** Waypoints along a route, a little off the line, so coverage is realistic. */
const walk = (route, start, missLast = false) => {
  const points = missLast ? route.routePoints.slice(0, -1) : route.routePoints;
  return points.map((p, i) => ({
    waypointId: randomUUID(),
    latitude: p.latitude + 0.0001,
    longitude: p.longitude - 0.0001,
    altitude: 40 + i * 3,
    timestamp: new Date(start.getTime() + i * 35 * 60_000),
    type: "AUTOMATIC",
    category: "",
    description: "",
  }));
};

export async function seedPatrols(users) {
  const manager = users["manager@ecoguard.lk"];
  const ranger = users["ranger@ecoguard.lk"];
  const ranger2 = users["ranger2@ecoguard.lk"];

  const routes = {};
  for (const r of ROUTES) {
    routes[r.name] =
      (await PatrolRoute.findOne({ name: r.name })) ?? (await PatrolRoute.create({ ...r, createdBy: manager._id }));
  }

  if ((await PatrolAssignment.countDocuments()) > 0) return;

  // Past, finished patrols (these feed the analytics coverage figures)
  const past = [
    { ranger, route: routes["North Ridge Trail"], daysAgo: 20, miss: false },
    { ranger: ranger2, route: routes["Forest Ridge Patrol"], daysAgo: 12, miss: true },
    { ranger, route: routes["River Boundary Patrol"], daysAgo: 6, miss: false },
    { ranger: ranger2, route: routes["North Ridge Trail"], daysAgo: 3, miss: true },
  ];
  for (const p of past) {
    const assignment = await PatrolAssignment.create({
      ranger: p.ranger._id,
      route: p.route._id,
      assignedBy: manager._id,
      assignedDate: daysAgo(p.daysAgo + 1),
      status: "COMPLETED",
    });
    const start = daysAgo(p.daysAgo);
    const waypoints = walk(p.route, start, p.miss);
    const covered = p.route.routePoints.length - (p.miss ? 1 : 0);
    await Patrol.create({
      patrolId: randomUUID(),
      assignment: assignment._id,
      ranger: p.ranger._id,
      route: p.route._id,
      startTime: start,
      endTime: new Date(start.getTime() + p.route.estimatedDurationMinutes * 60_000),
      status: "COMPLETED",
      syncStatus: "SYNCED",
      totalDistance: p.route.distanceKm,
      waypoints,
      coveragePercentage: Math.round((covered / p.route.routePoints.length) * 1000) / 10,
    });
  }

  // Today's open assignments: the rangers see these on their home screen
  await PatrolAssignment.create({
    ranger: ranger._id,
    route: routes["North Ridge Trail"]._id,
    assignedBy: manager._id,
    assignedDate: new Date(),
  });
  await PatrolAssignment.create({
    ranger: ranger2._id,
    route: routes["Forest Ridge Patrol"]._id,
    assignedBy: manager._id,
    assignedDate: new Date(),
  });
}
