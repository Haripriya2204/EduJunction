import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { studentService, authService } from "../../services/api";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { cn } from "../../lib/utils";
import { Check, Clock, AlertCircle, Upload, File, X, Building2 } from "lucide-react";
import { useAcademicYear } from "../../contexts/AcademicYearContext";
import { getSemesterForRoll, requiresAdminFee } from "../../lib/academicYear";

// Upload + status for the administrative office fee. Self-contained so the
// existing main fee slip form stays untouched. Only shown for academic years
// where the admin office fee applies.
const AdminFeeSlipCard = () => {
  const { academicYear } = useAcademicYear();
  const currentUser = authService.getCurrentUser();
  const [status, setStatus] = useState<string>("not_uploaded");
  const [reviewNotes, setReviewNotes] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const expectedSemester = getSemesterForRoll(
    currentUser?.roll_no,
    academicYear
  );
  const [semester, setSemester] = useState<string>(
    expectedSemester ? String(expectedSemester) : currentUser?.semester || "1"
  );
  const [paymentMode, setPaymentMode] = useState<string>("");
  const [transactionNumber, setTransactionNumber] = useState<string>("");
  const [bankName, setBankName] = useState<string>("");

  useEffect(() => {
    if (expectedSemester) setSemester(String(expectedSemester));
  }, [expectedSemester]);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const { status, receipt } =
          await studentService.getAdminFeeReceiptStatus(academicYear);
        setStatus(status);
        setReviewNotes(receipt?.review_notes ?? null);
        setPreviewUrl(null);
        setSelectedFile(null);
        setPaymentMode("");
        setTransactionNumber("");
        setBankName("");
      } catch (error) {
        console.error("Error fetching admin fee status:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, [currentUser?.id, academicYear]);

  if (!requiresAdminFee(academicYear)) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== "application/pdf") {
        toast.error("Only PDF files are allowed");
        return;
      }
      if (file.size > 1 * 1024 * 1024) {
        toast.error("File size should be less than 1MB");
        return;
      }
      setSelectedFile(file);
      const fileReader = new FileReader();
      fileReader.onload = () => {
        if (typeof fileReader.result === "string") {
          setPreviewUrl(fileReader.result);
        }
      };
      fileReader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a file first");
      return;
    }
    if (!paymentMode) {
      toast.error("Please select a mode of payment");
      return;
    }
    if (
      (paymentMode === "Online" || paymentMode === "Offline (Bank to Bank)") &&
      (!transactionNumber || !bankName)
    ) {
      toast.error("Please enter transaction number/UTR and bank name");
      return;
    }

    setUploading(true);
    try {
      await studentService.uploadAdminFeeReceipt(
        selectedFile,
        semester,
        paymentMode,
        transactionNumber,
        bankName,
        academicYear
      );
      setStatus("pending");
      toast.success(
        "Administrative office fee receipt uploaded and pending approval!"
      );
      setSelectedFile(null);
      setPreviewUrl(null);
      setTransactionNumber("");
      setBankName("");
      setPaymentMode("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Error uploading admin fee receipt:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to upload admin fee receipt"
      );
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (loading) return null;

  const canUpload = status === "not_uploaded" || status === "rejected";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Building2 className="mr-2 h-5 w-5" />
          Administrative Office Fee Receipt
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div
            className={cn(
              "p-6 rounded-lg flex flex-col md:flex-row md:items-center",
              status === "not_uploaded" && "bg-gray-100",
              status === "pending" && "bg-yellow-50",
              status === "approved" && "bg-green-50",
              (status === "rejected" || status === "on_hold") && "bg-red-50"
            )}
          >
            <div className="flex-shrink-0 mb-4 md:mb-0 md:mr-6">
              {status === "not_uploaded" && (
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                  <Upload className="h-8 w-8 text-gray-500" />
                </div>
              )}
              {status === "pending" && (
                <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Clock className="h-8 w-8 text-yellow-500" />
                </div>
              )}
              {status === "approved" && (
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="h-8 w-8 text-green-500" />
                </div>
              )}
              {(status === "rejected" || status === "on_hold") && (
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-red-500" />
                </div>
              )}
            </div>
            <div>
              <h3 className="text-lg font-medium">
                {status === "not_uploaded" &&
                  "No Administrative Office Fee Receipt Uploaded"}
                {status === "pending" &&
                  "Administrative Office Fee Receipt Pending Approval"}
                {status === "approved" &&
                  "Administrative Office Fee Receipt Approved"}
                {status === "rejected" &&
                  "Administrative Office Fee Receipt Rejected"}
                {status === "on_hold" &&
                  "Administrative Office Fee Receipt On Hold"}
              </h3>
              <p className="text-gray-600 mt-1">
                {status === "not_uploaded" &&
                  "Upload your administrative office fee receipt. Both this and your main fee receipt must be approved to access courses."}
                {status === "pending" &&
                  "Your administrative office fee receipt is awaiting approval."}
                {status === "approved" &&
                  "Your administrative office fee receipt has been approved."}
                {(status === "rejected" || status === "on_hold") &&
                  "Please upload a valid administrative office fee receipt."}
              </p>
              {(status === "rejected" || status === "on_hold") && reviewNotes && (
                <p className="text-red-700 mt-2 whitespace-pre-line">
                  Reason: {reviewNotes}
                </p>
              )}
            </div>
          </div>

          {canUpload && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Semester
                  </h3>
                  <select
                    className="w-full border rounded-md p-2 disabled:bg-gray-100 disabled:text-gray-600"
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    disabled={!!expectedSemester}
                  >
                    {[...Array(8)].map((_, i) => (
                      <option key={i + 1} value={String(i + 1)}>
                        {`Semester ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Mode of Payment
                  </h3>
                  <select
                    className="w-full border rounded-md p-2"
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                  >
                    <option value="">Select Payment Mode</option>
                    <option value="Online">Online</option>
                    <option value="Offline (Bank to Bank)">
                      Offline (Bank to Bank)
                    </option>
                    <option value="Cash payment">Cash payment</option>
                  </select>
                </div>
              </div>

              {(paymentMode === "Online" ||
                paymentMode === "Offline (Bank to Bank)") && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      Transaction Number / UTR
                    </h3>
                    <Input
                      type="text"
                      value={transactionNumber}
                      onChange={(e) => setTransactionNumber(e.target.value)}
                      placeholder="Enter Transaction Number or UTR"
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      Bank Name
                    </h3>
                    <Input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="Enter Bank Name"
                    />
                  </div>
                </div>
              )}

              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Administrative Office Fee Document
                </h3>
                {previewUrl ? (
                  <div className="mb-4">
                    <div className="relative border rounded-lg overflow-hidden">
                      <embed
                        src={previewUrl}
                        type="application/pdf"
                        className="w-full h-64 mx-auto"
                      />
                      <button
                        onClick={handleRemoveFile}
                        className="absolute top-2 right-2 bg-red-100 text-red-500 p-1 rounded-full hover:bg-red-200"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedFile?.name || "Uploaded receipt"}
                    </p>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50"
                  >
                    <File className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      PDF only (max. 1MB)
                    </p>
                  </div>
                )}
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleUpload}
                  disabled={uploading || !selectedFile}
                  className="w-full md:w-auto"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {uploading ? "Uploading..." : "Upload Administrative Office Fee"}
                </Button>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminFeeSlipCard;
