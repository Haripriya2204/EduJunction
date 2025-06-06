import { useEffect, useState, useMemo } from "react";
import { Button } from "../../components/ui/button";
import { studentService } from "../../services/api";
import type { Course as ApiCourse } from "../../services/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Skeleton } from "../../components/ui/skeleton";
import { toast } from "sonner";
import { 
  BookOpen, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  RefreshCw,
  FileText,
  TableProperties
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { selectElective, saveElectives } from '../../api';

// Helper to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

// Add romanNumerals mapping
const romanNumerals: Record<number, string> = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'III LAB',
  5: 'V',
  6: 'VI'
};

// Define our local interface for courses
interface ElectiveCourse extends Omit<ApiCourse, 'id'> {
  id: string | number;
  isSelected?: boolean;
  groupType?: string;
  peGroupId?: number | null;
  oeGroupId?: number | null;
  createdAt: Date;
  updatedAt: Date;
  isPlaceholder?: boolean;
}

const Courses = () => {
  const [courses, setCourses] = useState<ElectiveCourse[]>([]);
  const [selectedElectivesMap, setSelectedElectivesMap] = useState<Record<string, ElectiveCourse>>({});
  const [feeStatus, setFeeStatus] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("mandatory");
  const [refreshKey, setRefreshKey] = useState(0);
  const [availableElectives, setAvailableElectives] = useState<Record<number, ElectiveCourse[]> | null>(null);
  const [electivesLoading, setElectivesLoading] = useState(false);
  const [selectedElectives, setSelectedElectives] = useState<Record<number, ElectiveCourse>>({});
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
      setSelectedElectivesMap(data.selectedElectivesMap || {});
    } catch (error: any) {
      console.error('Error fetching courses:', error);
      setError(error.message || 'Failed to fetch courses');
    } finally {
      setLoading(false);
    }
  };
  
  const refreshAllData = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };
  
  const getPEGroupIdFromName = (name: string): number | null => {
    const trimmed = name.trim().toUpperCase();
    if (trimmed.includes('PROFESSIONAL ELECTIVE - I') && !trimmed.includes('II')) return 1;
    if (trimmed.includes('PROFESSIONAL ELECTIVE - II')) return 2;
    if (trimmed.includes('PROFESSIONAL ELECTIVE - III') && !trimmed.includes('LAB')) return 3;
    if (trimmed.includes('PROFESSIONAL ELECTIVE - III LAB')) return 4;
    if (trimmed.includes('PROFESSIONAL ELECTIVE - V')) return 5;
    if (trimmed.includes('PROFESSIONAL ELECTIVE - VI')) return 6;
    return null;
  };
  
  const handleRadioSelect = async (groupId: number, course: ElectiveCourse) => {
    if (electivesFinalized) {
      toast.error('Your selections are finalized and cannot be changed.');
      return;
    }

    if (!user) {
      toast.error('User not found. Please log in again.');
      return;
    }

    const semester = courses[0]?.semester;
    if (!semester) {
      toast.error('Could not determine semester.');
      return;
    }

    const originalSelection = selectedElectives[groupId];
    setSelectedElectives(prev => ({ ...prev, [groupId]: course }));

    try {
      await selectElective({
        userId: Number(user.id),
        courseId: Number(course.id),
        semester: String(semester),
        peGroupId: groupId,
      });
      toast.success(`${course.name} selected successfully!`);
      refreshAllData(); // Full refresh to get latest state
    } catch (error: any) {
      toast.error(`Error selecting ${course.name}: ${error.message}`);
      // Revert optimistic update on error
      if (originalSelection) {
        setSelectedElectives(prev => ({ ...prev, [groupId]: originalSelection }));
      } else {
        setSelectedElectives(prev => {
          const newSelections = { ...prev };
          delete newSelections[groupId];
          return newSelections;
        });
      }
      if (error.message.includes('finalized')) {
        setElectivesFinalized(true);
      }
    }
  };

  // Update radio button state when available electives are loaded
  useEffect(() => {
    if (!availableElectives) return;
    
    const newSelected: Record<number, ElectiveCourse> = {};
    Object.entries(availableElectives).forEach(([groupId, courses]) => {
      const selectedCourse = (courses as ElectiveCourse[]).find(c => c.isSelected);
      if (selectedCourse) {
        newSelected[Number(groupId)] = selectedCourse;
      }
    });
    
    setSelectedElectives(prev => ({ ...prev, ...newSelected }));
  }, [availableElectives]);

  const fetchElectivesStatus = async () => {
    if (!user || isFetchingElectives) return;
    try {
      const semester = courses[0]?.semester || '';
      if (!semester) return;
      const response = await fetch(`/api/electives/status/${user.id}/${semester}`, { headers: getAuthHeaders() });
      const data = await response.json();
      if (data.success) {
        setElectivesFinalized(data.electivesFinalized);
      }
    } catch (error) {
      console.error('Error fetching elective status:', error);
    }
  };

  const isElectivePlaceholder = (course: ElectiveCourse) => {
    return course.category === 'PE' || course.category === 'OE';
  };
  
  const mandatoryCourses = useMemo(() => {
    return courses.filter(course => !isElectivePlaceholder(course));
  }, [courses]);

  const electivePlaceholders = useMemo(() => {
    return courses.filter(isElectivePlaceholder);
  }, [courses]);

  useEffect(() => {
    if (courses.length > 0) {
      fetchElectivesStatus();
      fetchAvailableElectives();
    }
  }, [courses, refreshKey]);

  const fetchAvailableElectives = async () => {
    if (!user || isFetchingElectives) return;
    setIsFetchingElectives(true);
    setElectivesLoading(true);
    try {
      const semester = courses[0]?.semester || '';
      if (!semester) {
        setError('Could not determine current semester.');
        return;
      }
      const response = await fetch(`/api/electives/available/${user.id}/${semester}`, { headers: getAuthHeaders() });
      const data = await response.json();
      if (data.success) {
        setAvailableElectives(data.data);
      } else {
        setError(data.message || 'Failed to fetch available electives');
      }
    } catch (error) {
      setError('Failed to fetch available electives. Please try again.');
    } finally {
      setElectivesLoading(false);
      setIsFetchingElectives(false);
    }
  };

  const handleFinalizeElectives = async () => {
    if (!user) return;
    setElectivesLoading(true);
    try {
      const semester = courses[0]?.semester;
      if (!semester) {
        toast.error('Could not determine semester. Please try again.');
        return;
      }
      await saveElectives(Number(user.id), String(semester));
      toast.success('All elective selections have been finalized!');
      setElectivesFinalized(true);
      setActiveTab('mandatory');
      refreshAllData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to finalize selections.');
    } finally {
      setElectivesLoading(false);
    }
  };
  
  const professionalElectiveGroupsToShow = Object.entries(availableElectives || {})
    .filter(([, courses]) => courses.length > 0)
    .sort(([a], [b]) => Number(a) - Number(b));
  
  const EmptyCoursesPlaceholder = ({ message }: { message: string }) => (
    <div className="text-center py-12">
      <BookOpen className="h-12 w-12 mx-auto text-gray-300 mb-4" />
      <h3 className="text-lg font-bold text-gray-500 mb-2">No Courses Available</h3>
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
              {[1, 2, 3, 4].map(i => (
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
                <Button variant="secondary" size="sm" asChild className="transition-all duration-200">
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
          <Tabs defaultValue="mandatory" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="mandatory">Mandatory Courses</TabsTrigger>
              <TabsTrigger value="electives">Electives</TabsTrigger>
            </TabsList>
            
            <TabsContent value="mandatory" className="transition-opacity duration-300">
              {electivesFinalized && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-blue-700 text-center">
                  Course selection completed. Your electives are now fixed.
                </div>
              )}
              {feeStatus !== "approved" ? (
                <div className="bg-gray-50 rounded-lg p-6 text-center">
                  <Clock className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <h3 className="text-lg font-medium text-gray-700 mb-2">Fee Approval Pending</h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    Your course access will be available once your fee payment is verified.
                  </p>
                </div>
              ) : (mandatoryCourses.length > 0 || electivePlaceholders.length > 0) ? (
                <div className="space-y-6">
                  {mandatoryCourses.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-4 text-lg">Mandatory Courses</h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Course Code</TableHead>
                            <TableHead>Course Title</TableHead>
                            <TableHead className="text-center">Credits</TableHead>
                            <TableHead>Type</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {mandatoryCourses.map((course) => (
                            <TableRow key={course.id} className="transition-colors hover:bg-gray-50">
                              <TableCell className="font-medium">{course.code}</TableCell>
                              <TableCell>{course.name}</TableCell>
                              <TableCell className="text-center">{course.credits}</TableCell>
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

                  {electivePlaceholders.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-4 text-lg">Electives</h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Course Code</TableHead>
                            <TableHead>Course Title</TableHead>
                            <TableHead className="text-center">Credits</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {electivePlaceholders.map((placeholder) => {
                            const isOE = placeholder.category === 'OE';
                            const groupId = getPEGroupIdFromName(placeholder.name);
                            const groupKey = isOE ? `oe-` : `pe-${groupId}`; // Simplified OE key
                            const selectedCourse = selectedElectivesMap[groupKey];
                            const displayCourse = selectedCourse || placeholder;
                            
                            return (
                              <TableRow key={placeholder.id} className="transition-colors hover:bg-gray-50">
                                <TableCell className="font-medium">{displayCourse.code}</TableCell>
                                <TableCell>{displayCourse.name}</TableCell>
                                <TableCell className="text-center">{displayCourse.credits}</TableCell>
                                <TableCell>
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    isOE ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                                  }`}>
                                    {isOE ? 'Open Elective' : 'Professional Elective'}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {!electivesFinalized ? (
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      onClick={() => setActiveTab('electives')}
                                    >
                                      {selectedCourse ? 'Change' : 'Select'}
                                    </Button>
                                  ) : (
                                    <span className="text-sm text-gray-500">Finalized</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              ) : (
                <EmptyCoursesPlaceholder message="You don't have any mandatory courses assigned yet." />
              )}
            </TabsContent>

            <TabsContent value="electives" className="transition-opacity duration-300">
              {electivesFinalized ? (
                <div className="mb-8">
                  <h3 className="font-semibold mb-4 text-lg">Your Finalized Electives</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Course Code</TableHead>
                        <TableHead>Course Title</TableHead>
                        <TableHead>Credits</TableHead>
                        <TableHead>Category</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.values(selectedElectivesMap).map((course: ElectiveCourse) => (
                        <TableRow key={course.id}>
                          <TableCell>{course.code}</TableCell>
                          <TableCell>{course.name}</TableCell>
                          <TableCell>{course.credits}</TableCell>
                          <TableCell>{course.category}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-lg">Available Electives</h3>
                    <Button
                      onClick={fetchAvailableElectives}
                      disabled={electivesLoading}
                      variant="outline"
                      size="sm"
                    >
                      {electivesLoading ? 'Loading...' : 'Refresh'}
                    </Button>
                  </div>
                  {electivesLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                      <div className="text-gray-500">Loading available electives...</div>
                    </div>
                  ) : professionalElectiveGroupsToShow.length > 0 ? (
                    <div className="space-y-8">
                      <div>
                        <div className="space-y-6">
                          {professionalElectiveGroupsToShow.map(([groupId, courses]) => {
                              const selectedCourseForGroup = selectedElectives[Number(groupId)];
                              return (
                                <div key={'pe-group-' + groupId} className="border border-green-200 rounded-lg p-4 bg-green-50">
                                  <h4 className="font-medium mb-4 text-lg text-green-800">
                                    {`Professional Elective ${romanNumerals[Number(groupId)]}`}
                                  </h4>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Course Code</TableHead>
                                        <TableHead>Course Title</TableHead>
                                        <TableHead>Credits</TableHead>
                                        <TableHead>Select</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {(courses as ElectiveCourse[]).map((courseData: ElectiveCourse) => (
                                        <TableRow key={groupId + '-' + courseData.id}>
                                          <TableCell className="font-medium">{courseData.code}</TableCell>
                                          <TableCell>{courseData.name}</TableCell>
                                          <TableCell>{courseData.credits}</TableCell>
                                          <TableCell>
                                            <input
                                              type="radio"
                                              name={`elective-group-${groupId}`}
                                              checked={selectedCourseForGroup?.id === courseData.id}
                                              onChange={() => handleRadioSelect(Number(groupId), courseData)}
                                              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                                              disabled={electivesFinalized}
                                            />
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              );
                            })}
                        </div>
                      </div>

                      <div className="mt-8 flex justify-end">
                        <Button 
                          onClick={handleFinalizeElectives}
                          disabled={electivesLoading || electivesFinalized}
                          className="px-8 py-2"
                          size="lg"
                        >
                          {electivesLoading ? 'Finalizing...' : 'Finalize All Selections'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500 text-center py-8">
                      <BookOpen className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                      <div>No electives currently available for this semester.</div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Courses;
