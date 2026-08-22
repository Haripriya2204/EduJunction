import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";
import { MAINTENANCE_MODE } from "../../config/maintenance";

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
import { LogIn, Eye, EyeOff } from "lucide-react";

const LoginForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    // Check if maintenance mode is active
    if (MAINTENANCE_MODE) {
      toast.error(
        "Login is currently disabled due to maintenance. Please try again later."
      );
      return;
    }

    setIsLoading(true);
    try {
      // Trim both fields once, here, so every path below (admin match, the
      // year gate, student login) compares the same clean value. A mobile
      // keyboard adding a trailing space to only the visible field made two
      // identical-looking entries fail the username === password rule, with
      // the password masked so the student could not see why.
      //
      // Case is deliberately NOT folded: roll numbers must be entered in
      // capitals. Lower case is rejected with an explicit message in
      // authService.login rather than silently corrected.
      const username = (data.username || "").trim();
      const password = (data.password || "").trim();

      // First check if this is an admin user
      const { data: adminUser, error: adminError } = await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .eq("role", "admin")
        .single();

      if (adminUser && adminUser.password === password) {
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
        (username.startsWith("23") || username.startsWith("22"))
      ) {
        toast.error(
          "Logins for 2nd and 3rd years are temporarily disabled. Please try again later."
        );
        setIsLoading(false);
        return;
      }

      // If not an admin, proceed with regular student login
      const result = await login({
        rollNo: username,
        password,
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
      
      // Handle blocked user error with specific message
      if (errorMessage === "BLOCKED_USER") {
        toast.error("Your account has been blocked. Please meet the HOD to obtain login access.", {
          duration: 5000,
        });
      } else {
        toast.error(errorMessage);
      }
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
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                      autoComplete="username"
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
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        autoCapitalize="characters"
                        autoCorrect="off"
                        spellCheck={false}
                        autoComplete="current-password"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="text-sm text-gray-600">
              <p>
                Students: Use your roll number in CAPITALS for both username
                and password.
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading || MAINTENANCE_MODE}>
              {MAINTENANCE_MODE ? "Login Disabled - Under Maintenance" : isLoading ? "Logging in..." : "Log In"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default LoginForm;
