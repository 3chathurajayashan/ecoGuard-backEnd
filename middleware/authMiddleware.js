import auth, { authorize } from "./auth.js";

// Used by the wildlife-conflict routes. These used to be stubs that always injected a
// fixed ranger; they now enforce real authentication and roles.
export const requireAuth = auth;

/** allowRoles("RANGER", ...) authenticates the request, then checks the role. */
export const allowRoles =
  (...roles) =>
  (req, res, next) =>
    auth(req, res, (err) => (err ? next(err) : authorize(...roles)(req, res, next)));
