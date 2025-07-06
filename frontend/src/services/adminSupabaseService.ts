import { supabase } from "../lib/supabase";

interface User {
  id: string;
  username: string;
  name: string;
  password?: string;
  department: string;
  role: string;
  email: string;
  roll_no: string;
  semester: string;
  mobile_number?: string;
  position?: string;
  profile_picture?: string;
  department_id?: number;
  created_at?: string;
  updated_at?: string;
  year?: string;
  fee_status: string;
  approved_semester?: string;
  payment_mode?: string;
  transaction_number?: string;
  bank_name?: string;
  fee_receipt_url?: string;
  is_elective?: boolean;
  category?: string;
  pe_group_id?: number;
  oe_group_id?: number;
  offering_department?: string;
}

export interface Student {
  roll_number: string;
  name: string;
  year: number;
  semester: number;
  email: string;
  department: string;
}

export interface AdminRequest {
  id: string;
  type: string;
  status: string;
  user: {
    id: string;
    name: string;
    rollNo: string;
    email?: string;
    department?: string;
  };
  semester?: string;
  payment_mode?: string;
  transaction_number?: string;
  bank_name?: string;
  receipt_url?: string;
  uploaded_at?: string;
  reviewed_at?: string;
}

export const adminSupabaseService = {
  supabase,

  async getAllDepartments(): Promise<string[]> {
    const { data, error } = await supabase
      .from("users")
      .select("department")
      .not("department", "is", null);

    if (error) {
      console.error("Error fetching departments:", error);
      throw error;
    }

    const uniqueDepartments = Array.from(
      new Set(data.map((item) => item.department))
    );
    return uniqueDepartments as string[];
  },

  async getAllRequestsSupabase(year?: string): Promise<AdminRequest[]> {
    let query = supabase
      .from("users")
      .select(
        `
        id,
        name,
        roll_no,
        email,
        department,
        fee_status,
        semester,
        payment_mode,
        transaction_number,
        bank_name,
        fee_receipt_url,
        created_at,
        year
      `
      )
      .order("created_at", { ascending: false });

    // Add year filter if specified
    if (year && year !== "all") {
      // Handle both Roman numerals and numbers
      const YEARS = ["I", "II", "III", "IV"];
      const yearIndex = YEARS.indexOf(year);
      if (yearIndex !== -1) {
        // Convert Roman numeral to number for filtering
        const yearNumber = (yearIndex + 1).toString();
        query = query.or(`year.eq.${year},year.eq.${yearNumber}`);
      } else {
        // If year is already a number, filter by both formats
        const yearNumber = parseInt(year);
        if (!isNaN(yearNumber) && yearNumber >= 1 && yearNumber <= 4) {
          const romanYear = YEARS[yearNumber - 1];
          query = query.or(`year.eq.${year},year.eq.${romanYear}`);
        } else {
          query = query.eq("year", year);
        }
      }
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data as User[]).map((user) => ({
      id: user.id,
      type: "feeslip", // Assuming all requests from users table related to fees are feeslip
      status: user.fee_status,
      user: {
        id: user.id,
        name: user.name,
        rollNo: user.roll_no,
        email: user.email,
        department: user.department,
      },
      semester: user.semester,
      payment_mode: user.payment_mode,
      transaction_number: user.transaction_number,
      bank_name: user.bank_name,
      receipt_url: user.fee_receipt_url,
      uploaded_at: user.created_at,
      reviewed_at: user.updated_at, // Use updated_at for reviewed_at if available
    }));
  },

  async getPendingFeeSlipRequests(): Promise<AdminRequest[]> {
    const { data, error } = await supabase
      .from("users")
      .select(
        `
        id,
        name,
        roll_no,
        email,
        department,
        fee_status,
        semester,
        payment_mode,
        transaction_number,
        bank_name,
        fee_receipt_url,
        created_at
      `
      )
      .eq("fee_status", "pending")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data as unknown as User[]).map((user) => ({
      id: user.id,
      type: "feeslip",
      status: user.fee_status,
      user: {
        id: user.id,
        name: user.name,
        rollNo: user.roll_no,
        email: user.email,
        department: user.department,
      },
      semester: user.semester,
      payment_mode: user.payment_mode,
      transaction_number: user.transaction_number,
      bank_name: user.bank_name,
      receipt_url: user.fee_receipt_url,
      uploaded_at: user.created_at,
      reviewed_at: user.updated_at,
    }));
  },

  async updateRequestStatus(
    requestId: string,
    status: string,
    rejectionComment?: string
  ): Promise<void> {
    const updateData: any = {
      fee_status: status,
      reviewed_at: new Date().toISOString(),
    };

    // Add rejection_comment if status is rejected or on_hold and comment is provided
    if ((status === "rejected" || status === "on_hold") && rejectionComment) {
      updateData.rejection_comment = rejectionComment;
    }

    const { error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", requestId);

    if (error) {
      console.error("Error updating request status:", error);
      throw error;
    }
  },

  async getUnregisteredStudents(
    department: string,
    year?: string
  ): Promise<Student[]> {
    const { data: registeredUsers, error: userError } = await supabase
      .from("users")
      .select("roll_no");

    if (userError) throw userError;

    // Specify the type for registeredUsers
    const registeredSet = new Set((registeredUsers as { roll_no: string }[]).map((u) => u.roll_no));

    let query = supabase.from("students25").select("*");

    // Add department filter if specified and not "all"
    if (department && department !== "all") {
      query = query.eq("department", department);
    }

    // Add year filter if specified
    if (year && year !== "all") {
      // Handle both Roman numerals and numbers
      const YEARS = ["I", "II", "III", "IV"];
      const yearIndex = YEARS.indexOf(year);
      if (yearIndex !== -1) {
        // Convert Roman numeral to number for filtering
        const yearNumber = (yearIndex + 1).toString();
        query = query.or(`year.eq.${year},year.eq.${yearNumber}`);
      } else {
        // If year is already a number, filter by both formats
        const yearNumber = parseInt(year);
        if (!isNaN(yearNumber) && yearNumber >= 1 && yearNumber <= 4) {
          const romanYear = YEARS[yearNumber - 1];
          query = query.or(`year.eq.${year},year.eq.${romanYear}`);
        } else {
          query = query.eq("year", year);
        }
      }
    }

    const { data: students, error: studentError } = await query;

    if (studentError) throw studentError;

    // Specify the type for students
    return (students as Student[]).filter(
      (student) => !registeredSet.has(student.roll_number)
    );
  },

  // Update admin password
  async updateAdminPassword(
    userId: string,
    newPassword: string
  ): Promise<void> {
    const { error } = await supabase
      .from("users")
      .update({ password: newPassword })
      .eq("id", userId);
    if (error) {
      console.error("Error updating admin password:", error);
      throw error;
    }
  },
};
