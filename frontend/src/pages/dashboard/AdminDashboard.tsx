import { useEffect, useState } from "react";
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
  authService,
  adminService,
  Request,
  Notification,
} from "../../services/api";
import { adminSupabaseService } from "../../services/adminSupabaseService";
import {
  ChevronRight,
  Clock,
  CheckCheck,
  XCircle,
  Bell,
  CalendarDays,
  FileText,
  Check,
  PauseCircle,
  Upload,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "../../components/ui/badge";
import { useIsMobile } from "../../hooks/use-mobile";
import { useToast } from "../../components/ui/use-toast";
import Modal from "../../components/ui/Modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";

const AdminDashboard = () => {
  const currentUser = authService.getCurrentUser();
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();
  const { toast } = useToast();

  // State for Fee Slip Approvals tab
  const [feeSlipRequests, setFeeSlipRequests] = useState<any[]>([]);
  const [feeSlipLoading, setFeeSlipLoading] = useState(true);
  const [feeSlipError, setFeeSlipError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch requests stats directly from Supabase
        const requests = await adminSupabaseService.getAllRequestsSupabase();

        // Count requests by status
        const counts = {
          pending: 0,
          approved: 0,
          rejected: 0,
        };

        requests.forEach((req: any) => {
          if (req.status === "pending") counts.pending++;
          else if (req.status === "approved") counts.approved++;
          else if (req.status === "rejected") counts.rejected++;
        });

        setStats(counts);

        // Fetch notifications created by this admin (this still uses the backend for now)
        const notifs = await adminService.getNotificationsCreatedByAdmin();
        setNotifications(notifs);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch fee slip requests when the component mounts or tab is active
  useEffect(() => {
    const fetchFeeSlipRequests = async () => {
      try {
        setFeeSlipLoading(true);
        const pendingRequests =
          await adminSupabaseService.getPendingFeeSlipRequests();
        setFeeSlipRequests(pendingRequests);
        setFeeSlipError(null);
      } catch (err: any) {
        console.error("Error fetching fee slip requests:", err);
        setFeeSlipError(err.message || "Failed to fetch fee slip requests");
        toast({
          title: "Error",
          description: err.message || "Failed to fetch fee slip requests",
          variant: "destructive",
        });
      } finally {
        setFeeSlipLoading(false);
      }
    };
    fetchFeeSlipRequests();
  }, []);

  const handleStatusUpdate = async (
    requestId: string,
    newStatus: "approved" | "rejected" | "on_hold"
  ) => {
    try {
      await adminSupabaseService.updateRequestStatus(requestId, newStatus);
      toast({
        title: "Success",
        description: `Fee slip request status updated to ${newStatus.toLowerCase()}!`,
      });
      // Refresh the list after update
      const updatedRequests =
        await adminSupabaseService.getPendingFeeSlipRequests();
      setFeeSlipRequests(updatedRequests);
    } catch (err: any) {
      console.error("Error updating fee slip request:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to update fee slip request status",
        variant: "destructive",
      });
    }
  };

  const handlePreview = (url: string) => {
    setPreviewUrl(url);
    setShowModal(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: {
      [key: string]: "default" | "secondary" | "destructive" | "outline";
    } = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
      on_hold: "outline",
    };
    return <Badge variant={variants[status.toLowerCase()]}>{status}</Badge>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Clock className="h-6 w-6 text-yellow-500 mr-2" />
              <div className="text-2xl font-bold">
                {loading ? "-" : stats.pending}
              </div>
            </div>
            <CardDescription className="mt-2">
              Awaiting your review
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Approved Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <CheckCheck className="h-6 w-6 text-green-500 mr-2" />
              <div className="text-2xl font-bold">
                {loading ? "-" : stats.approved}
              </div>
            </div>
            <CardDescription className="mt-2">
              Successfully processed
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Rejected Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <XCircle className="h-6 w-6 text-red-500 mr-2" />
              <div className="text-2xl font-bold">
                {loading ? "-" : stats.rejected}
              </div>
            </div>
            <CardDescription className="mt-2">
              Declined applications
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="welcome" className="mt-6">
        <TabsList className="w-full mb-4 flex flex-wrap">
          <TabsTrigger value="welcome" className={isMobile ? "flex-1" : ""}>
            Dashboard
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className={isMobile ? "flex-1" : ""}
          >
            My Notifications
          </TabsTrigger>
          <TabsTrigger
            value="fee-approvals"
            className={isMobile ? "flex-1" : ""}
          >
            Fee Slip Approvals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="welcome">
          <Card>
            <CardHeader>
              <CardTitle>Welcome, {currentUser?.name}</CardTitle>
              <CardDescription>
                You're logged in as an administrator for the{" "}
                {currentUser?.department} department.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Use the dashboard to manage student requests, create
                notifications, and perform other administrative tasks.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <Button className="justify-between w-full" asChild>
                  <a href="/dashboard/student-requests">
                    Manage Student Requests
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </a>
                </Button>

                <Button
                  className="justify-between w-full"
                  variant="outline"
                  asChild
                >
                  <a href="/dashboard/events">
                    Create Event Notification
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="mr-2 h-5 w-5" />
                Notifications Created by You
              </CardTitle>
              <CardDescription>
                All notifications you've sent to students in your department
              </CardDescription>
            </CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Bell className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p>You haven't created any notifications yet</p>
                  <Button variant="outline" className="mt-4" asChild>
                    <a href="/dashboard/events">
                      <CalendarDays className="mr-2 h-4 w-4" />
                      Create Notification
                    </a>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <Card key={notification.id}>
                      <CardContent className="p-4">
                        <div className="flex flex-col space-y-2">
                          <div className="flex justify-between flex-wrap">
                            <h3 className="font-medium">
                              {notification.title}
                            </h3>
                            <Badge variant="outline">
                              {formatDistanceToNow(
                                new Date(notification.createdAt),
                                { addSuffix: true }
                              )}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            {notification.description}
                          </p>
                          {notification.deadline && (
                            <div className="text-xs text-gray-500 flex items-center">
                              <CalendarDays className="h-3 w-3 mr-1" />
                              Deadline:{" "}
                              {new Date(
                                notification.deadline
                              ).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fee-approvals">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Pending Fee Slip Approvals
              </CardTitle>
              <CardDescription>
                Review and manage student fee receipt submissions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {feeSlipLoading ? (
                <div>Loading fee slip requests...</div>
              ) : feeSlipError ? (
                <div className="text-red-500">{feeSlipError}</div>
              ) : feeSlipRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Upload className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p>No pending fee slip approvals at this time.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Semester</TableHead>
                      <TableHead>Payment Mode</TableHead>
                      <TableHead>Transaction No.</TableHead>
                      <TableHead>Bank Name</TableHead>
                      <TableHead>Uploaded On</TableHead>
                      <TableHead>Fee Receipt</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feeSlipRequests.map((request: any) => (
                      <TableRow key={request.id}>
                        <TableCell>{request.user?.name || "N/A"}</TableCell>
                        <TableCell>{request.semester}</TableCell>
                        <TableCell>{request.payment_mode}</TableCell>
                        <TableCell>{request.transaction_number}</TableCell>
                        <TableCell>{request.bank_name}</TableCell>
                        <TableCell>
                          {new Date(request.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {request.receipt_url && (
                            <Button
                              onClick={() => handlePreview(request.receipt_url)}
                            >
                              Preview
                            </Button>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="space-x-2 flex">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleStatusUpdate(request.id, "approved")
                              }
                            >
                              <Check className="h-4 w-4 mr-1" /> Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-500"
                              onClick={() =>
                                handleStatusUpdate(request.id, "rejected")
                              }
                            >
                              <XCircle className="h-4 w-4 mr-1" /> Reject
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-blue-500"
                              onClick={() =>
                                handleStatusUpdate(request.id, "on_hold")
                              }
                            >
                              <PauseCircle className="h-4 w-4 mr-1" /> Hold
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {showModal && previewUrl && (
                <Modal onClose={() => setShowModal(false)}>
                  <div className="w-[600px] h-[700px] flex flex-col">
                    <h3 className="text-lg font-bold mb-2">
                      Fee Receipt Preview
                    </h3>
                    <embed
                      src={previewUrl}
                      type="application/pdf"
                      className="w-full h-full border rounded"
                    />
                    <Button
                      className="mt-4"
                      onClick={() => setShowModal(false)}
                    >
                      Close
                    </Button>
                  </div>
                </Modal>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
