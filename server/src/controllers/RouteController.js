import { routeToDto } from '../mappers/domainMappers.js';

/**
 * HTTP adapter for route listing.
 */
export class RouteController {
  /**
   * @param {import('../repositories/contracts.js').RouteRepository} routeRepository Route store.
   */
  constructor(routeRepository) {
    this.routeRepository = routeRepository;
  }

  /**
   * @param {import('express').Request} _request Express request.
   * @param {import('express').Response} response Express response.
   * @returns {Promise<void>} Writes route list.
   */
  async listRoutes(_request, response) {
    response
      .status(200)
      .json((await this.routeRepository.findAll()).map(routeToDto));
  }
}
