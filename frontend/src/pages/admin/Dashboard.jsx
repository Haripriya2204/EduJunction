import React, { useState } from "react";
import RequestList from "../../components/admin/RequestList.tsx";
import FeeReportsSection from "../../components/admin/FeeReportsSection.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { FileText, BarChart2 } from "lucide-react";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("requests");

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
          <FeeReportsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Dashboard;
