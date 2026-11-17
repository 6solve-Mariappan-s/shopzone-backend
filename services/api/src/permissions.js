export function roleAllowed(role, allowedRoles) {
  return allowedRoles.includes(role);
}

export const ADMIN_ROLES = Object.freeze(["SUPER_ADMIN", "ADMIN"]);
export const CATALOG_MANAGER_ROLES = Object.freeze([...ADMIN_ROLES, "MANAGER", "VENDOR"]);
export const CUSTOMER_ROLES = Object.freeze(["CUSTOMER", "BUYER"]);
