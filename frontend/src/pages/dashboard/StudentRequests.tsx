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
} from "lucide-react";
import { format } from "date-fns";
import { adminSupabaseService } from "../../services/adminSupabaseService";
import { authService } from "../../services/api";
import Modal from "../../components/ui/Modal";

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
  const [activeTab, setActiveTab] = useState("all");
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
  const currentUser = authService.getCurrentUser();

  const fetchRequests = async () => {
    setLoading(true);
    try {
      let data = await adminSupabaseService.getAllRequestsSupabase(
        selectedYear
      );
      let students = await adminSupabaseService.getUnregisteredStudents(
        currentUser.department,
        selectedYear
      );

      // Filter requests and students based on admin's department if they are a department admin
      if (
        currentUser?.role === "admin" &&
        currentUser?.roll_no?.startsWith("ADMIN_")
      ) {
        const adminDepartment = currentUser.department;
        data = data.filter(
          (request) => request.user?.department === adminDepartment
        );
        students = students.filter(
          (student) => student.department === adminDepartment
        );
      }

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
  }, [activeTab, selectedYear]);

  const handleUpdateStatus = async (
    requestId: string,
    status: "approved" | "rejected" | "on_hold"
  ) => {
    setProcessing(requestId);
    console.log(
      `Attempting to update request ${requestId} to status: ${status}`
    );
    try {
      await adminSupabaseService.updateRequestStatus(requestId, status);
      toast(`Request ${status.replace("_", " ")}`);
      console.log(
        `Successfully updated request ${requestId} to status: ${status}`
      );

      // If approving a fee slip request, notify the user
      const request = requests.find((r) => r.id === requestId);
      if (request?.type === "feeslip" && status === "approved") {
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
    let filtered = requests.filter((req) => req.status !== "not uploaded");

    if (activeTab === "all") {
      return filtered;
    }
    return filtered.filter((req) => req.status === activeTab);
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
            defaultValue="all"
            value={activeTab}
            onValueChange={setActiveTab}
            className="transition-opacity duration-300"
          >
            <TabsList className="grid grid-cols-4 md:grid-cols-5 mb-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="on_hold">On Hold</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {renderRequestsList()}
              {renderUnregisteredStudents()}
            </TabsContent>

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

    const paginatedStudents = getPaginatedData(unregisteredStudents);

    return (
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <UserPlus className="h-5 w-5 mr-2" />
          Unregistered Students
        </h3>
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
        {renderPagination(unregisteredStudents.length)}
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
            There are no {activeTab !== "all" ? activeTab : ""} fee receipt
            requests at this time.
          </AlertDescription>
        </Alert>
      );
    }

    return (
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <FileText className="h-5 w-5 mr-2" />
          Fee Receipt Requests
        </h3>
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
