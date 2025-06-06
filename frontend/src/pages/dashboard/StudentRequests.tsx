import { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle 
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
  DoorOpen,
  Search,
  PauseCircle,
  Calendar
} from "lucide-react";
import { format } from "date-fns";
import { adminService } from "../../services/api";
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
  details?: any;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  holdStartDate?: string | Date;
  // ... other fields ...
}

const StudentRequests = () => {
  const [activeTab, setActiveTab] = useState("all");
  const [activeTypeFilter, setActiveTypeFilter] = useState("all");
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<AdminRequest | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  
  const fetchRequests = async () => {
    setLoading(true);
    try {
      let data: AdminRequest[];
      
      if (activeTab === "all") {
        data = await adminService.getAllRequests();
      } else {
        data = await adminService.getRequestsByStatus(activeTab as any);
      }
      
      setRequests(data);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast("Failed to load requests");
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchRequests();
  }, [activeTab]);
  
  const handleUpdateStatus = async (requestId: string, status: 'approved' | 'rejected' | 'on_hold') => {
    setProcessing(requestId);
    try {
      await adminService.updateRequestStatus(requestId, status);
      toast(`Request ${status.replace('_', ' ')}`);
      
      // If approving a fee slip request, notify the user
      const request = requests.find(r => r.id === requestId);
      if (request?.type === 'feeslip' && status === 'approved') {
        toast("Fee slip approved. Student now has access to courses.");
      }
      
      fetchRequests();
      if (detailsOpen) {
        setDetailsOpen(false);
      }
    } catch (error) {
      console.error("Error updating request:", error);
      toast("Failed to update request status");
    } finally {
      setProcessing(null);
    }
  };
  
  const handleViewDetails = (request: AdminRequest) => {
    setSelectedRequest(request);
    setDetailsOpen(true);
  };
  
  const getRequestTypeBadge = (type: string) => {
    switch (type) {
      case 'gatepass':
        return <Badge className="bg-blue-500"><DoorOpen className="h-3 w-3 mr-1" /> Gate Pass</Badge>;
      case 'feeslip':
        return <Badge className="bg-green-500"><FilePenLine className="h-3 w-3 mr-1" /> Fee Slip</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300"><CheckCircle className="h-3 w-3 mr-1" /> Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
      case 'on_hold':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300"><PauseCircle className="h-3 w-3 mr-1" /> On Hold</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Filter requests by type
  const getFilteredRequests = () => {
    if (activeTypeFilter === 'all') {
      return requests;
    }
    return requests.filter(req => req.type === activeTypeFilter);
  };
  
  const handlePreview = (feeReceiptId: string) => {
    setPreviewUrl(`/api/feereceipts/${feeReceiptId}/file`);
    setShowModal(true);
  };

  const handleDownload = (feeReceiptId: string, rollNo: string) => {
    const url = `/api/feereceipts/${feeReceiptId}/file`;
    const link = document.createElement('a');
    link.href = url;
    link.download = `${rollNo}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Student Requests</h1>
        
        <Button variant="outline" onClick={fetchRequests} className="self-start">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      
      <Card className="transition-all duration-300 hover:shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Request Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="transition-opacity duration-300">
            <TabsList className="grid grid-cols-4 md:grid-cols-5 mb-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="on_hold">On Hold</TabsTrigger>
            </TabsList>
            
            <div className="flex flex-col md:flex-row gap-2 md:items-center border-b pb-4 mb-4">
              <div className="text-sm font-medium">Filter by type:</div>
              <div className="flex flex-wrap gap-2">
                <Badge 
                  variant={activeTypeFilter === 'all' ? "default" : "outline"} 
                  className="cursor-pointer transition-colors"
                  onClick={() => setActiveTypeFilter('all')}
                >
                  All
                </Badge>
                <Badge 
                  variant={activeTypeFilter === 'feeslip' ? "default" : "outline"} 
                  className="cursor-pointer transition-colors"
                  onClick={() => setActiveTypeFilter('feeslip')}
                >
                  <FilePenLine className="h-3 w-3 mr-1" />
                  Fee Slip
                </Badge>
                <Badge 
                  variant={activeTypeFilter === 'gatepass' ? "default" : "outline"} 
                  className="cursor-pointer transition-colors"
                  onClick={() => setActiveTypeFilter('gatepass')}
                >
                  <DoorOpen className="h-3 w-3 mr-1" />
                  Gate Pass
                </Badge>
              </div>
            </div>
            
            <TabsContent value="all" className="space-y-4">
              {renderRequestsList()}
            </TabsContent>
            
            <TabsContent value="pending" className="space-y-4">
              {renderRequestsList()}
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
            <SheetTitle>Request Details</SheetTitle>
            <SheetDescription>
              <div className="flex gap-2">
                {selectedRequest && getRequestTypeBadge(selectedRequest.type)}
                {selectedRequest && getStatusBadge(selectedRequest.status)}
              </div>
            </SheetDescription>
          </SheetHeader>
          
          <div className="py-6">
            {selectedRequest && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Student Information</h3>
                  <div className="font-medium">
                    <p className="font-medium">{(selectedRequest.user?.name || 'N/A')} - {(selectedRequest.user?.rollNo || 'N/A')}</p>
                    <p className="text-sm text-gray-600">{selectedRequest.user?.department}</p>
                  </div>
                </div>
                
                {selectedRequest.type === 'gatepass' && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Reason</h3>
                    <p>{selectedRequest.details.reason}</p>
                    <h3 className="text-sm font-medium text-gray-500 mt-3">Date Requested</h3>
                    <p className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                      {selectedRequest.details.date ? new Date(selectedRequest.details.date).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                )}
                
                {selectedRequest.type === 'feeslip' && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Fee Receipt</h3>
                    <div className="mt-2 p-4 border rounded-md bg-gray-50">
                      <div className="text-center">
                        <FileText className="h-12 w-12 mx-auto text-gray-400" />
                        <p className="mt-2 text-sm text-gray-600">
                          Fee Receipt Submitted
                        </p>
                      </div>
                      <div className="mt-4 text-left space-y-2">
                        {selectedRequest.details.semester && (
                          <div><span className="font-medium">Semester:</span> {selectedRequest.details.semester}</div>
                        )}
                        {selectedRequest.details.paymentMode && (
                          <div><span className="font-medium">Payment Mode:</span> {selectedRequest.details.paymentMode}</div>
                        )}
                        {(selectedRequest.details.paymentMode === 'Online' || selectedRequest.details.paymentMode === 'Offline (Bank to Bank)') && selectedRequest.details.transactionNumber && (
                          <div><span className="font-medium">Transaction Number/UTR:</span> {selectedRequest.details.transactionNumber}</div>
                        )}
                        {(selectedRequest.details.paymentMode === 'Online' || selectedRequest.details.paymentMode === 'Offline (Bank to Bank)') && selectedRequest.details.bankName && (
                          <div><span className="font-medium">Bank Name:</span> {selectedRequest.details.bankName}</div>
                        )}
                      </div>
                      {selectedRequest.details.feeReceiptId && (
                        <div className="flex gap-2 mt-4">
                          <Button size="sm" variant="outline" onClick={() => handlePreview(selectedRequest.details.feeReceiptId)}>
                            Preview PDF
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => handleDownload(selectedRequest.details.feeReceiptId, selectedRequest.details.rollNo)}>
                            Download PDF
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Request Timeline</h3>
                  <div className="mt-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Submitted:</span>
                      <span>{selectedRequest.createdAt ? format(new Date(selectedRequest.createdAt), 'MMM d, yyyy h:mm a') : 'N/A'}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-gray-500">Last Updated:</span>
                      <span>{selectedRequest.updatedAt ? format(new Date(selectedRequest.updatedAt), 'MMM d, yyyy h:mm a') : 'N/A'}</span>
                    </div>
                    
                    {selectedRequest.status === 'on_hold' && selectedRequest.holdStartDate && (
                      <div className="flex justify-between mt-1">
                        <span className="text-gray-500">On Hold Since:</span>
                        <span>{selectedRequest.holdStartDate ? format(new Date(selectedRequest.holdStartDate), 'MMM d, yyyy h:mm a') : 'N/A'}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col space-y-2 pt-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Update Status</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="default" 
                      onClick={() => handleUpdateStatus(selectedRequest.id, 'approved')}
                      disabled={processing === selectedRequest.id || selectedRequest.status === 'approved'}
                      className="transition-colors duration-200"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={() => handleUpdateStatus(selectedRequest.id, 'rejected')}
                      disabled={processing === selectedRequest.id || selectedRequest.status === 'rejected'}
                      className="transition-colors duration-200"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => handleUpdateStatus(selectedRequest.id, 'on_hold')}
                    disabled={processing === selectedRequest.id || selectedRequest.status === 'on_hold'}
                    className="mt-2 transition-colors duration-200"
                  >
                    <PauseCircle className="h-4 w-4 mr-2" />
                    Put On Hold
                  </Button>
                  
                  {selectedRequest.type === 'feeslip' && selectedRequest.status === 'approved' && (
                    <Alert className="mt-4 bg-green-50 border-green-200 animate-pulse">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertTitle className="text-green-800">Fee Slip Approved</AlertTitle>
                      <AlertDescription className="text-green-700">
                        Student now has access to all mandatory courses for their semester.
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
            <embed src={previewUrl} type="application/pdf" className="w-full h-full border rounded" />
            <Button className="mt-4" onClick={() => setShowModal(false)}>Close</Button>
          </div>
        </Modal>
      )}
    </div>
  );
  
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
    
    if (filteredRequests.length === 0) {
      return (
        <Alert className="transition-all duration-300 hover:shadow-sm">
          <AlertTitle className="flex items-center">
            <Search className="h-4 w-4 mr-2" />
            No requests found
          </AlertTitle>
          <AlertDescription>
            There are no {activeTab !== 'all' ? activeTab : ''} {activeTypeFilter !== 'all' ? activeTypeFilter : ''} requests at this time.
          </AlertDescription>
        </Alert>
      );
    }
    
    return filteredRequests.map((request) => {
      return (
        <Card key={request.id} className="overflow-hidden transition-all duration-300 hover:shadow-md">
          <div className={`h-1 ${
            request.status === 'pending' ? 'bg-yellow-500' : 
            request.status === 'approved' ? 'bg-green-500' : 
            request.status === 'on_hold' ? 'bg-purple-500' :
            'bg-red-500'
          }`}></div>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {getRequestTypeBadge(request.type)}
                  {getStatusBadge(request.status)}
                </div>
                
                <h3 className="font-medium">
                  {(request.user?.name || 'N/A')} - {(request.user?.rollNo || 'N/A')}
                </h3>
                
                <p className="text-sm text-gray-500">
                  Submitted {request.createdAt ? format(new Date(request.createdAt), 'MMM d, yyyy') : 'N/A'}
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
                
                {request.status === 'pending' && (
                  <>
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => handleUpdateStatus(request.id, 'approved')}
                      disabled={!!processing}
                      className="transition-colors duration-200"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" /> Approve
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleUpdateStatus(request.id, 'rejected')}
                      disabled={!!processing}
                      className="transition-colors duration-200"
                    >
                      <XCircle className="h-4 w-4 mr-1" /> Reject
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleUpdateStatus(request.id, 'on_hold')}
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
      );
    });
  }
};

export default StudentRequests;
