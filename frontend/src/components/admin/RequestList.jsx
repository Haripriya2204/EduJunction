import React, { useState, useEffect } from 'react';
import requestService from '../../services/requestService';
import { useToast } from '../../components/ui/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import Modal from '../../components/ui/Modal';

const RequestList = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast } = useToast();
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await requestService.getDepartmentRequests();
      setRequests(data);
      setError(null);
    } catch (err) {
      setError(err.error || 'Failed to fetch requests');
      toast({
        title: 'Error',
        description: err.error || 'Failed to fetch requests',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleStatusUpdate = async (requestId, newStatus) => {
    try {
      await requestService.updateRequestStatus(requestId, newStatus);
      toast({
        title: 'Success',
        description: 'Request status updated successfully',
      });
      fetchRequests(); // Refresh the list
    } catch (err) {
      toast({
        title: 'Error',
        description: err.error || 'Failed to update request status',
        variant: 'destructive',
      });
    }
  };

  const handlePreview = (feeReceiptId) => {
    setPreviewUrl(`/api/feereceipts/${feeReceiptId}/file`);
    setShowModal(true);
  };

  const handleDownload = (feeReceiptId, rollNo) => {
    const url = `/api/feereceipts/${feeReceiptId}/file`;
    const link = document.createElement('a');
    link.href = url;
    link.download = `${rollNo}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: 'warning',
      approved: 'success',
      rejected: 'destructive',
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
      <h2 className="text-2xl font-bold mb-6">Department Requests</h2>
      {showModal && previewUrl && (
        <Modal onClose={() => setShowModal(false)}>
          <div className="w-[600px] h-[700px] flex flex-col">
            <h3 className="text-lg font-bold mb-2">Fee Receipt Preview</h3>
            <embed src={previewUrl} type="application/pdf" className="w-full h-full border rounded" />
            <Button className="mt-4" onClick={() => setShowModal(false)}>Close</Button>
          </div>
        </Modal>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead>Fee Receipt</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <TableRow key={request.id}>
              <TableCell>{request.User.fullName}</TableCell>
              <TableCell>{request.type}</TableCell>
              <TableCell>{getStatusBadge(request.status)}</TableCell>
              <TableCell>
                {new Date(request.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                {request.type === 'feeslip' && request.details && request.details.feeReceiptId && (
                  <div className="flex flex-col gap-2">
                    <Button size="sm" variant="outline" onClick={() => handlePreview(request.details.feeReceiptId)}>
                      Preview
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => handleDownload(request.details.feeReceiptId, request.details.rollNo)}>
                      Download
                    </Button>
                  </div>
                )}
              </TableCell>
              <TableCell>
                {request.status.toLowerCase() === 'pending' && (
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusUpdate(request.id, 'APPROVED')}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-500"
                      onClick={() => handleStatusUpdate(request.id, 'REJECTED')}
                    >
                      Reject
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