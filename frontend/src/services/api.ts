/**
 * This file would typically contain database connection setup.
 * For this demo, we're using localStorage to simulate a database.
 * In a real application, this would use an actual SQLite connection.
 */

import { db, connectToDatabase } from "../db/database";
import { User, Course, Request, FeeReceipt, Notification } from "../db/models";
import axios from "axios";
import { supabase } from "../lib/supabase";
import { comparePassword } from "../services/auth";

// Connect to the database
connectToDatabase();

// Authentication service
export const authService = {
  signup: async (username: string, password: string) => {
    try {
      // First get the student's email and name from the students table
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("email, name, department")
        .eq("roll_number", username)
        .single();

      if (studentError || !student) {
        throw new Error("Student not found");
      }

      // Create user in Supabase auth with the student's email
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: student.email,
        password: password,
      });

      if (authError) {
        throw new Error(authError.message);
      }

      return authData;
    } catch (error: unknown) {
      console.error("Signup error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to sign up";
      throw new Error(errorMessage);
    }
  },

  login: async (username: string, password: string) => {
    try {
      // Admin bypass
      if (username === "admin" && password === "admin") {
        // ... existing admin bypass logic ...
      }

      // First, check if the user exists in the users table (by username or roll_no)
      const { data: existingUser, error: userError } = await supabase
        .from("users")
        .select()
        .or(`username.eq.${username},roll_no.eq.${username}`)
        .single();

      if (!existingUser) {
        // Get student's email and name from students table
        const { data: student, error: studentError } = await supabase
          .from("students")
          .select("email, name, department")
          .eq("roll_number", username)
          .single();

        if (studentError || !student) {
          throw new Error("Student not found");
        }

        // User doesn't exist in users table, try to sign up with Supabase
        const authData = await authService.signup(username, password);

        if (!authData.user?.id) {
          throw new Error("Failed to create auth user");
        }

        // If Supabase auth successful, create user in users table
        const { data: newUser, error: createError } = await supabase
          .from("users")
          .insert({
            id: authData.user.id, // Use the Supabase auth uid as the user id
            username: username,
            name: student.name,
            department: student.department,
            roll_no: username,
            password: password, // This will be the roll number for first login
            email: student.email,
            role: "student",
            is_first_login: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (createError) {
          console.error("Create user error:", createError);
          throw new Error("Failed to create user account");
        }

        return newUser;
      }

      // For first-time login, the password is the roll number
      if (existingUser.is_first_login) {
        if (existingUser.password !== password) {
          throw new Error("Invalid password");
        }
        // Return the user with is_first_login flag
        return { ...existingUser, is_first_login: true };
      } else {
        // For subsequent logins, compare with bcrypt hashed password
        const isPasswordValid = await comparePassword(
          password,
          existingUser.password
        );
        if (!isPasswordValid) {
          throw new Error("Invalid password");
        }
        return existingUser;
      }
    } catch (error: unknown) {
      console.error("Login error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to login";
      throw new Error(errorMessage);
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
    } catch (error: unknown) {
      console.error("getCourses: Final catch block error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch courses";
      throw new Error(errorMessage);
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
    } catch (error: unknown) {
      console.error("Error uploading fee receipt:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to upload fee receipt";
      throw new Error(errorMessage);
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
    try {
      const { department, year, semester } = user;
      const schemaName = `${department.toLowerCase()}_courses`;
      const normalizedName = courseName
        .replace(/–/g, "-")
        .replace(/\s*-\s*/g, " - ");
      const isLab = /lab/i.test(normalizedName);
      const electiveGroup = isLab
        ? "LAB"
        : `PE-${normalizedName.split(" - ")[1]}`;
      const { data, error } = await supabase
        .schema(`${schemaName}`)
        .from(`${electiveGroup}`)
        .select("*");
      if (error) {
        console.error("Error fetching elective options:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to fetch elective options";
        throw new Error(errorMessage);
      }
      return data as Course[];
    } catch (error: unknown) {
      console.error("Error fetching elective options:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to fetch elective options";
      throw new Error(errorMessage);
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
      const { department, year, semester } = user;
      const schemaName = `${department.toLowerCase()}_courses`;
      const normalizedName = electiveGroup
        .replace(/–/g, "-")
        .replace(/\s*-\s*/g, " - ");
      const isLab = /lab/i.test(normalizedName);
      const finalElectiveGroup = isLab
        ? "LAB"
        : `PE-${normalizedName.split(" - ")[1]}`;
      const { data: allCourses } = await supabase
        .schema(schemaName)
        .from(finalElectiveGroup)
        .select("id, course_code")
        .eq("id", courseId)
        .single();
      if (!allCourses) {
        throw new Error(
          "Failed to retrieve course_code for the selected elective"
        );
      }
      const { data: existingElectives } = await supabase
        .from("users")
        .select("selected_electives")
        .eq("id", user.id)
        .single();
      const selectedElectives = existingElectives?.selected_electives || {};
      selectedElectives[finalElectiveGroup] = allCourses.course_code;
      await supabase
        .from("users")
        .update({ selected_electives: selectedElectives })
        .eq("id", user.id);
    } catch (error: unknown) {
      console.error("Error selecting elective:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to select elective";
      throw new Error(errorMessage);
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
    } catch (error: unknown) {
      console.error("Error fetching selected electives:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to fetch selected electives";
      throw new Error(errorMessage);
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
    } catch (error: unknown) {
      console.error("Error fetching available semesters:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to fetch available semesters";
      throw new Error(errorMessage);
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

      // Get all department schemas to check
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
      ];

      // First try the user's department schema
      departmentSchemas.unshift(`${user.department.toLowerCase()}_courses`);

      console.log(
        `getOpenElectiveOptions: Will try these schemas:`,
        departmentSchemas
      );

      let data: OpenElectiveRecord[] = [];

      // Try each schema
      for (const schema of departmentSchemas) {
        console.log(
          `getOpenElectiveOptions: Trying schema "${schema}" with table "${electiveGroup}"`
        );

        // Query the table with schema
        const result = await supabase
          .schema(schema)
          .from(electiveGroup)
          .select(
            "id, course_code, course_name, offering_department, enrolled_out"
          );

        if (!result.error && result.data && result.data.length > 0) {
          console.log(
            `getOpenElectiveOptions: Success! Found data in "${schema}.${electiveGroup}"`,
            result.data
          );
          data = [...data, ...(result.data as OpenElectiveRecord[])];
        } else {
          console.log(
            `getOpenElectiveOptions: No data found in "${schema}.${electiveGroup}" or error:`,
            result.error
          );
        }
      }

      if (data.length === 0) {
        console.error(
          `getOpenElectiveOptions: Could not find data in any of the attempted schemas/tables`
        );
        return [];
      }

      // Deduplicate by id (or course_code if id is missing)
      const uniqueCoursesMap = new Map();
      for (const course of data) {
        const key = course.id?.toString() || course.course_code;
        if (!uniqueCoursesMap.has(key)) {
          uniqueCoursesMap.set(key, course);
        }
      }
      const uniqueCourses = Array.from(uniqueCoursesMap.values());

      // Instead of filtering, mark courses as unavailable
      return uniqueCourses.map((course) => {
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
