import { OpenElective } from '../db/models';

// Get open electives excluding user's department
export const getOpenElectives = async (department: string): Promise<OpenElective[]> => {
  try {
    const response = await fetch(`/api/electives/open?department=${department}`);
    if (!response.ok) {
      throw new Error('Failed to fetch open electives');
    }
    const data = await response.json();
    return data.filter((elective: OpenElective) => elective.department !== department);
  } catch (error) {
    console.error('Error fetching open electives:', error);
    throw error;
  }
};

// Select an open elective
export const selectOpenElective = async (data: {
  userId: number;
  courseId: number;
  semester: string;
}): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch('/api/electives/open/select', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to select open elective');
    }

    return response.json();
  } catch (error) {
    console.error('Error selecting open elective:', error);
    throw error;
  }
};

// Validate if a student can select an open elective
export const validateOpenElectiveSelection = async (
  userId: number,
  courseId: number,
  department: string
): Promise<{ canSelect: boolean; message: string }> => {
  try {
    const response = await fetch(`/api/electives/open/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, courseId, department }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to validate open elective selection');
    }

    return response.json();
  } catch (error) {
    console.error('Error validating open elective selection:', error);
    throw error;
  }
}; 