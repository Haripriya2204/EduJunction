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
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { Badge } from "../../components/ui/badge";
import {
  FilePlus,
  Upload,
  Check,
  Clock,
  FileText,
  RefreshCw,
  File,
  X,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { supabase } from "../../lib/supabase";

const FeeSlip = () => {
  const [feeStatus, setFeeStatus] = useState<string>("not_uploaded");
  const [approvedSemester, setApprovedSemester] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentUser = authService.getCurrentUser();
  const [semester, setSemester] = useState<string>(
    currentUser?.semester || "1"
  );
  const [paymentMode, setPaymentMode] = useState<string>("");
  const [transactionNumber, setTransactionNumber] = useState<string>("");
  const [bankName, setBankName] = useState<string>("");
  const [mobileNumber, setMobileNumber] = useState<string>(
    currentUser?.mobile_number || ""
  );
  const [mobileSaved, setMobileSaved] = useState<boolean>(
    !!currentUser?.mobile_number
  );
  const [savingMobile, setSavingMobile] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const { status } = await studentService.getFeeReceiptStatus();
        setFeeStatus(status);
        setApprovedSemester(null);
        setPaymentMode("");
        setTransactionNumber("");
        setBankName("");
        setPreviewUrl(null);
      } catch (error) {
        console.error("Error fetching fee status:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [currentUser?.id]);

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Session expired. Please log in again.");
        // Redirect to login or handle session expiry
        return;
      }
    };

    checkAuth();
  }, []);

  // Fetch user mobile number on mount (in case it's updated elsewhere)
  useEffect(() => {
    if (currentUser?.mobile_number) {
      setMobileNumber(currentUser.mobile_number);
      setMobileSaved(true);
    }
  }, [currentUser?.mobile_number]);

  // Save mobile number to users table
  const handleSaveMobile = async () => {
    if (!/^\d{10}$/.test(mobileNumber)) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }
    setSavingMobile(true);
    try {
      const { error } = await supabase
        .from("users")
        .update({ mobile_number: mobileNumber })
        .eq("id", currentUser.id);
      if (error) throw error;
      toast.success("Mobile number saved successfully");
      setMobileSaved(true);
    } catch (error) {
      toast.error("Failed to save mobile number");
    } finally {
      setSavingMobile(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Only allow PDF files up to 1MB
      const allowedTypes = ["application/pdf"];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Only PDF files are allowed");
        return;
      }
      if (file.size > 1 * 1024 * 1024) {
        // 1MB limit
        toast.error("File size should be less than 1MB");
        return;
      }
      setSelectedFile(file);
      // Create a preview URL
      const fileReader = new FileReader();
      fileReader.onload = () => {
        if (typeof fileReader.result === "string") {
          setPreviewUrl(fileReader.result);
        }
      };
      fileReader.readAsDataURL(file);
    }
  };

  const handleUploadFeeReceipt = async () => {
    if (!selectedFile) {
      toast.error("Please select a file first");
      return;
    }
    if (!semester) {
      toast.error("Please select a semester");
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
    if (!currentUser) {
      toast.error("User not found. Please log in again.");
      return;
    }

    // Check Supabase auth status
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();
    console.log("Supabase Auth Status:", {
      isAuthenticated: !!session,
      userId: session?.user?.id,
      error: authError,
    });

    if (authError) {
      console.error("Auth error:", authError);
      toast.error("Authentication failed. Please log in again.");
      return;
    }

    if (!session) {
      toast.error("No active session found. Please log in again.");
      return;
    }

    // Validate file size (1MB limit)
    if (selectedFile.size > 1 * 1024 * 1024) {
      toast.error("File size should be less than 1MB");
      return;
    }

    // Validate file type
    const allowedTypes = ["application/pdf"];
    if (!allowedTypes.includes(selectedFile.type)) {
      toast.error("Only PDF files are allowed");
      return;
    }

    setUploading(true);
    try {
      await studentService.uploadFeeReceipt(
        selectedFile,
        semester,
        paymentMode,
        transactionNumber,
        bankName
      );

      setFeeStatus("pending");
      toast.success("Fee receipt uploaded successfully and pending approval!");

      // Reset form
      setSelectedFile(null);
      setPreviewUrl(null);
      setTransactionNumber("");
      setBankName("");
      setPaymentMode("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error uploading fee receipt:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to upload fee receipt"
      );
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin">
          <RefreshCw className="h-8 w-8 text-edu-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Fee Slip Management
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Fee Receipt Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Status Banner */}
            <div
              className={cn(
                "p-6 rounded-lg flex flex-col md:flex-row md:items-center",
                feeStatus === "not_uploaded" && "bg-gray-100",
                feeStatus === "pending" && "bg-yellow-50",
                feeStatus === "approved" && "bg-green-50",
                feeStatus === "rejected" && "bg-red-50"
              )}
            >
              <div className="flex-shrink-0 mb-4 md:mb-0 md:mr-6">
                {feeStatus === "not_uploaded" && (
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                    <Upload className="h-8 w-8 text-gray-500" />
                  </div>
                )}
                {feeStatus === "pending" && (
                  <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
                    <Clock className="h-8 w-8 text-yellow-500" />
                  </div>
                )}
                {feeStatus === "approved" && (
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="h-8 w-8 text-green-500" />
                  </div>
                )}
                {feeStatus === "rejected" && (
                  <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertCircle className="h-8 w-8 text-red-500" />
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-medium">
                  {feeStatus === "not_uploaded" && "No Fee Receipt Uploaded"}
                  {feeStatus === "pending" && "Fee Receipt Pending Approval"}
                  {feeStatus === "approved" && "Fee Receipt Approved"}
                  {feeStatus === "rejected" && "Fee Receipt Rejected"}
                </h3>
                <p className="text-gray-600 mt-1">
                  {feeStatus === "not_uploaded" &&
                    "You need to upload your fee receipt to gain access to your courses and other features."}
                  {feeStatus === "pending" &&
                    "Your fee receipt has been submitted and is awaiting approval from administration."}
                  {feeStatus === "approved" &&
                    "Your fee receipt has been approved. You now have full access to courses and other features."}
                  {feeStatus === "rejected" &&
                    "Your fee receipt has been rejected. Please upload a valid receipt."}
                </p>

                {feeStatus === "approved" && (
                  <div className="mt-2">
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                      <Check className="h-3 w-3 mr-1" />
                      Courses Unlocked
                    </Badge>
                    <Button
                      variant="link"
                      size="sm"
                      className="text-green-600 pl-0"
                      asChild
                    >
                      <a href="/dashboard/courses">
                        View My Courses <ArrowRight className="h-3 w-3 ml-1" />
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Student Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Student Information
                </h3>
                <dl className="space-y-2">
                  <div className="flex">
                    <dt className="w-24 text-sm text-gray-500">Student ID:</dt>
                    <dd className="text-sm font-medium">
                      {currentUser?.roll_no}
                    </dd>
                  </div>
                  <div className="flex">
                    <dt className="w-24 text-sm text-gray-500">Name:</dt>
                    <dd className="text-sm font-medium">{currentUser?.name}</dd>
                  </div>
                  <div className="flex">
                    <dt className="w-24 text-sm text-gray-500">Department:</dt>
                    <dd className="text-sm font-medium">
                      {currentUser?.department}
                    </dd>
                  </div>
                  </dl>
              </div>
            </div>

            {/* Semester and Payment Mode Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Select Semester
                </h3>
                <select
                  className="w-full border rounded-md p-2"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                >
                  {[...Array(8)].map((_, i) => (
                    <option key={i + 1} value={String(i + 1)}>{`Semester ${
                      i + 1
                    }`}</option>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
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

            {/* Mobile Number Section */}
            {!mobileSaved && (
              <div className="mb-6 border rounded-lg p-4 bg-yellow-50">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Enter Your Mobile Number
                </h3>
                <div className="flex flex-col sm:flex-row gap-2 items-center">
                  <Input
                    type="tel"
                    maxLength={10}
                    minLength={10}
                    pattern="[0-9]{10}"
                    value={mobileNumber}
                    onChange={(e) =>
                      setMobileNumber(e.target.value.replace(/[^0-9]/g, ""))
                    }
                    placeholder="10-digit mobile number"
                    className="w-full sm:w-64"
                    disabled={savingMobile}
                  />
                  <Button
                    onClick={handleSaveMobile}
                    disabled={savingMobile || !/^\d{10}$/.test(mobileNumber)}
                    className="w-full sm:w-auto"
                  >
                    {savingMobile ? "Saving..." : "Save Mobile Number"}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  This number will be used for important notifications.
                </p>
              </div>
            )}

            {/* File Upload Section */}
            {mobileSaved && (
              <div className="mt-6 border rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Fee Receipt Document
                </h3>
                {previewUrl ? (
                  <div className="mb-4">
                    <div className="relative border rounded-lg overflow-hidden">
                      {/* PDF Preview */}
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
                    onClick={triggerFileInput}
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
            )}

            <div className="flex justify-end space-x-4">
              {mobileSaved &&
                (feeStatus === "not_uploaded" || feeStatus === "rejected" ? (
                  <Button
                    onClick={handleUploadFeeReceipt}
                    disabled={uploading || !selectedFile}
                    className="w-full md:w-auto"
                  >
                    <FilePlus className="mr-2 h-4 w-4" />
                    {uploading ? "Uploading..." : "Upload Fee Receipt"}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={handleUploadFeeReceipt}
                    disabled={uploading || !selectedFile}
                    className="w-full md:w-auto"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {uploading ? "Uploading..." : "Update Fee Receipt"}
                  </Button>
                ))}
            </div>

            {feeStatus === "pending" && (
              <Alert className="bg-yellow-50 border-yellow-200 mt-4">
                <Clock className="h-4 w-4 text-yellow-500" />
                <AlertTitle className="text-yellow-800">
                  Request Pending
                </AlertTitle>
                <AlertDescription className="text-yellow-700">
                  Your fee slip request is being reviewed by the admin. You'll
                  be notified once it's approved.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeeSlip;
