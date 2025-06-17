import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../../services/api";
import FeeReportsSection from "../../components/admin/FeeReportsSection";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { adminSupabaseService } from "../../services/adminSupabaseService";

const FeeReports = () => {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const isSuperAdmin =
    currentUser?.role === "admin" &&
    !currentUser?.roll_no?.startsWith("ADMIN_");
  const isAdmin = authService.isAdmin();

  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [departments, setDepartments] = useState<string[]>([]);

  // Redirect non-admin users
  useEffect(() => {
    if (!isAdmin) {
      navigate("/dashboard");
    }
  }, [isAdmin, navigate]);

  // Fetch departments for super admin
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const data = await adminSupabaseService.getAllDepartments();
        setDepartments(data);
      } catch (error) {
        console.error("Error fetching departments:", error);
      }
    };

    if (isSuperAdmin) {
      fetchDepartments();
    }
  }, [isSuperAdmin]);

  // Only render the component if user is admin or dept_admin
  if (!isAdmin) {
    return null;
  }

  return (
    <FeeReportsSection
      selectedDepartment={selectedDepartment}
      departments={departments}
      isSuperAdmin={isSuperAdmin}
      onDepartmentChange={(value) => {
        setSelectedDepartment(value);
      }}
    />
  );
};

export default FeeReports;
