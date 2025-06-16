import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useToast } from "../ui/use-toast";
import { authService } from "../../services/api";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "../ui/table";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend 
} from "recharts";
import { 
  FileText, 
  Check, 
  X, 
  Clock, 
  BarChart2, 
  RefreshCw,
  Download
} from "lucide-react";
import * as XLSX from 'xlsx';

interface FeeStatusReport {
  semester: string;
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  on_hold: number;
  not_uploaded: number;
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

const COLORS = ['#4caf50', '#ff9800', '#f44336', '#2196f3', '#9e9e9e'];

const FeeReportsSection = () => {
  const [semesters, setSemesters] = useState<string[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [reportData, setReportData] = useState<FeeStatusReport | null>(null);
  const [detailedData, setDetailedData] = useState<DetailedFeeData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("summary");
  const { toast } = useToast();
  
  // Get admin's department if they are a department admin
  const adminDepartment = authService.getAdminDepartment();
  const isDeptAdmin = authService.isDepartmentAdmin();

  // Fetch available semesters
  useEffect(() => {
    const fetchSemesters = async () => {
      try {
        // Build query based on admin type
        let query = supabase
          .from('users')
          .select('semester')
          .not('semester', 'is', null);
        
        // Filter by department if department admin
        if (adminDepartment) {
          query = query.eq('department', adminDepartment);
        }
        
        const { data, error } = await query.order('semester');

        if (error) throw error;

        // Extract unique semesters
        const uniqueSemesters = Array.from(
          new Set(data.map(item => item.semester).filter(Boolean))
        );
        
        setSemesters(uniqueSemesters as string[]);
        
        // Set default selected semester if available
        if (uniqueSemesters.length > 0) {
          setSelectedSemester(uniqueSemesters[0] as string);
        }
      } catch (error) {
        console.error("Error fetching semesters:", error);
        toast({
          title: "Error",
          description: "Failed to fetch semesters",
          variant: "destructive",
        });
      }
    };

    fetchSemesters();
  }, [toast, adminDepartment]);

  // Fetch report data when semester changes
  useEffect(() => {
    if (!selectedSemester) return;
    
    const fetchReportData = async () => {
      setLoading(true);
      try {
        // Get total count of students in the semester
        let totalQuery = supabase
          .from('users')
          .select('id', { count: 'exact' })
          .eq('semester', selectedSemester)
          .eq('role', 'student');
          
        // Filter by department if department admin
        if (adminDepartment) {
          totalQuery = totalQuery.eq('department', adminDepartment);
        }
        
        const { data: totalData, error: totalError } = await totalQuery;

        if (totalError) throw totalError;

        // Get count by fee status
        const statuses = ['approved', 'pending', 'rejected', 'on_hold'];
        const statusCounts: Record<string, number> = {};

        for (const status of statuses) {
          let statusQuery = supabase
            .from('users')
            .select('id', { count: 'exact' })
            .eq('semester', selectedSemester)
            .eq('role', 'student')
            .eq('fee_status', status);
            
          // Filter by department if department admin
          if (adminDepartment) {
            statusQuery = statusQuery.eq('department', adminDepartment);
          }
          
          const { count, error } = await statusQuery;

          if (error) throw error;
          statusCounts[status] = count || 0;
        }

        // Count students who haven't uploaded (null or empty fee_status)
        let notUploadedQuery = supabase
          .from('users')
          .select('id', { count: 'exact' })
          .eq('semester', selectedSemester)
          .eq('role', 'student')
          .or('fee_status.is.null,fee_status.eq.');
          
        // Filter by department if department admin
        if (adminDepartment) {
          notUploadedQuery = notUploadedQuery.eq('department', adminDepartment);
        }
        
        const { count: notUploadedCount, error: notUploadedError } = await notUploadedQuery;

        if (notUploadedError) throw notUploadedError;

        // Create report data
        const total = totalData.length;
        const report: FeeStatusReport = {
          semester: selectedSemester,
          total,
          approved: statusCounts.approved || 0,
          pending: statusCounts.pending || 0,
          rejected: statusCounts.rejected || 0,
          on_hold: statusCounts.on_hold || 0,
          not_uploaded: notUploadedCount || 0,
        };

        setReportData(report);

        // Also fetch detailed data for the table view
        let detailedQuery = supabase
          .from('users')
          .select('id, name, roll_no, email, department, fee_status, payment_mode, transaction_number, bank_name, fee_receipt_url, created_at, updated_at')
          .eq('semester', selectedSemester)
          .eq('role', 'student');
          
        // Filter by department if department admin
        if (adminDepartment) {
          detailedQuery = detailedQuery.eq('department', adminDepartment);
        }
        
        const { data: detailed, error: detailedError } = await detailedQuery.order('fee_status', { ascending: false });

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
  }, [selectedSemester, toast, adminDepartment]);

  // Prepare chart data
  const getChartData = () => {
    if (!reportData) return [];

    return [
      { name: 'Approved', value: reportData.approved, color: '#4caf50' },
      { name: 'Pending', value: reportData.pending, color: '#ff9800' },
      { name: 'Rejected', value: reportData.rejected, color: '#f44336' },
      { name: 'On Hold', value: reportData.on_hold, color: '#2196f3' },
      { name: 'Not Uploaded', value: reportData.not_uploaded, color: '#9e9e9e' },
    ].filter(item => item.value > 0); // Only show non-zero values
  };

  // Get status icon
  const getStatusIcon = (status: string | null) => {
    if (!status) return <Clock className="h-4 w-4 text-gray-500" />;
    
    switch (status.toLowerCase()) {
      case 'approved':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <X className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'on_hold':
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    if (selectedSemester) {
      // Re-trigger the effect that fetches data
      setSelectedSemester(selectedSemester);
    }
  };

  // Add download function
  const handleDownloadExcel = () => {
    if (!detailedData.length) {
      toast({
        title: "Error",
        description: "No data available to download",
        variant: "destructive",
      });
      return;
    }

    // Prepare data for Excel
    const excelData = detailedData.map(student => ({
      'Roll No': student.roll_no,
      'Name': student.name,
      'Department': student.department,
      'Status': student.fee_status ? student.fee_status.charAt(0).toUpperCase() + student.fee_status.slice(1) : 'Not Uploaded',
      'Payment Mode': student.payment_mode || '-',
      'Transaction No.': student.transaction_number || '-',
      'Bank Name': student.bank_name || '-',
      'Updated On': student.updated_at ? new Date(student.updated_at).toLocaleDateString() : '-'
    }));

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Fee Reports');

    // Generate Excel file
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fee_reports_${selectedSemester}_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Excel report downloaded successfully",
    });
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">
          {isDeptAdmin ? `${adminDepartment} Department - Fee Receipt Reports` : "Fee Receipt Reports"}
        </h2>
        <div className="flex items-center space-x-2">
          <Select
            value={selectedSemester}
            onValueChange={setSelectedSemester}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select semester" />
            </SelectTrigger>
            <SelectContent>
              {semesters.map((semester) => (
                <SelectItem key={semester} value={semester}>
                  {semester}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadExcel}
            disabled={loading || !detailedData.length}
          >
            <Download className="h-4 w-4 mr-2" />
            Download Excel
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
        </div>
      ) : !reportData ? (
        <div className="text-center py-12 text-gray-500">
          {semesters.length > 0 
            ? "Select a semester to view reports" 
            : "No semester data available"}
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="summary">
              <BarChart2 className="h-4 w-4 mr-2" />
              Summary
            </TabsTrigger>
            <TabsTrigger value="detailed">
              <FileText className="h-4 w-4 mr-2" />
              Detailed Report
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Students
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{reportData.total}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Approved Receipts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {reportData.approved}
                    <span className="text-base font-normal text-gray-500 ml-2">
                      ({Math.round((reportData.approved / reportData.total) * 100)}%)
                    </span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Pending Approvals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-500">
                    {reportData.pending}
                    <span className="text-base font-normal text-gray-500 ml-2">
                      ({Math.round((reportData.pending / reportData.total) * 100)}%)
                    </span>
                  </div>
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
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {getChartData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} students`, 'Count']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fee Status Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Count</TableHead>
                      <TableHead>Percentage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <Check className="h-4 w-4 text-green-500 mr-2" />
                          Approved
                        </div>
                      </TableCell>
                      <TableCell>{reportData.approved}</TableCell>
                      <TableCell>
                        {Math.round((reportData.approved / reportData.total) * 100)}%
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 text-orange-500 mr-2" />
                          Pending
                        </div>
                      </TableCell>
                      <TableCell>{reportData.pending}</TableCell>
                      <TableCell>
                        {Math.round((reportData.pending / reportData.total) * 100)}%
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <X className="h-4 w-4 text-red-500 mr-2" />
                          Rejected
                        </div>
                      </TableCell>
                      <TableCell>{reportData.rejected}</TableCell>
                      <TableCell>
                        {Math.round((reportData.rejected / reportData.total) * 100)}%
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 text-blue-500 mr-2" />
                          On Hold
                        </div>
                      </TableCell>
                      <TableCell>{reportData.on_hold}</TableCell>
                      <TableCell>
                        {Math.round((reportData.on_hold / reportData.total) * 100)}%
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 text-gray-500 mr-2" />
                          Not Uploaded
                        </div>
                      </TableCell>
                      <TableCell>{reportData.not_uploaded}</TableCell>
                      <TableCell>
                        {Math.round((reportData.not_uploaded / reportData.total) * 100)}%
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="detailed">
            <Card>
              <CardHeader>
                <CardTitle>Detailed Student Fee Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Roll No</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payment Mode</TableHead>
                        <TableHead>Transaction No.</TableHead>
                        <TableHead>Receipt</TableHead>
                        <TableHead>Updated</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailedData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-4 text-gray-500">
                            No student data available for this semester
                          </TableCell>
                        </TableRow>
                      ) : (
                        detailedData.map((student) => (
                          <TableRow key={student.id}>
                            <TableCell className="font-medium">{student.roll_no}</TableCell>
                            <TableCell>{student.name}</TableCell>
                            <TableCell>{student.department}</TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                {getStatusIcon(student.fee_status)}
                                <span className="ml-2">
                                  {student.fee_status 
                                    ? student.fee_status.charAt(0).toUpperCase() + student.fee_status.slice(1) 
                                    : "Not Uploaded"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>{student.payment_mode || "-"}</TableCell>
                            <TableCell>{student.transaction_number || "-"}</TableCell>
                            <TableCell>
                              {student.fee_receipt_url ? (
                                <a 
                                  href={student.fee_receipt_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline"
                                >
                                  View
                                </a>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell>
                              {student.updated_at 
                                ? new Date(student.updated_at).toLocaleDateString() 
                                : "-"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default FeeReportsSection; 