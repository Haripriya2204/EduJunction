import { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { authService } from "../../services/api";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "../../components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import NotificationBadge from "./NotificationBadge";
import { 
  BookUser, 
  LogOut, 
  User, 
  BookOpen, 
  Ticket, 
  FileText, 
  Clock, 
  Layers, 
  LayoutDashboard,
  CalendarDays,
  Menu,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { cn } from "../../lib/utils";

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mounted, setMounted] = useState(false);
  const isAdmin = authService.isAdmin();
  const user = authService.getCurrentUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState<number>(window.innerWidth);
  
  useEffect(() => {
    setMounted(true);
    
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  useEffect(() => {
    // Check if user is authenticated
    if (mounted && !authService.isAuthenticated()) {
      navigate("/login");
    }
  }, [mounted, navigate]);
  
  const handleLogout = () => {
    authService.logout();
    navigate("/login");
  };
  
  // Menu items based on user role
  const menuItems = isAdmin
    ? [
        { path: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
        { path: "/dashboard/profile", label: "Profile", icon: <User className="h-5 w-5" /> },
        { path: "/dashboard/student-requests", label: "Student Requests", icon: <Clock className="h-5 w-5" /> },
        { path: "/dashboard/events", label: "Events & Notifications", icon: <CalendarDays className="h-5 w-5" /> },
        { path: "/dashboard/fee-reports", label: "Fee Reports", icon: <FileText className="h-5 w-5" /> }
      ]
    : [
        { path: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-5 w-5" /> },
        { path: "/dashboard/courses", label: "My Courses", icon: <BookOpen className="h-5 w-5" /> },
        {
          label: "Services",
          icon: <Layers className="h-5 w-5" />,
          subItems: [
            { path: "/dashboard/services/gatepass", label: "Gate Pass", icon: <Ticket className="h-5 w-5" /> },
            { path: "/dashboard/services/feeslip", label: "Fee Slip", icon: <FileText className="h-5 w-5" /> }
          ]
        },
        { path: "/dashboard/requests", label: "My Requests", icon: <Clock className="h-5 w-5" /> },
        { path: "/dashboard/notifications", label: "Notifications", icon: <NotificationBadge /> }
      ];
  
  // Handle submenus
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  
  useEffect(() => {
    // Check if current path matches any submenu
    menuItems.forEach(item => {
      if ('subItems' in item) {
        const subItems = (item as any).subItems;
        if (subItems.some((subItem: any) => location.pathname === subItem.path)) {
          setExpandedMenu(item.label);
        }
      }
    });
  }, [location.pathname]);
  
  const toggleSubmenu = (label: string) => {
    setExpandedMenu(prevExpanded => 
      prevExpanded === label ? null : label
    );
  };

  // Close mobile menu when path changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);
  
  const SidebarContent = () => (
    <>
      <div className="h-16 flex items-center justify-center border-b">
        <BookUser className="h-6 w-6 text-edu-primary mr-2" />
        <h1 className="text-xl font-bold text-edu-primary">Edu Junction</h1>
      </div>
      
      <ScrollArea className="flex-1 py-4">
        <div className="px-3 space-y-1">
          {menuItems.map((item, index) => (
            'subItems' in item ? (
              <div key={index}>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 mb-1 transition-all duration-200"
                  onClick={() => toggleSubmenu(item.label)}
                >
                  {item.icon}
                  {item.label}
                  {expandedMenu === item.label ? (
                    <ChevronUp className="ml-auto h-4 w-4 transition-transform duration-200" />
                  ) : (
                    <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200" />
                  )}
                </Button>
                
                {expandedMenu === item.label && (
                  <div className="pl-6 space-y-1 mb-3 animate-accordion-down">
                    {(item as any).subItems.map((subItem: any, subIndex: number) => (
                      <NavLink
                        key={subIndex}
                        to={subItem.path}
                        className={({ isActive }) =>
                          `flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-all duration-200 ${
                            isActive 
                              ? 'bg-edu-primary bg-opacity-10 text-edu-primary font-medium' 
                              : 'text-gray-700 hover:bg-gray-100'
                          }`
                        }
                      >
                        {subItem.icon}
                        {subItem.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <NavLink
                key={index}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-200 ${
                    isActive 
                      ? 'bg-edu-primary bg-opacity-10 text-edu-primary font-medium' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
              >
                {item.icon}
                {item.label}
              </NavLink>
            )
          ))}
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t">
        <div className="flex items-center mb-3">
          <div className="flex-shrink-0">
            <Avatar>
              <AvatarImage src={user?.profilePicture || ''} alt={user?.name || 'User'} />
              <AvatarFallback>
                {user?.name?.substring(0, 2).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">{user?.name}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full justify-start gap-2 transition-colors"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Log out
        </Button>
      </div>
    </>
  );
  
  const isMobile = windowWidth < 768;
  
  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Desktop Sidebar */}
      <div className={cn("hidden md:flex flex-col bg-white border-r",
        isMobile ? "w-0" : "w-64"
      )}>
        <SidebarContent />
      </div>
      
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-white w-full">
        <div className="flex items-center">
          <BookUser className="h-6 w-6 text-edu-primary mr-2" />
          <h1 className="text-xl font-bold text-edu-primary">Edu Junction</h1>
        </div>
        
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>
      
      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 md:p-6 pt-0 md:pt-6 w-full">
        <div className="max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
      
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          .animate-fade {
            animation: fadeIn 0.3s ease-in-out;
          }
        `}
      </style>
    </div>
  );
};

export default DashboardLayout;
