import { UserModel } from '../../models/UserModel.js';
import { toUserDomain } from '../../mappers/domainMappers.js';

/**
 * Repository: reads and writes seeded user identities without exposing documents.
 */
export class MongooseUserRepository {
  /**
   * @param {import('mongoose').Model} [model] Mongoose user model.
   */
  constructor(model = UserModel) {
    this.model = model;
  }

  /** @param {string} userId User identifier. @returns {Promise<object|null>} Domain user. */
  async findById(userId) {
    const document = await this.model.findOne({ userId }).lean();
    return document ? toUserDomain(document) : null;
  }

  /** @param {object} user Domain user. @returns {Promise<object>} Saved domain user. */
  async save(user) {
    const document = await this.model
      .findOneAndUpdate(
        { userId: user.userId },
        { $set: { userId: user.userId, name: user.name, role: user.role } },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        },
      )
      .lean();
    return toUserDomain(document);
  }
}
