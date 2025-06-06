import { useState, useEffect } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Badge } from "../../components/ui/badge";
import { Clock, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
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
import requestService from '../../services/requestService';

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

  // Get counts for each status
  const pendingCount = requests.filter(req => req.status.toLowerCase() === 'pending').length;
  const approvedCount = requests.filter(req => req.status.toLowerCase() === 'approved').length;
  const rejectedCount = requests.filter(req => req.status.toLowerCase() === 'rejected').length;

  // Get requests filtered by status
  const getFilteredRequests = (status: string) => {
    return requests.filter(req => req.status.toLowerCase() === status);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" /> Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  const getRequestTypeBadge = (type: string) => {
    switch (type) {
      case 'gatepass':
        return <Badge variant="outline">Gate Pass</Badge>;
      case 'feeslip':
        return <Badge variant="outline">Fee Slip</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
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
              <TableCell>{new Date(request.createdAt).toLocaleDateString()}</TableCell>
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
            Pending <Badge variant="outline" className="ml-2">{pendingCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved <Badge variant="outline" className="ml-2">{approvedCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected <Badge variant="outline" className="ml-2">{rejectedCount}</Badge>
          </TabsTrigger>
        </TabsList>
        
        <Card>
          <CardContent className="pt-6">
            <TabsContent value="pending">
              {renderRequestsTable('pending')}
            </TabsContent>
            
            <TabsContent value="approved">
              {renderRequestsTable('approved')}
            </TabsContent>
            
            <TabsContent value="rejected">
              {renderRequestsTable('rejected')}
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
};

export default Requests;
