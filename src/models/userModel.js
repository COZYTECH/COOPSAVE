const USER_ROLES = Object.freeze({
  MEMBER: 'member',
  ADMIN: 'admin'
});

const PLATFORM_ROLES = Object.freeze({
  USER: 'USER',
  PLATFORM_ADMIN: 'PLATFORM_ADMIN'
});

const toSafeUser = (user) => {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    platformRole: user.role === USER_ROLES.ADMIN
      ? PLATFORM_ROLES.PLATFORM_ADMIN
      : PLATFORM_ROLES.USER,
    isActive: Boolean(user.is_active),
    createdAt: user.created_at,
    updatedAt: user.updated_at
  };
};

module.exports = {
  USER_ROLES,
  PLATFORM_ROLES,
  toSafeUser
};
