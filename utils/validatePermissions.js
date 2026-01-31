const ALL_PERMISSIONS = require("../config/permissions");

module.exports = (permissions = []) => {
  return permissions.every((p) => ALL_PERMISSIONS.includes(p));
};
