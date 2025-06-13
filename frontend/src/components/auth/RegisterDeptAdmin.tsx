import React, { useState } from "react";
import { supabase } from "../../lib/supabase";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useToast } from "../ui/use-toast";

const DEPARTMENTS = [
  { id: "IT", name: "Information Technology" },
  { id: "CSE", name: "Computer Science Engineering" },
  { id: "MECH", name: "Mechanical Engineering" },
  { id: "EEE", name: "Electrical and Electronics Engineering" },
  { id: "ECE", name: "Electronics and Communication Engineering" },
  { id: "CSD", name: "Computer Science and Design" },
  { id: "CSC", name: "Computer Science and Cybersecurity" },
  { id: "CSM", name: "Computer Science and Management" },
  { id: "AERO", name: "Aeronautical Engineering" },
  { id: "HSM", name: "Humanities and Management" }
];

interface RegisterDeptAdminProps {
  onSuccess?: () => void;
}

const RegisterDeptAdmin = ({ onSuccess }: RegisterDeptAdminProps) => {
  const [loading, setLoading] = useState(false);
  const [selectedDept, setSelectedDept] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDept || !username || !email || !password || !name) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // First check if username already exists
      const { data: existingUser, error: checkError } = await supabase
        .from("users")
        .select("id")
        .eq("username", username)
        .single();
        
      if (existingUser) {
        toast({
          title: "Error",
          description: "Username already exists",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      // Skip Supabase auth and directly create the user in the users table
      // For a production app, you would want to use proper authentication
      const { data: createdUser, error: insertError } = await supabase
        .from("users")
        .insert({
          username,
          name,
          email,
          password, // In production, never store plain passwords
          department: selectedDept,
          role: "admin",
          roll_no: `ADMIN_${selectedDept}`,
          semester: "",
          fee_status: "approved", // No need for fee approval for admins
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();
        
      if (insertError) {
        throw insertError;
      }
      
      toast({
        title: "Success",
        description: `Department admin for ${selectedDept} registered successfully`,
      });
      
      // Reset form
      setSelectedDept("");
      setUsername("");
      setEmail("");
      setPassword("");
      setName("");
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
    } catch (error: any) {
      console.error("Error registering department admin:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to register department admin",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Register Department Admin</CardTitle>
        <CardDescription>Create an admin account for a specific department</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Department</label>
            <Select
              value={selectedDept}
              onValueChange={setSelectedDept}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map(dept => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name} ({dept.id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Username</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin_it"
              required
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Full Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="IT Department Admin"
              required
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="it.admin@example.com"
              required
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full"
            disabled={loading}
          >
            {loading ? "Registering..." : "Register Department Admin"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default RegisterDeptAdmin; 