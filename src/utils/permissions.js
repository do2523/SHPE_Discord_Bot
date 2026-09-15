import "dotenv/config";

export function isEboard(interaction) {
  const roleId = process.env.EBOARD_ROLE_ID;
  const roles = interaction.member?.roles;

  if (!roleId || !roles) {
    return false;
  }

  if (Array.isArray(roles)) {
    return roles.includes(roleId);
  }

  return roles.cache?.has(roleId) ?? false;
}

// Used role ID incase someone renames the role.:
