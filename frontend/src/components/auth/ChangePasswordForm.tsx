import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Lock } from "lucide-react";
import { hashPassword, comparePassword } from "../../services/auth";

interface UserData {
  password: string;
  is_first_login: boolean;
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

interface ChangePasswordFormProps {
  userId: string;
  onSuccess: () => void;
}

const ChangePasswordForm = ({ userId, onSuccess }: ChangePasswordFormProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: ChangePasswordFormData) => {
    setIsLoading(true);
    try {
      // First verify the current password
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("password, is_first_login")
        .eq("id", userId)
        .single();

      if (userError || !user) {
        throw new Error("Failed to verify current password");
      }

      const userData = user as UserData;

      // For first-time login, the current password is the roll number
      const isFirstLogin = userData.is_first_login;
      const isPasswordValid = isFirstLogin
        ? userData.password === data.currentPassword
        : await comparePassword(data.currentPassword, userData.password);

      if (!isPasswordValid) {
        throw new Error("Current password is incorrect");
      }

      // Hash the new password
      const hashedPassword = await hashPassword(data.newPassword);

      // Update the password and set is_first_login to false
      const { error: updateError } = await supabase
        .from("users")
        .update({
          password: hashedPassword,
          is_first_login: false,
        })
        .eq("id", userId);

      if (updateError) {
        throw new Error("Failed to update password");
      }

      toast.success("Password changed successfully!");
      onSuccess();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to change password";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 edu-card animate-fade-in">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-edu-primary/10 mb-4">
          <Lock className="w-8 h-8 text-edu-primary" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">Change Password</h1>
        <p className="text-gray-600 mt-1">
          Please set a new password for your account
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="currentPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Enter your current password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Enter your new password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm New Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Confirm your new password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Changing Password..." : "Change Password"}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default ChangePasswordForm;
