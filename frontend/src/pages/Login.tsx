import LoginForm from "../components/auth/LoginForm";
import { BookUser } from "lucide-react";

const Login = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-blue-50">
      <header className="py-6 px-4 sm:px-6 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-center md:justify-start">
          <a href="/" className="flex items-center text-edu-primary">
            <BookUser className="h-8 w-8 mr-2" />
            <span className="text-xl font-bold">MLRIT ACH</span>
          </a>
        </div>
      </header>
      
      <main className="flex-grow flex items-center justify-center p-4 sm:p-6">
        <LoginForm />
      </main>
      
      <footer className="py-6 px-4 bg-white border-t">
        <div className="max-w-7xl mx-auto text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} MLRIT ACH. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Login;
