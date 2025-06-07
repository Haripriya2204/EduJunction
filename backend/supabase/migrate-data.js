const { Sequelize } = require("sequelize");
const supabase = require("../config/supabase");
const config = require("../config/config");
require("dotenv").config();

const env = process.env.NODE_ENV || "development";
const dbConfig = config[env];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    dialect: dbConfig.dialect,
  }
);

async function migrateData() {
  try {
    // Connect to MySQL
    await sequelize.authenticate();
    console.log("Connected to MySQL database");

    // Migrate Departments
    const departments = await sequelize.query("SELECT * FROM departments", {
      type: Sequelize.QueryTypes.SELECT,
    });
    for (const dept of departments) {
      const { error } = await supabase.from("departments").insert({
        id: dept.id,
        name: dept.name,
        dept_code: dept.deptCode,
        created_at: dept.createdAt,
        updated_at: dept.updatedAt,
      });
      if (error) console.error("Error migrating department:", error);
    }
    console.log("Migrated departments");

    // Migrate Users
    const users = await sequelize.query("SELECT * FROM users", {
      type: Sequelize.QueryTypes.SELECT,
    });
    for (const user of users) {
      const { error } = await supabase.from("users").insert({
        id: user.id,
        username: user.username,
        name: user.name,
        password: user.password,
        department: user.department,
        role: user.role,
        email: user.email,
        roll_no: user.rollNo,
        semester: user.semester,
        mobile_number: user.mobileNumber,
        position: user.position,
        profile_picture: user.profilePicture,
        department_id: user.departmentId,
        created_at: user.createdAt,
        updated_at: user.updatedAt,
      });
      if (error) console.error("Error migrating user:", error);
    }
    console.log("Migrated users");

    // Migrate Courses
    const courses = await sequelize.query("SELECT * FROM courses", {
      type: Sequelize.QueryTypes.SELECT,
    });
    for (const course of courses) {
      const { error } = await supabase.from("courses").insert({
        id: course.id,
        name: course.name,
        code: course.code,
        department: course.department,
        semester: course.semester,
        credits: course.credits,
        is_elective: course.isElective,
        category: course.category,
        pe_group_id: course.peGroupId,
        oe_group_id: course.oeGroupId,
        offering_department: course.offeringDepartment,
        created_at: course.createdAt,
        updated_at: course.updatedAt,
      });
      if (error) console.error("Error migrating course:", error);
    }
    console.log("Migrated courses");

    // Migrate Fee Receipts
    const feeReceipts = await sequelize.query("SELECT * FROM feeReceipts", {
      type: Sequelize.QueryTypes.SELECT,
    });
    for (const receipt of feeReceipts) {
      const { error } = await supabase.from("fee_receipts").insert({
        id: receipt.id,
        user_id: receipt.userId,
        status: receipt.status,
        file: receipt.file,
        semester: receipt.semester,
        payment_mode: receipt.paymentMode,
        transaction_number: receipt.transactionNumber,
        bank_name: receipt.bankName,
        created_at: receipt.createdAt,
        updated_at: receipt.updatedAt,
      });
      if (error) console.error("Error migrating fee receipt:", error);
    }
    console.log("Migrated fee receipts");

    // Migrate Requests
    const requests = await sequelize.query("SELECT * FROM requests", {
      type: Sequelize.QueryTypes.SELECT,
    });
    for (const request of requests) {
      const { error } = await supabase.from("requests").insert({
        id: request.id,
        user_id: request.userId,
        type: request.type,
        status: request.status,
        details: request.details,
        hold_start_date: request.holdStartDate,
        department_id: request.departmentId,
        created_at: request.createdAt,
        updated_at: request.updatedAt,
      });
      if (error) console.error("Error migrating request:", error);
    }
    console.log("Migrated requests");

    // Migrate Notifications
    const notifications = await sequelize.query("SELECT * FROM notifications", {
      type: Sequelize.QueryTypes.SELECT,
    });
    for (const notification of notifications) {
      const { error } = await supabase.from("notifications").insert({
        id: notification.id,
        title: notification.title,
        description: notification.description,
        department: notification.department,
        deadline: notification.deadline,
        read_by: notification.readBy,
        created_at: notification.createdAt,
        updated_at: notification.updatedAt,
      });
      if (error) console.error("Error migrating notification:", error);
    }
    console.log("Migrated notifications");

    // Migrate Student Electives
    const studentElectives = await sequelize.query(
      "SELECT * FROM studentElectives",
      { type: Sequelize.QueryTypes.SELECT }
    );
    for (const elective of studentElectives) {
      const { error } = await supabase.from("student_electives").insert({
        id: elective.id,
        student_id: elective.studentId,
        semester: elective.semester,
        elective_type: elective.electiveType,
        slot: elective.slot,
        course_id: elective.courseId,
        created_at: elective.createdAt,
        updated_at: elective.updatedAt,
      });
      if (error) console.error("Error migrating student elective:", error);
    }
    console.log("Migrated student electives");

    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await sequelize.close();
  }
}

migrateData();
