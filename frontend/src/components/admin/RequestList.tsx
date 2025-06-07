import React, { useState, useEffect } from "react";
import { adminSupabaseService } from "../../services/adminSupabaseService"; // Import the new service
import { useToast } from "../../components/ui/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import Modal from "../../components/ui/Modal";

interface FeeReceiptRequestData {
  id: string;
  userId: string;
  type: string;
  status: string;
  details: {
    semester: string;
    payment_mode: string;
    transaction_number?: string;
    bank_name?: string;
    fee_receipt_url: string;
  };
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    roll_no: string;
    email: string;
  };
}

const RequestList = () => {
  const [requests, setRequests] = useState<FeeReceiptRequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      // Fetch pending fee slip requests directly from Supabase
      const feeSlipRequests =
        await adminSupabaseService.getPendingFeeSlipRequests();
      setRequests(feeSlipRequests);
      setError(null);
    } catch (err: any) {
      console.error("Error fetching requests:", err);
      setError(err.message || "Failed to fetch requests");
      toast({
        title: "Error",
        description: err.message || "Failed to fetch requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleStatusUpdate = async (
    requestId: string,
    newStatus: "approved" | "rejected" | "on_hold"
  ) => {
    try {
      await adminSupabaseService.updateRequestStatus(requestId, newStatus);
      toast({
        title: "Success",
        description: `Request status updated to ${newStatus.toLowerCase()}!`,
      });
      fetchRequests(); // Refresh the list
    } catch (err: any) {
      console.error("Error updating request status:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to update request status",
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

  if (loading) {
    return <div>Loading requests...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <h2 className="text-2xl font-bold mb-6">Pending Fee Slip Approvals</h2>
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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Semester</TableHead>
            <TableHead>Payment Mode</TableHead>
            <TableHead>Transaction No.</TableHead>
            <TableHead>Bank Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Uploaded On</TableHead>
            <TableHead>Fee Receipt</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <TableRow key={request.id}>
              <TableCell>
                {request.user?.name || "N/A"} ({request.user?.roll_no || "N/A"})
              </TableCell>
              <TableCell>{request.details?.semester || "N/A"}</TableCell>
              <TableCell>{request.details?.payment_mode || "N/A"}</TableCell>
              <TableCell>
                {request.details?.transaction_number || "N/A"}
              </TableCell>
              <TableCell>{request.details?.bank_name || "N/A"}</TableCell>
              <TableCell>{getStatusBadge(request.status)}</TableCell>
              <TableCell>
                {new Date(request.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                {request.details?.fee_receipt_url && (
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handlePreview(request.details.fee_receipt_url)
                      }
                    >
                      Preview
                    </Button>
                    <a
                      href={request.details.fee_receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="sm" variant="secondary">
                        Download
                      </Button>
                    </a>
                  </div>
                )}
              </TableCell>
              <TableCell>
                {request.status.toLowerCase() === "pending" && (
                  <div className="space-x-2 flex">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusUpdate(request.id, "approved")}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-500"
                      onClick={() => handleStatusUpdate(request.id, "rejected")}
                    >
                      Reject
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-blue-500"
                      onClick={() => handleStatusUpdate(request.id, "on_hold")}
                    >
                      Hold
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default RequestList;
