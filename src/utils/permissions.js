export function isEboard(interaction) {
  return interaction.member.roles.cache.has(process.env.EBOARD_ROLE_ID);
}

// Used role ID incase someone renames the role.:
