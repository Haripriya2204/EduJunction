import React, { useEffect, useState } from 'react';
import axios from 'axios';

const DataFetcher = () => {
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get('http://localhost:3000/api/users')
      .then(response => setUsers(response.data))
      .catch(error => setError('Error fetching users'));
    axios.get('http://localhost:3000/api/courses')
      .then(response => setCourses(response.data))
      .catch(error => setError('Error fetching courses'));
  }, []);

  return (
    <div>
      <h1>Users</h1>
      {error && <p>{error}</p>}
      <ul>
        {users.map((user, index) => (
          <li key={index}>{user.name} ({user.email})</li>
        ))}
      </ul>
      <h1>Courses</h1>
      <ul>
        {courses.map((course, index) => (
          <li key={index}>{course.name} ({course.code})</li>
        ))}
      </ul>
    </div>
  );
};

export default DataFetcher; 