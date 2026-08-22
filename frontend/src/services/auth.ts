import { DETAINED_STUDENTS, User } from '../db/models';
import { authService as apiAuthService } from './api';

// Check if a student is detained - synchronous check
export const isDetained = (rollNo: string): boolean => {
  console.log('Checking detained status for roll number:', rollNo);
  const detainedList = DETAINED_STUDENTS.split(',');
  console.log('Detained list:', detainedList);
  const isDetained = detainedList.includes(rollNo.trim());
  console.log('Is detained:', isDetained);
  return isDetained;
};

// Check if a student is detained with message
export const checkDetainedStatus = (rollNo: string): { isDetained: boolean; message?: string } => {
  console.log('Checking detained status with message for roll number:', rollNo);
  if (isDetained(rollNo)) {
    console.log('Student is detained, returning error message');
    return {
      isDetained: true,
      message: 'You have been detained for this academic year/semester and do not have access to this portal.'
    };
  }
  console.log('Student is not detained');
  return { isDetained: false };
};

// Login with detained status check
export const login = async (credentials: { rollNo: string; password: string }): Promise<{ 
  success: boolean; 
  message: string;
  user?: User;
}> => {
  console.log('Login attempt for roll number:', credentials.rollNo);
  
  // First check if the student is detained - synchronous check
  const detained = isDetained(credentials.rollNo);
  console.log('Detained check result:', detained);
  
  if (detained) {
    console.log('Login blocked - student is detained');
    return {
      success: false,
      message: 'You have been detained for this academic year/semester and do not have access to this portal.'
    };
  }

  try {
    console.log('Proceeding with login');
    // Use the existing auth service for login
    const user = await apiAuthService.login(credentials.rollNo, credentials.password);
    
    return {
      success: true,
      message: 'Login successful',
      user
    };
  } catch (error) {
    console.error('Error during login process:', error);
    throw error;
  }
}; 