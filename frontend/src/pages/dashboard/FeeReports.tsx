import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/api";
import FeeReportsSection from "../../components/admin/FeeReportsSection";

const FeeReports = () => {
  const navigate = useNavigate();
  const isAdmin = authService.isAdmin(); // This now checks for both admin and dept_admin

  // Redirect non-admin users
  useEffect(() => {
    if (!isAdmin) {
      navigate("/dashboard");
    }
  }, [isAdmin, navigate]);

  // Only render the component if user is admin or dept_admin
  if (!isAdmin) {
    return null;
  }

  return <FeeReportsSection />;
};

export default FeeReports; 