/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
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
      // Require username and password to be identical (roll-number rule).
      // Previously the string "admin" was exempt, which inadvertently
      // allowed anyone to login as an admin by typing "admin" twice.
      if (username !== password) {
        throw new Error("Username and password must be your roll number");
      }

      // Check if the student exists in the students table
      const { data: student, error: studentError } = await supabase
        .from("students25")
        .select()
        .eq("roll_number", username)
        .single();

      if (studentError || !student) {
        throw new Error("Invalid roll number");
      }

      // Check if student is blocked before attempting login
      const { data: userBlockStatus, error: blockCheckError } = await supabase
        .from("users")
        .select("blocked, block_reason")
        .eq("username", username)
        .single();

      if (!blockCheckError && userBlockStatus?.blocked) {
        throw new Error("BLOCKED_USER");
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
              emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
          });

        if (signUpError) {
          console.error("Sign up error:", signUpError);
          throw new Error("Failed to create user account");
        }

        // Wait a moment for the sign-up to complete
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Try to sign in again after sign up
        const { data: signInData, error: signInError } =
          await supabase.auth.signInWithPassword({
            email: student.email,
            password: username,
          });

        if (signInError) {
          console.error("Sign in error after sign up:", signInError);
          throw new Error(
            "Check your student email and confirm the mail from supabase to continue"
          );
        }

        authData = signInData;
      }

      console.log("Auth session:", authData.session);

      // Check if user already exists in users table
      const { data: existingUser, error: userError } = await supabase
        .from("users")
        .select()
        .eq("id", authData.session?.user.id) // Check by auth user ID
        .single();

      let user;

      if (!existingUser) {
        // Create new user if doesn't exist, using auth user ID
        const newUser = {
          id: authData.session?.user.id, // Use auth user ID
          username: student.roll_number,
          name: student.name,
          email: student.email,
          password: student.roll_number, // Use roll number as password
          department: student.branch || student.department || "Unknown", // Fallback to department if branch is not available
          role: "student",
          roll_no: student.roll_number,
          semester: student.semester,
          year: student.year,
          fee_status: "not_uploaded", // Set initial fee status
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
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

  isDepartmentAdmin: (): boolean => {
    const user = authService.getCurrentUser();
    // Super admin has "Administration" department, dept admins have specific departments
    return user?.role === "admin" && user?.department !== "Administration";
  },

  getAdminDepartment: (): string | null => {
    const user = authService.getCurrentUser();
    if (user?.role === "admin" && user?.department !== "Administration") {
      return user.department;
    }
    // For super admin, return null to indicate access to all departments
    return null;
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

  getCourses: async (semester: string) => {
    const user = authService.getCurrentUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    try {
      console.log(
        `getCourses: Fetching courses for user ${user.email} in department ${user.department}`
      );

      const schema = `${user.department.toLowerCase()}_courses`;
      console.log(`getCourses: Using schema: ${schema}, table: ${semester}`);

      // Use the correct supabase schema method from elsewhere in the codebase
      const { data: rawCourses, error } = await supabase
        .schema(schema)
        .from(semester)
        .select("*");

      if (error) {
        console.error("getCourses: Error fetching courses:", error);
        throw new Error("Failed to fetch courses");
      }

      console.log(
        `getCourses: Successfully fetched ${rawCourses.length} raw courses`
      );

      // Process the courses to ensure proper typing and flags
      const courses = rawCourses.map((course) => {
        const courseName = course.course_name || "";
        const courseNameLower = courseName.toLowerCase();

        // Explicitly set isElective flag for elective courses
        const isProfessionalElective = courseNameLower.includes(
          "professional elective"
        );
        const isOpenElective =
          courseNameLower.includes("open elective") ||
          course.course_code === "OEC";

        return {
          ...course,
          isElective:
            course.isElective || isProfessionalElective || isOpenElective,
          // Ensure these fields are present
          course_name: courseName,
          course_code: course.course_code || "",
          department: course.department || user.department,
          credits: course.credits || 0,
        };
      });

      console.log(`getCourses: Processed courses:`, courses);
      console.log(
        `getCourses: Identified ${
          courses.filter((c) => c.isElective).length
        } elective courses`
      );

      const selectedElectivesMap: Record<string, string> = {};

      // Process elective courses to find selected ones
      for (const course of courses) {
        if (!course.isElective) continue;

        const courseNameLower = (course.course_name || "").toLowerCase();
        const isProfessionalElective = courseNameLower.includes(
          "professional elective"
        );
        const isOpenElective =
          courseNameLower.includes("open elective") ||
          course.course_code === "OEC";

        if (isProfessionalElective || isOpenElective) {
          console.log(
            `getCourses: Processing elective course: "${course.course_name}"`
          );

          const electiveType = isProfessionalElective ? "PE" : "OE";

          // Normalize the course name and extract the elective number
          const normalizedName = course.course_name
            .replace(/–/g, "-") // Replace en dash with regular hyphen
            .replace(/\s*-\s*/g, " - "); // Normalize whitespace around hyphens

          const parts = normalizedName.split(" - ");
          if (parts.length < 2) {
            console.warn(
              `getCourses: Could not parse elective group from "${course.course_name}"`
            );
            continue;
          }

          const electiveNumber = parts[1];
          const electiveGroup = `${electiveType}-${electiveNumber}`;
          console.log(
            `getCourses: Mapped to elective group: "${electiveGroup}"`
          );

          // Check if user has selected an elective for this group
          const userSelectedElectives = user.selected_electives || {};
          const selectedCourseCode = userSelectedElectives[electiveGroup];

          if (selectedCourseCode) {
            console.log(
              `getCourses: User has selected elective for ${electiveGroup}: ${selectedCourseCode}`
            );
            selectedElectivesMap[course.course_name] = selectedCourseCode;
          } else {
            console.log(
              `getCourses: No selected elective found for ${electiveGroup}`
            );
          }
        }
      }

      console.log(
        "getCourses: Final selected electives map:",
        selectedElectivesMap
      );
      return { courses, selectedElectivesMap };
    } catch (error) {
      console.error("getCourses: Final catch block error:", error);
      throw new Error("Failed to fetch courses");
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

  getOpenElectiveOptions: async (courseName: string): Promise<Course[]> => {
    const user = authService.getCurrentUser();
    if (!user) {
      console.error("getOpenElectiveOptions: User not authenticated");
      throw new Error("User not authenticated");
    }
    console.log(
      `getOpenElectiveOptions: Called for user ${user.email} in department ${user.department}`
    );
    console.log(`getOpenElectiveOptions: Received courseName: "${courseName}"`);

    // Handle case where courseName might be empty
    if (!courseName) {
      courseName = "Open Elective-I";
      console.log(
        `getOpenElectiveOptions: Empty courseName, defaulting to "${courseName}"`
      );
    }

    // Try to determine the elective group from the course name
    let electiveGroup = "";

    // For names like "Open Elective - I" or "Open Elective-I"
    if (courseName.toLowerCase().includes("open elective")) {
      // Normalize the course name
      const normalizedName = courseName
        .replace(/–/g, "-")
        .replace(/\s*-\s*/g, " - ");

      const parts = normalizedName.split(" - ");
      if (parts.length >= 2) {
        electiveGroup = `OE-${parts[1]}`;
      } else {
        // Try to extract roman numeral (I, II, III) from the name
        const match = courseName.match(/[IVX]+$/);
        if (match) {
          electiveGroup = `OE-${match[0]}`;
        } else {
          // Default to OE-I if we can't determine
          electiveGroup = "OE-I";
        }
      }
    }
    // For course code "OEC"
    else if (courseName.toUpperCase() === "OEC") {
      // Use OE-I as the default for OEC course code
      electiveGroup = "OE-I";
    }
    // Default fallback
    else {
      electiveGroup = "OE-I";
    }

    console.log(
      `getOpenElectiveOptions: Determined table name: "${electiveGroup}"`
    );

    try {
      interface OpenElectiveRecord {
        id: string | number;
        course_code: string;
        course_name: string;
        offering_department: string;
        enrolled_out: boolean | string;
      }

      // Only use the user's department schema
      const schema = `${user.department.toLowerCase()}_courses`;
      let data: OpenElectiveRecord[] = [];

      // Query the table with schema
      const result = await supabase
        .schema(schema)
        .from(electiveGroup)
        .select(
          "id, course_code, course_name, offering_department, enrolled_out"
        );

      if (!result.error && result.data && result.data.length > 0) {
        data = result.data as OpenElectiveRecord[];
      } else {
        console.log(
          `getOpenElectiveOptions: No data found in "${schema}.${electiveGroup}" or error:`,
          result.error
        );
      }

      if (data.length === 0) {
        console.error(
          `getOpenElectiveOptions: Could not find data in the user's department schema/table`
        );
        return [];
      }

      console.log(
        `getOpenElectiveOptions: Successfully fetched ${data.length} raw course(s):`,
        data
      );

      // Instead of filtering, mark courses as unavailable
      return data.map((course) => {
        // Check department against user's department (case insensitive)
        const isFromUserDepartment =
          course.offering_department &&
          user.department &&
          course.offering_department.toUpperCase() ===
            user.department.toUpperCase();

        // Check if course is enrolled out (could be boolean or string "true"/"false")
        const isEnrolledOut =
          course.enrolled_out === true || course.enrolled_out === "true";

        // Generate a reason why this course might be unavailable
        let unavailableReason = "";
        if (isFromUserDepartment) {
          unavailableReason =
            "Cannot select electives from your own department";
        } else if (isEnrolledOut) {
          unavailableReason = "Course enrollment limit reached";
        }

        // Map fields to match the Course interface
        return {
          id:
            course.id?.toString() ||
            course.course_code ||
            `oe-${Math.random().toString(36).substring(2, 9)}`,
          course_name: course.course_name,
          course_code: course.course_code,
          department: course.offering_department,
          semester: user.semester || "",
          credits: 3, // Default credits for open electives
          isElective: true,
          category: "open",
          isAvailable: !isFromUserDepartment && !isEnrolledOut,
          unavailableReason: unavailableReason,
          enrolled_out: isEnrolledOut,
          fromUserDepartment: isFromUserDepartment,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });
    } catch (error: unknown) {
      console.error("getOpenElectiveOptions: Final catch block error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to fetch open elective options: ${errorMessage}`);
    }
  },

  selectOpenElective: async (
    courseName: string,
    courseId: string
  ): Promise<void> => {
    const user = authService.getCurrentUser();
    if (!user) {
      console.error("selectOpenElective: User not authenticated");
      throw new Error("User not authenticated");
    }
    console.log(
      `selectOpenElective: Called for user ${user.email}, courseName: "${courseName}", courseId: "${courseId}"`
    );

    // Determine elective group (table name) from course name
    let electiveGroup = "";

    if (courseName.toLowerCase().includes("open elective")) {
      // Normalize the course name
      const normalizedName = courseName
        .replace(/–/g, "-")
        .replace(/\s*-\s*/g, " - ");

      const parts = normalizedName.split(" - ");
      if (parts.length >= 2) {
        electiveGroup = `OE-${parts[1]}`;
      } else {
        // Try to extract roman numeral (I, II, III) from the name
        const match = courseName.match(/[IVX]+$/);
        if (match) {
          electiveGroup = `OE-${match[0]}`;
        } else {
          // Default to OE-I if we can't determine
          electiveGroup = "OE-I";
        }
      }
    }
    // For course code "OEC"
    else if (courseName.toUpperCase() === "OEC") {
      electiveGroup = "OE-I"; // Default to first open elective
    }
    // Default fallback
    else {
      electiveGroup = "OE-I";
    }

    console.log(
      `selectOpenElective: Determined table name: "${electiveGroup}"`
    );

    try {
      interface OpenElectiveRecord {
        id: string | number;
        course_code: string;
        course_name: string;
        offering_department: string;
        enrolled_out: boolean | string;
      }

      // Try to find the department schema that contains the selected course
      const departmentSchemas = [
        "it_courses",
        "cse_courses",
        "ece_courses",
        "mech_courses",
        "hsm_courses",
        "aero_courses",
        "csd_courses",
        "csc_courses",
        "eee_courses",
        "csm_courses",
      ];

      let selectedCourse: OpenElectiveRecord | null = null;
      let foundSchema = "";

      // Search each schema for the selected course
      for (const schema of departmentSchemas) {
        console.log(
          `selectOpenElective: Searching in schema "${schema}" for course ID ${courseId}`
        );

        // Query the table in each schema
        const result = await supabase
          .schema(schema)
          .from(electiveGroup)
          .select(
            "id, course_code, course_name, offering_department, enrolled_out"
          )
          .eq("id", courseId)
          .maybeSingle();

        if (!result.error && result.data) {
          console.log(
            `selectOpenElective: Found course in "${schema}.${electiveGroup}":`,
            result.data
          );
          selectedCourse = result.data as OpenElectiveRecord;
          foundSchema = schema;
          break;
        }
      }

      if (!selectedCourse) {
        throw new Error(`Course with ID ${courseId} not found in any schema`);
      }

      console.log(`selectOpenElective: Found course:`, selectedCourse);

      // Check for availability
      // Check department against user's department (case insensitive)
      const isFromUserDepartment =
        selectedCourse.offering_department &&
        user.department &&
        selectedCourse.offering_department.toUpperCase() ===
          user.department.toUpperCase();

      // Check if course is enrolled out
      const isEnrolledOut =
        selectedCourse.enrolled_out === true ||
        selectedCourse.enrolled_out === "true";

      // Throw error if course is not available
      if (isFromUserDepartment) {
        throw new Error(
          "You cannot select an open elective from your own department."
        );
      }

      if (isEnrolledOut) {
        throw new Error("This course has reached its enrollment limit.");
      }

      // Now retrieve user's selected electives
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("selected_electives")
        .eq("id", user.id)
        .single();

      if (userError) {
        throw userError;
      }

      // Initialize or update the selected_electives object
      const selectedElectives = userData?.selected_electives || {};

      // Set the selection using the normalized elective group name and course code
      selectedElectives[electiveGroup] = selectedCourse.course_code;

      console.log(
        `selectOpenElective: Updating user's selected electives:`,
        selectedElectives
      );

      // Update the user record
      const { error: updateError } = await supabase
        .from("users")
        .update({ selected_electives: selectedElectives })
        .eq("id", user.id);

      if (updateError) {
        throw updateError;
      }

      console.log(
        `selectOpenElective: Successfully updated user's selected electives`
      );
    } catch (error: unknown) {
      console.error("selectOpenElective: Error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to select open elective: ${errorMessage}`);
    }
  },
};

// Admin service
export const adminService = {
  getRequestsByStatus: async (
    status: "pending" | "approved" | "rejected" | "on_hold"
  ): Promise<Request[]> => {
    const user = authService.getCurrentUser();
    const adminDept = authService.getAdminDepartment();

    // Create API endpoint with status filter
    let endpoint = `/api/requests/department?status=${status}`;

    // Add department filter for department admins
    if (adminDept) {
      endpoint += `&department=${adminDept}`;
    }

    const response = await fetch(endpoint, {
      headers: { ...getAuthHeaders() },
    });
    if (!response.ok) {
      throw new Error("Failed to fetch requests");
    }
    return response.json();
  },

  getAllRequests: async (): Promise<Request[]> => {
    const user = authService.getCurrentUser();
    const adminDept = authService.getAdminDepartment();

    // Create API endpoint
    let endpoint = "/api/requests/department";

    // Add department filter for department admins
    if (adminDept) {
      endpoint += `?department=${adminDept}`;
    }

    const response = await fetch(endpoint, {
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
