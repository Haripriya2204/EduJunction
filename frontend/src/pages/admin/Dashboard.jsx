import React, { useState, useEffect } from "react";
import RequestList from "../../components/admin/RequestList.tsx";
import FeeReportsSection from "../../components/admin/FeeReportsSection.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { FileText, BarChart2 } from "lucide-react";
import { authService } from "../../services/api";
import { adminSupabaseService } from "../../services/adminSupabaseService";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("requests");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [departments, setDepartments] = useState([]);
  const [currentUser] = useState(authService.getCurrentUser());

  // Get admin's department if they are a department admin
  const adminDepartment = authService.getAdminDepartment();
  const isDeptAdmin = authService.isDepartmentAdmin();
  const isSuperAdmin = currentUser?.role === "admin" && !currentUser?.roll_no?.startsWith("ADMIN_");

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

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="requests">
            <FileText className="h-4 w-4 mr-2" />
            Pending Approvals
          </TabsTrigger>
          <TabsTrigger value="reports">
            <BarChart2 className="h-4 w-4 mr-2" />
            Fee Receipt Reports
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="requests">
          <RequestList />
        </TabsContent>
        
        <TabsContent value="reports">
          <FeeReportsSection
            selectedDepartment={selectedDepartment}
            departments={departments}
            isSuperAdmin={isSuperAdmin}
            onDepartmentChange={(value) => {
              setSelectedDepartment(value);
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
