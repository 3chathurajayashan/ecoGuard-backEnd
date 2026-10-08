/**
 * Abstract system user.
 */
export class User {
  /**
   * @param {string} userId UUID of the user.
   * @param {string} name Display name.
   * @param {string} role User role.
   */
  constructor(userId, name, role) {
    if (new.target === User) {
      throw new TypeError('User is abstract');
    }
    this.userId = userId;
    this.name = name;
    this.role = role;
  }
}
