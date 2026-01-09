import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { ArrowRight, BookOpen, UserCheck, FileText } from "lucide-react";

const Home = () => {
  return (
    <div className="min-h-screen relative flex flex-col">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-pink-300 via-blue-600 to-blue-800"
        style={{}}
      />

      <div className="relative z-10 flex flex-col min-h-screen px-2 md:px-0">
        {/* Header */}
        <header className="w-full py-4 px-4 md:px-6 flex justify-between items-center">
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
        <main className="flex-1 flex flex-col justify-center px-4 md:px-6 py-8 md:py-0">
          <div className="max-w-7xl w-full mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Left: Text content */}
            <div className="text-white text-center md:text-left space-y-6 mt-28 mb-28">
              <h1 className="text-4xl md:text-5xl font-bold">
                Welcome to{" "}
                <span className="text-blue-300 block md:inline">
                  EDMIT - COURSE REGISTRATION
                </span>
              </h1>
              <div className="pt-10">
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
            </div>

            {/* Right: Logo placeholder */}
            <div className="flex justify-center md:justify-end">
              <a
                href="https://www.mlrit.ac.in"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-background rounded-full p-6 w-64 h-64 flex items-center justify-center shadow-lg transition-transform duration-300 hover:-translate-y-3 hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-edu-primary"
                aria-label="Visit MLRIT website"
              >
                <img
                  src="/MLRIT.png"
                  alt="MLRIT Logo"
                  className="object-contain w-full h-full rounded-full"
                  style={{ maxHeight: "220px", maxWidth: "220px" }}
                />
              </a>
            </div>
          </div>
        </main>

        {/* Key Features section */}
        <section className="py-12 md:py-16 px-2 md:px-4">
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-10 text-white">
              MLR Institute of Technology
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 md:py-10 px-2 md:px-4 bg-gray-800 text-white">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center">
            <a href="/" className="flex items-center text-white mb-4 md:mb-0">
              <span className="text-lg font-bold">Edmit</span>
            </a>
            <div className="flex space-x-6">
              <a href="/about" className="text-gray-300 hover:text-white">
                About
              </a>
              <a href="/contact" className="text-gray-300 hover:text-white">
                Contact
              </a>
              <a href="/help" className="text-gray-300 hover:text-white">
                Help
              </a>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-700 text-center text-sm text-gray-400">
            <p>&copy; {new Date().getFullYear()} Edmit. All rights reserved.</p>
            <p className="mt-2">
              Developed by: B.Abhilash, D.Haripriya, Ch. Shashank, M. Sameeha, T
              S Siddharth, Keertan K
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Home;
