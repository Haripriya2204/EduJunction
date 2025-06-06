import { useEffect, useState } from "react";
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
}

const Courses = () => {
  const [courses, setCourses] = useState<ElectiveCourse[]>([]);
  const [feeStatus, setFeeStatus] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("mandatory");
  const [refreshKey, setRefreshKey] = useState(0);
  const [availableElectives, setAvailableElectives] = useState<Record<number, ElectiveCourse[]> | null>(null);
  const [electivesLoading, setElectivesLoading] = useState(false);
  const [visiblePEGroups, setVisiblePEGroups] = useState<number[]>([]);
  const [selectedElectives, setSelectedElectives] = useState<Record<number, ElectiveCourse>>({});
  const [pendingElectives, setPendingElectives] = useState<Record<number, ElectiveCourse>>({});
  const [electivesFinalized, setElectivesFinalized] = useState(false);
  const [finalizedElectives, setFinalizedElectives] = useState<Record<number, ElectiveCourse>>({});
  const user = studentService.getCurrentUser();
  const [error, setError] = useState<string | null>(null);
  const [selectedPEGroup, setSelectedPEGroup] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isFetchingElectives, setIsFetchingElectives] = useState(false);
  
  // Debug log for availableElectives
  useEffect(() => {
    console.log('DEBUG: availableElectives (state)', availableElectives);
  }, [availableElectives]);

  // Debug log for finalizedElectives
  useEffect(() => {
    console.log('DEBUG: finalizedElectives (state)', finalizedElectives);
  }, [finalizedElectives]);

  // Debug log for electivesFinalized
  useEffect(() => {
    console.log('DEBUG: electivesFinalized (state)', electivesFinalized);
  }, [electivesFinalized]);

  // Debug log for selectedElectives
  useEffect(() => {
    console.log('DEBUG: selectedElectives (state)', selectedElectives);
  }, [selectedElectives]);
  
  // Place debug log here, before any return
  useEffect(() => {
    console.log('DEBUG: availableElectives', availableElectives, 'visiblePEGroups', visiblePEGroups);
  }, [availableElectives, visiblePEGroups]);
  
  // Force an immediate check on first render
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
  }, []);
  
  // Fetch courses on component mount
  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const dbCourses = await studentService.getCourses();
      // Convert DBCourse to Course
      const convertedCourses: ElectiveCourse[] = dbCourses.map(c => ({
        ...c,
        id: parseInt(c.id)
      }));
      setCourses(convertedCourses);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setError('Failed to fetch courses');
    } finally {
      setLoading(false);
    }
  };
  
  const refreshCourses = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };
  
  // Helper to extract group ID from course name (PE or OE)
  const getPEGroupIdFromName = (name: string) => {
    const trimmed = name.trim();
    
    // Check for PE-III LAB first (special case)
    if (/^Professional Elective\\s*-?\\s*III\\s*LAB$/i.test(trimmed)) {
      return 4; // This matches our backend peGroupId for PE-III LAB
    }
    
    // Professional Elective (with or without dash)
    const peMatch = trimmed.match(/^Professional Elective\\s*-?\\s*(I{1,3}|IV|V|VI)$/i);
    if (peMatch) {
      const roman = peMatch[1];
      const romanToNum: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 };
      return romanToNum[roman.toUpperCase()] || null;
    }
    
    // Open Elective (with or without dash) - use different range to avoid conflicts
    const oeMatch = trimmed.match(/^Open Elective\s*-?\s*(I{1,3}|IV|V|VI)$/i);
    if (oeMatch) {
      const roman = oeMatch[1];
      const romanToNum: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 };
      return 100 + (romanToNum[roman.toUpperCase()] || 0); // OE-I: 101, OE-II: 102, etc.
    }
    return null;
  };

  // Helper to determine if a group ID is for Open Electives
  const isOpenElectiveGroup = (groupId: number) => {
    return groupId >= 100;
  };
  
  // Update selectedElectives when availableElectives changes
  useEffect(() => {
    if (!availableElectives) return;
    
    const newSelected: Record<number, ElectiveCourse> = {};
    Object.entries(availableElectives).forEach(([groupId, courses]) => {
      const selected = (courses as ElectiveCourse[]).find(c => c.isSelected);
      if (selected) newSelected[Number(groupId)] = selected;
    });
    setSelectedElectives(newSelected);
  }, [availableElectives]);
  
  // When a radio is selected, update pendingElectives
  const handleRadioSelect = (groupId: number, course: any) => {
    // Check if this group is already finalized
    if (finalizedElectives[groupId]) {
      toast.error('This elective group is already finalized and cannot be changed.');
      return;
    }
    setPendingElectives(prev => ({ ...prev, [groupId]: course }));
  };

  // Fetch electives finalized status
  const fetchElectivesStatus = async () => {
    if (!user || isFetchingElectives) return;
    try {
      const semester = courses[0]?.semester || '';
      const response = await fetch(`/api/electives/status/${user.id}/${semester}`);
      const data = await response.json();
      if (data.success) {
        setElectivesFinalized(data.electivesFinalized);
        setFinalizedElectives(data.selections.reduce((acc: any, curr: any) => {
          acc[curr.peGroupId || curr.oeGroupId] = curr;
          return acc;
        }, {}));
        
        // Update available electives if not finalized and not already fetching
        if (!data.electivesFinalized && !isFetchingElectives) {
          setAvailableElectives(data.availableElectives);
        }
      } else {
        console.warn('Failed to fetch elective status:', data.message);
      }
    } catch (error) {
      console.error('Error fetching elective status:', error);
    }
  };

  // Debug log for finalizedElectives
  useEffect(() => {
    if (electivesFinalized) {
      console.log('DEBUG: finalizedElectives', finalizedElectives);
    }
  }, [finalizedElectives, electivesFinalized]);

  // getMandatoryCourses - separate mandatory courses and electives
  const getMandatoryCourses = () => {
    return courses.filter(course => !isElectivePlaceholder(course.name));
  };

  // getElectivePlaceholders - get elective placeholders to show in mandatory tab
  const getElectivePlaceholders = () => {
    const currentSemester = courses[0]?.semester;
    return courses.filter(course => 
      isElectivePlaceholder(course.name) && 
      course.semester === currentSemester
    );
  };

  // Fetch status on load and after refresh
  useEffect(() => {
    if (courses.length > 0) {
      fetchElectivesStatus();
    }
  }, [courses, refreshKey]);

  // Handler for View button
  const handleViewPE = (peGroupId: number | null) => {
    if (typeof peGroupId !== 'number' || isNaN(peGroupId)) {
      toast.error('Invalid elective group. Please contact admin.');
      return;
    }
    if (electivesFinalized) {
      toast.info('Your elective selections are finalized and cannot be changed.');
      return;
    }
    setActiveTab('electives');
    setVisiblePEGroups([peGroupId]);
    fetchAvailableElectives();
  };

  // Fetch available electives for the current user and semester
  const fetchAvailableElectives = async () => {
    if (!user || isFetchingElectives) return;
    setIsFetchingElectives(true);
    setElectivesLoading(true);
    try {
      const semester = courses[0]?.semester || '';
      if (!semester) {
        throw new Error('No semester found');
      }
      const response = await fetch(`/api/electives/available/${user.id}/${semester}`);
      const data = await response.json();
      if (data.success) {
        console.log('DEBUG: Setting available electives:', data.data);
        setAvailableElectives(data.data);
      } else {
        console.error('Failed to fetch available electives:', data.message);
        setError(data.message || 'Failed to fetch available electives');
      }
    } catch (error) {
      console.error('Error fetching available electives:', error);
      setError('Failed to fetch available electives. Please try again.');
    } finally {
      setElectivesLoading(false);
      setIsFetchingElectives(false);
    }
  };

  // Helper to get visible PE group IDs from the mandatory list
  const getVisiblePEGroupsFromMandatory = () => {
    const groups: number[] = [];
    courses.filter(course => !course.isElective).forEach(course => {
      const peGroupId = getPEGroupIdFromName(course.name);
      if (peGroupId && !groups.includes(peGroupId)) {
        groups.push(peGroupId);
      }
    });
    return groups;
  };

  // In useEffect, set visible PE groups after courses are loaded
  useEffect(() => {
    if (courses.length > 0) {
      setVisiblePEGroups(getVisiblePEGroupsFromMandatory());
    }
  }, [courses]);

  // Handle save electives
  const handleSaveElectives = async () => {
    if (!user) return;
    setElectivesLoading(true);
    try {
      // Get semester from the first course
      const semester = courses[0]?.semester;
      if (!semester) {
        toast.error('Could not determine semester. Please try again.');
        return;
      }

      // Check if all visible groups have selections
      const missingGroups = visiblePEGroups.filter(
        groupId => !pendingElectives[groupId] && !selectedElectives[groupId]
      );

      if (missingGroups.length > 0) {
        toast.error(`Please select an elective for group(s): ${missingGroups.join(', ')}`);
        return;
      }

      // Save selections for each group
      for (const groupId of visiblePEGroups) {
        const course = pendingElectives[groupId] || selectedElectives[groupId];
        if (course) {
          try {
          await selectElective({
            userId: Number(user.id),
            courseId: Number(course.id),
            semester: String(semester),
            peGroupId: Number(groupId)
          });
          } catch (error: any) {
            toast.error(error.message || `Failed to select elective for group ${groupId}`);
            return;
          }
        }
      }

      // Save all selections
      try {
      await saveElectives(Number(user.id), String(semester));
        toast.success('Elective selections saved successfully');
      setPendingElectives({});
      setActiveTab('mandatory');
      // Force refresh of userCourses and electives status
      setRefreshKey(prevKey => prevKey + 1);
      await fetchElectivesStatus();
      } catch (error: any) {
        toast.error(error.message || 'Failed to save elective selections');
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred while saving selections');
    } finally {
      setElectivesLoading(false);
    }
  };
  
  // Empty state component
  const EmptyCoursesPlaceholder = ({ message }: { message: string }) => (
    <div className="text-center py-12">
      <BookOpen className="h-12 w-12 mx-auto text-gray-300 mb-4" />
      <h3 className="text-lg font-bold text-gray-500 mb-2">No Courses Available</h3>
      <p className="text-gray-400 max-w-md mx-auto mb-6">{message}</p>
    </div>
  );
  
  // Loading state
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
  
  // Add this helper function near getPEGroupIdFromName
  const isElectivePlaceholder = (name: string) => {
    return /^Professional Elective/.test(name) || /^Open Elective/.test(name);
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">My Courses</h1>
        
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            variant="outline" 
            onClick={refreshCourses}
            className="transition-all duration-200"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>
      
      {/* Fee verification status card */}
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
              ) : (getMandatoryCourses().length > 0 || getElectivePlaceholders().length > 0) ? (
                <div className="space-y-6">
                  {/* Mandatory Courses Section */}
                  {getMandatoryCourses().length > 0 && (
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
                          {getMandatoryCourses().map((course) => (
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

                  {/* Electives Section */}
                  {getElectivePlaceholders().length > 0 && (
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
                          {getElectivePlaceholders().map((course) => {
                            const groupId = getPEGroupIdFromName(course.name);
                            const selectedElective = selectedElectives[groupId as number];
                            const isOE = course.name.includes('Open Elective');
                            
                            return (
                              <TableRow key={course.id} className="transition-colors hover:bg-gray-50">
                                <TableCell className="font-medium">
                                  {selectedElective ? selectedElective.code : course.code}
                                </TableCell>
                                <TableCell>
                                  {selectedElective ? selectedElective.name : course.name}
                                </TableCell>
                                <TableCell className="text-center">{course.credits}</TableCell>
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
                                      onClick={() => handleViewPE(groupId as number)}
                                    >
                                      {selectedElective ? 'Change' : 'Select'}
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
              {activeTab === 'mandatory' && Object.keys(pendingElectives).length > 0 && !electivesFinalized && (
                <Button type="button" onClick={handleSaveElectives} className="mt-4">Save Selections</Button>
              )}
            </TabsContent>

            <TabsContent value="electives" className="transition-opacity duration-300">
              <div className="mb-4 flex gap-2">
                <Button
                  onClick={async () => {
                    if (!user) return;
                    const semester = courses[0]?.semester || '6';
                    const response = await fetch(`/api/electives/available/${user.id}/${semester}`);
                    const data = await response.json();
                    console.log('DEBUG: Manual /api/electives/available response', data);
                  }}
                  variant="outline"
                  size="sm"
                >
                  Debug: Fetch Available Electives
                </Button>
              </div>
              {electivesFinalized ? (
                <div className="mb-8">
                  <h3 className="font-semibold mb-4 text-lg">Your Selected Electives</h3>
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
                      {Object.values(finalizedElectives).map((course: ElectiveCourse) => (
                        <TableRow key={course.id}>
                          <TableCell>{course.code}</TableCell>
                          <TableCell>{course.name}</TableCell>
                          <TableCell>{course.credits}</TableCell>
                          <TableCell>{course.category || (course.peGroupId ? 'PE' : 'OE')}</TableCell>
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
                      {electivesLoading ? 'Loading...' : 'Refresh Electives'}
                    </Button>
                  </div>
                  {electivesLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                      <div className="text-gray-500">Loading available electives...</div>
                    </div>
                  ) : Object.entries(availableElectives || {}).length === 0 ? (
                    <div className="text-gray-500 text-center py-8">
                      <BookOpen className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                      <div>No electives available for this semester.</div>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {/* Professional Electives Section */}
                      {Object.entries(availableElectives || {})
                        .filter(([groupId]) => !isOpenElectiveGroup(Number(groupId)))
                        .sort(([a], [b]) => Number(a) - Number(b))
                        .length > 0 && (
                        <div>
                          <h3 className="font-semibold mb-6 text-xl text-green-700">Professional Electives</h3>
                          <div className="space-y-6">
                            {Object.entries(availableElectives || {})
                              .filter(([groupId]) => !isOpenElectiveGroup(Number(groupId)))
                              .sort(([a], [b]) => Number(a) - Number(b))
                              .map(([groupId, courses]) => (
                              <div key={'pe-group-' + groupId} className="border border-green-200 rounded-lg p-4 bg-green-50">
                                <h4 className="font-medium mb-4 text-lg text-green-800">
                                  {Number(groupId) === 4 ? 'Professional Elective III LAB' : `Professional Elective ${romanNumerals[Number(groupId)]}`}
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
                                            checked={courseData.isSelected}
                                            onChange={() => handleRadioSelect(Number(groupId), courseData)}
                                          />
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Open Electives Section */}
                      {Object.entries(availableElectives || {})
                        .filter(([groupId]) => isOpenElectiveGroup(Number(groupId)))
                        .sort(([a], [b]) => Number(a) - Number(b))
                        .length > 0 && (
                        <div>
                          <h3 className="font-semibold mb-6 text-xl text-purple-700">Open Electives</h3>
                          <div className="space-y-6">
                            {Object.entries(availableElectives || {})
                              .filter(([groupId]) => isOpenElectiveGroup(Number(groupId)))
                              .sort(([a], [b]) => Number(a) - Number(b))
                              .map(([groupId, courses]) => (
                              <div key={'oe-group-' + groupId} className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                                <h4 className="font-medium mb-4 text-lg text-purple-800">
                                  Open Elective Group {Number(groupId) - 100}
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
                                            checked={courseData.isSelected}
                                            onChange={() => handleRadioSelect(Number(groupId), courseData)}
                                          />
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Save Button */}
                      {Object.keys(pendingElectives).length > 0 && (
                        <div className="mt-8 flex justify-end">
                          <Button 
                            onClick={handleSaveElectives}
                            disabled={electivesLoading}
                            className="px-8 py-2"
                            size="lg"
                          >
                            {electivesLoading ? 'Saving...' : 'Save Selections'}
                          </Button>
                        </div>
                      )}
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
