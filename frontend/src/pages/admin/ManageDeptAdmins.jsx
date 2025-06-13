import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { authService } from "../../services/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import RegisterDeptAdmin from "../../components/auth/RegisterDeptAdmin";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { useToast } from "../../components/ui/use-toast";
import { UserPlus, Users, Trash2 } from "lucide-react";

const ManageDeptAdmins = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deptAdmins, setDeptAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("list");
  
  // Check if user is a super admin
  const isSuperAdmin = authService.getCurrentUser()?.role === "admin";

  useEffect(() => {
    // Redirect if not super admin
    if (!isSuperAdmin) {
      navigate("/dashboard");
      return;
    }
    
    fetchDeptAdmins();
  }, [navigate, isSuperAdmin]);
  
  const fetchDeptAdmins = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, username, name, email, department, created_at")
        .eq("role", "admin")
        .not("department", "eq", "Administration") // Exclude super admin
        .order("department");
        
      if (error) {
        console.error("Detailed error:", error);
        throw error;
      }
      
      setDeptAdmins(data || []);
    } catch (error) {
      console.error("Error fetching department admins:", error);
      toast({
        title: "Error",
        description: "Failed to fetch department admins: " + (error.message || "Unknown error"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleRemoveAdmin = async (id) => {
    if (!confirm("Are you sure you want to remove this department admin?")) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("id", id);
        
      if (error) throw error;
      
      // Remove from the state
      setDeptAdmins(deptAdmins.filter(admin => admin.id !== id));
      
      toast({
        title: "Success",
        description: "Department admin removed successfully",
      });
    } catch (error) {
      console.error("Error removing department admin:", error);
      toast({
        title: "Error",
        description: "Failed to remove department admin",
        variant: "destructive",
      });
    }
  };
  
  // Redirect if not super admin
  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Manage Department Admins</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="list">
            <Users className="h-4 w-4 mr-2" />
            Department Admins
          </TabsTrigger>
          <TabsTrigger value="register">
            <UserPlus className="h-4 w-4 mr-2" />
            Register New Admin
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="list">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            </div>
          ) : deptAdmins.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No department admins found. Create one using the Register tab.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deptAdmins.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell className="font-medium">{admin.department}</TableCell>
                      <TableCell>{admin.username}</TableCell>
                      <TableCell>{admin.name}</TableCell>
                      <TableCell>{admin.email}</TableCell>
                      <TableCell>
                        {new Date(admin.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="destructive" 
                          size="icon"
                          onClick={() => handleRemoveAdmin(admin.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="register">
          <RegisterDeptAdmin onSuccess={() => {
            setActiveTab("list");
            fetchDeptAdmins();
          }} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ManageDeptAdmins; 