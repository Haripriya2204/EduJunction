import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { authService } from "../../services/api";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Badge } from "../ui/badge";
import {
  MessageSquare,
  Search,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Eye,
  Reply,
  Filter,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

interface Issue {
  id: string;
  student_id: string;
  student_name: string;
  student_roll_no: string;
  student_email: string;
  department: string;
  issue_type: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  admin_response?: string;
  responded_by?: string;
  responded_at?: string;
  created_at: string;
  updated_at: string;
}

const ISSUE_TYPES = [
  { value: "all", label: "All Types" },
  { value: "technical", label: "Technical Issue" },
  { value: "academic", label: "Academic Issue" },
  { value: "administrative", label: "Administrative Issue" },
  { value: "fee", label: "Fee Related" },
  { value: "other", label: "Other" },
];

const StudentIssuesSection = () => {
  const currentUser = authService.getCurrentUser();
  const adminDepartment = authService.getAdminDepartment();
  const isDeptAdmin = authService.isDepartmentAdmin();

  const [issues, setIssues] = useState<Issue[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [showResponseDialog, setShowResponseDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [response, setResponse] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [newPriority, setNewPriority] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      
      // For admins, we need to bypass RLS since they don't have Supabase auth sessions
      // We'll fetch all issues and filter on the client side
      const { data, error } = await supabase
        .from("student_issues")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching issues:", error);
        throw error;
      }

      // Filter by department if department admin
      let filteredData = data || [];
      if (isDeptAdmin && adminDepartment) {
        filteredData = filteredData.filter(
          (issue) => issue.department === adminDepartment
        );
      }

      setIssues(filteredData);
    } catch (error) {
      console.error("Error fetching issues:", error);
      toast.error("Failed to load student issues");
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async () => {
    if (!selectedIssue || !response.trim() || !newStatus) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setActionLoading(true);

      const updateData: any = {
        admin_response: response.trim(),
        status: newStatus,
        responded_by: currentUser?.id,
        responded_at: new Date().toISOString(),
      };

      if (newPriority) {
        updateData.priority = newPriority;
      }

      const { error } = await supabase
        .from("student_issues")
        .update(updateData)
        .eq("id", selectedIssue.id);

      if (error) throw error;

      toast.success("Response sent successfully!");
      setShowResponseDialog(false);
      setResponse("");
      setNewStatus("");
      setNewPriority("");
      setSelectedIssue(null);
      fetchIssues();
    } catch (error) {
      console.error("Error responding to issue:", error);
      toast.error("Failed to send response");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "in_progress":
        return <AlertCircle className="h-4 w-4" />;
      case "resolved":
        return <CheckCircle className="h-4 w-4" />;
      case "closed":
        return <XCircle className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; className: string }> = {
      pending: { variant: "secondary", className: "bg-yellow-100 text-yellow-800" },
      in_progress: { variant: "default", className: "bg-blue-100 text-blue-800" },
      resolved: { variant: "default", className: "bg-green-100 text-green-800" },
      closed: { variant: "outline", className: "border-gray-300 text-gray-700" },
    };

    const config = variants[status] || variants.pending;

    return (
      <Badge variant={config.variant} className={`gap-1 ${config.className}`}>
        {getStatusIcon(status)}
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, { className: string }> = {
      low: { className: "bg-gray-100 text-gray-800" },
      normal: { className: "bg-blue-100 text-blue-800" },
      high: { className: "bg-orange-100 text-orange-800" },
      urgent: { className: "bg-red-100 text-red-800" },
    };

    const config = variants[priority] || variants.normal;

    return (
      <Badge variant="outline" className={config.className}>
        {priority.toUpperCase()}
      </Badge>
    );
  };

  const filteredIssues = issues.filter((issue) => {
    const matchesSearch =
      issue.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.student_roll_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.subject?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === "all" || issue.issue_type === typeFilter;

    return matchesSearch && matchesType;
  });

  const pendingIssues = filteredIssues.filter((i) => i.status === "pending");
  const inProgressIssues = filteredIssues.filter((i) => i.status === "in_progress");
  const resolvedIssues = filteredIssues.filter(
    (i) => i.status === "resolved" || i.status === "closed"
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="mr-2 h-5 w-5" />
            Student Issues & Support
          </CardTitle>
          <CardDescription>
            View and respond to student-reported issues
            {isDeptAdmin && adminDepartment && (
              <span className="block mt-1">
                Showing issues from {adminDepartment} department
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">{issues.length}</div>
                  <div className="text-sm text-gray-600">Total Issues</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-yellow-600">
                    {pendingIssues.length}
                  </div>
                  <div className="text-sm text-gray-600">Pending</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-blue-600">
                    {inProgressIssues.length}
                  </div>
                  <div className="text-sm text-gray-600">In Progress</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-green-600">
                    {resolvedIssues.length}
                  </div>
                  <div className="text-sm text-gray-600">Resolved</div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by student name, roll number, or subject..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  {ISSUE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Issues Tabs */}
            <Tabs defaultValue="all" className="mt-6">
              <TabsList>
                <TabsTrigger value="all">All ({filteredIssues.length})</TabsTrigger>
                <TabsTrigger value="pending">
                  Pending ({pendingIssues.length})
                </TabsTrigger>
                <TabsTrigger value="in_progress">
                  In Progress ({inProgressIssues.length})
                </TabsTrigger>
                <TabsTrigger value="resolved">
                  Resolved ({resolvedIssues.length})
                </TabsTrigger>
              </TabsList>

              {["all", "pending", "in_progress", "resolved"].map((tab) => {
                const tabIssues =
                  tab === "all"
                    ? filteredIssues
                    : tab === "pending"
                    ? pendingIssues
                    : tab === "in_progress"
                    ? inProgressIssues
                    : resolvedIssues;

                return (
                  <TabsContent key={tab} value={tab}>
                    {loading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                        <p className="mt-2 text-gray-600">Loading issues...</p>
                      </div>
                    ) : tabIssues.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <MessageSquare className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                        <p>No issues found</p>
                      </div>
                    ) : (
                      <div className="border rounded-lg overflow-hidden mt-4">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Student</TableHead>
                              <TableHead>Roll No</TableHead>
                              <TableHead>Subject</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Priority</TableHead>
                              <TableHead>Submitted</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {tabIssues.map((issue) => (
                              <TableRow key={issue.id}>
                                <TableCell className="font-medium">
                                  {issue.student_name}
                                </TableCell>
                                <TableCell>{issue.student_roll_no}</TableCell>
                                <TableCell className="max-w-xs">
                                  <div className="truncate">{issue.subject}</div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {ISSUE_TYPES.find(
                                      (t) => t.value === issue.issue_type
                                    )?.label || issue.issue_type}
                                  </Badge>
                                </TableCell>
                                <TableCell>{getStatusBadge(issue.status)}</TableCell>
                                <TableCell>
                                  {getPriorityBadge(issue.priority)}
                                </TableCell>
                                <TableCell className="text-sm text-gray-600">
                                  {new Date(issue.created_at).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedIssue(issue);
                                        setShowViewDialog(true);
                                      }}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={() => {
                                        setSelectedIssue(issue);
                                        setResponse(issue.admin_response || "");
                                        setNewStatus(issue.status);
                                        setNewPriority(issue.priority);
                                        setShowResponseDialog(true);
                                      }}
                                    >
                                      <Reply className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Issue Details</DialogTitle>
            <DialogDescription>
              {selectedIssue && (
                <div className="flex gap-2 mt-2">
                  {getStatusBadge(selectedIssue.status)}
                  {getPriorityBadge(selectedIssue.priority)}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedIssue && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Student Name
                  </Label>
                  <p className="mt-1">{selectedIssue.student_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Roll Number
                  </Label>
                  <p className="mt-1">{selectedIssue.student_roll_no}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Email</Label>
                <p className="mt-1">{selectedIssue.student_email}</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Issue Type
                </Label>
                <p className="mt-1">
                  {ISSUE_TYPES.find((t) => t.value === selectedIssue.issue_type)
                    ?.label || selectedIssue.issue_type}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">Subject</Label>
                <p className="mt-1">{selectedIssue.subject}</p>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Description
                </Label>
                <p className="mt-1 text-gray-600 whitespace-pre-wrap">
                  {selectedIssue.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Submitted On
                  </Label>
                  <p className="mt-1">
                    {new Date(selectedIssue.created_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Last Updated
                  </Label>
                  <p className="mt-1">
                    {new Date(selectedIssue.updated_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {selectedIssue.admin_response && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <Label className="text-sm font-medium text-blue-900">
                    Your Response
                  </Label>
                  <p className="mt-2 text-gray-700 whitespace-pre-wrap">
                    {selectedIssue.admin_response}
                  </p>
                  {selectedIssue.responded_at && (
                    <p className="text-xs text-gray-600 mt-2">
                      Responded on:{" "}
                      {new Date(selectedIssue.responded_at).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Response Dialog */}
      <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Respond to Issue</DialogTitle>
            <DialogDescription>
              Provide a response and update the issue status
            </DialogDescription>
          </DialogHeader>

          {selectedIssue && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-700">
                  {selectedIssue.student_name} ({selectedIssue.student_roll_no})
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedIssue.subject}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Status *</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger id="status" className="mt-2">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={newPriority} onValueChange={setNewPriority}>
                    <SelectTrigger id="priority" className="mt-2">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="response">Your Response *</Label>
                <Textarea
                  id="response"
                  placeholder="Enter your response to the student..."
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  rows={6}
                  className="mt-2"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowResponseDialog(false);
                setResponse("");
                setNewStatus("");
                setNewPriority("");
                setSelectedIssue(null);
              }}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRespond}
              disabled={actionLoading || !response.trim() || !newStatus}
            >
              {actionLoading ? "Sending..." : "Send Response"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentIssuesSection;
