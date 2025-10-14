import { Home, Search, Library, PenTool, Bell, User } from "lucide-react";
import { Link, useLocation } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();
  
  // Load notifications and derive unread count from the first page
  const notificationsData = useQuery(
    api.notifications.listForUser,
    user ? { paginationOpts: { numItems: 100, cursor: null } } : "skip"
  );
  const unreadCount =
    notificationsData?.page?.filter((n: any) => !n.isRead).length ?? 0;

  const handleNavClick = () => {
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/search", icon: Search, label: "Search" },
    { path: "/library", icon: Library, label: "Library" },
    { path: "/write", icon: PenTool, label: "Write" },
    { 
      path: "/notifications", 
      icon: Bell, 
      label: "Alerts",
      badge: unreadCount && unreadCount > 0 ? unreadCount : undefined
    },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t">
      <div className="flex justify-around items-center h-16 max-w-screen-xl mx-auto px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={handleNavClick}
              className={`flex flex-col items-center justify-center flex-1 h-full relative ${
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-[1rem] px-1 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}