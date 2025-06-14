import { Button } from "../components/ui/button";
import { BookUser, BookOpen, UserCheck, FileText, Lightbulb } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { authService } from "../services/api";

const Home = () => {
  const navigate = useNavigate();
  
  // Redirect to dashboard if already logged in

  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="py-6 px-4 sm:px-6 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <a href="/" className="flex items-center text-edu-primary">
            <BookUser className="h-8 w-8 mr-2" />
            <span className="text-xl font-bold">Edu Junction</span>
          </a>
          
          <div className="flex space-x-4">
            <Button asChild>
              <a href="/login">Login</a>
            </Button>
          </div>
        </div>
      </header>
      
      {/* Hero section */}
      <section className="relative text-white py-20 px-4 overflow-hidden">
        {/* Background image with blur */}
        <div
          className="absolute inset-0 w-full h-full z-0"
          style={{
            backgroundImage: `url('/assets/images/MLRIT HD Pic.JPG')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(2px)',
            opacity: 1,
          }}
        />
        {/* Overlay for extra darkening if needed */}
        <div className="absolute inset-0 bg-edu-primary/10 z-10" />
        <div className="max-w-5xl mx-auto text-center relative z-20">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Streamline Your Campus Experience
          </h1>
          <p className="text-xl mb-8 max-w-3xl mx-auto text-blue-50">
            A comprehensive platform for students to manage courses, 
            request services, and simplify administrative tasks.
          </p>
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 justify-center">
            <Button size="lg" className="bg-white text-edu-primary hover:bg-gray-100" asChild>
              <a href="/login">Log In</a>
            </Button>
          </div>
        </div>
      </section>
      
      {/* Features section */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 bg-white rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-edu-primary/10 rounded-lg flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6 text-edu-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Course Management</h3>
              <p className="text-gray-600">Access course materials, track progress, and manage your academic journey.</p>
            </div>
            
            <div className="p-6 bg-white rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-edu-primary/10 rounded-lg flex items-center justify-center mb-4">
                <UserCheck className="w-6 h-6 text-edu-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Service Requests</h3>
              <p className="text-gray-600">Submit and track requests for gate passes, fee slips, and elective courses.</p>
            </div>
            
            <div className="p-6 bg-white rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-edu-primary/10 rounded-lg flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-edu-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Document Management</h3>
              <p className="text-gray-600">Upload and manage important documents like fee receipts and certificates.</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA section */}
      <section className="py-16 px-4 bg-edu-secondary/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-xl text-gray-600 mb-8">
            Log in to access your educational portal.
          </p>
          <Button size="lg" className="bg-edu-primary hover:bg-edu-dark" asChild>
            <a href="/login">Log In Now</a>
          </Button>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-10 px-4 bg-gray-800 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <a href="/" className="flex items-center text-white">
                <BookUser className="h-6 w-6 mr-2" />
                <span className="text-lg font-bold">Edu Junction</span>
              </a>
            </div>
            
            <div className="flex space-x-6">
              <a href="#" className="text-gray-300 hover:text-white">About</a>
              <a href="#" className="text-gray-300 hover:text-white">Features</a>
              <a href="#" className="text-gray-300 hover:text-white">Help</a>
              <a href="#" className="text-gray-300 hover:text-white">Contact</a>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-gray-700 text-center text-sm text-gray-400">
            <p>&copy; {new Date().getFullYear()} Edu Junction. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
