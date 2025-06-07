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
  async getAllRequestsSupabase(): Promise<AdminRequest[]> {
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
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data as unknown as User[]).map((user) => ({
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
    newStatus: "approved" | "rejected" | "on_hold"
  ) {
    console.log(
      `[adminSupabaseService] Attempting to update user ${requestId} fee_status to: ${newStatus}`
    );
    const { error } = await supabase
      .from("users")
      .update({
        fee_status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (error) {
      console.error(
        `[adminSupabaseService] Error updating user ${requestId} fee_status:`,
        error
      );
      throw error;
    }
    console.log(
      `[adminSupabaseService] Successfully updated user ${requestId} fee_status to: ${newStatus}`
    );
  },
};
