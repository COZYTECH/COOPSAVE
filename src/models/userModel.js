const USER_ROLES = Object.freeze({
  MEMBER: 'member',
  ADMIN: 'admin'
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
    isActive: Boolean(user.is_active),
    createdAt: user.created_at,
    updatedAt: user.updated_at
  };
};

module.exports = {
  USER_ROLES,
  toSafeUser
};
