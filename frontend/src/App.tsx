// import { Toaster } from "@/components/ui/toaster";
// import { Toaster as Sonner } from "@/components/ui/sonner";
// import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import About from './pages/about';
import Features from './pages/features';
import Help from './pages/help';
import Contact from './pages/contact';

// Dashboard pages
import DashboardLayout from "./components/dashboard/DashboardLayout";
import Profile from "./pages/dashboard/Profile";
import Courses from "./pages/dashboard/Courses";
import FeeSlip from "./pages/dashboard/FeeSlip";
import Requests from "./pages/dashboard/Requests";
import AdminDashboard from "./pages/dashboard/AdminDashboard";
import StudentRequests from "./pages/dashboard/StudentRequests";
import Events from "./pages/dashboard/Events";
import FeeReports from "./pages/dashboard/FeeReports";

// Auth protection
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { authService } from "./services/api";

const queryClient = new QueryClient();

const App = () => {
  // Redirect based on user role
  const DashboardIndex = () => {
    const isAdmin = authService.isAdmin();
    return isAdmin ? <AdminDashboard /> : <Courses />;
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/about" element={<About />} />
            <Route path="/features" element={<Features />} />
            <Route path="/help" element={<Help />} />
            <Route path="/contact" element={<Contact />} />

            {/* Protected dashboard routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardIndex />} />
              <Route path="profile" element={<Profile />} />
              <Route path="courses" element={<Courses />} />
              <Route path="services/feeslip" element={<FeeSlip />} />
              <Route path="requests" element={<Requests />} />

              {/* Admin routes */}
              <Route path="admin" element={<AdminDashboard />} />
              <Route path="student-requests" element={<StudentRequests />} />
              <Route path="events" element={<Events />} />
              <Route path="fee-reports" element={<FeeReports />} />
            </Route>

            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
