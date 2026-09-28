const cooperativeRepository = require('../repositories/cooperativeRepository');
const groupMembershipRepository = require('../repositories/groupMembershipRepository');

const PLATFORM_ROLES = Object.freeze({
  PLATFORM_ADMIN: 'PLATFORM_ADMIN',
  USER: 'USER'
});

const GROUP_ROLES = Object.freeze({
  GROUP_ADMIN: 'GROUP_ADMIN',
  GROUP_MEMBER: 'GROUP_MEMBER'
});

const getPlatformRole = (role) => (
  role === 'admin' ? PLATFORM_ROLES.PLATFORM_ADMIN : PLATFORM_ROLES.USER
);

const getAccess = async (user) => {
  const [ownedGroups, memberships] = await Promise.all([
    cooperativeRepository.findAllByOwnerId(user.id),
    groupMembershipRepository.findByUserId(user.id)
  ]);

  const groups = new Map();

  ownedGroups.forEach((group) => {
    groups.set(String(group.id), {
      id: group.id,
      name: group.name,
      role: GROUP_ROLES.GROUP_ADMIN,
      isOwner: true
    });
  });

  memberships.forEach((membership) => {
    const key = String(membership.cooperative_id);
    const current = groups.get(key);

    groups.set(key, {
      id: membership.cooperative_id,
      name: membership.cooperative_name,
      role: current?.isOwner ? GROUP_ROLES.GROUP_ADMIN : membership.role,
      isOwner: Boolean(current?.isOwner)
    });
  });

  return {
    platformRole: getPlatformRole(user.role),
    groups: Array.from(groups.values())
  };
};

module.exports = {
  PLATFORM_ROLES,
  GROUP_ROLES,
  getPlatformRole,
  getAccess
};
