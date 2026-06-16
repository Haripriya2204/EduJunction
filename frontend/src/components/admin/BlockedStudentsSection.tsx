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
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { Search, Ban, CheckCircle, XCircle, UserX } from "lucide-react";

interface Student {
  id: string;
  username: string;
  name: string;
  roll_no: string;
  email: string;
  department: string;
  year: string;
  semester: string;
  blocked: boolean;
  block_reason?: string;
  blocked_at?: string;
}

const BlockedStudentsSection = () => {
  const currentUser = authService.getCurrentUser();
  const adminDepartment = authService.getAdminDepartment();
  const isDeptAdmin = authService.isDepartmentAdmin();

  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showUnblockDialog, setShowUnblockDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("users")
        .select("*")
        .eq("role", "student")
        .order("name");

      // Filter by department if department admin
      if (isDeptAdmin && adminDepartment) {
        query = query.eq("department", adminDepartment);
      }

      const { data, error } = await query;

      if (error) throw error;

      setStudents(data || []);
    } catch (error) {
      console.error("Error fetching students:", error);
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const handleBlockStudent = async () => {
    if (!selectedStudent || !blockReason.trim()) {
      toast.error("Please provide a reason for blocking");
      return;
    }

    try {
      setActionLoading(true);

      const { error } = await supabase
        .from("users")
        .update({
          blocked: true,
          blocked_by: currentUser?.id,
          blocked_at: new Date().toISOString(),
          block_reason: blockReason.trim(),
        })
        .eq("id", selectedStudent.id);

      if (error) throw error;

      toast.success(`${selectedStudent.name} has been blocked from logging in`);
      setShowBlockDialog(false);
      setBlockReason("");
      setSelectedStudent(null);
      fetchStudents();
    } catch (error) {
      console.error("Error blocking student:", error);
      toast.error("Failed to block student");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnblockStudent = async () => {
    if (!selectedStudent) return;

    try {
      setActionLoading(true);

      const { error } = await supabase
        .from("users")
        .update({
          blocked: false,
          blocked_by: null,
          blocked_at: null,
          block_reason: null,
        })
        .eq("id", selectedStudent.id);

      if (error) throw error;

      toast.success(`${selectedStudent.name} has been unblocked`);
      setShowUnblockDialog(false);
      setSelectedStudent(null);
      fetchStudents();
    } catch (error) {
      console.error("Error unblocking student:", error);
      toast.error("Failed to unblock student");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredStudents = students.filter(
    (student) =>
      student.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.roll_no?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const blockedCount = students.filter((s) => s.blocked).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserX className="mr-2 h-5 w-5" />
            Blocked Students Management
          </CardTitle>
          <CardDescription>
            Search and manage student login access
            {isDeptAdmin && adminDepartment && (
              <span className="block mt-1">
                Showing students from {adminDepartment} department
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold">{students.length}</div>
                  <div className="text-sm text-gray-600">Total Students</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-red-600">
                    {blockedCount}
                  </div>
                  <div className="text-sm text-gray-600">Blocked</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-green-600">
                    {students.length - blockedCount}
                  </div>
                  <div className="text-sm text-gray-600">Active</div>
                </CardContent>
              </Card>
            </div>

            {/* Search */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, roll number, or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Students Table */}
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading students...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchQuery
                  ? "No students found matching your search"
                  : "No students found"}
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Roll Number</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">
                          {student.roll_no}
                        </TableCell>
                        <TableCell>{student.name}</TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {student.email}
                        </TableCell>
                        <TableCell>{student.year}</TableCell>
                        <TableCell>
                          {student.blocked ? (
                            <Badge variant="destructive" className="gap-1">
                              <Ban className="h-3 w-3" />
                              Blocked
                            </Badge>
                          ) : (
                            <Badge variant="default" className="gap-1 bg-green-600">
                              <CheckCircle className="h-3 w-3" />
                              Active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {student.blocked ? (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedStudent(student);
                                  setShowUnblockDialog(true);
                                }}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Unblock
                              </Button>
                              {student.block_reason && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    toast.info(
                                      `Reason: ${student.block_reason}`,
                                      { duration: 5000 }
                                    );
                                  }}
                                >
                                  View Reason
                                </Button>
                              )}
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedStudent(student);
                                setShowBlockDialog(true);
                              }}
                            >
                              <Ban className="h-4 w-4 mr-1" />
                              Block
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Block Dialog */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block Student</DialogTitle>
            <DialogDescription>
              Are you sure you want to block {selectedStudent?.name} (
              {selectedStudent?.roll_no})?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="blockReason">Reason for blocking *</Label>
              <Textarea
                id="blockReason"
                placeholder="Enter the reason for blocking this student..."
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                rows={4}
                className="mt-2"
              />
            </div>
            <p className="text-sm text-gray-600">
              The student will not be able to log in and will see a message to
              meet the HOD.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowBlockDialog(false);
                setBlockReason("");
                setSelectedStudent(null);
              }}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBlockStudent}
              disabled={actionLoading || !blockReason.trim()}
            >
              {actionLoading ? "Blocking..." : "Block Student"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unblock Dialog */}
      <Dialog open={showUnblockDialog} onOpenChange={setShowUnblockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unblock Student</DialogTitle>
            <DialogDescription>
              Are you sure you want to unblock {selectedStudent?.name} (
              {selectedStudent?.roll_no})?
            </DialogDescription>
          </DialogHeader>
          {selectedStudent?.block_reason && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Original Block Reason:
              </p>
              <p className="text-sm text-gray-600">
                {selectedStudent.block_reason}
              </p>
              {selectedStudent.blocked_at && (
                <p className="text-xs text-gray-500 mt-2">
                  Blocked on:{" "}
                  {new Date(selectedStudent.blocked_at).toLocaleString()}
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowUnblockDialog(false);
                setSelectedStudent(null);
              }}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUnblockStudent}
              disabled={actionLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {actionLoading ? "Unblocking..." : "Unblock Student"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BlockedStudentsSection;
