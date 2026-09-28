export const getPlatformRole = (user) => (
  user?.platformRole || (user?.role === 'admin' ? 'PLATFORM_ADMIN' : 'USER')
);

export const getGroups = (user) => user?.access?.groups || [];

export const isPlatformAdmin = (user) => getPlatformRole(user) === 'PLATFORM_ADMIN';

export const isGroupAdmin = (user) => getGroups(user).some((group) => group.role === 'GROUP_ADMIN');

export const isGroupMember = (user) => getGroups(user).some((group) => group.role === 'GROUP_MEMBER');

export const getDefaultGroup = (user) => {
  const groups = getGroups(user);
  return groups.find((group) => group.role === 'GROUP_ADMIN') || groups[0] || null;
};

export const getLandingPath = (user) => {
  if (isPlatformAdmin(user)) {
    return '/admin';
  }

  const groups = getGroups(user);

  if (groups.length === 0) {
    return '/groups/onboarding';
  }

  if (groups.length > 1) {
    return '/groups/select';
  }

  return groups[0].role === 'GROUP_ADMIN'
    ? `/groups/${groups[0].id}/manage`
    : `/groups/${groups[0].id}`;
};
