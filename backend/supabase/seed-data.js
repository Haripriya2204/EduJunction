const supabase = require("../config/supabase");
require("dotenv").config();

async function seedData() {
  try {
    // Seed Departments
    const departments = [
      { name: "Computer Science", dept_code: "CSE" },
      { name: "Information Technology", dept_code: "IT" },
      { name: "Electronics and Communication", dept_code: "ECE" },
      { name: "Electrical and Electronics", dept_code: "EEE" },
      { name: "Mechanical Engineering", dept_code: "MECH" },
      { name: "Civil Engineering", dept_code: "CIVIL" },
    ];

    const { data: deptData, error: deptError } = await supabase
      .from("departments")
      .insert(departments)
      .select();

    if (deptError) throw deptError;
    console.log("Departments seeded successfully");

    // Seed Users (including admin and student)
    const users = [
      {
        username: "admin",
        name: "Administrator",
        email: "admin@mlrit.ac.in",
        password: "$2a$10$X7UrH5YxX5YxX5YxX5YxX.5YxX5YxX5YxX5YxX5YxX5YxX5YxX", // hashed 'admin123'
        department: "Administration",
        role: "admin",
        position: "System Administrator",
        department_id: deptData[0].id,
      },
      {
        username: "student1",
        name: "John Doe",
        email: "john.doe@mlrit.ac.in",
        password: "$2a$10$X7UrH5YxX5YxX5YxX5YxX.5YxX5YxX5YxX5YxX5YxX5YxX5YxX", // hashed 'student123'
        department: "Computer Science",
        role: "student",
        roll_no: "19R21A0501",
        semester: "6",
        mobile_number: "9876543210",
        department_id: deptData[0].id,
      },
    ];

    const { data: userData, error: userError } = await supabase
      .from("users")
      .insert(users)
      .select();

    if (userError) throw userError;
    console.log("Users seeded successfully");

    // Seed Courses
    const courses = [
      {
        name: "Data Structures",
        code: "CS201",
        department: "Computer Science",
        semester: "3",
        credits: 4,
        is_elective: false,
        department_id: deptData[0].id,
      },
      {
        name: "Database Management Systems",
        code: "CS301",
        department: "Computer Science",
        semester: "5",
        credits: 4,
        is_elective: false,
        department_id: deptData[0].id,
      },
      {
        name: "Artificial Intelligence",
        code: "CS401",
        department: "Computer Science",
        semester: "6",
        credits: 3,
        is_elective: true,
        category: "PE",
        pe_group_id: 1,
        department_id: deptData[0].id,
      },
      {
        name: "Machine Learning",
        code: "CS402",
        department: "Computer Science",
        semester: "6",
        credits: 3,
        is_elective: true,
        category: "PE",
        pe_group_id: 1,
        department_id: deptData[0].id,
      },
      {
        name: "Web Development",
        code: "CS403",
        department: "Computer Science",
        semester: "6",
        credits: 3,
        is_elective: true,
        category: "OE",
        oe_group_id: 1,
        department_id: deptData[0].id,
      },
    ];

    const { data: courseData, error: courseError } = await supabase
      .from("courses")
      .insert(courses)
      .select();

    if (courseError) throw courseError;
    console.log("Courses seeded successfully");

    // Seed Notifications
    const notifications = [
      {
        title: "Welcome to MLRIT",
        description:
          "Welcome to the new academic year. Please complete your profile and course registration.",
        department: "All",
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      },
      {
        title: "Course Registration",
        description:
          "Course registration for semester 6 is now open. Please register your courses by the deadline.",
        department: "Computer Science",
        deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
      },
    ];

    const { error: notificationError } = await supabase
      .from("notifications")
      .insert(notifications);

    if (notificationError) throw notificationError;
    console.log("Notifications seeded successfully");

    // Seed Student Electives
    const studentElectives = [
      {
        student_id: userData[1].id,
        semester: 6,
        elective_type: "PE",
        slot: "PE-I",
        course_id: courseData[2].id,
      },
      {
        student_id: userData[1].id,
        semester: 6,
        elective_type: "OE",
        slot: "OE-I",
        course_id: courseData[4].id,
      },
    ];

    const { error: electiveError } = await supabase
      .from("student_electives")
      .insert(studentElectives);

    if (electiveError) throw electiveError;
    console.log("Student Electives seeded successfully");

    console.log("All data seeded successfully!");
  } catch (error) {
    console.error("Error seeding data:", error);
  }
}

seedData();
