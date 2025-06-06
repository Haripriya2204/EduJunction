import axios from 'axios';

const API_URL = '/api/requests';

// Set up axios to always send the Authorization header if token is present
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

const requestService = {
  // Get all requests for department admin
  async getDepartmentRequests() {
    try {
      const response = await axios.get(`${API_URL}/department`);
      return response.data;
    } catch (error) {
      console.error('Error fetching department requests:', error);
      throw error.response?.data || { error: 'Failed to fetch requests' };
    }
  },

  // Update request status
  async updateRequestStatus(requestId, status) {
    try {
      const response = await axios.patch(`${API_URL}/${requestId}`, { status });
      return response.data;
    } catch (error) {
      console.error('Error updating request status:', error);
      throw error.response?.data || { error: 'Failed to update request status' };
    }
  },

  // Create new request (for students)
  async createRequest(type, details) {
    try {
      const response = await axios.post(API_URL, { type, details });
      return response.data;
    } catch (error) {
      console.error('Error creating request:', error);
      throw error.response?.data || { error: 'Failed to create request' };
    }
  },

  // Get all requests for the logged-in student
  async getMyRequests() {
    try {
      const response = await axios.get(`${API_URL}/my`);
      return response.data;
    } catch (error) {
      console.error('Error fetching my requests:', error);
      throw error.response?.data || { error: 'Failed to fetch my requests' };
    }
  }
};

export default requestService; 