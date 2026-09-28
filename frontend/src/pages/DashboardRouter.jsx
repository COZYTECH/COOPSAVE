import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getGroups, isPlatformAdmin } from '../lib/access';

export const DashboardRouter = () => {
  const { user } = useAuth();

  if (isPlatformAdmin(user)) {
    return <Navigate to="/admin" replace />;
  }

  const groups = getGroups(user);

  if (groups.length === 0) {
    return <Navigate to="/groups/onboarding" replace />;
  }

  if (groups.length > 1) {
    return <Navigate to="/groups/select" replace />;
  }

  const group = groups[0];
  return <Navigate to={group.role === 'GROUP_ADMIN' ? `/groups/${group.id}/manage` : `/groups/${group.id}`} replace />;
};
