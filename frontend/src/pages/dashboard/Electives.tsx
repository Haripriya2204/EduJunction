import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { studentService } from "../../services/api";
import { Course } from "../../db/models";
import { Skeleton } from "../../components/ui/skeleton";

interface ElectiveOption extends Course {
  enrolled_out?: boolean;
}

const Electives = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<string>("III-II");
  const [availableSemesters, setAvailableSemesters] = useState<string[]>([]);
  const [selectedElectives, setSelectedElectives] = useState<Record<string, string>>({});
  const [electiveOptions, setElectiveOptions] = useState<Record<string, ElectiveOption[]>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingOptions, setLoadingOptions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchAvailableSemesters();
  }, []);

  useEffect(() => {
    if (selectedSemester) {
      console.log(`Electives.tsx: useEffect triggered for semester: "${selectedSemester}"`);
      fetchCourses();
    }
  }, [selectedSemester]);

  // Add specific semester for testing
  useEffect(() => {
    // Try to select a semester that should have open electives (usually III-II)
    console.log("Electives.tsx: Available semesters:", availableSemesters);
    if (availableSemesters.includes("III-II")) {
      console.log("Electives.tsx: Setting semester to III-II for testing");
      setSelectedSemester("III-II");
    } else if (availableSemesters.length > 0) {
      console.log(`Electives.tsx: Setting semester to ${availableSemesters[0]} for testing`);
      setSelectedSemester(availableSemesters[0]);
    }
  }, [availableSemesters]);

  const fetchAvailableSemesters = async () => {
    try {
      const semesters = await studentService.getAvailableSemesters();
      setAvailableSemesters(semesters);
      if (semesters.length > 0) {
        setSelectedSemester(semesters[0]);
      }
    } catch (error) {
      console.error("Error fetching semesters:", error);
      toast.error("Failed to fetch available semesters");
    }
  };

  const fetchCourses = async () => {
    try {
      setLoading(true);
      console.log(`Electives.tsx: fetchCourses called for semester: "${selectedSemester}"`);
      const result = await studentService.getCourses(selectedSemester);
      const allCourses = result.courses;
      console.log(`Electives.tsx: Received ${allCourses.length} total courses:`, allCourses);
      
      // Detailed logging of every course
      allCourses.forEach((course, index) => {
        console.log(`Electives.tsx: Course[${index}]:`, {
          id: course.id,
          name: course.course_name,
          code: course.course_code,
          isElective: course.isElective,
          department: course.department
        });
      });
      
      // Filter courses for electives with detailed logging
      const electiveCourses = allCourses.filter(course => {
        const courseNameLower = (course.course_name || "").toLowerCase();
        const isProfElective = courseNameLower.includes("professional elective");
        const isOpenElective = courseNameLower.includes("open elective") || courseNameLower.includes("open-elective");
        const isElectiveByFlag = !!course.isElective;
        const isElective = isElectiveByFlag || isProfElective || isOpenElective;
        
        console.log(`Electives.tsx: Evaluating course "${course.course_name}" as elective:`, {
          courseNameLower,
          isProfElective,
          isOpenElective,
          isElectiveByFlag,
          isElective
        });
        
        return isElective;
      });
      
      console.log(`Electives.tsx: Filtered ${electiveCourses.length} elective courses from ${allCourses.length} total:`, electiveCourses);
      setCourses(electiveCourses);
      
      // Process selected electives
      if (result.selectedElectivesMap) {
        console.log(`Electives.tsx: Setting selected electives:`, result.selectedElectivesMap);
        setSelectedElectives(result.selectedElectivesMap);
      }
    } catch (error) {
      console.error("Electives.tsx: Error fetching courses:", error);
      toast.error("Failed to fetch courses");
    } finally {
      setLoading(false);
    }
  };

  const fetchSelectedElectives = async () => {
    try {
      const electives = await studentService.getSelectedElectives();
      setSelectedElectives(electives);
    } catch (error) {
      console.error("Error fetching selected electives:", error);
      toast.error("Failed to fetch selected electives");
    }
  };

  const handleElectiveSelection = async (courseName: string, courseId: string) => {
    try {
      console.log(`Electives.tsx: handleElectiveSelection for course "${courseName}", selected option: "${courseId}"`);
      
      // Check if it's an open elective based on name
      const isOpenElective = courseName.toLowerCase().includes("open elective");
      
      if (isOpenElective) {
        console.log(`Electives.tsx: Processing as Open Elective selection`);
        await studentService.selectOpenElective(courseName, courseId);
      } else {
        console.log(`Electives.tsx: Processing as Professional Elective selection`);
        await studentService.selectElective(courseId, courseName);
      }
      
      toast.success("Elective selected successfully");
      
      // Refresh all selected electives after successful selection
      console.log(`Electives.tsx: Refreshing selected electives data`);
      fetchSelectedElectives();
    } catch (error: unknown) {
      console.error("Electives.tsx: Error selecting elective:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to select elective";
      toast.error(errorMessage);
    }
  };

  const getElectiveOptions = async (courseName: string) => {
    if (loadingOptions[courseName]) {
      console.log(`Electives.tsx: Already loading options for "${courseName}", skipping`);
      return;
    }
    
    if (electiveOptions[courseName]?.length > 0) {
      console.log(`Electives.tsx: Options for "${courseName}" already loaded (${electiveOptions[courseName].length} items), using cached data`);
      return;
    }
    
    try {
      setLoadingOptions(prev => ({ ...prev, [courseName]: true }));
      console.log(`Electives.tsx: getElectiveOptions fetching for course: "${courseName}"`);
      
      const isOpenElective = courseName.toLowerCase().includes("open elective");
      
      if (isOpenElective) {
        console.log(`Electives.tsx: Fetching Open Elective options`);
        const options = await studentService.getOpenElectiveOptions(courseName);
        console.log(`Electives.tsx: Received ${options?.length || 0} open elective options:`, options);
        
        if (options && options.length > 0) {
          setElectiveOptions(prev => ({ ...prev, [courseName]: options }));
        } else {
          console.warn(`Electives.tsx: No open elective options returned for "${courseName}"`);
          toast.warning(`No options available for ${courseName}`);
        }
      } else {
        console.log(`Electives.tsx: Fetching Professional Elective options`);
        const options = await studentService.getElectiveOptions(courseName);
        console.log(`Electives.tsx: Received ${options?.length || 0} professional elective options:`, options);
        
        if (options && options.length > 0) {
          setElectiveOptions(prev => ({ ...prev, [courseName]: options }));
        } else {
          console.warn(`Electives.tsx: No professional elective options returned for "${courseName}"`);
          toast.warning(`No options available for ${courseName}`);
        }
      }
    } catch (error) {
      console.error(`Electives.tsx: Error fetching elective options for "${courseName}":`, error);
      toast.error(`Failed to fetch options for ${courseName}`);
    } finally {
      setLoadingOptions(prev => ({ ...prev, [courseName]: false }));
    }
  };

  const renderElectiveSection = (course: Course) => {
    console.log(`Electives.tsx: Rendering elective section for course:`, course);
    
    // More flexible matching for electives
    const courseNameLower = (course.course_name || "").toLowerCase();
    const courseCodeUpper = (course.course_code || "").toUpperCase();
    
    const isProfElective = courseNameLower.includes("professional elective");
    const isOpenElective = courseNameLower.includes("open elective") || courseCodeUpper === "OEC";
    const isElectiveByFlag = !!course.isElective;
    const isElective = isElectiveByFlag || isProfElective || isOpenElective;
    
    console.log(`Electives.tsx: Evaluating course "${course.course_name}" for rendering:`, {
      courseNameLower,
      courseCodeUpper,
      isProfElective,
      isOpenElective,
      isElectiveByFlag,
      isElective
    });
    
    // If not an elective by any criteria, don't render
    if (!isElective) {
      console.log(`Electives.tsx: Course "${course.course_name}" is not an elective, not rendering section`);
      return null;
    }

    // Even if course.course_name is undefined, use a default name
    const courseName = course.course_name || (isOpenElective ? "Open Elective" : "Professional Elective");
    const selectedCourseCode = selectedElectives[courseName];
    const options = electiveOptions[courseName] || [];

    console.log(`Electives.tsx: Rendering elective section for "${courseName}":`, {
      selectedCourseCode,
      hasOptions: options.length > 0,
      options
    });

    // If no options are loaded and we're not currently loading them, fetch them
    if (options.length === 0 && !loadingOptions[courseName]) {
      console.log(`Electives.tsx: No options loaded for "${courseName}", fetching them now`);
      getElectiveOptions(courseName);
    }

    return (
      <Card key={course.id} className="mb-4">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>{courseName}</span>
            {selectedCourseCode && (
              <span className="text-sm text-green-600">Selected: {selectedCourseCode}</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingOptions[courseName] ? (
            <div className="py-2 text-center">Loading options...</div>
          ) : (
            <Select
              onValueChange={(value) => handleElectiveSelection(courseName, value)}
              value={selectedCourseCode}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an elective" />
              </SelectTrigger>
              <SelectContent>
                {options.length > 0 ? (
                  options.map((option: ElectiveOption) => (
                    <SelectItem 
                      key={option.id} 
                      value={option.id}
                      disabled={option.enrolled_out}
                    >
                      {option.course_code} - {option.course_name} 
                      {option.enrolled_out && " (Enrolled Out)"}
                      {option.department && ` (${option.department})`}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-options" disabled>No options available</SelectItem>
                )}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Elective Selection</h1>
        <Select
          value={selectedSemester}
          onValueChange={setSelectedSemester}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select semester" />
          </SelectTrigger>
          <SelectContent>
            {availableSemesters.map((semester) => (
              <SelectItem key={semester} value={semester}>
                {semester}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Debug information */}
      <div className="p-4 bg-gray-100 rounded-md">
        <h2 className="text-lg font-semibold mb-2">Debug Information</h2>
        <p>Selected Semester: {selectedSemester}</p>
        <p>Total courses: {courses.length}</p>
        <p>Professional Electives: {courses.filter(c => {
          const courseNameLower = (c.course_name || "").toLowerCase();
          return courseNameLower.includes("professional elective");
        }).length}</p>
        <p>Open Electives: {courses.filter(c => {
          const courseNameLower = (c.course_name || "").toLowerCase();
          const codeIsOE = (c.course_code || "").toUpperCase() === "OEC";
          return courseNameLower.includes("open elective") || codeIsOE;
        }).length}</p>

        {/* Force refresh button */}
        <div className="mt-4">
          <button 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2"
            onClick={() => {
              console.log("Force refreshing courses and selected electives");
              fetchCourses();
              fetchSelectedElectives();
            }}
          >
            Force Refresh Data
          </button>
          
          <button 
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            onClick={() => {
              // Force re-render elective cards
              console.log("Force re-rendering all elective cards");
              const updatedCourses = [...courses];
              setCourses([]);
              setTimeout(() => setCourses(updatedCourses), 100);
            }}
          >
            Force Re-render Cards
          </button>
        </div>

        {/* Manual Open Elective Creation for Testing */}
        <div className="mt-4 p-4 bg-red-100 rounded-md">
          <h3 className="font-medium">Direct OEC Test:</h3>
          <p className="mb-2">Create a manual open elective card for testing:</p>
          <button 
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            onClick={() => {
              // Create a fake open elective course
              const fakeOEC: Course = {
                id: "fake-oec-id",
                course_name: "Open Elective-I",
                course_code: "OEC",
                department: "IT",
                isElective: true,
                credits: 3,
                semester: selectedSemester,
                createdAt: new Date(),
                updatedAt: new Date()
              };
              
              console.log("Electives.tsx: Created fake OEC course:", fakeOEC);
              
              // Directly fetch options for this course
              getElectiveOptions("Open Elective-I");
              
              // Add to courses array to force re-render
              setCourses(prev => [...prev.filter(c => c.id !== "fake-oec-id"), fakeOEC]);
            }}
          >
            Create Test Open Elective Card
          </button>
        </div>

        {/* Show raw courses data */}
        <div className="mt-4 p-4 bg-yellow-100 rounded-md">
          <h3 className="font-medium mb-2">Raw Courses Data:</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white text-xs">
              <thead>
                <tr>
                  <th className="border px-2 py-1">ID</th>
                  <th className="border px-2 py-1">Code</th>
                  <th className="border px-2 py-1">Name</th>
                  <th className="border px-2 py-1">Elective?</th>
                  <th className="border px-2 py-1">Will Render?</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course, index) => {
                  const courseNameLower = (course.course_name || "").toLowerCase();
                  const isProfElective = courseNameLower.includes("professional elective");
                  const isOpenElective = courseNameLower.includes("open elective") || (course.course_code || "").toUpperCase() === "OEC";
                  const isElectiveByFlag = !!course.isElective;
                  const willRender = isElectiveByFlag || isProfElective || isOpenElective;
                  
                  return (
                    <tr key={index} className={willRender ? "bg-green-50" : "bg-red-50"}>
                      <td className="border px-2 py-1">{course.id}</td>
                      <td className="border px-2 py-1">{course.course_code}</td>
                      <td className="border px-2 py-1">{course.course_name}</td>
                      <td className="border px-2 py-1">{isElectiveByFlag ? "Yes" : "No"}</td>
                      <td className="border px-2 py-1">{willRender ? "Yes" : "No"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-2">
          <h3 className="font-medium">All Courses:</h3>
          <ul className="list-disc pl-5">
            {courses.map((course, index) => (
              <li key={index}>
                <span className={course.isElective ? "font-semibold" : ""}>
                  {course.course_code} - {course.course_name}
                </span>
                {course.isElective ? " (isElective=true)" : " (isElective=false)"}
                
                {/* Try to render an elective section anyway */}
                {!course.isElective && (course.course_name || "").toLowerCase().includes("elective") && 
                  <span className="text-red-500"> (Should be marked as elective!)</span>
                }
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Directly force rendering all electives with debugging */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-4">All Potential Electives</h2>
        <div className="grid gap-6">
          {courses.map((course, idx) => {
            // Check if it looks like an elective by name or code
            const courseNameLower = (course.course_name || "").toLowerCase();
            const courseCodeUpper = (course.course_code || "").toUpperCase();
            const isPotentialElective = 
              course.isElective || 
              courseNameLower.includes("elective") || 
              courseCodeUpper === "OEC" ||
              courseCodeUpper === "PCC";
              
            if (!isPotentialElective) return null;
            
            // Always try to get options
            if (!electiveOptions[course.course_name] && !loadingOptions[course.course_name]) {
              getElectiveOptions(course.course_name);
            }
            
            const options = electiveOptions[course.course_name] || [];
            const selectedCode = selectedElectives[course.course_name];
            
            return (
              <Card key={`forced-${idx}`} className="mb-4">
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>{course.course_name} {!course.isElective && "(Forced)"}</span>
                    {selectedCode && (
                      <span className="text-sm text-green-600">Selected: {selectedCode}</span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingOptions[course.course_name] ? (
                    <div className="py-2 text-center">Loading options...</div>
                  ) : (
                    <div>
                      <Select
                        onValueChange={(value) => handleElectiveSelection(course.course_name, value)}
                        value={selectedCode}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select an elective" />
                        </SelectTrigger>
                        <SelectContent>
                          {options.length > 0 ? (
                            options.map((option: ElectiveOption) => (
                              <SelectItem 
                                key={option.id} 
                                value={option.id}
                                disabled={option.enrolled_out}
                              >
                                {option.course_code} - {option.course_name} 
                                {option.enrolled_out && " (Enrolled Out)"}
                                {option.department && ` (${option.department})`}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="no-options" disabled>No options available</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      
                      <div className="mt-2 text-xs text-gray-500">
                        <p>Course code: {course.course_code}</p>
                        <p>isElective flag: {course.isElective ? "true" : "false"}</p>
                        <p>Options count: {options.length}</p>
                        <button 
                          className="mt-1 px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs"
                          onClick={() => getElectiveOptions(course.course_name)}
                        >
                          Refresh Options
                        </button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[125px] w-full" />
          ))}
        </div>
      ) : courses.length > 0 ? (
        <div className="grid gap-6">
          <h2 className="text-xl font-semibold">Normal Elective Cards</h2>
          {courses.map((course) => renderElectiveSection(course))}
        </div>
      ) : (
        <div className="py-8 text-center">
          <p className="text-muted-foreground">No elective courses available for this semester.</p>
        </div>
      )}
    </div>
  );
};

export default Electives; 