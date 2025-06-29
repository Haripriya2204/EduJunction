import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import {
  BookUser,
  BookOpen,
  UserCheck,
  FileText,
  Lightbulb,
  ArrowRight,
} from "lucide-react";
import { useEffect } from "react";
import { authService } from "../services/api";

const Home = () => {
  return (
    <div className="min-h-screen relative">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/background.jpg')",
          filter: "brightness(0.7)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="w-full py-4 px-6 flex justify-between items-center">
          <div className="text-white text-2xl font-bold">Edmit</div>
          <div className="flex gap-4">
            <Link to="/login">
              <Button
                variant="outline"
                className="text-blue-500 border-blue-500 hover:bg-blue-500/10"
              >
                Login
              </Button>
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <main className="flex-1 flex items-center justify-center px-6">
          <div className="text-center text-white max-w-3xl">
            <h1 className="text-5xl font-bold mb-6">Welcome to </h1>
            <h1 className="text-5xl font-bold mb-6 text-blue-800">
              EDUCATION MANAGEMENT SYSTEM
            </h1>
            <p className="text-xl mb-8">
              Streamline your educational journey with our comprehensive fee
              management system
            </p>
            <Link to="/login">
              <Button
                size="lg"
                className="bg-white text-black hover:bg-white/90"
              >
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </main>

        {/* Features section */}
        <section className="py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-bold text-white text-center mb-12">
              Key Features
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-6 bg-white rounded-lg shadow-sm">
                <div className="w-12 h-12 bg-edu-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <BookOpen className="w-6 h-6 text-edu-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  Course Management
                </h3>
                <p className="text-gray-600">
                  Access course materials, track progress, and manage your
                  academic journey.
                </p>
              </div>

              <div className="p-6 bg-white rounded-lg shadow-sm">
                <div className="w-12 h-12 bg-edu-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <UserCheck className="w-6 h-6 text-edu-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Service Requests</h3>
                <p className="text-gray-600">
                  Submit and track requests for gate passes, fee slips, and
                  elective courses.
                </p>
              </div>

              <div className="p-6 bg-white rounded-lg shadow-sm">
                <div className="w-12 h-12 bg-edu-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-edu-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  Document Management
                </h3>
                <p className="text-gray-600">
                  Upload and manage important documents like fee receipts and
                  certificates.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA section */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6 text-white">
              Ready to Get Started?
            </h2>
            <p className="text-xl mb-8 text-white">
              Log in to access your educational portal.
            </p>
            <Link to="/login">
              <Button size="lg" className="bg-edu-primary hover:bg-edu-dark">
                Log In Now
              </Button>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-10 px-4 bg-gray-800 text-white">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="mb-4 md:mb-0">
                <a href="/" className="flex items-center text-white">
                  <BookUser className="h-6 w-6 mr-2" />
                  <span className="text-lg font-bold">Edmit</span>
                </a>
              </div>

              <div className="flex space-x-6">
                <a href="#" className="text-gray-300 hover:text-white">
                  About
                </a>
                <a href="#" className="text-gray-300 hover:text-white">
                  Features
                </a>
                <a href="#" className="text-gray-300 hover:text-white">
                  Help
                </a>
                <a href="#" className="text-gray-300 hover:text-white">
                  Contact
                </a>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-gray-700 text-center text-sm text-gray-400">
              <p>
                &copy; {new Date().getFullYear()} Edmit. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Home;
