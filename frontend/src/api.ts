export const selectElective = async (data: {
  userId: number;
  courseId: number;
  semester: string;
  peGroupId: number;
}) => {
  const response = await fetch('/api/electives/select', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Failed to select elective');
  }

  return response.json();
};

export const saveElectives = async (userId: number, semester: string) => {
  const response = await fetch(`/api/electives/save/${userId}/${semester}`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Failed to save elective selections');
  }

  return response.json();
}; 