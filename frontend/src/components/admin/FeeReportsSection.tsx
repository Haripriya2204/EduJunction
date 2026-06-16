import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useToast } from "../ui/use-toast";
import { authService } from "../../services/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { FileText, Check, X, Clock, BarChart2, RefreshCw } from "lucide-react";
import { useAcademicYear } from "../../contexts/AcademicYearContext";
import AcademicYearPicker from "../dashboard/AcademicYearPicker";

interface FeeStatusReport {
  year: string;
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  on_hold: number;
  not_uploaded: number;
  unregistered: number;
}

interface DetailedFeeData {
  id: string;
  name: string;
  roll_no: string;
  email: string;
  department: string;
  fee_status: string;
  payment_mode?: string;
  transaction_number?: string;
  bank_name?: string;
  fee_receipt_url?: string;
  created_at: string;
  updated_at: string;
}

interface FeeReportsSectionProps {
  selectedDepartment: string;
  departments: string[];
  isSuperAdmin: boolean;
  onDepartmentChange: (value: string) => void;
}

const COLORS = [
  "#4caf50",
  "#ff9800",
  "#f44336",
  "#2196f3",
  "#9e9e9e",
  "#673ab7",
];
const YEARS = ["I", "II", "III", "IV"];

const FeeReportsSection = ({
  selectedDepartment,
  departments,
  isSuperAdmin,
  onDepartmentChange,
}: FeeReportsSectionProps) => {
  const { academicYear } = useAcademicYear();
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [reportData, setReportData] = useState<FeeStatusReport | null>(null);
  const [detailedData, setDetailedData] = useState<DetailedFeeData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("summary");
  const { toast } = useToast();

  // Get admin's department if they are a department admin
  const adminDepartment = authService.getAdminDepartment();
  const isDeptAdmin = authService.isDepartmentAdmin();

  // Fetch report data when year or department changes
  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      try {
        // Helper function to convert year to both formats for filtering
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

        // Fetch the filtered set of registered students.
        let studentsQuery = supabase
          .from("users")
          .select(
            "id, name, roll_no, email, department, year, semester, created_at"
          )
          .eq("role", "student");

        // Filter by department if department admin, or by selectedDepartment if super admin
        if (isDeptAdmin && adminDepartment) {
          studentsQuery = studentsQuery.eq("department", adminDepartment);
        } else if (isSuperAdmin && selectedDepartment !== "all") {
          studentsQuery = studentsQuery.eq("department", selectedDepartment);
        }

        // Add year filter if specified
        if (yearFilters) {
          if (yearFilters.length === 2) {
            studentsQuery = studentsQuery.or(
              `year.eq.${yearFilters[0]},year.eq.${yearFilters[1]}`
            );
          } else {
            studentsQuery = studentsQuery.eq("year", yearFilters[0]);
          }
        }

        const { data: studentsRaw, error: studentsError } = await studentsQuery;
        if (studentsError) throw studentsError;
        const students = (studentsRaw as any[]) || [];
        const registeredCount = students.length;

        // Fetch this academic year's receipts for these students (chunked to
        // avoid oversized URLs) and keep the latest per student. fee_receipts
        // is the per-academic-year source of truth.
        const studentIds = students.map((s) => s.id);
        const latestReceiptByUser = new Map<string, any>();
        const CHUNK = 150;
        for (let i = 0; i < studentIds.length; i += CHUNK) {
          const ids = studentIds.slice(i, i + CHUNK);
          const { data: receipts, error: receiptsError } = await supabase
            .from("fee_receipts")
            .select(
              "id, user_id, semester, payment_mode, transaction_number, bank_name, file_url, status, uploaded_at, reviewed_at"
            )
            .eq("academic_year", academicYear)
            .in("user_id", ids)
            .order("uploaded_at", { ascending: false });
          if (receiptsError) throw receiptsError;
          for (const r of (receipts as any[]) || []) {
            if (!latestReceiptByUser.has(r.user_id)) {
              latestReceiptByUser.set(r.user_id, r);
            }
          }
        }

        // Tally statuses for the selected academic year and build the detailed rows.
        const statusCounts: Record<string, number> = {
          approved: 0,
          pending: 0,
          rejected: 0,
          on_hold: 0,
        };
        let notUploadedCount = 0;
        const detailed: DetailedFeeData[] = students.map((s) => {
          const rc = latestReceiptByUser.get(s.id);
          const status = rc?.status || "not_uploaded";
          if (status in statusCounts) {
            statusCounts[status] += 1;
          } else {
            notUploadedCount += 1;
          }
          return {
            id: s.id,
            name: s.name,
            roll_no: s.roll_no,
            email: s.email,
            department: s.department,
            fee_status: status === "not_uploaded" ? "" : status,
            payment_mode: rc?.payment_mode,
            transaction_number: rc?.transaction_number,
            bank_name: rc?.bank_name,
            fee_receipt_url: rc?.file_url,
            created_at: rc?.uploaded_at || s.created_at,
            updated_at: rc?.reviewed_at,
          };
        });

        // Get count of unregistered students (in students25 but not in users)
        let unregisteredQuery = supabase
          .from("students25")
          .select("roll_number", { count: "exact" });

        // Filter by department if department admin, or by selectedDepartment if super admin
        if (isDeptAdmin && adminDepartment) {
          unregisteredQuery = unregisteredQuery.eq(
            "department",
            adminDepartment
          );
        } else if (isSuperAdmin && selectedDepartment !== "all") {
          unregisteredQuery = unregisteredQuery.eq(
            "department",
            selectedDepartment
          );
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

        const { count: students25Count, error: unregisteredError } =
          await unregisteredQuery;

        if (unregisteredError) throw unregisteredError;

        // Calculate unregistered students: students25_count - users_count
        const unregisteredCount = Math.max(0, (students25Count || 0) - (registeredCount || 0));

        // Create report data
        const total = (registeredCount || 0) + unregisteredCount;
        const report: FeeStatusReport = {
          year: selectedYear,
          total,
          approved: statusCounts.approved || 0,
          pending: statusCounts.pending || 0,
          rejected: statusCounts.rejected || 0,
          on_hold: statusCounts.on_hold || 0,
          not_uploaded: notUploadedCount || 0,
          unregistered: unregisteredCount,
        };

        setReportData(report);
        setDetailedData(detailed);
      } catch (error) {
        console.error("Error fetching report data:", error);
        toast({
          title: "Error",
          description: "Failed to fetch report data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [
    selectedYear,
    selectedDepartment,
    academicYear,
    toast,
    adminDepartment,
    isDeptAdmin,
    isSuperAdmin,
  ]);

  // Prepare chart data
  const getChartData = () => {
    if (!reportData) return [];

    return [
      { name: "Approved", value: reportData.approved, color: "#4caf50" },
      { name: "Pending", value: reportData.pending, color: "#ff9800" },
      { name: "Rejected", value: reportData.rejected, color: "#f44336" },
      { name: "On Hold", value: reportData.on_hold, color: "#2196f3" },
      {
        name: "Not Uploaded",
        value: reportData.not_uploaded,
        color: "#9e9e9e",
      },
      {
        name: "Unregistered",
        value: reportData.unregistered,
        color: "#673ab7",
      },
    ].filter((item) => item.value > 0); // Only show non-zero values
  };

  // Get status icon
  const getStatusIcon = (status: string | null) => {
    if (!status) return <Clock className="h-4 w-4 text-gray-500" />;

    switch (status.toLowerCase()) {
      case "approved":
        return <Check className="h-4 w-4 text-green-500" />;
      case "rejected":
        return <X className="h-4 w-4 text-red-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-orange-500" />;
      case "on_hold":
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleRefresh = () => {
    // Trigger re-fetch of data based on current filters
    setSelectedYear(selectedYear); // Re-triggers year effect
    onDepartmentChange(selectedDepartment); // Re-triggers department effect
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Fee Reports</h1>
          {isDeptAdmin && (
            <p className="text-sm text-gray-600 mt-1">
              Showing reports for {adminDepartment} department
            </p>
          )}
          {isSuperAdmin && selectedDepartment !== "all" && (
            <p className="text-sm text-gray-600 mt-1">
              Showing reports for {selectedDepartment} department
            </p>
          )}
        </div>

        <div className="flex items-center gap-4">
          <AcademicYearPicker />
          {isSuperAdmin && (
            <Select
              value={selectedDepartment}
              onValueChange={onDepartmentChange}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={selectedYear} onValueChange={setSelectedYear}>
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

          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs
        defaultValue="summary"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList>
          <TabsTrigger value="summary">
            <BarChart2 className="h-4 w-4 mr-2" />
            Summary
          </TabsTrigger>
          <TabsTrigger value="detailed">
            <FileText className="h-4 w-4 mr-2" />
            Detailed View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : reportData ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Students
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{reportData.total}</div>
                    <p className="text-xs text-gray-500">
                      Including {reportData.unregistered} unregistered students
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Pending Approvals
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {reportData.pending}
                    </div>
                    <p className="text-xs text-gray-500">
                      Fee receipts pending approval
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Approved
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {reportData.approved}
                    </div>
                    <p className="text-xs text-gray-500">
                      Fee receipts approved
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Fee Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getChartData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) =>
                            `${name} (${(percent * 100).toFixed(0)}%)`
                          }
                        >
                          {getChartData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center text-gray-500">No data available</div>
          )}
        </TabsContent>

        <TabsContent value="detailed">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : detailedData.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Roll No</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Payment Mode</TableHead>
                      <TableHead>Transaction Details</TableHead>
                      <TableHead>Submitted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailedData.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(student.fee_status)}
                            <span className="capitalize">
                              {student.fee_status || "Not Uploaded"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{student.name}</TableCell>
                        <TableCell>{student.roll_no}</TableCell>
                        <TableCell>{student.department}</TableCell>
                        <TableCell>{student.payment_mode || "-"}</TableCell>
                        <TableCell>
                          {student.transaction_number ? (
                            <div className="text-sm">
                              <div>UTR: {student.transaction_number}</div>
                              {student.bank_name && (
                                <div>Bank: {student.bank_name}</div>
                              )}
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {student.created_at
                            ? new Date(student.created_at).toLocaleDateString()
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center text-gray-500">No data available</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FeeReportsSection;