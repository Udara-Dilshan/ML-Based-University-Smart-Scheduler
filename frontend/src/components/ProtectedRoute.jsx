import { Navigate, Outlet } from "react-router-dom";
import { getHomeRouteByRole, getUser, isAuthenticated } from "../services/api";

export default function ProtectedRoute({ allowedRoles }) {
  const user = getUser();

  if (!isAuthenticated() || !user) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getHomeRouteByRole(user.role)} replace />;
  }

  return <Outlet />;
}
