import { AssignmentModel } from '../../models/AssignmentModel.js';
import { RouteModel } from '../../models/RouteModel.js';
import {
  toAssignmentDomain,
  toRouteDomain,
} from '../../mappers/domainMappers.js';

/**
 * Repository: persists assignment references and resolves their route DTO.
 */
export class MongooseAssignmentRepository {
  /**
   * @param {import('mongoose').Model} [model] Mongoose assignment model.
   * @param {import('mongoose').Model} [routeModel] Mongoose route model.
   */
  constructor(model = AssignmentModel, routeModel = RouteModel) {
    this.model = model;
    this.routeModel = routeModel;
  }

  /** @param {object} assignment Domain assignment. @returns {Promise<object>} Saved assignment. */
  async save(assignment) {
    const payload = {
      assignmentId: assignment.assignmentId,
      rangerId: assignment.rangerId,
      routeId: assignment.route.routeId,
      assignedDate: assignment.assignedDate,
      status: assignment.status,
    };
    const document = await this.model
      .findOneAndUpdate(
        { assignmentId: assignment.assignmentId },
        { $set: payload },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        },
      )
      .lean();
    return this.hydrate(document);
  }

  /** @param {string} rangerId Ranger identifier. @returns {Promise<object|null>} Latest assignment. */
  async findLatestByRangerId(rangerId) {
    const document = await this.model
      .findOne({ rangerId })
      .sort({ assignedDate: -1 })
      .lean();
    return document ? this.hydrate(document) : null;
  }

  /** @param {string} assignmentId Assignment identifier. @returns {Promise<object|null>} Assignment. */
  async findById(assignmentId) {
    const document = await this.model.findOne({ assignmentId }).lean();
    return document ? this.hydrate(document) : null;
  }

  /** @param {string} assignmentId Assignment identifier. @param {string} status New status. @returns {Promise<void>} */
  async updateStatus(assignmentId, status) {
    await this.model.updateOne(
      { assignmentId },
      { $set: { status } },
      { runValidators: true },
    );
  }

  /** @param {object} document Plain assignment record. @returns {Promise<object|null>} Hydrated assignment. */
  async hydrate(document) {
    const routeDocument = await this.routeModel
      .findOne({ routeId: document.routeId })
      .lean();
    if (!routeDocument) return null;
    return toAssignmentDomain(document, toRouteDomain(routeDocument));
  }
}
