import { User } from './User.js';

/**
 * Ranger account used by patrol assignment workflows.
 */
export class Ranger extends User {
  /**
   * @param {string} userId UUID of the ranger.
   * @param {string} name Display name.
   */
  constructor(userId, name) {
    super(userId, name, 'RANGER');
  }
}
