import { z } from "zod";

// Login validation schema
export const loginSchema = z.object({
  username: z.string().min(1, {
    message: "Username is required.",
  }),
  password: z.string().min(1, {
    message: "Password is required.",
  }),
});

// Signup validation schema
export const signupSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  rollNo: z.string().optional(),
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  department: z.string().min(1, { message: "Department is required." }),
  semester: z.string().optional(),
  mobileNumber: z.string().min(10, { message: "Mobile number is required." }),
  role: z.enum(["student", "admin"]),
  position: z.string().optional(),
});

// Gate pass validation schema
export const gatePassSchema = z.object({
  reason: z.string().min(1, { message: "Reason is required." }),
  date: z.string().min(1, { message: "Date is required." }),
});

// Notification form schema
export const notificationSchema = z.object({
  title: z.string().min(1, { message: "Title is required." }),
  description: z.string().min(1, { message: "Description is required." }),
  department: z.string().min(1, { message: "Department is required." }),
  deadline: z.string().optional(),
});

// Define types from the schemas
export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;
export type GatePassFormData = z.infer<typeof gatePassSchema>;
export type NotificationFormData = z.infer<typeof notificationSchema>;
