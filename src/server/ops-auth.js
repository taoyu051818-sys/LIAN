import { getCurrentUser } from "./auth-service.js";
import { requireAdmin } from "./request-utils.js";

function configuredOpsAdminUsers() {
  return String(process.env.LIAN_OPS_ADMIN_USERS || process.env.OPS_ADMIN_USERS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

async function requireOpsAdmin(req) {
  requireAdmin(req);

  const allowed = configuredOpsAdminUsers();
  if (!allowed.length) {
    const error = new Error("LIAN_OPS_ADMIN_USERS is missing");
    error.status = 503;
    throw error;
  }

  const auth = await getCurrentUser(req);
  const user = auth.user;
  if (!user || user.status !== "active") {
    const error = new Error("admin login required");
    error.status = 401;
    throw error;
  }

  const identities = [
    user.email,
    user.username,
    user.id
  ].map((item) => String(item || "").trim().toLowerCase()).filter(Boolean);

  if (!identities.some((item) => allowed.includes(item))) {
    const error = new Error("ops admin account required");
    error.status = 403;
    throw error;
  }

  return auth;
}

export { configuredOpsAdminUsers, requireOpsAdmin };
