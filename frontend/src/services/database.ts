import pool from "../config/database";
import {
  User,
  Course,
  Request,
  FeeReceipt,
  UserCourse,
  Notification,
} from "../db/models";
import { v4 as uuidv4 } from "uuid";

// User operations
export const userService = {
  async getUsers(): Promise<User[]> {
    const [rows] = await pool.execute("SELECT * FROM users");
    return rows as User[];
  },

  async getUserByEmail(email: string): Promise<User | null> {
    const [rows] = await pool.execute("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    return (rows as User[])[0] || null;
  },

  async getUserById(id: string): Promise<User | null> {
    const [rows] = await pool.execute("SELECT * FROM users WHERE id = ?", [id]);
    return (rows as User[])[0] || null;
  },

  async createUser(
    user: Omit<User, "id" | "createdAt" | "updatedAt">
  ): Promise<User> {
    const id = uuidv4();
    const now = new Date();
    const [result] = await pool.execute(
      "INSERT INTO users (id, name, email, password, rollNo, department, semester, mobileNumber, role, position, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        id,
        user.name,
        user.email,
        user.password,
        user.rollNo,
        user.department,
        user.semester,
        user.mobileNumber,
        user.role,
        user.position,
        now,
        now,
      ]
    );
    return { ...user, id, createdAt: now, updatedAt: now };
  },
};

// Course operations
export const courseService = {
  async getCourses(): Promise<Course[]> {
    const [rows] = await pool.execute("SELECT * FROM courses");
    return rows as Course[];
  },

  async createCourse(
    course: Omit<Course, "id" | "createdAt" | "updatedAt">
  ): Promise<Course> {
    const id = uuidv4();
    const now = new Date();
    await pool.execute(
      "INSERT INTO courses (id, name, code, department, semester, credits, isElective, category, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        id,
        course.name,
        course.code,
        course.department,
        course.semester,
        course.credits,
        course.isElective,
        course.category,
        now,
        now,
      ]
    );
    return { ...course, id, createdAt: now, updatedAt: now };
  },
};

// Request operations
export const requestService = {
  async getRequests(): Promise<Request[]> {
    const [rows] = await pool.execute("SELECT * FROM requests");
    return rows as Request[];
  },

  async createRequest(
    request: Omit<Request, "id" | "createdAt" | "updatedAt">
  ): Promise<Request> {
    const id = uuidv4();
    const now = new Date();
    await pool.execute(
      "INSERT INTO requests (id, userId, type, status, details, holdStartDate, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        id,
        request.userId,
        request.type,
        request.status,
        JSON.stringify(request.details),
        request.holdStartDate,
        now,
        now,
      ]
    );
    return { ...request, id, createdAt: now, updatedAt: now };
  },

  async updateRequestStatus(
    id: string,
    status: "pending" | "approved" | "rejected"
  ): Promise<Request | null> {
    const now = new Date();
    await pool.execute(
      "UPDATE requests SET status = ?, updatedAt = ? WHERE id = ?",
      [status, now, id]
    );
    const [rows] = await pool.execute("SELECT * FROM requests WHERE id = ?", [
      id,
    ]);
    return (rows as Request[])[0] || null;
  },
};

// Notification operations
export const notificationService = {
  async getNotifications(department?: string): Promise<Notification[]> {
    let query = "SELECT * FROM notifications";
    const params: any[] = [];

    if (department) {
      query += ' WHERE department = ? OR department = "All"';
      params.push(department);
    }

    const [rows] = await pool.execute(query, params);
    return rows as Notification[];
  },

  async createNotification(
    notification: Omit<Notification, "id" | "createdAt">
  ): Promise<Notification> {
    const id = uuidv4();
    const now = new Date();
    await pool.execute(
      "INSERT INTO notifications (id, title, description, department, deadline, readBy, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        id,
        notification.title,
        notification.description,
        notification.department,
        notification.deadline,
        JSON.stringify(notification.readBy || []),
        now,
      ]
    );
    return { ...notification, id, createdAt: now };
  },
};

// FeeReceipt operations
export const feeReceiptService = {
  async createFeeReceipt(
    receipt: Omit<FeeReceipt, "id" | "createdAt" | "updatedAt">
  ): Promise<FeeReceipt> {
    const id = uuidv4();
    const now = new Date();
    await pool.execute(
      "INSERT INTO feeReceipts (id, userId, status, file, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
      [id, receipt.userId, receipt.status, receipt.file, now, now]
    );
    return { ...receipt, id, createdAt: now, updatedAt: now };
  },
};

// UserCourse operations
export const userCourseService = {
  async createUserCourse(
    userCourse: Omit<UserCourse, "id" | "createdAt" | "updatedAt">
  ): Promise<UserCourse> {
    const id = uuidv4();
    const now = new Date();
    await pool.execute(
      "INSERT INTO userCourses (id, userId, courseId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)",
      [id, userCourse.userId, userCourse.courseId, now, now]
    );
    return { ...userCourse, id, createdAt: now, updatedAt: now };
  },
};
