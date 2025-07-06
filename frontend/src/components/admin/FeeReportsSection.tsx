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

        // Get total count of registered students
        let totalQuery = supabase
          .from("users")
          .select("id", { count: "exact" })
          .eq("role", "student");

        // Filter by department if department admin, or by selectedDepartment if super admin
        if (isDeptAdmin && adminDepartment) {
          totalQuery = totalQuery.eq("department", adminDepartment);
        } else if (isSuperAdmin && selectedDepartment !== "all") {
          totalQuery = totalQuery.eq("department", selectedDepartment);
        }

        // Add year filter if specified
        if (yearFilters) {
          if (yearFilters.length === 2) {
            // Filter by both Roman numeral and number formats
            totalQuery = totalQuery.or(`year.eq.${yearFilters[0]},year.eq.${yearFilters[1]}`);
          } else {
            totalQuery = totalQuery.eq("year", yearFilters[0]);
          }
        }

        const { count: registeredCount, error: totalError } = await totalQuery;

        if (totalError) throw totalError;

        // Get count by fee status
        const statuses = ["approved", "pending", "rejected", "on_hold"];
        const statusCounts: Record<string, number> = {};

        for (const status of statuses) {
          let statusQuery = supabase
            .from("users")
            .select("id", { count: "exact" })
            .eq("role", "student")
            .eq("fee_status", status);

          // Filter by department if department admin, or by selectedDepartment if super admin
          if (isDeptAdmin && adminDepartment) {
            statusQuery = statusQuery.eq("department", adminDepartment);
          } else if (isSuperAdmin && selectedDepartment !== "all") {
            statusQuery = statusQuery.eq("department", selectedDepartment);
          }

          // Add year filter if specified
          if (yearFilters) {
            if (yearFilters.length === 2) {
              // Filter by both Roman numeral and number formats
              statusQuery = statusQuery.or(`year.eq.${yearFilters[0]},year.eq.${yearFilters[1]}`);
            } else {
              statusQuery = statusQuery.eq("year", yearFilters[0]);
            }
          }

          const { count, error } = await statusQuery;

          if (error) throw error;
          statusCounts[status] = count || 0;
        }

        // Count students who haven't uploaded (null or empty fee_status)
        let notUploadedQuery = supabase
          .from("users")
          .select("id", { count: "exact" })
          .eq("role", "student")
          .or("fee_status.is.null,fee_status.eq.");

        // Filter by department if department admin, or by selectedDepartment if super admin
        if (isDeptAdmin && adminDepartment) {
          notUploadedQuery = notUploadedQuery.eq("department", adminDepartment);
        } else if (isSuperAdmin && selectedDepartment !== "all") {
          notUploadedQuery = notUploadedQuery.eq(
            "department",
            selectedDepartment
          );
        }

        // Add year filter if specified
        if (yearFilters) {
          if (yearFilters.length === 2) {
            // Filter by both Roman numeral and number formats
            notUploadedQuery = notUploadedQuery.or(`year.eq.${yearFilters[0]},year.eq.${yearFilters[1]}`);
          } else {
            notUploadedQuery = notUploadedQuery.eq("year", yearFilters[0]);
          }
        }

        const { count: notUploadedCount, error: notUploadedError } =
          await notUploadedQuery;

        if (notUploadedError) throw notUploadedError;

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

        // Also fetch detailed data for the table view
        let detailedQuery = supabase
          .from("users")
          .select(
            "id, name, roll_no, email, department, fee_status, payment_mode, transaction_number, bank_name, fee_receipt_url, created_at, updated_at, year"
          )
          .eq("role", "student");

        // Filter by department if department admin, or by selectedDepartment if super admin
        if (isDeptAdmin && adminDepartment) {
          detailedQuery = detailedQuery.eq("department", adminDepartment);
        } else if (isSuperAdmin && selectedDepartment !== "all") {
          detailedQuery = detailedQuery.eq("department", selectedDepartment);
        }

        // Add year filter if specified
        if (yearFilters) {
          if (yearFilters.length === 2) {
            // Filter by both Roman numeral and number formats
            detailedQuery = detailedQuery.or(`year.eq.${yearFilters[0]},year.eq.${yearFilters[1]}`);
          } else {
            detailedQuery = detailedQuery.eq("year", yearFilters[0]);
          }
        }

        const { data: detailed, error: detailedError } =
          await detailedQuery.order("fee_status", { ascending: false });

        if (detailedError) throw detailedError;
        setDetailedData(detailed as DetailedFeeData[]);
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