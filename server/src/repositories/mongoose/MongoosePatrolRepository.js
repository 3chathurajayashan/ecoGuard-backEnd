import { PatrolModel } from '../../models/PatrolModel.js';
import { patrolToDto, toPatrolDomain } from '../../mappers/domainMappers.js';

/**
 * Repository: atomically upserts by the unique patrolId for safe retry syncing.
 */
export class MongoosePatrolRepository {
  /**
   * @param {import('mongoose').Model} [model] Mongoose patrol model.
   */
  constructor(model = PatrolModel) {
    this.model = model;
  }

  /** @param {object} patrol Domain patrol. @returns {Promise<object>} Upserted domain patrol. */
  async upsertByPatrolId(patrol) {
    const document = await this.model
      .findOneAndUpdate(
        { patrolId: patrol.patrolId },
        { $set: patrolToDto(patrol) },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        },
      )
      .lean();
    return toPatrolDomain(document);
  }

  /** @param {string} patrolId Patrol identifier. @returns {Promise<object|null>} Domain patrol. */
  async findById(patrolId) {
    const document = await this.model.findOne({ patrolId }).lean();
    return document ? toPatrolDomain(document) : null;
  }

  /** @returns {Promise<object[]>} Synchronized domain patrols. */
  async findAll() {
    const documents = await this.model.find({ syncStatus: 'SYNCED' }).lean();
    return documents.map(toPatrolDomain);
  }
}
