// Role groups used by the route guards.
export const RANGER = "RANGER";
export const LIAISON = "COMMUNITY_LIAISON_OFFICER";
export const MANAGER = "PARK_MANAGER";
export const RESEARCHER = "CONSERVATION_RESEARCHER";
export const VILLAGER = "VILLAGER";

/** Everyone who works for the park. */
export const STAFF = [RANGER, LIAISON, MANAGER, RESEARCHER];

/** People who respond to alerts in the field. */
export const RESPONDERS = [RANGER, LIAISON];

/** Anyone with an account. */
export const EVERYONE = [...STAFF, VILLAGER];
