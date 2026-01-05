import { Navigate } from 'react-router-dom';
import { hasAnyRole } from '../utils/auth';

const RoleRoute = ({ children, allowedRoles }) => {
  if (!hasAnyRole(...allowedRoles)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default RoleRoute;





