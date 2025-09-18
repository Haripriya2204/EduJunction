import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";

// Flag to temporarily disable student logins
const STUDENT_LOGINS_DISABLED = false;

// Flag to disable logins for roll numbers starting with "23" or "22"
const DISABLE_LOGINS_FOR_22_23 = false;
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
      // First check if this is an admin user
      const { data: adminUser, error: adminError } = await supabase
        .from("users")
        .select("*")
        .eq("username", data.username)
        .eq("role", "admin")
        .single();

      if (adminUser && adminUser.password === data.password) {
        // Admin login successful
        localStorage.setItem("currentUser", JSON.stringify(adminUser));
        toast.success(
          `${adminUser.department} Department Admin login successful!`
        );
        navigate("/dashboard");
        return;
      }

      // Check if student logins are disabled
      if (STUDENT_LOGINS_DISABLED) {
        toast.error(
          "Student services have been paused temporarily. Please try again later."
        );
        setIsLoading(false);
        return;
      }

      // Check if logins for roll numbers starting with "23" or "22" are disabled
      if (
        DISABLE_LOGINS_FOR_22_23 &&
        (data.username.startsWith("23") || data.username.startsWith("22"))
      ) {
        toast.error(
          "Logins for 2nd and 3rd years are temporarily disabled. Please try again later."
        );
        setIsLoading(false);
        return;
      }

      // If not an admin, proceed with regular student login
      const result = await login({
        rollNo: data.username,
        password: data.password,
      });

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
      const errorMessage =
        error instanceof Error ? error.message : "Failed to login";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center">
      {/* Background Image */}
      <div />

      {/* Login Form */}
      <div className="relative z-10 w-full max-w-md mx-auto p-8 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-edu-primary/10 mb-4">
            <LogIn className="w-8 h-8 text-edu-primary" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Welcome to EDMIT</h1>
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
                    <Input
                      placeholder="Enter username or roll number"
                      {...field}
                    />
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
              <p>
                Students: Use your roll number for both username and password
                [Capitals]
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Log In"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default LoginForm;
