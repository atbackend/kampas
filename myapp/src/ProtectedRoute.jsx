// PrivateRoute.js
import { useSelector, useDispatch } from "react-redux";
import { Navigate } from "react-router-dom";
import { checkTokenValidity } from "./redux/authSlice";
import { useEffect } from "react";


// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, accessToken, refreshToken } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  useEffect(() => {
    // Check token validity when component mounts
    if ((accessToken || refreshToken) && isAuthenticated) {
      dispatch(checkTokenValidity());
    }
  }, [dispatch, accessToken, refreshToken, isAuthenticated]);

  if (!isAuthenticated || (!accessToken && !refreshToken)) {
    return <Navigate to="/sign-in" replace />;
  }

  return children;
};
export default ProtectedRoute;