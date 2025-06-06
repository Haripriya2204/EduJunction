// Helper to get auth headers from localStorage
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

export const selectElective = async (data: {
  userId: number;
  courseId: number;
  semester: string;
  peGroupId: number;
}) => {
  const response = await fetch('/api/electives/select', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to select elective');
  }

  return response.json();
};

export const saveElectives = async (userId: number, semester: string) => {
  const response = await fetch(`/api/electives/save/${userId}/${semester}`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to save elective selections');
  }

  return response.json();
}; 