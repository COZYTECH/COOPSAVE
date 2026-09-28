import { Navigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { getGroups, getLandingPath, isGroupAdmin } from '../../lib/access';

export const GroupAdminRoute = ({ children, allowNoGroup = false }) => {
  const { isAuthenticated, bootstrapping, user } = useAuth();
  const { groupId } = useParams();

  if (bootstrapping) {
    return <div className="flex min-h-screen items-center justify-center bg-pamoja-surface text-pamoja-forest"><Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" /></div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const groups = getGroups(user);
  const selectedGroup = groupId
    ? groups.find((group) => String(group.id) === String(groupId))
    : null;
  const canCreateFirstGroup = allowNoGroup && groups.length === 0;
  const hasSelectedGroupAccess = selectedGroup?.role === 'GROUP_ADMIN';

  return (groupId ? hasSelectedGroupAccess : isGroupAdmin(user)) || canCreateFirstGroup
    ? children
    : <Navigate to={getLandingPath(user)} replace />;
};
