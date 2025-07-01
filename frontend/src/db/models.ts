/**
 * This file contains TypeScript interfaces for the database models.
 * In a real application, these would be used with an ORM like Sequelize or TypeORM.
 * For this demo, we'll use them to define the data structure.
 */

// User model
export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  password: string; // In a real app, this would be hashed
  rollNo: string;
  department: string;
  semester: string;
  mobileNumber: string;
  role: "student" | "admin";
  position: string;
  profilePicture?: string; // Added profile picture field
  createdAt: Date;
  updatedAt: Date;
}

// Course model
export interface Course {
  id: string;
  course_name: string;
  course_code: string;
  department: string;
  semester: string;
  credits: number;
  isElective: boolean;
  category?: string; // For open/professional electives
  isSelected?: boolean; // Flag to track if course is selected
  groupType?: string; // PE or OE
  peGroupId?: number | null;
  oeGroupId?: number | null;
  isAvailable?: boolean; // Whether the elective can be selected
  unavailableReason?: string; // Reason why the course cannot be selected
  enrolled_out?: boolean; // Whether the course has reached enrollment limit
  fromUserDepartment?: boolean; // Whether the course is from user's department
  createdAt: Date;
  updatedAt: Date;
}

// FeeReceipt model
export interface FeeReceipt {
  id: string;
  userId: string;
  status: "pending" | "approved" | "rejected";
  file: string; // URL or path to file
  semester: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Request model
export interface Request {
  id: string;
  userId: string;
  type: "gatepass" | "feeslip" | "elective";
  status: "pending" | "approved" | "rejected" | "on_hold";
  details: any; // JSON data with request-specific details
  holdStartDate?: Date; // Date when the request was put on hold
  createdAt: Date;
  updatedAt: Date;
  User: User; // Include the associated User
}

// UserCourse model (many-to-many relation)
export interface UserCourse {
  id: string;
  userId: string;
  courseId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Notification model
export interface Notification {
  id: string;
  title: string;
  description: string;
  department: string; // Department or 'All' for all departments
  deadline?: string;
  readBy?: string[]; // Array of user IDs who have read this notification
  createdAt: Date;
}

// OpenElective model
export interface OpenElective {
  id: string;
  course_code: string;
  course_name: string;
  department: string;
  createdAt: Date;
  updatedAt: Date;
}

// List of detained students (comma-separated roll numbers)
export const DETAINED_STUDENTS =
  "21R21A12A4,22R21A12B6,22R21A0302,22R21A0306,22R21A0312,22R21A0314,23R25A0303,23R25A6606,21R21A2106,21R21A2149,22R21A05M0,22R21A05M8,22R21A0443,22R21A0444,22R21A04E7,23R21A12L3,24R25A1227,23R21A0307,23R21A0311,23R21A6761,23R21A67J8,24R25A6718,23R21A6613,24R25A6616,23R21A2140,23R21A0435,23R21A0447,23R21A0469,23R21A05Z2,23R21A05DW";

/**
 * SQLite table creation statements - for reference only
 * In a real app, these would be in migration files or handled by an ORM
 */

/*
CREATE TABLE Users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  rollNo TEXT UNIQUE NOT NULL,
  department TEXT NOT NULL,
  semester TEXT NOT NULL,
  mobileNumber TEXT NOT NULL,
  role TEXT NOT NULL,
  position TEXT,
  profilePicture TEXT,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL
);

CREATE TABLE Courses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  department TEXT NOT NULL,
  semester TEXT NOT NULL,
  credits INTEGER NOT NULL,
  isElective INTEGER NOT NULL,
  category TEXT,
  isSelected INTEGER,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL
);

CREATE TABLE FeeReceipts (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  status TEXT NOT NULL,
  file TEXT NOT NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  FOREIGN KEY (userId) REFERENCES Users (id)
);

CREATE TABLE Requests (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  details TEXT NOT NULL,
  holdStartDate DATETIME,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  FOREIGN KEY (userId) REFERENCES Users (id)
);

CREATE TABLE UserCourses (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  courseId TEXT NOT NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  FOREIGN KEY (userId) REFERENCES Users (id),
  FOREIGN KEY (courseId) REFERENCES Courses (id)
);

CREATE TABLE Notifications (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  department TEXT NOT NULL,
  deadline TEXT,
  createdAt DATETIME NOT NULL
);
*/
