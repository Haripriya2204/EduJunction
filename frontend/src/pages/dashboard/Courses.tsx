import { useEffect, useState, useMemo } from "react";
import { Button } from "../../components/ui/button";
import { studentService } from "../../services/api";
import type { Course } from "../../db/models";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { Skeleton } from "../../components/ui/skeleton";
import { toast } from "sonner";
import {
  BookOpen,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  FileText,
  TableProperties,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
// import { selectElective, saveElectives } from '../../api'; // Temporarily comment out elective related imports
import { supabase } from "../../lib/supabase";

// Helper to get auth headers (still needed for some API calls, though studentService handles most)
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
};

// Remove romanNumerals mapping as it's not directly used for course display in this simplified view

// Add this constant at the top of the file, after imports
const AVAILABLE_SEMESTERS = [
  "I-I",
  "I-II",
  "II-I",
  "II-II",
  "III-I",
  "III-II",
  "IV-I",
  "IV-II",
];

// Add this helper function at the top after imports
const convertSemesterNumberToFormat = (semesterNumber: string): string => {
  const num = parseInt(semesterNumber);
  if (isNaN(num)) return "I-I"; // Default to first semester if invalid

  const year = Math.ceil(num / 2);
  const semester = num % 2 === 0 ? "II" : "I";

  // Convert year to roman numerals
  const romanYear = ["I", "II", "III", "IV"][year - 1] || "I";

  return `${romanYear}-${semester}`;
};

const Courses = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedElectivesMap, setSelectedElectivesMap] = useState<
    Record<string, string>
  >({});
  const [feeStatus, setFeeStatus] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("mandatory");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [availableElectives, setAvailableElectives] = useState<
    Record<string, Course[]>
  >({});
  const [electivesLoading, setElectivesLoading] = useState(false);
  const [selectedElectives, setSelectedElectives] = useState<
    Record<string, string>
  >({});
  const [electivesFinalized, setElectivesFinalized] = useState(false);
  const user = studentService.getCurrentUser();
  const [error, setError] = useState<string | null>(null);
  const [isFetchingElectives, setIsFetchingElectives] = useState(false);
  const [isSelectingElective, setIsSelectingElective] = useState(false);
  const [currentElectiveGroup, setCurrentElectiveGroup] = useState<string>("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingElectiveSelection, setPendingElectiveSelection] = useState<{
    courseId: string;
    group: string;
  } | null>(null);

  // Add this useEffect to fetch approved semester and set it
  useEffect(() => {
    const fetchApprovedSemester = async () => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("approved_semester")
          .eq("id", user?.id)
          .single();

        if (error) {
          console.error("Error fetching approved semester:", error);
          return;
        }

        if (data?.approved_semester) {
          const formattedSemester = convertSemesterNumberToFormat(
            data.approved_semester
          );
          setSelectedSemester(formattedSemester);
        }
      } catch (error) {
        console.error("Error in fetchApprovedSemester:", error);
      }
    };

    if (user?.id) {
      fetchApprovedSemester();
    }
  }, [user?.id]);

  // Fetch courses on component mount or refresh
  useEffect(() => {
    fetchCourses();
  }, [refreshKey]);

  useEffect(() => {
    const checkFeeStatus = async () => {
      try {
        const { status } = await studentService.getFeeReceiptStatus();
        setFeeStatus(status);
      } catch (error) {
        console.error("Error checking fee status:", error);
      }
    };
    checkFeeStatus();
  }, [refreshKey]);

  // Update the fetchCourses function
  const fetchCourses = async () => {
    if (!selectedSemester) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await studentService.getCourses(selectedSemester);
      setCourses(data.courses || []);
      setSelectedElectivesMap(data.selectedElectivesMap || {});
    } catch (error: unknown) {
      console.error("Error fetching courses:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch courses";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Update the useEffect to depend on selectedSemester
  useEffect(() => {
    if (selectedSemester) {
      fetchCourses();
    }
  }, [selectedSemester, refreshKey]);

  const refreshAllData = () => {
    setRefreshKey((prevKey) => prevKey + 1);
  };

  // getPEGroupIdFromName is not needed if electives are handled differently.
  // handleRadioSelect is not needed if electives are handled differently.
  // Update radio button state when available electives are loaded is not needed if electives are handled differently.
  // fetchElectivesStatus is not needed if electives are handled differently.
  // isElectivePlaceholder is not needed as all courses are treated as mandatory

  const mandatoryCourses = useMemo(() => {
    return courses.filter((course) => {
      // Not an elective if the course code is not PCC or OEC
      const isPE = course.course_code === "PCC";
      const isOE = course.course_code === "OEC";
      const nameHasElective = (course.course_name || "")
        .toLowerCase()
        .includes("elective");

      // Course is mandatory if it's not an elective by any measure
      return !(isPE || isOE || nameHasElective || course.isElective);
    });
  }, [courses]);

  const electiveCourses = useMemo(() => {
    return courses.filter((course) => {
      // Check if this is an elective by course code or name
      const isPE = course.course_code === "PCC";
      const isOE = course.course_code === "OEC";
      const nameHasElective = (course.course_name || "")
        .toLowerCase()
        .includes("elective");

      // Course is an elective if it matches any elective criteria
      return isPE || isOE || nameHasElective || course.isElective;
    });
  }, [courses]);

  // electivePlaceholders is no longer needed in this context, as electives are now explicitly filtered
  const electivePlaceholders = useMemo(() => {
    return [];
  }, [courses]);

  useEffect(() => {
    if (courses.length > 0) {
      // Elective related fetches are not needed if electives are handled differently
      // fetchElectivesStatus();
      // fetchAvailableElectives();
    }
  }, [courses, refreshKey]);

  const fetchAvailableElectives = async () => {
    // This function will need significant refactoring or removal if electives are handled differently in the future.
    console.log(
      "fetchAvailableElectives: Not implemented for current course fetching logic."
    );
  };

  const handleFinalizeElectives = async () => {
    // This function will need significant refactoring or removal if electives are handled differently in the future.
    console.log(
      "handleFinalizeElectives: Not implemented for current course fetching logic."
    );
  };

  // professionalElectiveGroupsToShow is not needed as electives are not shown separately
  const professionalElectiveGroupsToShow: [string, Course[]][] = [];

  const EmptyCoursesPlaceholder = ({ message }: { message: string }) => (
    <div className="text-center py-12">
      <BookOpen className="h-12 w-12 mx-auto text-gray-300 mb-4" />
      <h3 className="text-lg font-bold text-gray-500 mb-2">
        No Courses Available
      </h3>
      <p className="text-gray-400 max-w-md mx-auto mb-6">{message}</p>
    </div>
  );

  const handleElectiveSelection = async (courseName: string) => {
    try {
      // Determine if this is an open or professional elective
      const isOpenElective = courseName.toLowerCase().includes("open elective");

      let options: Course[];
      if (isOpenElective) {
        console.log("Fetching open elective options for:", courseName);
        options = await studentService.getOpenElectiveOptions(courseName);
      } else {
        console.log("Fetching professional elective options for:", courseName);
        options = await studentService.getElectiveOptions(courseName);
      }

      console.log("Received elective options:", options);

      setAvailableElectives((prev) => ({
        ...prev,
        [courseName]: options,
      }));
      setCurrentElectiveGroup(courseName);
      setIsSelectingElective(true);
    } catch (error: unknown) {
      console.error("Error fetching elective options:", error);
      toast.error("Failed to load elective options");
    }
  };

  const handleElectiveConfirm = async (courseId: string) => {
    // Find the selected course to get its code
    const selectedCourse = availableElectives[currentElectiveGroup]?.find(
      (course) => course.id === courseId
    );

    if (!selectedCourse) {
      toast.error("Selected course not found");
      return;
    }

    console.log("Selected course for confirmation:", selectedCourse);

    // Check if the course is enrolled out (new boolean column)
    if (selectedCourse.enrolled_out === true) {
      toast.error("This course is enrolled out and cannot be selected");
      return;
    }

    // Check if the course is available for selection
    if (selectedCourse.isAvailable === false) {
      const reason =
        selectedCourse.unavailableReason ||
        (selectedCourse.fromUserDepartment
          ? "You cannot select electives from your own department"
          : "This course is not available for selection");

      toast.error(reason);
      return;
    }

    setPendingElectiveSelection({
      courseId,
      group: currentElectiveGroup,
    });
    setShowConfirmDialog(true);
  };

  const confirmElectiveSelection = async () => {
    if (!pendingElectiveSelection) return;

    try {
      // Determine if this is an open or professional elective
      const isOpenElective = pendingElectiveSelection.group
        .toLowerCase()
        .includes("open elective");

      if (isOpenElective) {
        console.log("Selecting open elective:", pendingElectiveSelection);
        await studentService.selectOpenElective(
          pendingElectiveSelection.group,
          pendingElectiveSelection.courseId
        );
      } else {
        console.log(
          "Selecting professional elective:",
          pendingElectiveSelection
        );
        await studentService.selectElective(
          pendingElectiveSelection.courseId,
          pendingElectiveSelection.group
        );
      }

      // Update local state with course_code
      const selectedCourse = availableElectives[currentElectiveGroup]?.find(
        (course) => course.id === pendingElectiveSelection.courseId
      );

      if (selectedCourse) {
        // Create new selected electives object with the new selection
        const updatedElectives: Record<string, string> = {
          ...selectedElectives,
          [normalizeElectiveGroupName(pendingElectiveSelection.group)]:
            selectedCourse.course_code,
        };
        setSelectedElectives(updatedElectives);
      }

      toast.success("Elective course selected successfully");
      setShowConfirmDialog(false);
      setIsSelectingElective(false);
      setPendingElectiveSelection(null);

      // Refresh all necessary data
      await Promise.all([loadAvailableElectives(), fetchCourses()]);

      // Force a complete refresh of the component
      setRefreshKey((prev) => prev + 1);
    } catch (error: unknown) {
      console.error("Error selecting elective:", error);
      toast.error("Failed to select elective course");
    }
  };

  // Add this useEffect after the existing useEffects
  useEffect(() => {
    const loadSelectedElectives = async () => {
      try {
        const selectedElectivesData =
          await studentService.getSelectedElectives();
        setSelectedElectives(selectedElectivesData);
      } catch (error: unknown) {
        console.error("Error loading selected electives:", error);
      }
    };
    loadSelectedElectives();
  }, [refreshKey]);

  // Update the loadAvailableElectives function
  const loadAvailableElectives = async () => {
    try {
      const electiveGroups = electiveCourses.map(
        (course) => course.course_name
      );
      const electiveOptions: Record<string, Course[]> = {};

      for (const group of electiveGroups) {
        console.log("Loading options for elective group:", group);

        // Determine if this is an open or professional elective
        const isOpenElective = group.toLowerCase().includes("open elective");

        let options: Course[];
        if (isOpenElective) {
          console.log("Fetching open elective options for:", group);
          options = await studentService.getOpenElectiveOptions(group);
        } else {
          console.log("Fetching professional elective options for:", group);
          options = await studentService.getElectiveOptions(group);
        }

        console.log(
          `Received ${options.length} options for ${group}:`,
          options
        );
        electiveOptions[group] = options;
      }

      setAvailableElectives(electiveOptions);
    } catch (error: unknown) {
      console.error("Error loading available electives:", error);
    }
  };

  // Update the useEffect that depends on courses
  useEffect(() => {
    if (courses.length > 0) {
      loadAvailableElectives();
    }
  }, [courses, refreshKey]);

  // Add this helper function to normalize elective group names
  const normalizeElectiveGroupName = (name: string): string => {
    // Check if this is an Open Elective first
    if (name.toLowerCase().includes("open elective")) {
      const normalizedName = name
        .replace(/–/g, "-") // Replace en dash with regular hyphen
        .replace(/\s*-\s*/g, " - "); // Normalize whitespace around hyphens

      // Extract the number/identifier (I, II, III) from the name
      const parts = normalizedName.split(" - ");
      if (parts.length >= 2) {
        return `OE-${parts[1]}`;
      }

      // If we can't split, try to extract roman numeral
      const match = normalizedName.match(/[IVX]+$/);
      if (match) {
        return `OE-${match[0]}`;
      }

      // Default for open electives
      return "OE-I";
    }

    // For Professional Electives
    const normalizedName = name
      .replace(/–/g, "-") // Replace en dash with regular hyphen
      .replace(/\s*-\s*/g, " - "); // Normalize whitespace around hyphens

    return normalizedName.includes("Lab")
      ? normalizedName.split(" - ")[1].replace("Lab", "LAB") // For PE-III-LAB
      : `PE-${normalizedName.split(" - ")[1]}`;
  };

  // Update the getSelectedCourseName function to correctly find the selected course
  const getSelectedCourseName = (electiveGroup: string) => {
    const normalizedGroup = normalizeElectiveGroupName(electiveGroup);
    const selectedCourseCode = selectedElectives[normalizedGroup];
    if (!selectedCourseCode) return null;

    // Get all available options for this elective group
    const availableOptions = availableElectives[electiveGroup];
    if (!availableOptions) return selectedCourseCode;

    // Find the course that matches the selected course code
    const selectedCourse = availableOptions.find(
      (course) => course.course_code === selectedCourseCode
    );

    // If we can't find the course in available options, return the course code
    if (!selectedCourse) {
      console.log("Selected course not found in available options:", {
        selectedCourseCode,
        availableOptions,
        electiveGroup,
      });
      return selectedCourseCode;
    }

    return selectedCourse.course_name;
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">My Courses</h1>
        <Skeleton className="h-20 w-full mb-6" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-full max-w-md" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">My Courses</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={refreshAllData}
            className="transition-all duration-200"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {!selectedSemester ? (
        <Card className="bg-yellow-50 border-yellow-200 mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <p className="text-yellow-800 font-medium">
                No approved semester found. Please submit your fee receipt for
                approval.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : feeStatus === "not_uploaded" ? (
        <Card className="bg-blue-50 border-blue-200 mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600" />
                <p className="text-blue-800 font-medium">
                  No fee receipt found
                </p>
              </div>
              <p className="text-blue-700 ml-7">
                You need to upload your fee receipt to access your courses.
                Please submit your fee slip for approval.
              </p>
              <div className="ml-7 mt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  asChild
                  className="transition-all duration-200"
                >
                  <a href="/dashboard/services/feeslip">
                    <FileText className="mr-2 h-4 w-4" />
                    Upload Fee Slip
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : feeStatus === "pending" ? (
        <Card className="bg-yellow-50 border-yellow-200 mb-6 transition-all duration-300">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <p className="text-yellow-800 font-medium">
                  Fee payment verification pending
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : feeStatus === "approved" ? (
        <Card className="bg-green-50 border-green-200 mb-6 transition-all duration-300">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-green-800 font-medium">
                Fee payment verified. You have access to all your courses for
                Semester {selectedSemester}.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="transition-all duration-300 hover:shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <TableProperties className="mr-2 h-5 w-5" />
            Course List
          </CardTitle>
          <CardDescription>
            View all your enrolled courses for the current semester
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            defaultValue="mandatory"
            value={activeTab}
            onValueChange={setActiveTab}
          >
            <TabsList className="mb-6">
              <TabsTrigger value="mandatory">Mandatory Courses</TabsTrigger>
              <TabsTrigger value="electives">Electives</TabsTrigger>
            </TabsList>

            <TabsContent
              value="mandatory"
              className="transition-opacity duration-300"
            >
              {feeStatus !== "approved" ? (
                <div className="bg-gray-50 rounded-lg p-6 text-center">
                  <Clock className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <h3 className="text-lg font-medium text-gray-700 mb-2">
                    Fee Approval Pending
                  </h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    Your course access will be available once your fee payment
                    is verified.
                  </p>
                </div>
              ) : mandatoryCourses.length > 0 ? (
                <div className="space-y-6">
                  {mandatoryCourses.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-4 text-lg">
                        Mandatory Courses
                      </h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Course course_code</TableHead>
                            <TableHead>Course Title</TableHead>
                            <TableHead className="text-center">
                              Credits
                            </TableHead>
                            <TableHead>Type</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {mandatoryCourses.map((course) => (
                            <TableRow
                              key={course.id}
                              className="transition-colors hover:bg-gray-50"
                            >
                              <TableCell className="font-medium">
                                {course.course_code}
                              </TableCell>
                              <TableCell>{course.course_name}</TableCell>
                              <TableCell className="text-center">
                                {course.credits}
                              </TableCell>
                              <TableCell>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  Mandatory
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              ) : (
                <EmptyCoursesPlaceholder message="You don't have any mandatory courses assigned yet." />
              )}
            </TabsContent>

            <TabsContent
              value="electives"
              className="transition-opacity duration-300"
            >
              {feeStatus !== "approved" ? (
                <div className="bg-gray-50 rounded-lg p-6 text-center">
                  <Clock className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <h3 className="text-lg font-medium text-gray-700 mb-2">
                    Fee Approval Pending
                  </h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    Your course access will be available once your fee payment
                    is verified.
                  </p>
                </div>
              ) : electiveCourses.length > 0 ? (
                <div className="space-y-6">
                  {electiveCourses.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-4 text-lg">
                        Elective Courses
                      </h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Course Code</TableHead>
                            <TableHead>Course Title</TableHead>
                            <TableHead className="text-center">
                              Credits
                            </TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {electiveCourses.map((course) => (
                            <TableRow
                              key={course.id}
                              className="transition-colors hover:bg-gray-50"
                            >
                              <TableCell className="font-medium">
                                {course.course_code}
                              </TableCell>
                              <TableCell>{course.course_name}</TableCell>
                              <TableCell className="text-center">
                                {course.credits}
                              </TableCell>
                              <TableCell>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Elective
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                {selectedElectives[
                                  normalizeElectiveGroupName(course.course_name)
                                ] ? (
                                  <div className="flex items-center justify-end gap-2">
                                    <span className="text-sm text-gray-600">
                                      {getSelectedCourseName(
                                        course.course_name
                                      )}
                                    </span>
                                  </div>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      handleElectiveSelection(
                                        course.course_name
                                      )
                                    }
                                    className="ml-auto"
                                  >
                                    Select Course
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
              ) : (
                <EmptyCoursesPlaceholder message="You don't have any elective courses assigned yet." />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={isSelectingElective} onOpenChange={setIsSelectingElective}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Elective Course</DialogTitle>
            <DialogDescription>
              Choose an elective course from the available options
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Select onValueChange={handleElectiveConfirm}>
              <SelectTrigger>
                <SelectValue placeholder="Select a course" />
              </SelectTrigger>
              <SelectContent>
                {availableElectives[currentElectiveGroup]?.map((course) => {
                  // Check if course is enrolled out (new boolean column)
                  const isEnrolledOut = course.enrolled_out === true;
                  const isAvailable =
                    course.isAvailable !== false && !isEnrolledOut;

                  let warningText = "";
                  if (!isAvailable) {
                    if (isEnrolledOut) {
                      warningText = "Enrolled Out";
                    } else if (course.unavailableReason) {
                      warningText = course.unavailableReason;
                    } else if (course.fromUserDepartment) {
                      warningText = "Cannot select from your department";
                    } else {
                      warningText = "Not available";
                    }
                  }

                  return (
                    <SelectItem
                      key={course.id}
                      value={course.id}
                      disabled={!isAvailable}
                      className={!isAvailable ? "text-gray-400 opacity-50" : ""}
                    >
                      {course.course_name} ({course.course_code})
                      {!isAvailable && (
                        <span className="ml-2 text-xs text-red-600">
                          ({warningText})
                        </span>
                      )}
                    </SelectItem>
                  );
                }) || []}
              </SelectContent>
            </Select>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Selection</DialogTitle>
            <DialogDescription>
              Are you sure you want to select this elective course? This choice
              cannot be changed later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={confirmElectiveSelection}>
              Confirm Selection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Courses;
