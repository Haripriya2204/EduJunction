import { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { authService } from "../../services/api";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "../../components/ui/sheet";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../components/ui/avatar";
import {
  BookUser,
  LogOut,
  User,
  BookOpen,
  FileText,
  Clock,
  CalendarDays,
  Menu,
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  MessageSquare,
} from "lucide-react";

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mounted, setMounted] = useState(false);
  const isAdmin = authService.isAdmin();
  const user = authService.getCurrentUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);

    // No additional side-effects are needed here since we removed the
    // persistent sidebar and no longer track viewport width.
    return () => {
      /* no-op cleanup */
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

  // Menu items based on user role (unused helper vars removed)
  const menuItems = isAdmin
    ? [
        {
          path: "/dashboard",
          label: "Dashboard",
          icon: <LayoutDashboard className="h-5 w-5" />,
        },
        {
          path: "/dashboard/profile",
          label: "Profile",
          icon: <User className="h-5 w-5" />,
        },
        {
          path: "/dashboard/student-requests",
          label: "Student Requests",
          icon: <Clock className="h-5 w-5" />,
        },
        {
          path: "/dashboard/events",
          label: "Events & Notifications",
          icon: <CalendarDays className="h-5 w-5" />,
        },
        {
          path: "/dashboard/fee-reports",
          label: "Fee Reports",
          icon: <FileText className="h-5 w-5" />,
        },
      ]
    : [
        {
          path: "/dashboard/courses",
          label: "My Courses",
          icon: <BookOpen className="h-5 w-5" />,
        },
        {
          path: "/dashboard/services/feeslip",
          label: "Fee Slip",
          icon: <FileText className="h-5 w-5" />,
        },
        {
          path: "/dashboard/requests",
          label: "My Requests",
          icon: <Clock className="h-5 w-5" />,
        },
        {
          path: "/dashboard/support",
          label: "Support & Issues",
          icon: <MessageSquare className="h-5 w-5" />,
        },
        {
          path: "/dashboard/profile",
          label: "Profile",
          icon: <User className="h-5 w-5" />,
        },
      ];

  // Handle submenus
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);

  useEffect(() => {
    // Check if current path matches any submenu
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    menuItems.forEach((item: any) => {
      if ("subItems" in item) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subItems = (item as any).subItems;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (subItems.some((subItem: any) => location.pathname === subItem.path)) {
          setExpandedMenu(item.label);
        }
      }
    });
  }, [location.pathname]);

  const toggleSubmenu = (label: string) => {
    setExpandedMenu((prevExpanded) => (prevExpanded === label ? null : label));
  };

  // Close mobile menu when path changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const SidebarContent = () => (
    <>
      <button
        className="h-16 flex items-center justify-center border-b w-full focus:outline-none focus:ring-2 focus:ring-edu-primary"
        onClick={() => navigate("/")}
        aria-label="Go to home"
      >
        <BookUser className="h-6 w-6 text-edu-primary mr-2" />
        <h1 className="text-xl font-bold text-edu-primary">Edmit</h1>
      </button>

      <ScrollArea className="flex-1 py-4">
        <div className="px-3 space-y-1">
          {menuItems.map((item, index) =>
            "subItems" in item ? (
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
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {(item as any).subItems.map(
                      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                      (subItem: any, subIndex: number) => (
                        <NavLink
                          key={subIndex}
                          to={subItem.path}
                          className={({ isActive }) =>
                            `flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-all duration-200 ${
                              isActive
                                ? "bg-edu-primary bg-opacity-10 text-edu-primary font-medium"
                                : "text-gray-700 hover:bg-gray-100"
                            }`
                          }
                        >
                          {subItem.icon}
                          {subItem.label}
                        </NavLink>
                      )
                    )}
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
                      ? "bg-edu-primary bg-opacity-10 text-edu-primary font-medium"
                      : "text-gray-700 hover:bg-gray-100"
                  }`
                }
              >
                {item.icon}
                {item.label}
              </NavLink>
            )
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <div className="flex items-center mb-3">
          <div className="flex-shrink-0">
            <Avatar>
              <AvatarImage
                src={user?.profilePicture || ""}
                alt={user?.name || "User"}
              />
              <AvatarFallback>
                {user?.name?.substring(0, 2).toUpperCase() || "U"}
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

  return (
    <div className="flex min-h-screen bg-gray-100 flex-col">
      {/* Top bar with hamburger menu for all screen sizes */}
      <div className="flex items-center justify-between p-4 border-b bg-white w-full">
        <button
          className="flex items-center focus:outline-none focus:ring-2 focus:ring-edu-primary rounded"
          onClick={() => navigate("/")}
          aria-label="Go to home"
        >
          <BookUser className="h-6 w-6 text-edu-primary mr-2" />
          <h1 className="text-xl font-bold text-edu-primary">Edmit</h1>
        </button>

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
      <main className="flex-1 overflow-auto p-4 md:p-6 pt-6 w-full">
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
