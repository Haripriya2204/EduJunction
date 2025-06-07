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
// import { selectElective, saveElectives } from '../../api'; // Temporarily comment out elective related imports

// Helper to get auth headers (still needed for some API calls, though studentService handles most)
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
};

// Remove romanNumerals mapping as it's not directly used for course display in this simplified view

const Courses = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedElectivesMap, setSelectedElectivesMap] = useState<
    Record<string, Course>
  >({});
  const [feeStatus, setFeeStatus] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("mandatory");
  const [refreshKey, setRefreshKey] = useState(0);
  const [availableElectives, setAvailableElectives] = useState<Record<
    number,
    Course[]
  > | null>(null);
  const [electivesLoading, setElectivesLoading] = useState(false);
  const [selectedElectives, setSelectedElectives] = useState<
    Record<number, Course>
  >({});
  const [electivesFinalized, setElectivesFinalized] = useState(false);
  const user = studentService.getCurrentUser();
  const [error, setError] = useState<string | null>(null);
  const [isFetchingElectives, setIsFetchingElectives] = useState(false);

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

  const fetchCourses = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await studentService.getCourses();
      setCourses(data.courses || []);
      // selectedElectivesMap might be empty or not relevant for now
      setSelectedElectivesMap(data.selectedElectivesMap || {});
    } catch (error: any) {
      console.error("Error fetching courses:", error);
      setError(error.message || "Failed to fetch courses");
    } finally {
      setLoading(false);
    }
  };

  const refreshAllData = () => {
    setRefreshKey((prevKey) => prevKey + 1);
  };

  // getPEGroupIdFromName is not needed if electives are handled differently.
  // handleRadioSelect is not needed if electives are handled differently.
  // Update radio button state when available electives are loaded is not needed if electives are handled differently.
  // fetchElectivesStatus is not needed if electives are handled differently.
  // isElectivePlaceholder is not needed as all courses are treated as mandatory

  const mandatoryCourses = useMemo(() => {
    return courses.filter((course) => course.course_code !== "PCC");
  }, [courses]);

  const electiveCourses = useMemo(() => {
    return courses.filter((course) => course.course_code === "PCC");
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

      {feeStatus === "approved" ? (
        <Card className="bg-green-50 border-green-200 mb-6 transition-all duration-300">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-green-800 font-medium">
                Fee payment verified. You have access to all your courses.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-yellow-50 border-yellow-200 mb-6 animate-pulse transition-all duration-300">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <p className="text-yellow-800 font-medium">
                  Fee payment verification pending
                </p>
              </div>
              <p className="text-yellow-700 ml-7">
                Your course access is limited until fee payment is verified.
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
      )}

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
                            <TableHead>Course course_code</TableHead>
                            <TableHead>Course Title</TableHead>
                            <TableHead className="text-center">
                              Credits
                            </TableHead>
                            <TableHead>Type</TableHead>
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
    </div>
  );
};

export default Courses;
