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
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Badge } from "../../components/ui/badge";
import {
  MessageSquarePlus,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Eye,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";

interface Issue {
  id: string;
  issue_type: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  admin_response?: string;
  responded_at?: string;
  created_at: string;
  updated_at: string;
}

const ISSUE_TYPES = [
  { value: "technical", label: "Technical Issue" },
  { value: "academic", label: "Academic Issue" },
  { value: "administrative", label: "Administrative Issue" },
  { value: "fee", label: "Fee Related" },
  { value: "other", label: "Other" },
];

const SupportIssues = () => {
  const currentUser = authService.getCurrentUser();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);

  // Form state
  const [issueType, setIssueType] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("student_issues")
        .select("*")
        .eq("student_id", currentUser?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setIssues(data || []);
    } catch (error) {
      console.error("Error fetching issues:", error);
      toast.error("Failed to load your issues");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!issueType || !subject.trim() || !description.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      setSubmitting(true);

      const { error } = await supabase.from("student_issues").insert({
        student_id: currentUser?.id,
        student_name: currentUser?.name,
        student_roll_no: currentUser?.roll_no,
        student_email: currentUser?.email,
        department: currentUser?.department,
        issue_type: issueType,
        subject: subject.trim(),
        description: description.trim(),
        status: "pending",
      });

      if (error) throw error;

      toast.success("Your issue has been submitted successfully!");
      setIssueType("");
      setSubject("");
      setDescription("");
      fetchIssues();
    } catch (error) {
      console.error("Error submitting issue:", error);
      toast.error("Failed to submit issue");
    } finally {
      setSubmitting(false);
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

  const pendingIssues = issues.filter((i) => i.status === "pending");
  const inProgressIssues = issues.filter((i) => i.status === "in_progress");
  const resolvedIssues = issues.filter(
    (i) => i.status === "resolved" || i.status === "closed"
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Support & Issues</h1>
        <p className="text-gray-600 mt-1">
          Report issues and track their status
        </p>
      </div>

      <Tabs defaultValue="submit" className="space-y-6">
        <TabsList>
          <TabsTrigger value="submit">Submit New Issue</TabsTrigger>
          <TabsTrigger value="myissues">
            My Issues ({issues.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="submit">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquarePlus className="mr-2 h-5 w-5" />
                Submit a New Issue
              </CardTitle>
              <CardDescription>
                Describe your issue in detail. Your department HOD will review and
                respond to it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="issueType">Issue Type *</Label>
                    <Select value={issueType} onValueChange={setIssueType}>
                      <SelectTrigger id="issueType">
                        <SelectValue placeholder="Select issue type" />
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

                  <div className="space-y-2">
                    <Label>Your Department</Label>
                    <Input value={currentUser?.department} disabled />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    placeholder="Brief summary of your issue"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    maxLength={200}
                  />
                  <p className="text-xs text-gray-500">
                    {subject.length}/200 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Provide detailed information about your issue..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={8}
                    maxLength={2000}
                  />
                  <p className="text-xs text-gray-500">
                    {description.length}/2000 characters
                  </p>
                </div>

                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? "Submitting..." : "Submit Issue"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="myissues">
          <div className="space-y-6">
            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-yellow-600">
                        {pendingIssues.length}
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
                      <div className="text-2xl font-bold text-blue-600">
                        {inProgressIssues.length}
                      </div>
                      <div className="text-sm text-gray-600">In Progress</div>
                    </div>
                    <AlertCircle className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {resolvedIssues.length}
                      </div>
                      <div className="text-sm text-gray-600">Resolved</div>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Issues List */}
            <Card>
              <CardHeader>
                <CardTitle>Your Issues</CardTitle>
                <CardDescription>
                  View all your submitted issues and their status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading issues...</p>
                  </div>
                ) : issues.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <p>You haven't submitted any issues yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Subject</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Submitted</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {issues.map((issue) => (
                          <TableRow key={issue.id}>
                            <TableCell className="font-medium max-w-xs">
                              <div className="truncate">{issue.subject}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {ISSUE_TYPES.find((t) => t.value === issue.issue_type)
                                  ?.label || issue.issue_type}
                              </Badge>
                            </TableCell>
                            <TableCell>{getStatusBadge(issue.status)}</TableCell>
                            <TableCell>{getPriorityBadge(issue.priority)}</TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {new Date(issue.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedIssue(issue);
                                  setShowViewDialog(true);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* View Issue Dialog */}
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
                    HOD Response
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

              {!selectedIssue.admin_response &&
                selectedIssue.status === "pending" && (
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-800">
                      Your issue is pending review by the HOD. You'll be notified
                      once they respond.
                    </p>
                  </div>
                )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupportIssues;
