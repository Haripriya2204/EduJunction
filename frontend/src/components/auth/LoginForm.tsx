import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { loginSchema, LoginFormData } from "../../lib/validation";
import { login } from "../../services/auth";
import { LogIn } from "lucide-react";

const LoginForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      // Hardcoded super admin login for demo purposes
      if (data.username === "admin" && data.password === "admin") {
        // Bypass for super admin login
        localStorage.setItem("currentUser", JSON.stringify({ 
          role: "admin",
          name: "Super Administrator",
          email: "admin@edujunction.com",
          department: "Administration"
        }));
        toast("Super Admin login successful!");
        navigate("/dashboard");
        return;
      }
      
      // Check if this is a department admin login
      if (data.username.startsWith("admin_") || data.username.includes("_admin")) {
        try {
          // Try to find a department admin account
          const { data: adminUser, error: adminError } = await supabase
            .from("users")
            .select("*")
            .eq("username", data.username)
            .eq("role", "admin")
            .not("department", "eq", "Administration") // Exclude super admin
            .single();
            
          if (adminUser && adminUser.password === data.password) {
            // Department admin login successful
            localStorage.setItem("currentUser", JSON.stringify(adminUser));
            toast.success(`${adminUser.department} Department Admin login successful!`);
            navigate("/dashboard");
            return;
          } else if (adminError) {
            console.error("Department admin lookup error:", adminError);
            toast.error("Invalid department admin credentials");
            setIsLoading(false);
            return;
          } else {
            toast.error("Invalid username or password");
            setIsLoading(false);
            return;
          }
        } catch (error) {
          console.error("Error during department admin login:", error);
          toast.error("Failed to process login");
          setIsLoading(false);
          return;
        }
      }

      // Regular student login
      const result = await login({ rollNo: data.username, password: data.password });
      
      if (!result.success) {
        toast.error(result.message);
        setIsLoading(false);
        return;
      }

      localStorage.setItem("currentUser", JSON.stringify(result.user));
      toast.success("Login successful!");
      navigate("/dashboard");
    } catch (error: unknown) {
      console.error("Login error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to login";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 edu-card animate-fade-in">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-edu-primary/10 mb-4">
          <LogIn className="w-8 h-8 text-edu-primary" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">Welcome back</h1>
        <p className="text-gray-600 mt-1">Log in to your account</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username / Roll Number</FormLabel>
                <FormControl>
                  <Input placeholder="Enter username or roll number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Enter your password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="text-sm text-gray-600">
            <p>Students: Use your roll number for both username and password</p>
            <p>Department admins: Use your assigned username and password</p>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Logging in..." : "Log In"}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default LoginForm;
