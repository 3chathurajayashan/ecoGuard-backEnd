import { RouteModel } from '../../models/RouteModel.js';
import { routeToDto, toRouteDomain } from '../../mappers/domainMappers.js';

/**
 * Repository: Mongoose-backed route storage; only domain objects leave it.
 */
export class MongooseRouteRepository {
  /**
   * @param {import('mongoose').Model} [model] Mongoose route model.
   */
  constructor(model = RouteModel) {
    this.model = model;
  }

  /** @param {string} routeId Route identifier. @returns {Promise<object|null>} Domain route. */
  async findById(routeId) {
    const document = await this.model.findOne({ routeId }).lean();
    return document ? toRouteDomain(document) : null;
  }

  /** @returns {Promise<object[]>} Domain routes. */
  async findAll() {
    const documents = await this.model.find().lean();
    return documents.map(toRouteDomain);
  }

  /** @param {object} route Domain route. @returns {Promise<object>} Saved domain route. */
  async save(route) {
    const document = await this.model
      .findOneAndUpdate(
        { routeId: route.routeId },
        { $set: routeToDto(route) },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        },
      )
      .lean();
    return toRouteDomain(document);
  }
}
