import 'dotenv/config';
import { AssignmentStatus } from './domain/enums.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { AssignmentModel } from './models/AssignmentModel.js';
import { RouteModel } from './models/RouteModel.js';
import { UserModel } from './models/UserModel.js';

const ranger = {
  userId: 'c9b84b3a-48eb-4f32-92e6-1dbba9a5f001',
  name: 'Asha Ranger',
  role: 'RANGER',
};
const parkManager = {
  userId: '2f066090-4a1f-42ce-9a5b-6f3a7c7d1002',
  name: 'Kiran Park Manager',
  role: 'PARK_MANAGER',
};
const routeRecords = [
  {
    routeId: '7fa42db7-89e1-49ba-8bc7-bb4ddb3c2001',
    routeName: 'River Boundary Patrol',
    startPoint: 'North Ranger Station',
    endPoint: 'River Crossing',
    distance: 8.4,
    estimatedDuration: 180,
    expectedWaypoints: 3,
    routePoints: [
      { latitude: 7.8731, longitude: 80.7718 },
      { latitude: 7.875, longitude: 80.775 },
      { latitude: 7.878, longitude: 80.779 },
    ],
  },
  {
    routeId: 'd50f2e04-5868-4c56-a0ab-67d4e8062002',
    routeName: 'Forest Ridge Patrol',
    startPoint: 'Eastern Gate',
    endPoint: 'Lookout Point',
    distance: 5.2,
    estimatedDuration: 120,
    expectedWaypoints: 2,
    routePoints: [
      { latitude: 7.91, longitude: 80.81 },
      { latitude: 7.914, longitude: 80.816 },
    ],
  },
];
const assignmentId = 'eb931813-178e-4974-b504-58c4ab4b3001';

try {
  await connectDatabase();
  await Promise.all([
    UserModel.updateOne(
      { userId: ranger.userId },
      { $set: ranger },
      { upsert: true, runValidators: true },
    ),
    UserModel.updateOne(
      { userId: parkManager.userId },
      { $set: parkManager },
      { upsert: true, runValidators: true },
    ),
    ...routeRecords.map((route) =>
      RouteModel.updateOne(
        { routeId: route.routeId },
        { $set: route },
        { upsert: true, runValidators: true },
      ),
    ),
  ]);
  await AssignmentModel.updateOne(
    { assignmentId },
    {
      $set: {
        assignmentId,
        rangerId: ranger.userId,
        routeId: routeRecords[0].routeId,
        assignedDate: new Date('2025-01-01T08:00:00.000Z'),
        status: AssignmentStatus.ASSIGNED,
      },
    },
    { upsert: true, runValidators: true },
  );
  console.info(
    JSON.stringify(
      {
        rangerId: ranger.userId,
        parkManagerId: parkManager.userId,
        routeIds: routeRecords.map((route) => route.routeId),
        assignmentId,
      },
      null,
      2,
    ),
  );
} finally {
  await disconnectDatabase();
}
