module.exports = (
  rolePermissions = [],
  extraPermissions = [],
  deniedPermissions = []
) => {
  // Ensure arrays
  rolePermissions = Array.isArray(rolePermissions) ? rolePermissions : [];
  extraPermissions = Array.isArray(extraPermissions) ? extraPermissions : [];
  deniedPermissions = Array.isArray(deniedPermissions) ? deniedPermissions : [];

  // Admin shortcut
  if (rolePermissions.includes("*")) {
    return ["*"];
  }

  let permissions = [...rolePermissions, ...extraPermissions];

  permissions = permissions.filter(
    (p) => !deniedPermissions.includes(p)
  );

  return [...new Set(permissions)];
};
