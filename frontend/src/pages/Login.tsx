import LoginForm from "../components/auth/LoginForm";
import { BookUser } from "lucide-react";

const Login = () => {
  return (
    <div className="min-h-screen relative flex flex-col">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/background.jpg')",
          filter: "brightness(0.7)",
        }}
      />



      {/* Content Wrapper */}
      <div className="relative z-10 min-h-screen flex flex-col">
        <header className="py-6 px-4 sm:px-6 bg-transparent shadow-none">
          <div className="max-w-7xl mx-auto flex justify-center md:justify-start">
            <a href="/" className="flex items-center text-white">
              <BookUser className="h-8 w-8 mr-2" />
              <span className="text-xl font-bold">Edmit</span>
            </a>
          </div>
        </header>

        <main className="flex-grow flex items-center justify-center p-4 sm:p-6">
          <LoginForm />
        </main>

        <footer className="py-6 px-4 bg-transparent border-t border-gray-700/50">
          <div className="max-w-7xl mx-auto text-center text-sm text-gray-300">
            <p>&copy; {new Date().getFullYear()} Edmit. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Login;
