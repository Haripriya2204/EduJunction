/**
 * This file would typically contain database connection setup.
 * For this demo, we're using localStorage to simulate a database.
 * In a real application, this would use an actual SQLite connection.
 */

import { db, connectToDatabase } from "../db/database";
import { User, Course, Request, FeeReceipt, Notification } from "../db/models";
import axios from "axios";
import { supabase } from "../lib/supabase";

// Connect to the database
connectToDatabase();

// Authentication service
export const authService = {
  login: async (username: string, password: string) => {
    try {
      // Verify that username and password are the same (roll number)
      if (username !== password && username !== "admin") {
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

      // Try to sign in first
      let { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: student.email,
          password: username, // Using roll number as password
        });

      // If sign in fails, try to sign up the user
      if (authError) {
        console.log("Sign in failed, attempting to sign up user...");
        const { data: signUpData, error: signUpError } =
          await supabase.auth.signUp({
            email: student.email,
            password: username,
            options: {
              data: {
                roll_number: student.roll_number,
                name: student.name,
                department: student.branch,
                semester: student.semester,
                year: student.year,
              },
            },
          });

        if (signUpError) {
          console.error("Sign up error:", signUpError);
          throw new Error("Failed to create user account");
        }

        // Try to sign in again after sign up
        const { data: signInData, error: signInError } =
          await supabase.auth.signInWithPassword({
            email: student.email,
            password: username,
          });

        if (signInError) {
          console.error("Sign in error after sign up:", signInError);
          throw new Error("Failed to sign in after account creation");
        }

        authData = signInData;
      }

      console.log("Auth session:", authData.session);

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
          year: student.year,
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

  logout: async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Logout error:", error);
    }
    localStorage.removeItem("currentUser");
  },

  isAuthenticated: async (): Promise<boolean> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return !!session;
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

  getCourses: async (
    semester: string
  ): Promise<{
    courses: Course[];
    selectedElectivesMap: Record<string, Course>;
  }> => {
    const user = authService.getCurrentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    const { department, year } = user;
    const schemaName = `${department.toLowerCase()}_courses`;
    const tableName = semester; // Use semester directly as table name

    console.log(
      `Fetching courses from schema: ${schemaName}, table: ${tableName}`
    );

    try {
      const { data, error } = await supabase
        .schema(`${schemaName}`)
        .from(`${tableName}`)
        .select("*")
        .limit(100);

      if (error) {
        console.error(
          `Error fetching courses from ${schemaName}.${tableName}:`,
          error
        );
        throw error;
      }

      return {
        courses: data as Course[],
        selectedElectivesMap: {},
      };
    } catch (error: any) {
      console.error("Supabase query error:", error);
      throw new Error(`Failed to fetch courses: ${error.message}`);
    }
  },

  getElectiveCourses: async (): Promise<Course[]> => {
    // This function might be refactored or removed later if electives are handled differently.
    const user = authService.getCurrentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }
    const response = await fetch("/api/courses", {
      headers: {
        "Content-Type": "application/json",
        Authorization: localStorage.getItem("token")
          ? `Bearer ${localStorage.getItem("token")}`
          : "",
      },
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
      headers: {
        "Content-Type": "application/json",
        Authorization: localStorage.getItem("token")
          ? `Bearer ${localStorage.getItem("token")}`
          : "",
      },
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

  getFeeReceiptStatus: async (): Promise<{ status: string }> => {
    const user = authService.getCurrentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }
    // Assuming fee_status is available directly on the user object
    const { data, error } = await supabase
      .from("users")
      .select("fee_status")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error fetching fee status:", error);
      throw error;
    }

    return { status: data?.fee_status || "unknown" };
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

    // Check Supabase auth status
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();
    console.log("Supabase Auth Status:", {
      isAuthenticated: !!session,
      userId: session?.user?.id,
      error: authError,
    });

    if (authError) {
      console.error("Auth error:", authError);
      throw new Error("Authentication failed");
    }

    if (!session) {
      throw new Error("No active session found");
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

    try {
      // Upload file to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${
        session.user.id
      }/${semester}_${Date.now()}.${fileExt}`;

      console.log("Attempting to upload file:", {
        fileName,
        fileSize: file.size,
        fileType: file.type,
        userId: session.user.id,
      });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("fee-receipt-files")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error("Failed to upload fee receipt");
      }

      console.log("File uploaded successfully:", uploadData);

      // Get the public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("fee-receipt-files").getPublicUrl(fileName);

      console.log("Generated public URL:", publicUrl);

      // Create fee receipt record in the database
      const { error: dbError } = await supabase.from("fee_receipts").insert({
        user_id: session.user.id,
        semester: semester,
        file_path: fileName,
        file_url: publicUrl,
        payment_mode: paymentMode,
        transaction_number: transactionNumber,
        bank_name: bankName,
        status: "pending",
        uploaded_at: new Date().toISOString(),
      });

      if (dbError) {
        console.error("Database error:", dbError);
        // If database update fails, delete the uploaded file
        await supabase.storage.from("fee-receipt-files").remove([fileName]);
        throw new Error("Failed to save fee receipt information");
      }

      // Update user's fee-related fields in the users table
      const { error: userUpdateError } = await supabase
        .from("users")
        .update({
          approved_semester: semester,
          payment_mode: paymentMode,
          transaction_number: transactionNumber,
          bank_name: bankName,
          fee_receipt_url: publicUrl,
          fee_status: "pending", // Set status to pending upon upload
        })
        .eq("id", session.user.id); // Assuming 'id' is the primary key in users table

      if (userUpdateError) {
        console.error("User update error:", userUpdateError);
        // Consider rolling back the fee_receipts insert or handling this error appropriately
        throw new Error("Failed to update user profile with fee receipt info");
      }

      console.log(
        "Fee receipt record created and user profile updated successfully"
      );
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
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .or(`department.eq.${user.department},department.eq.All`);

    if (error) {
      console.error("Error fetching notifications:", error);
      throw error;
    }
    return data || [];
  },

  markNotificationAsRead: async (notificationId: string): Promise<void> => {
    const user = authService.getCurrentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Fetch the current notification to get existing readBy users
    const { data: existingNotification, error: fetchError } = await supabase
      .from("notifications")
      .select("readBy")
      .eq("id", notificationId)
      .single();

    if (fetchError) {
      console.error("Error fetching notification for read status:", fetchError);
      throw fetchError;
    }

    const currentReadBy = existingNotification?.readBy || [];
    const newReadBy = Array.from(new Set([...currentReadBy, user.id]));

    const { error } = await supabase
      .from("notifications")
      .update({ readBy: newReadBy })
      .eq("id", notificationId);

    if (error) {
      console.error("Error marking notification as read:", error);
      throw error;
    }
  },

  getCurrentUser: (): User | null => {
    return authService.getCurrentUser();
  },

  getElectiveOptions: async (courseName: string): Promise<Course[]> => {
    const user = authService.getCurrentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    console.log("User object in getCourses:", user);

    const { department, year, semester } = user;
    const schemaName = `${department.toLowerCase()}_courses`;
    const tableName = `${year}-${semester}`;

    // Extract the elective group from course name (e.g., "Professional Elective - III" -> "PE-III")
    console.log("Course name:", courseName);

    // Replace en dash with regular hyphen and normalize whitespace around dashes
    const normalizedName = courseName
      .replace(/–/g, "-") // Replace en dash with regular hyphen
      .replace(/\s*-\s*/g, " - "); // Normalize whitespace around hyphens

    console.log("Normalized name:", normalizedName);

    const electiveGroup = normalizedName.includes("Lab")
      ? normalizedName.split(" - ")[1].replace("Lab", "LAB") // For PE-III-LAB
      : `PE-${normalizedName.split(" - ")[1]}`; // For regular electives

    console.log("Elective group:", electiveGroup);

    try {
      const { data, error } = await supabase
        .schema(`${schemaName}`)
        .from(`${electiveGroup}`)
        .select("*");

      if (error) {
        console.error("Error fetching elective options:", error);
        throw error;
      }

      return data as Course[];
    } catch (error: any) {
      console.error("Error fetching elective options:", error);
      throw new Error(`Failed to fetch elective options: ${error.message}`);
    }
  },

  selectElective: async (
    courseId: string,
    electiveGroup: string
  ): Promise<void> => {
    const user = authService.getCurrentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    try {
      // First, check if user already has selected electives
      const { data: existingElectives, error: fetchError } = await supabase
        .from("users")
        .select("selected_electives")
        .eq("id", user.id)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        // PGRST116 is "no rows returned"
        throw fetchError;
      }

      // Initialize or update selected_electives
      const { department, year, semester } = user;
      const schemaName = `${department.toLowerCase()}_courses`;
      const tableName = `${year}-${semester}`;

      const inputElectiveGroup: string = electiveGroup;
      const normalizedName: string = inputElectiveGroup
        .replace(/–/g, "-") // Replace en dash with regular hyphen
        .replace(/\s*-\s*/g, " - "); // Normalize whitespace around hyphens

      console.log("Normalized name:", normalizedName);

      const finalElectiveGroup: string = normalizedName.includes("Lab")
        ? normalizedName.split(" - ")[1].replace("Lab", "LAB") // For PE-III-LAB
        : `PE-${normalizedName.split(" - ")[1]}`;

      const { data: allCourses } = await supabase
        .schema(schemaName)
        .from(finalElectiveGroup)
        .select("id, course_code")
        .eq("id", courseId)
        .single();

      if (fetchError || !allCourses) {
        console.log(courseId);
        console.log(finalElectiveGroup);
        throw new Error(
          "Failed to retrieve course_code for the selected elective"
        );
      }

      const selectedElectives = existingElectives?.selected_electives || {};
      selectedElectives[finalElectiveGroup] = allCourses.course_code;

      // Update user's selected electives
      const { error: updateError } = await supabase
        .from("users")
        .update({ selected_electives: selectedElectives })
        .eq("id", user.id);

      if (updateError) {
        throw updateError;
      }
    } catch (error: any) {
      console.error("Error selecting elective:", error);
      throw new Error(`Failed to select elective: ${error.message}`);
    }
  },

  getSelectedElectives: async (): Promise<Record<string, string>> => {
    const user = authService.getCurrentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    try {
      const { data, error } = await supabase
        .from("users")
        .select("selected_electives")
        .eq("id", user.id)
        .single();

      if (error) {
        throw error;
      }

      return data?.selected_electives || {};
    } catch (error: any) {
      console.error("Error fetching selected electives:", error);
      throw new Error(`Failed to fetch selected electives: ${error.message}`);
    }
  },

  getAvailableSemesters: async (): Promise<string[]> => {
    const user = authService.getCurrentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    try {
      // Get all available semesters for the user's department
      const { data, error } = await supabase
        .schema(`${user.department.toLowerCase()}_courses`)
        .from("semesters")
        .select("semester")
        .order("semester");

      if (error) {
        throw error;
      }

      return data.map((row) => row.semester);
    } catch (error: any) {
      console.error("Error fetching available semesters:", error);
      throw new Error(`Failed to fetch available semesters: ${error.message}`);
    }
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
