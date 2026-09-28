import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { getLandingPath } from '../../lib/access';

export const GuestRoute = ({ children }) => {
  const { isAuthenticated, bootstrapping, user } = useAuth();

  if (bootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-pamoja-surface text-pamoja-forest">
        <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={getLandingPath(user)} replace />;
  }

  return children;
};
