/**
 * This file would typically contain database connection setup.
 * For this demo, we're using localStorage to simulate a database.
 * In a real application, this would use an actual SQLite connection.
 */

import { User, Course, Request, FeeReceipt, UserCourse, Notification } from './models';

// Initialize the database with some seed data
export const initializeDatabase = () => {
  // Check if the database has been initialized
  if (!localStorage.getItem('dbInitialized')) {
    // Seed users
    const users: User[] = [
      {
        id: 'stadmin',
        username: 'stadmin',
        name: 'Student Admin',
        email: 'stadmin@gmail.com',
        password: 'stadmin', // In a real app, this would be hashed
        rollNo: '19r21a0543',
        department: 'Computer Science',
        semester: '6',
        mobileNumber: '9876543210',
        role: 'student',
        position: '',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'admin',
        username: 'admin',
        name: 'Administrator',
        email: 'fadmin@gmail.com',
        password: 'fadmin', // In a real app, this would be hashed
        rollNo: 'ADMIN001',
        department: 'Administration',
        semester: '',
        mobileNumber: '1234567890',
        role: 'admin',
        position: 'Faculty Head',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    localStorage.setItem('users', JSON.stringify(users));
    
    // Seed courses
    const courses: Course[] = [
      {
        id: '1',
        name: 'Data Structures',
        code: 'CS201',
        department: 'Computer Science',
        semester: '3',
        credits: 4,
        isElective: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '2',
        name: 'Database Management',
        code: 'CS301',
        department: 'Computer Science',
        semester: '5',
        credits: 4,
        isElective: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '3',
        name: 'Artificial Intelligence',
        code: 'CS401',
        department: 'Computer Science',
        semester: '6',
        credits: 3,
        isElective: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '4',
        name: 'Machine Learning',
        code: 'CS402',
        department: 'Computer Science',
        semester: '6',
        credits: 3,
        isElective: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '5',
        name: 'Web Development',
        code: 'CS403',
        department: 'Computer Science',
        semester: '6',
        credits: 3,
        isElective: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '6',
        name: 'Mobile App Development',
        code: 'CS404',
        department: 'Computer Science',
        semester: '6',
        credits: 3,
        isElective: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
    ];
    localStorage.setItem('courses', JSON.stringify(courses));
    
    // Create empty tables for other models
    localStorage.setItem('feeReceipts', JSON.stringify([]));
    localStorage.setItem('requests', JSON.stringify([]));
    localStorage.setItem('userCourses', JSON.stringify([]));
    localStorage.setItem('notifications', JSON.stringify([]));
    
    // Mark the database as initialized
    localStorage.setItem('dbInitialized', 'true');
  }
};

// Initialize the database when the module is imported
initializeDatabase();

// Database access functions (in a real app, these would interact with SQLite)
export const db = {
  getUsers: (): User[] => {
    return JSON.parse(localStorage.getItem('users') || '[]');
  },
  
  getUserByEmail: (email: string): User | undefined => {
    const users = db.getUsers();
    return users.find(user => user.email === email);
  },
  
  getUserById: (id: string): User | undefined => {
    const users = db.getUsers();
    return users.find(user => user.id === id);
  },
  
  getUserByUsername: (username: string): User | undefined => {
    const users = db.getUsers();
    return users.find(user => user.username === username);
  },
  
  createUser: (user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): User => {
    const users = db.getUsers();
    const newUser: User = {
      ...user,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    return newUser;
  },
  
  // Notifications
  createNotification: (notification: Omit<Notification, 'id' | 'createdAt'>): Notification => {
    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      createdAt: new Date()
    };
    notifications.push(newNotification);
    localStorage.setItem('notifications', JSON.stringify(notifications));
    return newNotification;
  },
  
  getNotifications: (department?: string): Notification[] => {
    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    if (department) {
      return notifications.filter((n: Notification) => n.department === department || n.department === 'All');
    }
    return notifications;
  },
  
  // Request management functions
  getRequests: (): Request[] => {
    return JSON.parse(localStorage.getItem('requests') || '[]');
  },
  
  createRequest: (request: Omit<Request, 'id' | 'createdAt' | 'updatedAt'>): Request => {
    const requests = db.getRequests();
    const newRequest: Request = {
      ...request,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    requests.push(newRequest);
    localStorage.setItem('requests', JSON.stringify(requests));
    return newRequest;
  },
  
  updateRequestStatus: (id: string, status: 'pending' | 'approved' | 'rejected'): Request | null => {
    const requests = db.getRequests();
    const index = requests.findIndex(req => req.id === id);
    if (index === -1) return null;
    
    const updatedRequest = { 
      ...requests[index], 
      status,
      updatedAt: new Date() 
    };
    
    requests[index] = updatedRequest;
    localStorage.setItem('requests', JSON.stringify(requests));
    return updatedRequest;
  },
  
  // Check and auto-decline on hold requests
  checkOnHoldRequests: () => {
    const requests = db.getRequests();
    const now = new Date();
    
    const updatedRequests = requests.map(req => {
      if (req.status === 'on_hold' && req.holdStartDate) {
        const holdDate = new Date(req.holdStartDate);
        const daysDifference = Math.floor((now.getTime() - holdDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDifference >= 7) {
          return { ...req, status: 'rejected', updatedAt: new Date() };
        }
      }
      return req;
    });
    
    localStorage.setItem('requests', JSON.stringify(updatedRequests));
  },
  
  // Other database access functions would go here...
};

// Export a database connection function (in a real app, this would connect to SQLite)
export const connectToDatabase = () => {
  console.log('Connected to database');
  // Check on hold requests and auto-decline if needed
  db.checkOnHoldRequests();
  return db;
};
