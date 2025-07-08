import { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../../components/ui/sheet";
import { toast } from "sonner";
import {
  CheckCircle,
  Clock,
  FileText,
  Filter,
  RefreshCw,
  XCircle,
  Eye,
  FilePenLine,
  Search,
  PauseCircle,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  Download,
  Mail,
} from "lucide-react";
import { format } from "date-fns";
import { adminSupabaseService } from "../../services/adminSupabaseService";
import { authService } from "../../services/api";
import Modal from "../../components/ui/Modal";
import * as XLSX from "xlsx";
import emailjs from "@emailjs/browser";
import { Textarea } from "../../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { supabase } from "../../lib/supabase";

export interface AdminRequest {
  id: string;
  type: string;
  status: string;
  user?: {
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
  uploaded_at?: string | Date;
  reviewed_at?: string | Date;
}

export interface Student {
  roll_number: string;
  name: string;
  year: number;
  semester: number;
  email: string;
  department: string;
}

const ITEMS_PER_PAGE = 50;
const YEARS = ["I", "II", "III", "IV"];

const StudentRequests = () => {
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [unregisteredStudents, setUnregisteredStudents] = useState<Student[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<AdminRequest | null>(
    null
  );
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentUser] = useState(authService.getCurrentUser());
  const [rejectionComment, setRejectionComment] = useState("");
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [selectedRequestForRejection, setSelectedRequestForRejection] =
    useState<AdminRequest | null>(null);
  const [rejectionAction, setRejectionAction] = useState<
    "rejected" | "on_hold" | null
  >(null);
  const [unregisteredPage, setUnregisteredPage] = useState(1);

  // Initialize EmailJS
  useEffect(() => {
    emailjs.init(import.meta.env.VITE_EMAILJS_PUBLIC_KEY || "");
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      // Helper function to convert year to both formats for filtering (same as FeeReportsSection)
      const getYearFilters = (year: string) => {
        if (year === "all") return null;
        const yearIndex = YEARS.indexOf(year);
        if (yearIndex !== -1) {
          // Convert Roman numeral to number (I=1, II=2, III=3, IV=4)
          const yearNumber = (yearIndex + 1).toString();
          return [year, yearNumber]; // Return both formats
        }
        return [year]; // If it's already a number, just use as is
      };

      const yearFilters = getYearFilters(selectedYear);

      // Get current user info for department filtering
      const isDeptAdmin = authService.isDepartmentAdmin();
      const adminDepartment = authService.getAdminDepartment();
      const isSuperAdmin = currentUser?.role === "admin" && !currentUser?.roll_no?.startsWith("ADMIN_");

      // Fetch requests with proper filtering (same logic as FeeReportsSection)
      let requestsQuery = supabase
        .from("users")
        .select(
          "id, name, roll_no, email, department, fee_status, semester, payment_mode, transaction_number, bank_name, fee_receipt_url, created_at, updated_at, year"
        )
        .eq("role", "student") // Only students
        .order("created_at", { ascending: false });

      // Filter by department if department admin, or by selectedDepartment if super admin
      if (isDeptAdmin && adminDepartment) {
        requestsQuery = requestsQuery.eq("department", adminDepartment);
      } else if (isSuperAdmin && currentUser?.department !== "all") {
        requestsQuery = requestsQuery.eq("department", currentUser?.department);
      }

      // Add year filter if specified
      if (yearFilters) {
        if (yearFilters.length === 2) {
          // Filter by both Roman numeral and number formats
          requestsQuery = requestsQuery.or(`year.eq.${yearFilters[0]},year.eq.${yearFilters[1]}`);
        } else {
          requestsQuery = requestsQuery.eq("year", yearFilters[0]);
        }
      }

      const { data: requestsData, error: requestsError } = await requestsQuery;

      if (requestsError) throw requestsError;

      // Transform to AdminRequest format
      const data = (requestsData as any[]).map((user) => ({
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

      // Fetch unregistered students with same logic as FeeReportsSection
      let unregisteredQuery = supabase
        .from("students25")
        .select("roll_number, name, department, year, semester, email");

      // Filter by department if department admin, or by selectedDepartment if super admin
      if (isDeptAdmin && adminDepartment) {
        unregisteredQuery = unregisteredQuery.eq("department", adminDepartment);
      } else if (isSuperAdmin && currentUser?.department !== "all") {
        unregisteredQuery = unregisteredQuery.eq("department", currentUser?.department);
      }

      // Add year filter if specified
      if (yearFilters) {
        if (yearFilters.length === 2) {
          // Filter by both Roman numeral and number formats
          unregisteredQuery = unregisteredQuery.or(`year.eq.${yearFilters[0]},year.eq.${yearFilters[1]}`);
        } else {
          unregisteredQuery = unregisteredQuery.eq("year", yearFilters[0]);
        }
      }

      const { data: students25Data, error: studentsError } = await unregisteredQuery;

      if (studentsError) throw studentsError;

      // Get registered roll numbers from the SAME DEPARTMENT to filter out
      let registeredQuery = supabase
        .from("users")
        .select("roll_no")
        .eq("role", "student");

      // Filter by department if department admin, or by selectedDepartment if super admin
      if (isDeptAdmin && adminDepartment) {
        registeredQuery = registeredQuery.eq("department", adminDepartment);
      } else if (isSuperAdmin && currentUser?.department !== "all") {
        registeredQuery = registeredQuery.eq("department", currentUser?.department);
      }

      const { data: registeredRollNumbers, error: rollNumbersError } = await registeredQuery;

      if (rollNumbersError) throw rollNumbersError;

      // Create a set of registered roll numbers for efficient lookup
      const registeredRollSet = new Set((registeredRollNumbers as { roll_no: string }[]).map(u => u.roll_no));

      // Debug: Log some sample data to verify the comparison
      console.log("Sample registered roll numbers:", Array.from(registeredRollSet).slice(0, 5));
      console.log("Sample students25 roll numbers:", (students25Data as any[]).slice(0, 5).map(s => s.roll_number));

      // Filter out registered students - compare roll_number (students25) with roll_no (users)
      const students = (students25Data as any[]).filter(
        (student) => !registeredRollSet.has(student.roll_number)
      ).map(student => ({
        roll_number: student.roll_number,
        name: student.name,
        year: student.year,
        semester: student.semester,
        email: student.email,
        department: student.department,
      }));

      console.log(`Total students25: ${(students25Data as any[]).length}`);
      console.log(`Registered students in department: ${registeredRollSet.size}`);
      console.log(`Unregistered students: ${students.length}`);

      setRequests(data);
      setUnregisteredStudents(students);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    setCurrentPage(1); // Reset to first page when tab changes
    setUnregisteredPage(1); // Reset unregistered students page
  }, [activeTab, selectedYear]);

  const sendEmailNotification = async (
    request: AdminRequest,
    status: string,
    comment?: string
  ) => {
    if (!request.user?.email) {
      console.error("No email address found for student");
      toast.error("Cannot send email: No email address found for student");
      return;
    }

    // Format the status for better readability
    const formattedStatus = status.charAt(0).toUpperCase() + status.slice(1);

    // Create the email body with proper formatting
    const emailBody = `
Dear ${request.user.name},

Your fee receipt has been ${formattedStatus}.

${comment ? `Reason for rejection: ${comment}` : ""}

Department: ${request.user.department}
Roll Number: ${request.user.rollNo}
Date: ${format(new Date(), "MMM d, yyyy")}

Please contact your department administrator if you have any questions.

Best regards,
Edmit Team
    `.trim();

    const templateParams = {
      to_email: request.user.email,
      to_name: request.user.name,
      subject: `Fee Receipt ${formattedStatus} - ${request.user.rollNo}`,
      message: emailBody,
    };

    try {
      const response = await emailjs.send(
        import.meta.env.VITE_EMAILJS_SERVICE_ID || "",
        import.meta.env.VITE_EMAILJS_TEMPLATE_ID || "",
        templateParams
      );

      if (response.status === 200) {
        toast.success("Email notification sent successfully");
      } else {
        throw new Error(`EmailJS returned status ${response.status}`);
      }
    } catch (error) {
      console.error("Error sending email:", error);
      toast.error("Failed to send email notification");
    }
  };

  const handleRejectOrHoldWithComment = async () => {
    if (!selectedRequestForRejection || !rejectionAction) return;
    setProcessing(selectedRequestForRejection.id);
    try {
      await adminSupabaseService.updateRequestStatus(
        selectedRequestForRejection.id,
        rejectionAction,
        rejectionComment
      );
      await sendEmailNotification(
        selectedRequestForRejection,
        rejectionAction,
        rejectionComment
      );
      toast(
        rejectionAction === "rejected"
          ? "Request rejected"
          : "Request put on hold"
      );
      fetchRequests();
      setShowRejectionDialog(false);
      setRejectionComment("");
      setSelectedRequestForRejection(null);
      setRejectionAction(null);
      if (detailsOpen) {
        setDetailsOpen(false);
      }
    } catch (error) {
      console.error(`Error updating request:`, error);
      toast(
        rejectionAction === "rejected"
          ? "Failed to reject request"
          : "Failed to put request on hold"
      );
    } finally {
      setProcessing(null);
    }
  };

  const handleUpdateStatus = async (
    requestId: string,
    status: "approved" | "rejected" | "on_hold"
  ) => {
    if (status === "rejected" || status === "on_hold") {
      const request = requests.find((r) => r.id === requestId);
      if (request) {
        setSelectedRequestForRejection(request);
        setRejectionAction(status);
        setShowRejectionDialog(true);
      }
      return;
    }
    setProcessing(requestId);
    try {
      await adminSupabaseService.updateRequestStatus(requestId, status);
      const request = requests.find((r) => r.id === requestId);
      if (request) {
        await sendEmailNotification(request, status);
      }
      toast(`Request ${status.replace("_", " ")}`);
      if (status === "approved") {
        toast("Fee slip approved. Student now has access to courses.");
      }
      fetchRequests();
      if (detailsOpen) {
        setDetailsOpen(false);
      }
    } catch (error) {
      console.error(`Error updating request ${requestId}:`, error);
      toast("Failed to update request status");
    } finally {
      setProcessing(null);
    }
  };

  const handleViewDetails = (request: AdminRequest) => {
    setSelectedRequest(request);
    setDetailsOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge
            variant="outline"
            className="bg-yellow-100 text-yellow-800 border-yellow-300"
          >
            <Clock className="h-3 w-3 mr-1" /> Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge
            variant="outline"
            className="bg-green-100 text-green-800 border-green-300"
          >
            <CheckCircle className="h-3 w-3 mr-1" /> Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge
            variant="outline"
            className="bg-red-100 text-red-800 border-red-300"
          >
            <XCircle className="h-3 w-3 mr-1" /> Rejected
          </Badge>
        );
      case "on_hold":
        return (
          <Badge
            variant="outline"
            className="bg-purple-100 text-purple-800 border-purple-300"
          >
            <PauseCircle className="h-3 w-3 mr-1" /> On Hold
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Filter requests by status
  const getFilteredRequests = () => {
    const filtered = requests.filter((req) => req.status !== "not uploaded");
    return filtered.filter((req) => req.status === activeTab);
  };

  // Get counts for each status
  const getStatusCounts = () => {
    // Don't filter out "not uploaded" since we're now only fetching students
    // and want to show all statuses like FeeReportsSection
    return {
      pending: requests.filter((req) => req.status === "pending").length,
      approved: requests.filter((req) => req.status === "approved").length,
      rejected: requests.filter((req) => req.status === "rejected").length,
      on_hold: requests.filter((req) => req.status === "on_hold").length,
    };
  };

  // Pagination functions
  const getPaginatedData = (data: any[]) => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return data.slice(startIndex, endIndex);
  };

  const getTotalPages = (data: any[]) => {
    return Math.ceil(data.length / ITEMS_PER_PAGE);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleUnregisteredPageChange = (newPage: number) => {
    setUnregisteredPage(newPage);
  };

  const handlePreview = (url: string) => {
    setPreviewUrl(url);
    setShowModal(true);
  };

  const handleDownload = (url: string, rollNo: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `${rollNo}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadExcel = (data: AdminRequest[]) => {
    // Prepare data for Excel
    const excelData = data.map((request) => ({
      "Roll Number": request.user?.rollNo || "N/A",
      Name: request.user?.name || "N/A",
      Department: request.user?.department || "N/A",
      Status: request.status.charAt(0).toUpperCase() + request.status.slice(1),
      "Payment Mode": request.payment_mode || "N/A",
      "Transaction Number": request.transaction_number || "N/A",
      "Bank Name": request.bank_name || "N/A",
      "Submitted Date": request.uploaded_at
        ? format(new Date(request.uploaded_at), "MMM d, yyyy")
        : "N/A",
      "Last Updated": request.reviewed_at
        ? format(new Date(request.reviewed_at), "MMM d, yyyy")
        : "N/A",
    }));

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Fee Receipts");

    // Generate Excel file
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fee_receipts_${activeTab}_${format(
      new Date(),
      "yyyy-MM-dd"
    )}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadUnregisteredExcel = (data: Student[]) => {
    // Prepare data for Excel
    const excelData = data.map((student) => ({
      "Roll Number": student.roll_number,
      Name: student.name,
      Department: student.department,
      Year: student.year,
      Semester: student.semester,
      Email: student.email,
      Status: "Not Registered",
    }));

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Unregistered Students");

    // Generate Excel file
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `unregistered_students_${format(
      new Date(),
      "yyyy-MM-dd"
    )}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Student Management
          </h1>
          {currentUser?.role === "admin" &&
            currentUser?.roll_no?.startsWith("ADMIN_") && (
              <p className="text-sm text-gray-600 mt-1">
                Showing students for {currentUser.department} department
              </p>
            )}
        </div>

        <div className="flex items-center gap-4">
          <Select
            value={selectedYear}
            onValueChange={(value) => {
              setSelectedYear(value);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {YEARS.map((year) => (
                <SelectItem key={year} value={year}>
                  Year {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={fetchRequests}
            className="self-start"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Card className="transition-all duration-300 hover:shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Student Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            defaultValue="pending"
            value={activeTab}
            onValueChange={setActiveTab}
            className="transition-opacity duration-300"
          >
            <TabsList className="grid grid-cols-4 md:grid-cols-4 mb-4">
              <TabsTrigger value="pending">
                Pending ({getStatusCounts().pending})
              </TabsTrigger>
              <TabsTrigger value="approved">
                Approved ({getStatusCounts().approved})
              </TabsTrigger>
              <TabsTrigger value="rejected">
                Rejected ({getStatusCounts().rejected})
              </TabsTrigger>
              <TabsTrigger value="on_hold">
                On Hold ({getStatusCounts().on_hold})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              {renderRequestsList()}
              {renderUnregisteredStudents()}
            </TabsContent>

            <TabsContent value="approved" className="space-y-4">
              {renderRequestsList()}
            </TabsContent>

            <TabsContent value="rejected" className="space-y-4">
              {renderRequestsList()}
            </TabsContent>

            <TabsContent value="on_hold" className="space-y-4">
              {renderRequestsList()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Request Details Sheet */}
      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Fee Receipt Details</SheetTitle>
            <SheetDescription>
              <div className="flex gap-2">
                {selectedRequest && getStatusBadge(selectedRequest.status)}
              </div>
            </SheetDescription>
          </SheetHeader>

          <div className="py-6">
            {selectedRequest && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Student Information
                  </h3>
                  <div className="font-medium">
                    <p className="font-medium">
                      {selectedRequest.user?.name || "N/A"} -{" "}
                      {selectedRequest.user?.rollNo || "N/A"}
                    </p>
                    <p className="text-sm text-gray-600">
                      {selectedRequest.user?.department}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Fee Receipt
                  </h3>
                  <div className="mt-2 p-4 border rounded-md bg-gray-50">
                    {selectedRequest.receipt_url ? (
                      <div className="space-y-4">
                        <div className="h-[400px] border rounded-md overflow-hidden">
                          <embed
                            src={selectedRequest.receipt_url}
                            type="application/pdf"
                            className="w-full h-full"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleDownload(
                                selectedRequest.receipt_url!,
                                selectedRequest.user?.rollNo || "receipt"
                              )
                            }
                          >
                            Download PDF
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <FileText className="h-12 w-12 mx-auto text-gray-400" />
                        <p className="mt-2 text-sm text-gray-600">
                          No fee receipt available
                        </p>
                      </div>
                    )}
                    <div className="mt-4 text-left space-y-2">
                      {selectedRequest.semester && (
                        <div>
                          <span className="font-medium">Semester:</span>{" "}
                          {selectedRequest.semester}
                        </div>
                      )}
                      {selectedRequest.payment_mode && (
                        <div>
                          <span className="font-medium">Payment Mode:</span>{" "}
                          {selectedRequest.payment_mode}
                        </div>
                      )}
                      {selectedRequest.transaction_number && (
                        <div>
                          <span className="font-medium">
                            Transaction Number/UTR:
                          </span>{" "}
                          {selectedRequest.transaction_number}
                        </div>
                      )}
                      {selectedRequest.bank_name && (
                        <div>
                          <span className="font-medium">Bank Name:</span>{" "}
                          {selectedRequest.bank_name}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500">
                    Request Timeline
                  </h3>
                  <div className="mt-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Submitted:</span>
                      <span>
                        {selectedRequest.uploaded_at
                          ? format(
                              new Date(selectedRequest.uploaded_at),
                              "MMM d, yyyy h:mm a"
                            )
                          : "N/A"}
                      </span>
                    </div>
                    {selectedRequest.reviewed_at && (
                      <div className="flex justify-between mt-1">
                        <span className="text-gray-500">Last Updated:</span>
                        <span>
                          {format(
                            new Date(selectedRequest.reviewed_at),
                            "MMM d, yyyy h:mm a"
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col space-y-2 pt-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">
                    Update Status
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="default"
                      onClick={() =>
                        handleUpdateStatus(selectedRequest.id, "approved")
                      }
                      disabled={
                        processing === selectedRequest.id ||
                        selectedRequest.status === "approved"
                      }
                      className="transition-colors duration-200"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() =>
                        handleUpdateStatus(selectedRequest.id, "rejected")
                      }
                      disabled={
                        processing === selectedRequest.id ||
                        selectedRequest.status === "rejected"
                      }
                      className="transition-colors duration-200"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>

                  <Button
                    variant="outline"
                    onClick={() =>
                      handleUpdateStatus(selectedRequest.id, "on_hold")
                    }
                    disabled={
                      processing === selectedRequest.id ||
                      selectedRequest.status === "on_hold"
                    }
                    className="mt-2 transition-colors duration-200"
                  >
                    <PauseCircle className="h-4 w-4 mr-2" />
                    Put On Hold
                  </Button>

                  {selectedRequest.status === "approved" && (
                    <Alert className="mt-4 bg-green-50 border-green-200 animate-pulse">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertTitle className="text-green-800">
                        Fee Slip Approved
                      </AlertTitle>
                      <AlertDescription className="text-green-700">
                        Student now has access to all mandatory courses for
                        their semester.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {showModal && previewUrl && (
        <Modal onClose={() => setShowModal(false)}>
          <div className="w-[600px] h-[700px] flex flex-col">
            <h3 className="text-lg font-bold mb-2">Fee Receipt Preview</h3>
            <embed
              src={previewUrl}
              type="application/pdf"
              className="w-full h-full border rounded"
            />
            <Button className="mt-4" onClick={() => setShowModal(false)}>
              Close
            </Button>
          </div>
        </Modal>
      )}

      {/* Rejection Dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {rejectionAction === "rejected"
                ? "Reject Fee Receipt"
                : "Put Fee Receipt On Hold"}
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for{" "}
              {rejectionAction === "rejected" ? "rejection" : "putting on hold"}
              . This will be included in the email sent to the student and
              stored in the system.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder={`Enter ${
                rejectionAction === "rejected" ? "rejection" : "on hold"
              } reason...`}
              value={rejectionComment}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setRejectionComment(e.target.value)
              }
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectionDialog(false);
                setRejectionComment("");
                setSelectedRequestForRejection(null);
                setRejectionAction(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant={
                rejectionAction === "rejected" ? "destructive" : "outline"
              }
              onClick={handleRejectOrHoldWithComment}
              disabled={!rejectionComment.trim() || !!processing}
            >
              {processing
                ? rejectionAction === "rejected"
                  ? "Rejecting..."
                  : "Putting on hold..."
                : rejectionAction === "rejected"
                ? "Reject"
                : "Put On Hold"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  function renderPagination(totalItems: number) {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-600">
          Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
          {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of {totalItems}{" "}
          items
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  function renderUnregisteredPagination(totalItems: number) {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-600">
          Showing {(unregisteredPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
          {Math.min(unregisteredPage * ITEMS_PER_PAGE, totalItems)} of {totalItems}{" "}
          items
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleUnregisteredPageChange(unregisteredPage - 1)}
            disabled={unregisteredPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {unregisteredPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleUnregisteredPageChange(unregisteredPage + 1)}
            disabled={unregisteredPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  function renderUnregisteredStudents() {
    if (loading) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse transition-all duration-300">
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (unregisteredStudents.length === 0) {
      return null;
    }

    // Use separate pagination for unregistered students
    const startIndex = (unregisteredPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedStudents = unregisteredStudents.slice(startIndex, endIndex);

    return (
      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <UserPlus className="h-5 w-5 mr-2" />
            Unregistered Students
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              handleDownloadUnregisteredExcel(unregisteredStudents)
            }
            className="transition-colors duration-200"
          >
            <Download className="h-4 w-4 mr-1" /> Download Excel
          </Button>
        </div>
        {paginatedStudents.map((student) => (
          <Card
            key={student.roll_number}
            className="overflow-hidden transition-all duration-300 hover:shadow-md"
          >
            <div className="h-1 bg-blue-500"></div>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge
                      variant="outline"
                      className="bg-blue-100 text-blue-800 border-blue-300"
                    >
                      <UserPlus className="h-3 w-3 mr-1" /> Not Registered
                    </Badge>
                  </div>

                  <h3 className="font-medium">
                    {student.name} - {student.roll_number}
                  </h3>

                  <p className="text-sm text-gray-500">
                    {student.department} • Year {student.year} • Semester{" "}
                    {student.semester}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Add functionality to register student
                      toast.info(
                        "Register student functionality to be implemented"
                      );
                    }}
                    className="transition-colors duration-200"
                  >
                    <UserPlus className="h-4 w-4 mr-1" /> Register
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {renderUnregisteredPagination(unregisteredStudents.length)}
      </div>
    );
  }

  function renderRequestsList() {
    if (loading) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse transition-all duration-300">
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    const filteredRequests = getFilteredRequests();
    const paginatedRequests = getPaginatedData(filteredRequests);

    if (filteredRequests.length === 0) {
      return (
        <Alert className="transition-all duration-300 hover:shadow-sm">
          <AlertTitle className="flex items-center">
            <Search className="h-4 w-4 mr-2" />
            No requests found
          </AlertTitle>
          <AlertDescription>
            There are no {activeTab} fee receipt requests at this time.
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Fee Receipt Requests
          </h3>
          {(activeTab === "pending" ||
            activeTab === "approved" ||
            activeTab === "rejected") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownloadExcel(filteredRequests)}
              className="transition-colors duration-200"
            >
              <Download className="h-4 w-4 mr-1" /> Download Excel
            </Button>
          )}
        </div>
        {paginatedRequests.map((request) => (
          <Card
            key={request.id}
            className="overflow-hidden transition-all duration-300 hover:shadow-md"
          >
            <div
              className={`h-1 ${
                request.status === "pending"
                  ? "bg-yellow-500"
                  : request.status === "approved"
                  ? "bg-green-500"
                  : request.status === "on_hold"
                  ? "bg-purple-500"
                  : "bg-red-500"
              }`}
            ></div>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {getStatusBadge(request.status)}
                  </div>

                  <h3 className="font-medium">
                    {request.user?.name || "N/A"} -{" "}
                    {request.user?.rollNo || "N/A"}
                  </h3>

                  <p className="text-sm text-gray-500">
                    Submitted{" "}
                    {request.uploaded_at
                      ? format(new Date(request.uploaded_at), "MMM d, yyyy")
                      : "N/A"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDetails(request)}
                    className="transition-colors duration-200"
                  >
                    <Eye className="h-4 w-4 mr-1" /> View
                  </Button>

                  {request.status === "pending" && (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() =>
                          handleUpdateStatus(request.id, "approved")
                        }
                        disabled={!!processing}
                        className="transition-colors duration-200"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" /> Approve
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() =>
                          handleUpdateStatus(request.id, "rejected")
                        }
                        disabled={!!processing}
                        className="transition-colors duration-200"
                      >
                        <XCircle className="h-4 w-4 mr-1" /> Reject
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          handleUpdateStatus(request.id, "on_hold")
                        }
                        disabled={!!processing}
                        className="transition-colors duration-200"
                      >
                        <PauseCircle className="h-4 w-4 mr-1" /> Hold
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {renderPagination(filteredRequests.length)}
      </div>
    );
  }
};

export default StudentRequests;
