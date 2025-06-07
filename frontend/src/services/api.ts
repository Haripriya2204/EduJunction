/**
 * This file would typically contain database connection setup.
 * For this demo, we're using localStorage to simulate a database.
 * In a real application, this would use an actual SQLite connection.
 */

import { db, connectToDatabase } from "../db/database";
import { User, Course, Request, FeeReceipt, Notification } from "../db/models";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://nihdnnaixxtndvddgoel.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5paGRubmFpeHh0bmR2ZGRnb2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxODEyNjUsImV4cCI6MjA2NDc1NzI2NX0.R10U6v7FdPU8wNbstBvClK-EAYhZm7B2oeRCvbRREEs";
const supabase = createClient(supabaseUrl, supabaseKey);

// Connect to the database
connectToDatabase();

// Authentication service
export const authService = {
  login: async (username: string, password: string) => {
    try {
      // Verify that username and password are the same (roll number)
      if (username !== password) {
        throw new Error("Username and password must be your roll number");
      }

      // Check if the student exists in the students table
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select()
        .eq("roll_number", username)
        .single();

      if (studentError || !student) {
        throw new Error("Invalid roll number");
      }

      // Check if user already exists in users table
      const { data: existingUser, error: userError } = await supabase
        .from("users")
        .select()
        .eq("username", username)
        .single();

      let user;

      if (!existingUser) {
        // Create new user if doesn't exist
        const newUser = {
          username: student.roll_number,
          name: student.name,
          email: student.email,
          password: student.roll_number, // Use roll number as password
          department: student.branch,
          role: "student",
          roll_no: student.roll_number,
          semester: student.semester,
        };

        const { data: createdUser, error: createError } = await supabase
          .from("users")
          .insert(newUser)
          .select()
          .single();

        if (createError) {
          console.error("Create user error:", createError);
          throw new Error("Failed to create user account");
        }
        user = createdUser;
      } else {
        // Verify password for existing user
        if (existingUser.password !== username) {
          throw new Error("Invalid roll number");
        }
        user = existingUser;
      }

      // Store user data in localStorage
      localStorage.setItem("currentUser", JSON.stringify(user));
      return user;
    } catch (error: any) {
      console.error("Login error:", error);
      throw new Error(error.message || "Failed to login");
    }
  },

  logout: (): void => {
    localStorage.removeItem("currentUser");
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem("currentUser");
  },

  getCurrentUser: () => {
    const userJson = localStorage.getItem("currentUser");
    return userJson ? JSON.parse(userJson) : null;
  },

  isAdmin: (): boolean => {
    const user = authService.getCurrentUser();
    return user?.role === "admin";
  },
};

// Helper to get auth headers
const getAuthHeaders = (includeContentType = true) => {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {
    Authorization: token ? `Bearer ${token}` : "",
  };
  if (includeContentType) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
};

// Helper to handle API responses
const handleResponse = async (response: Response) => {
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    const text = await response.text();
    throw new Error("Invalid server response: " + text);
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || data.details || "Request failed");
  }
  return data;
};

// Student service
export const studentService = {
  getProfile: async (): Promise<User> => {
    const user = authService.getCurrentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }
    return user;
  },

  getCourses: async (): Promise<{
    courses: Course[];
    selectedElectivesMap: Record<string, Course>;
  }> => {
    const user = authService.getCurrentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }
    const response = await fetch(`/api/courses/mandatory?userId=${user.id}`, {
      headers: { ...getAuthHeaders() },
    });
    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: "Failed to fetch courses" }));
      throw new Error(errorData.message);
    }
    const data = await response.json();
    return data;
  },

  getElectiveCourses: async (): Promise<Course[]> => {
    const user = authService.getCurrentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }
    const response = await fetch("/api/courses", {
      headers: { ...getAuthHeaders() },
    });
    if (!response.ok) {
      throw new Error("Failed to fetch courses");
    }
    const courses: Course[] = await response.json();
    return courses.filter(
      (course) =>
        course.isElective &&
        course.department === user.department &&
        course.semester === user.semester
    );
  },

  addElectiveCourse: async (courseId: string): Promise<void> => {
    const user = authService.getCurrentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }
    const response = await fetch("/api/user-courses", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ userId: user.id, courseId }),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to add elective course");
    }
  },

  removeElectiveCourse: async (userCourseId: string): Promise<void> => {
    const response = await fetch(`/api/user-courses/${userCourseId}`, {
      method: "DELETE",
      headers: { ...getAuthHeaders() },
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to remove elective course");
    }
  },

  getFeeReceiptStatus: async (): Promise<{
    status: string;
    semester: string | null;
  }> => {
    const user = authService.getCurrentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }
    try {
      const response = await fetch(`/api/feereceipts?userId=${user.id}`, {
        headers: getAuthHeaders(),
      });
      const data = await handleResponse(response);
      const receipts: FeeReceipt[] = data;
      // Get the latest receipt for the user
      const receipt = receipts
        .filter((r) => r.userId === user.id)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];
      return receipt
        ? { status: receipt.status, semester: receipt.semester }
        : { status: "not_uploaded", semester: null };
    } catch (error) {
      console.error("Error fetching fee receipt status:", error);
      throw error;
    }
  },

  uploadFeeReceipt: async (
    file: File,
    semester: string,
    paymentMode: string,
    transactionNumber?: string,
    bankName?: string
  ): Promise<void> => {
    const user = authService.getCurrentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("File size should be less than 5MB");
    }

    // Validate file type
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      throw new Error("Only PDF, JPEG, and PNG files are allowed");
    }

    const formData = new FormData();
    formData.append("userId", user.id);
    formData.append("file", file);
    formData.append("semester", semester);
    formData.append("paymentMode", paymentMode);
    if (transactionNumber) {
      formData.append("transactionNumber", transactionNumber);
    }
    if (bankName) {
      formData.append("bankName", bankName);
    }

    try {
      const response = await fetch("/api/feereceipts/upload", {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      await handleResponse(response);
    } catch (error) {
      console.error("Error uploading fee receipt:", error);
      throw error;
    }
  },

  submitFeeSlipRequest: async (): Promise<void> => {
    const user = authService.getCurrentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }
    const details = {
      studentName: user.name,
      rollNo: user.roll_no,
      filename: "fee_receipt.pdf",
    };
    const response = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({
        userId: user.id,
        type: "feeslip",
        status: "pending",
        details,
      }),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to submit fee slip request");
    }
  },

  submitGatePassRequest: async (
    reason: string,
    date: string
  ): Promise<void> => {
    const user = authService.getCurrentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }
    const details = {
      reason,
      date,
      studentName: user.name,
      rollNo: user.roll_no,
    };
    const response = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify({
        userId: user.id,
        type: "gatepass",
        status: "pending",
        details,
      }),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to submit gate pass request");
    }
  },

  getRequests: async (): Promise<Request[]> => {
    const user = authService.getCurrentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }
    const response = await fetch("/api/requests/my", {
      headers: { ...getAuthHeaders() },
    });
    if (!response.ok) {
      throw new Error("Failed to fetch requests");
    }
    return await response.json();
  },

  getNotifications: async (): Promise<Notification[]> => {
    const user = authService.getCurrentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }
    const response = await fetch(
      `/api/notifications?department=${encodeURIComponent(user.department)}`,
      { headers: { ...getAuthHeaders() } }
    );
    if (!response.ok) {
      throw new Error("Failed to fetch notifications");
    }
    return await response.json();
  },

  markNotificationAsRead: async (notificationId: string): Promise<void> => {
    const user = authService.getCurrentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const notifications: Notification[] = JSON.parse(
      localStorage.getItem("notifications") || "[]"
    );
    const notificationIndex = notifications.findIndex(
      (n) => n.id === notificationId
    );

    if (notificationIndex >= 0) {
      const notification = notifications[notificationIndex];

      // Initialize readBy array if it doesn't exist
      if (!notification.readBy) {
        notification.readBy = [];
      }

      // Add user ID to readBy array if not already there
      if (!notification.readBy.includes(user.id)) {
        notification.readBy.push(user.id);
        notifications[notificationIndex] = notification;
        localStorage.setItem("notifications", JSON.stringify(notifications));
      }
    }
  },

  getCurrentUser: (): User | null => {
    return authService.getCurrentUser();
  },
};

// Admin service
export const adminService = {
  getRequestsByStatus: async (
    status: "pending" | "approved" | "rejected" | "on_hold"
  ): Promise<Request[]> => {
    const response = await fetch(`/api/requests/department?status=${status}`, {
      headers: { ...getAuthHeaders() },
    });
    if (!response.ok) {
      throw new Error("Failed to fetch requests");
    }
    return response.json();
  },

  getAllRequests: async (): Promise<Request[]> => {
    const response = await fetch("/api/requests/department", {
      headers: { ...getAuthHeaders() },
    });
    if (!response.ok) {
      throw new Error("Failed to fetch requests");
    }
    return response.json();
  },

  createNotification: async (
    notification: Omit<Notification, "id" | "createdAt">
  ): Promise<Notification> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    const user = authService.getCurrentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    if (user.role !== "admin") {
      throw new Error("Not authorized");
    }

    return db.createNotification(notification);
  },

  getNotificationsCreatedByAdmin: async (): Promise<Notification[]> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const user = authService.getCurrentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    if (user.role !== "admin") {
      throw new Error("Not authorized");
    }

    const notifications = JSON.parse(
      localStorage.getItem("notifications") || "[]"
    );
    return notifications;
  },

  approveFeeReceipt: async (
    userId: string,
    approve: boolean
  ): Promise<void> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    const user = authService.getCurrentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    if (user.role !== "admin") {
      throw new Error("Not authorized");
    }

    // Update fee receipt status
    const feeReceipts: FeeReceipt[] = JSON.parse(
      localStorage.getItem("feeReceipts") || "[]"
    );
    const receiptIndex = feeReceipts.findIndex((r) => r.userId === userId);

    if (receiptIndex >= 0) {
      feeReceipts[receiptIndex].status = approve ? "approved" : "rejected";
      feeReceipts[receiptIndex].updatedAt = new Date();
      localStorage.setItem("feeReceipts", JSON.stringify(feeReceipts));
    }
  },

  updateRequestStatus: async (
    id: string,
    status: "approved" | "rejected" | "on_hold"
  ): Promise<Request> => {
    const res = await axios.patch(`/api/requests/${id}`, { status });
    return res.data;
  },
};

// Export types for use in components
export type { User, Course, Request, FeeReceipt, Notification };
