import { Navigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { getGroups, getLandingPath } from '../../lib/access';

export const GroupMemberRoute = ({ children }) => {
  const { isAuthenticated, bootstrapping, user } = useAuth();
  const { groupId } = useParams();

  if (bootstrapping) {
    return <div className="flex min-h-screen items-center justify-center bg-pamoja-surface text-pamoja-forest"><Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" /></div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const membership = getGroups(user).find((group) => String(group.id) === String(groupId));

  if (!membership) {
    return <Navigate to={getLandingPath(user)} replace />;
  }

  // Administrative role and financial participation are independent. A
  // GROUP_ADMIN can use the member-scoped pages for their own obligations.
  return children;
};
