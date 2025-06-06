declare module '../../services/requestService' {
  import { Request } from './api';
  const requestService: {
    getDepartmentRequests: () => Promise<Request[]>;
    updateRequestStatus: (requestId: string, status: string) => Promise<any>;
    createRequest: (type: string, details: any) => Promise<Request>;
    getMyRequests: () => Promise<Request[]>;
  };
  export default requestService;
}

// Also keep the global declaration for direct imports
import { Request } from './api';
declare const requestService: {
  getDepartmentRequests: () => Promise<Request[]>;
  updateRequestStatus: (requestId: string, status: string) => Promise<any>;
  createRequest: (type: string, details: any) => Promise<Request>;
  getMyRequests: () => Promise<Request[]>;
};
export default requestService; 