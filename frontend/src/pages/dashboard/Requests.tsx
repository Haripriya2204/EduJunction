import { useState, useEffect } from "react";
import { Card, CardContent } from "../../components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { Badge } from "../../components/ui/badge";
import { Clock, CheckCircle2, XCircle, RefreshCw, Receipt } from "lucide-react";
import { authService, Request } from "../../services/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
// @ts-ignore
import requestService from "../../services/requestService";

const Requests = () => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const user = authService.getCurrentUser();

  useEffect(() => {
    const loadRequests = async () => {
      try {
        setIsLoading(true);
        // Fetch requests for this student from backend
        const userRequests = await requestService.getMyRequests();
        setRequests(userRequests);
      } catch (error) {
        console.error("Error fetching requests:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadRequests();
  }, [user?.id]);

  // Get counts for each status, including fee status
  const pendingCount =
    requests.filter((req) => req.status.toLowerCase() === "pending").length +
    (user?.fee_status?.toLowerCase() === "pending" ? 1 : 0);
  const approvedCount =
    requests.filter((req) => req.status.toLowerCase() === "approved").length +
    (user?.fee_status?.toLowerCase() === "approved" ? 1 : 0);
  const rejectedCount =
    requests.filter((req) => req.status.toLowerCase() === "rejected").length +
    (user?.fee_status?.toLowerCase() === "rejected" ? 1 : 0);

  // Get requests filtered by status
  const getFilteredRequests = (status: string) => {
    return requests.filter((req) => req.status.toLowerCase() === status);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge className="bg-yellow-500">
            <Clock className="h-3 w-3 mr-1" /> Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-500">
            <XCircle className="h-3 w-3 mr-1" /> Rejected
          </Badge>
        );
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  const getRequestTypeBadge = (type: string) => {
    switch (type) {
      case "gatepass":
        return <Badge variant="outline">Gate Pass</Badge>;
      case "feeslip":
        return <Badge variant="outline">Fee Slip</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getFeeStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Approved
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-500">
            <Clock className="h-3 w-3 mr-1" /> Pending
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-500">
            <XCircle className="h-3 w-3 mr-1" /> Rejected
          </Badge>
        );
      case "not_uploaded":
        return (
          <Badge className="bg-gray-500">
            <Receipt className="h-3 w-3 mr-1" /> Not Uploaded
          </Badge>
        );
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  const renderFeeStatusCard = () => {
    if (!user?.fee_status) return null;

    return (
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-gray-500" />
              <span className="font-medium">Fee Receipt Status</span>
            </div>
            {getFeeStatusBadge(user.fee_status)}
          </div>

          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span className="font-medium">Student Name:</span>
              <span>{user.name}</span>
            </div>
            {user.approved_semester && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Approved Semester:</span>
                <span>{user.approved_semester}</span>
              </div>
            )}
            {user.payment_mode && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Payment Mode:</span>
                <span className="capitalize">{user.payment_mode}</span>
              </div>
            )}
            {user.transaction_number && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Transaction Number:</span>
                <span>{user.transaction_number}</span>
              </div>
            )}
            {user.bank_name && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Bank Name:</span>
                <span>{user.bank_name}</span>
              </div>
            )}
          </div>

          {user.fee_receipt_url && (
            <div className="mt-4">
              <a
                href={user.fee_receipt_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                View Fee Receipt
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const shouldShowFeeStatus = (tabStatus: string) => {
    if (!user?.fee_status) return false;
    return user.fee_status.toLowerCase() === tabStatus.toLowerCase();
  };

  const renderRequestsTable = (status: string) => {
    const filteredRequests = getFilteredRequests(status);

    if (isLoading) {
      return (
        <div className="flex justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      );
    }

    if (filteredRequests.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No {status} requests found
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Submitted On</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Last Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredRequests.map((request) => (
            <TableRow key={request.id}>
              <TableCell>{getRequestTypeBadge(request.type)}</TableCell>
              <TableCell>
                {new Date(request.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell>{getStatusBadge(request.status)}</TableCell>
              <TableCell className="text-right text-sm text-gray-500">
                {new Date(request.updatedAt).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">My Requests</h1>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid grid-cols-3 mb-4">
          <TabsTrigger value="pending">
            Pending{" "}
            <Badge variant="outline" className="ml-2">
              {pendingCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved{" "}
            <Badge variant="outline" className="ml-2">
              {approvedCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected{" "}
            <Badge variant="outline" className="ml-2">
              {rejectedCount}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <Card>
          <CardContent className="pt-6">
            <TabsContent value="pending">
              {shouldShowFeeStatus("pending") && renderFeeStatusCard()}
              {renderRequestsTable("pending")}
            </TabsContent>

            <TabsContent value="approved">
              {shouldShowFeeStatus("approved") && renderFeeStatusCard()}
              {renderRequestsTable("approved")}
            </TabsContent>

            <TabsContent value="rejected">
              {shouldShowFeeStatus("rejected") && renderFeeStatusCard()}
              {renderRequestsTable("rejected")}
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
};

export default Requests;
