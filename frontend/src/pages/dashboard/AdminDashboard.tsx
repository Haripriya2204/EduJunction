/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
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
import { authService } from "../../services/api";
import { adminSupabaseService } from "../../services/adminSupabaseService";
import {
  Clock,
  CheckCheck,
  XCircle,
  CalendarDays,
  FileText,
  Users,
  GraduationCap,
  TrendingUp,
  BarChart3,
  PieChart,
  Download,
  RefreshCw,
  Eye,
  UserPlus,
  PauseCircle,
  Upload,
  UserX,
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { useIsMobile } from "../../hooks/use-mobile";
import { useToast } from "../../components/ui/use-toast";
import BlockedStudentsSection from "../../components/admin/BlockedStudentsSection";
import StudentIssuesSection from "../../components/admin/StudentIssuesSection";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";

interface DepartmentStats {
  department: string;
  totalStudents: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  onHoldRequests: number;
  feeStatus: {
    approved: number;
    pending: number;
    rejected: number;
    on_hold: number;
    notUploaded: number;
  };
  unregisteredStudents: number;
}

interface YearStats {
  year: string;
  totalStudents: number;
  totalRequests: number;
  departments: DepartmentStats[];
}

interface DetailedFeeData {
  id: string;
  name: string;
  roll_no: string;
  email: string;
  department: string;
  year: string;
  fee_status: string;
  payment_mode?: string;
  transaction_number?: string;
  bank_name?: string;
  fee_receipt_url?: string;
  created_at: string;
  updated_at: string;
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

// Helper for better pie labels (avoids overlap)
const RADIAN = Math.PI / 180;
const renderPieLabel = ({
  cx,
  cy,
  midAngle,
  outerRadius,
  percent,
  name,
}: any) => {
  // Skip very small slices (<3%) to minimise overlap
  if (percent < 0.03) return null;

  const radius = outerRadius + 14; // position label outside the slice
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#555"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      style={{ fontSize: "12px" }}
    >
      {`${name} ${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const AdminDashboard = () => {
  const currentUser = authService.getCurrentUser();
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [yearStats, setYearStats] = useState<YearStats[]>([]);
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailedData, setDetailedData] = useState<DetailedFeeData[]>([]);
  const isMobile = useIsMobile();
  const { toast } = useToast();

  // Get admin's department if they are a department admin
  const adminDepartment = authService.getAdminDepartment();
  const isDeptAdmin = authService.isDepartmentAdmin();
  const isSuperAdmin =
    currentUser?.role === "admin" &&
    !currentUser?.roll_no?.startsWith("ADMIN_");

  useEffect(() => {
    // Helper to fetch all departments from users table
    const fetchAllDepartments = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("department")
        .neq("department", null)
        .neq("department", "");
      if (error) {
        console.error("Error fetching departments:", error);
        return [];
      }
      // Remove duplicates and null/empty
      const departments = Array.from(
        new Set((data || []).map((row: any) => row.department).filter(Boolean))
      );
      return departments;
    };

    const fetchDetailedStats = async () => {
      try {
        setLoading(true);
        console.log(
          "[AdminDashboard] Fetching users and unregistered students..."
        );

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

        let users: any[] = [];
        let usersError = null;

        // Superadmin, all departments: fetch all departments and aggregate users
        if (isSuperAdmin && selectedDepartment === "all") {
          const departments = await fetchAllDepartments();
          const userResults = await Promise.all(
            departments.map(async (dept) => {
              let query = supabase
                .from("users")
                .select("*", { count: "exact" })
                .eq("role", "student")
                .eq("department", dept);
              if (yearFilters) {
                if (yearFilters.length === 2) {
                  query = query.or(
                    `year.eq.${yearFilters[0]},year.eq.${yearFilters[1]}`
                  );
                } else {
                  query = query.eq("year", yearFilters[0]);
                }
              }
              const { data, error } = await query;
              if (error) {
                console.error(
                  `Error fetching users for department ${dept}:`,
                  error
                );
                return [];
              }
              return data || [];
            })
          );
          users = userResults.flat();
          usersError = null;
        } else {
          // Existing logic for dept admin or superadmin with a specific department
          let usersQuery = supabase
            .from("users")
            .select("*", { count: "exact" })
            .eq("role", "student");

          // Filter by department if department admin, or by selectedDepartment if super admin
          if (isDeptAdmin && adminDepartment) {
            usersQuery = usersQuery.eq("department", adminDepartment);
          } else if (isSuperAdmin && selectedDepartment !== "all") {
            usersQuery = usersQuery.eq("department", selectedDepartment);
          }

          // Add year filter if specified
          if (yearFilters) {
            if (yearFilters.length === 2) {
              usersQuery = usersQuery.or(
                `year.eq.${yearFilters[0]},year.eq.${yearFilters[1]}`
              );
            } else {
              usersQuery = usersQuery.eq("year", yearFilters[0]);
            }
          }

          const { data, error } = await usersQuery;
          users = data || [];
          usersError = error;
        }

        if (usersError) {
          console.error("Error fetching users:", usersError);
          return;
        }
        console.log(`[AdminDashboard] Fetched ${users.length} users`);

        // Fetch unregistered students with same logic as FeeReportsSection
        let unregisteredQuery = supabase
          .from("students25")
          .select("roll_number, name, department, year, semester, email", {
            count: "exact",
          });

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
            unregisteredQuery = unregisteredQuery.or(
              `year.eq.${yearFilters[0]},year.eq.${yearFilters[1]}`
            );
          } else {
            unregisteredQuery = unregisteredQuery.eq("year", yearFilters[0]);
          }
        }

        const { data: students25Data, error: studentsError } =
          await unregisteredQuery;

        if (studentsError) {
          console.error("Error fetching students25:", studentsError);
          return;
        }

        // Get registered roll numbers from the SAME DEPARTMENT to filter out
        let registeredQuery = supabase
          .from("users")
          .select("roll_no", { count: "exact" })
          .eq("role", "student");

        // Filter by department if department admin, or by selectedDepartment if super admin
        if (isDeptAdmin && adminDepartment) {
          registeredQuery = registeredQuery.eq("department", adminDepartment);
        } else if (isSuperAdmin && selectedDepartment !== "all") {
          registeredQuery = registeredQuery.eq(
            "department",
            selectedDepartment
          );
        }

        const { data: registeredRollNumbers, error: rollNumbersError } =
          await registeredQuery;

        if (rollNumbersError) {
          console.error(
            "Error fetching registered roll numbers:",
            rollNumbersError
          );
          return;
        }

        // Create a set of registered roll numbers for efficient lookup
        const registeredRollSet = new Set(
          (registeredRollNumbers as { roll_no: string }[]).map((u) => u.roll_no)
        );

        // Filter out registered students - compare roll_number (students25) with roll_no (users)
        const unregisteredStudents = (students25Data as any[]).filter(
          (student) => !registeredRollSet.has(student.roll_number)
        );

        console.log(
          `[AdminDashboard] Total students25: ${
            (students25Data as any[]).length
          }`
        );
        console.log(
          `[AdminDashboard] Registered students in department: ${registeredRollSet.size}`
        );
        console.log(
          `[AdminDashboard] Unregistered students: ${unregisteredStudents.length}`
        );

        // Group data by year and department
        const yearData: { [key: string]: { [key: string]: any[] } } = {};
        const departmentData: { [key: string]: any[] } = {};

        // Process users
        users.forEach((user: any) => {
          const year = user.year || "Unknown";
          const dept = user.department || "Unknown";

          if (!yearData[year]) yearData[year] = {};
          if (!yearData[year][dept]) yearData[year][dept] = [];
          yearData[year][dept].push(user);

          if (!departmentData[dept]) departmentData[dept] = [];
          departmentData[dept].push(user);
        });

        // Log yearData for debugging
        console.log("[AdminDashboard] yearData:", yearData);

        // Calculate statistics
        const yearStatsArray: YearStats[] = Object.keys(yearData).map(
          (year) => {
            const departments: DepartmentStats[] = Object.keys(
              yearData[year]
            ).map((dept) => {
              const users = yearData[year][dept];
              const totalStudents = users.length;

              const feeStatus = {
                approved: 0,
                pending: 0,
                rejected: 0,
                on_hold: 0,
                notUploaded: 0,
              };

              users.forEach((user: any) => {
                switch (user.fee_status?.toLowerCase()) {
                  case "approved":
                    feeStatus.approved++;
                    break;
                  case "pending":
                    feeStatus.pending++;
                    break;
                  case "rejected":
                    feeStatus.rejected++;
                    break;
                  case "on_hold":
                    feeStatus.on_hold++;
                    break;
                  default:
                    feeStatus.notUploaded++;
                    break;
                }
              });

              // Count unregistered students for this department and year
              const unregisteredCount = unregisteredStudents.filter(
                (student) => {
                  const studentYearStr = student.year
                    ? student.year.toString()
                    : "Unknown";
                  return student.department === dept && studentYearStr === year;
                }
              ).length;

              return {
                department: dept,
                totalStudents,
                pendingRequests: feeStatus.pending,
                approvedRequests: feeStatus.approved,
                rejectedRequests: feeStatus.rejected,
                onHoldRequests: feeStatus.on_hold,
                feeStatus,
                unregisteredStudents: unregisteredCount,
              };
            });

            const totalStudents = departments.reduce(
              (sum, dept) => sum + dept.totalStudents,
              0
            );
            const totalRequests = departments.reduce(
              (sum, dept) =>
                sum +
                dept.pendingRequests +
                dept.approvedRequests +
                dept.rejectedRequests +
                dept.onHoldRequests,
              0
            );

            return {
              year,
              totalStudents,
              totalRequests,
              departments,
            };
          }
        );
        console.log(
          "[AdminDashboard] Processed yearStatsArray:",
          yearStatsArray
        );

        setYearStats(yearStatsArray);

        // Calculate overall department statistics
        const deptStatsArray: DepartmentStats[] = Object.keys(
          departmentData
        ).map((dept) => {
          const users = departmentData[dept];
          const totalStudents = users.length;

          const feeStatus = {
            approved: 0,
            pending: 0,
            rejected: 0,
            on_hold: 0,
            notUploaded: 0,
          };

          users.forEach((user: any) => {
            switch (user.fee_status?.toLowerCase()) {
              case "approved":
                feeStatus.approved++;
                break;
              case "pending":
                feeStatus.pending++;
                break;
              case "rejected":
                feeStatus.rejected++;
                break;
              case "on_hold":
                feeStatus.on_hold++;
                break;
              default:
                feeStatus.notUploaded++;
                break;
            }
          });

          // Count unregistered students for this department
          const unregisteredCount = unregisteredStudents.filter(
            (student) => student.department === dept
          ).length;

          return {
            department: dept,
            totalStudents,
            pendingRequests: feeStatus.pending,
            approvedRequests: feeStatus.approved,
            rejectedRequests: feeStatus.rejected,
            onHoldRequests: feeStatus.on_hold,
            feeStatus,
            unregisteredStudents: unregisteredCount,
          };
        });
        console.log(
          "[AdminDashboard] Processed deptStatsArray:",
          deptStatsArray
        );

        setDepartmentStats(deptStatsArray);

        // Set detailed data for export - only show data for admin's own department
        const detailedDataForExport =
          isDeptAdmin && adminDepartment
            ? users.filter((user: any) => user.department === adminDepartment)
            : users;
        setDetailedData(detailedDataForExport as DetailedFeeData[]);
        console.log("[AdminDashboard] Set detailedData for export.");
      } catch (error) {
        console.error("Error fetching detailed stats:", error);
        toast({
          title: "Error",
          description: "Failed to fetch detailed statistics",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
        console.log("[AdminDashboard] Data fetch and processing complete.");
      }
    };

    fetchDetailedStats();
  }, [
    selectedYear,
    selectedDepartment,
    isDeptAdmin,
    adminDepartment,
    isSuperAdmin,
  ]);

  const handleDownloadExcel = (data: any[], filename: string) => {
    const excelData = data.map((item) => ({
      "Roll Number": item.roll_no || item.roll_number || "N/A",
      Name: item.name || "N/A",
      Department: item.department || "N/A",
      Year: item.year || "N/A",
      "Fee Status": item.fee_status || "Not Uploaded",
      "Payment Mode": item.payment_mode || "N/A",
      "Transaction Number": item.transaction_number || "N/A",
      "Bank Name": item.bank_name || "N/A",
      "Submitted Date": item.created_at
        ? new Date(item.created_at).toLocaleDateString()
        : "N/A",
      "Last Updated": item.updated_at
        ? new Date(item.updated_at).toLocaleDateString()
        : "N/A",
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Fee Reports");

    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const getChartData = (stats: DepartmentStats[]) => {
    return stats.map((dept) => ({
      name: dept.department,
      approved: dept.feeStatus.approved,
      pending: dept.feeStatus.pending,
      rejected: dept.feeStatus.rejected,
      onHold: dept.feeStatus.on_hold,
      notUploaded: dept.feeStatus.notUploaded,
    }));
  };

  const getPieChartData = (stats: DepartmentStats[]) => {
    const total = stats.reduce((sum, dept) => sum + dept.totalStudents, 0);
    const approved = stats.reduce(
      (sum, dept) => sum + dept.feeStatus.approved,
      0
    );
    const pending = stats.reduce(
      (sum, dept) => sum + dept.feeStatus.pending,
      0
    );
    const rejected = stats.reduce(
      (sum, dept) => sum + dept.feeStatus.rejected,
      0
    );
    const onHold = stats.reduce((sum, dept) => sum + dept.feeStatus.on_hold, 0);
    const notUploaded = stats.reduce(
      (sum, dept) => sum + dept.feeStatus.notUploaded,
      0
    );

    return [
      { name: "Approved", value: approved, color: "#4caf50" },
      { name: "Pending", value: pending, color: "#ff9800" },
      { name: "Rejected", value: rejected, color: "#f44336" },
      { name: "On Hold", value: onHold, color: "#2196f3" },
      { name: "Not Uploaded", value: notUploaded, color: "#9e9e9e" },
    ].filter((item) => item.value > 0);
  };

  const filteredYearStats =
    selectedYear === "all"
      ? yearStats
      : yearStats.filter((stat) => stat.year === selectedYear);

  const filteredDepartmentStats =
    selectedDepartment === "all"
      ? departmentStats
      : departmentStats.filter(
          (stat) => stat.department === selectedDepartment
        );

  return (
    <div className="space-y-6 animate-fade-in">

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Detailed Reports Dashboard
          </h1>
          {isDeptAdmin && adminDepartment && (
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

          {isSuperAdmin && (
            <Select
              value={selectedDepartment}
              onValueChange={setSelectedDepartment}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departmentStats.map((stat) => (
                  <SelectItem key={stat.department} value={stat.department}>
                    {stat.department}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="self-start"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>

          <Button
            variant="outline"
            onClick={() =>
              handleDownloadExcel(detailedData, "detailed_fee_reports")
            }
            className="self-start"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList
          className={`w-full mb-4 flex ${
            isMobile
              ? "overflow-x-auto whitespace-nowrap gap-2 scrollbar-hide"
              : "flex-wrap"
          }`}
        >
          <TabsTrigger
            value="overview"
            className={isMobile ? "min-w-[120px]" : ""}
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="yearly"
            className={isMobile ? "min-w-[120px]" : ""}
          >
            Yearly Reports
          </TabsTrigger>
          <TabsTrigger
            value="department"
            className={isMobile ? "min-w-[120px]" : ""}
          >
            Department Reports
          </TabsTrigger>
          <TabsTrigger
            value="charts"
            className={isMobile ? "min-w-[120px]" : ""}
          >
            Charts & Analytics
          </TabsTrigger>
          <TabsTrigger
            value="detailed"
            className={isMobile ? "min-w-[120px]" : ""}
          >
            Detailed View
          </TabsTrigger>
          <TabsTrigger
            value="blocked"
            className={isMobile ? "min-w-[120px]" : ""}
          >
            Blocked Students
          </TabsTrigger>
          <TabsTrigger
            value="issues"
            className={isMobile ? "min-w-[120px]" : ""}
          >
            Student Issues
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="mr-2 h-5 w-5" />
                Overall Statistics
              </CardTitle>
              <CardDescription>
                Comprehensive overview of all departments and years
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading statistics...</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center">
                          <Users className="h-6 w-6 text-blue-500 mr-2" />
                          <div>
                            <div className="text-2xl font-bold">
                              {departmentStats.reduce(
                                (sum, dept) => sum + dept.totalStudents,
                                0
                              )}
                            </div>
                            <div className="text-sm text-gray-600">
                              Total Students
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center">
                          <FileText className="h-6 w-6 text-orange-500 mr-2" />
                          <div>
                            <div className="text-2xl font-bold">
                              {departmentStats.reduce(
                                (sum, dept) =>
                                  sum +
                                  dept.pendingRequests +
                                  dept.approvedRequests +
                                  dept.rejectedRequests +
                                  dept.onHoldRequests,
                                0
                              )}
                            </div>
                            <div className="text-sm text-gray-600">
                              Total Requests
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-2xl font-bold text-green-600">
                              {departmentStats.reduce(
                                (sum, dept) => sum + dept.feeStatus.approved,
                                0
                              )}
                            </div>
                            <div className="text-sm text-gray-600">
                              Approved
                            </div>
                          </div>
                          <CheckCheck className="h-8 w-8 text-green-500" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-2xl font-bold text-yellow-600">
                              {departmentStats.reduce(
                                (sum, dept) => sum + dept.feeStatus.pending,
                                0
                              )}
                            </div>
                            <div className="text-sm text-gray-600">Pending</div>
                          </div>
                          <Clock className="h-8 w-8 text-yellow-500" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-2xl font-bold text-red-600">
                              {departmentStats.reduce(
                                (sum, dept) => sum + dept.feeStatus.rejected,
                                0
                              )}
                            </div>
                            <div className="text-sm text-gray-600">
                              Rejected
                            </div>
                          </div>
                          <XCircle className="h-8 w-8 text-red-500" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-2xl font-bold text-blue-600">
                              {departmentStats.reduce(
                                (sum, dept) => sum + dept.feeStatus.on_hold,
                                0
                              )}
                            </div>
                            <div className="text-sm text-gray-600">On Hold</div>
                          </div>
                          <PauseCircle className="h-8 w-8 text-blue-500" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-2xl font-bold text-gray-600">
                              {departmentStats.reduce(
                                (sum, dept) => sum + dept.feeStatus.notUploaded,
                                0
                              )}
                            </div>
                            <div className="text-sm text-gray-600">
                              Not Uploaded
                            </div>
                          </div>
                          <Upload className="h-8 w-8 text-gray-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="yearly">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CalendarDays className="mr-2 h-5 w-5" />
                Yearly Statistics
              </CardTitle>
              <CardDescription>
                Detailed breakdown by academic year
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-gray-600">
                    Loading yearly statistics...
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredYearStats.length === 0 ? (
                    <div className="text-center py-8">
                      <CalendarDays className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-600">
                        No data available for the selected filters.
                      </p>
                    </div>
                  ) : (
                    filteredYearStats.map((yearStat) => (
                      <Card key={yearStat.year}>
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between">
                            <span>Academic Year: {yearStat.year}</span>
                            <div className="flex gap-2 text-sm">
                              <Badge variant="outline">
                                {yearStat.totalStudents} Students
                              </Badge>
                              <Badge variant="outline">
                                {yearStat.totalRequests} Requests
                              </Badge>
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Department</TableHead>
                                <TableHead>Students</TableHead>
                                <TableHead>Approved</TableHead>
                                <TableHead>Pending</TableHead>
                                <TableHead>Rejected</TableHead>
                                <TableHead>On Hold</TableHead>
                                <TableHead>Not Uploaded</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {yearStat.departments.map((dept) => (
                                <TableRow key={dept.department}>
                                  <TableCell className="font-medium">
                                    {dept.department}
                                  </TableCell>
                                  <TableCell>{dept.totalStudents}</TableCell>
                                  <TableCell>
                                    <Badge
                                      variant="default"
                                      className="bg-green-100 text-green-800"
                                    >
                                      {dept.feeStatus.approved}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="secondary">
                                      {dept.feeStatus.pending}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="destructive">
                                      {dept.feeStatus.rejected}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant="outline"
                                      className="border-blue-300 text-blue-700"
                                    >
                                      {dept.feeStatus.on_hold}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant="outline"
                                      className="border-gray-300 text-gray-700"
                                    >
                                      {dept.feeStatus.notUploaded}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="department">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Department Statistics
              </CardTitle>
              <CardDescription>
                Detailed breakdown by department
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-gray-600">
                    Loading department statistics...
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDepartmentStats.map((deptStat) => (
                    <Card key={deptStat.department}>
                      <CardHeader>
                        <CardTitle className="text-lg">
                          {deptStat.department}
                        </CardTitle>
                        <CardDescription>
                          Total Registered Users: {deptStat.totalStudents}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">
                            Fee Status Breakdown
                          </h4>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm">Approved:</span>
                              <Badge
                                variant="default"
                                className="bg-green-100 text-green-800"
                              >
                                {deptStat.feeStatus.approved}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm">Pending:</span>
                              <Badge variant="secondary">
                                {deptStat.feeStatus.pending}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm">Rejected:</span>
                              <Badge variant="destructive">
                                {deptStat.feeStatus.rejected}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm">On Hold:</span>
                              <Badge
                                variant="outline"
                                className="border-blue-300 text-blue-700"
                              >
                                {deptStat.feeStatus.on_hold}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm">Not Uploaded:</span>
                              <Badge
                                variant="outline"
                                className="border-gray-300 text-gray-700"
                              >
                                {deptStat.feeStatus.notUploaded}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t">
                          <div className="flex justify-between text-sm">
                            <span>Total:</span>
                            <span className="font-medium">
                              {deptStat.totalStudents}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <PieChart className="mr-2 h-5 w-5" />
                  Fee Status Distribution
                </CardTitle>
                <CardDescription>
                  Overall fee status breakdown across all departments
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading chart...</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={getPieChartData(filteredDepartmentStats)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={isMobile ? false : renderPieLabel}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {getPieChartData(filteredDepartmentStats).map(
                          (entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          )
                        )}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="mr-2 h-5 w-5" />
                  Department Comparison
                </CardTitle>
                <CardDescription>
                  Fee status comparison across departments
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading chart...</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={getChartData(filteredDepartmentStats)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="approved" fill="#4caf50" name="Approved" />
                      <Bar dataKey="pending" fill="#ff9800" name="Pending" />
                      <Bar dataKey="rejected" fill="#f44336" name="Rejected" />
                      <Bar dataKey="onHold" fill="#2196f3" name="On Hold" />
                      <Bar
                        dataKey="notUploaded"
                        fill="#9e9e9e"
                        name="Not Uploaded"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="detailed">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Eye className="mr-2 h-5 w-5" />
                  Detailed Student Records
                </div>
                <Button
                  variant="outline"
                  onClick={() =>
                    handleDownloadExcel(
                      detailedData,
                      "detailed_student_records"
                    )
                  }
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </CardTitle>
              <CardDescription>
                {isDeptAdmin && adminDepartment
                  ? `Complete list of student records for ${adminDepartment} department`
                  : "Complete list of all student records with fee status"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2 text-gray-600">
                    Loading detailed records...
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Roll Number</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Year</TableHead>
                        <TableHead>Fee Status</TableHead>
                        <TableHead>Payment Mode</TableHead>
                        <TableHead>Transaction Number</TableHead>
                        <TableHead>Bank Name</TableHead>
                        <TableHead>Submitted Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailedData.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">
                            {student.roll_no}
                          </TableCell>
                          <TableCell>{student.name}</TableCell>
                          <TableCell>{student.department}</TableCell>
                          <TableCell>{student.year}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                student.fee_status === "approved"
                                  ? "default"
                                  : student.fee_status === "pending"
                                  ? "secondary"
                                  : student.fee_status === "rejected"
                                  ? "destructive"
                                  : student.fee_status === "on_hold"
                                  ? "outline"
                                  : "outline"
                              }
                              className={
                                student.fee_status === "approved"
                                  ? "bg-green-100 text-green-800"
                                  : student.fee_status === "on_hold"
                                  ? "border-blue-300 text-blue-700"
                                  : student.fee_status === "not_uploaded" ||
                                    !student.fee_status
                                  ? "border-gray-300 text-gray-700"
                                  : ""
                              }
                            >
                              {student.fee_status || "Not Uploaded"}
                            </Badge>
                          </TableCell>
                          <TableCell>{student.payment_mode || "N/A"}</TableCell>
                          <TableCell>
                            {student.transaction_number || "N/A"}
                          </TableCell>
                          <TableCell>{student.bank_name || "N/A"}</TableCell>
                          <TableCell>
                            {student.created_at
                              ? new Date(
                                  student.created_at
                                ).toLocaleDateString()
                              : "N/A"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blocked">
          <BlockedStudentsSection />
        </TabsContent>

        <TabsContent value="issues">
          <StudentIssuesSection />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
