import { BookOpen, PenTool, Bell, User, Home, Search } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { isAuthenticated } = useAuth();

  // Fetch unread notification count
  const notifications = useQuery(
    api.notifications.listForUser,
    isAuthenticated ? { paginationOpts: { numItems: 50, cursor: null } } : "skip"
  );
  const unreadCount = notifications?.page.filter(n => !n.isRead).length || 0;

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname === path || pathname.startsWith(path);
  };

  const tabClass = (active: boolean) =>
    `flex flex-col items-center gap-1 py-3 ${
      active ? "text-purple-600" : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50">
      {/* Make nav visible and properly sized on desktop as well */}
      <div className="mx-auto w-full px-3 max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl">
        <nav className="m-3 rounded-2xl bg-white/90 dark:bg-gray-900/90 backdrop-blur border shadow-lg">
          <div className="grid grid-cols-6">
            <button
              className={tabClass(isActive("/"))}
              onClick={() => navigate("/")}
              aria-label="Home"
            >
              <Home className="h-5 w-5" />
              <span className="text-[11px] font-medium">Home</span>
            </button>
            <button
              className={tabClass(isActive("/search"))}
              onClick={() => navigate("/search")}
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
              <span className="text-[11px] font-medium">Search</span>
            </button>
            <button
              className={tabClass(isActive("/library"))}
              onClick={() => navigate("/library")}
              aria-label="Library"
            >
              <BookOpen className="h-5 w-5" />
              <span className="text-[11px] font-medium">Library</span>
            </button>
            <button
              className={tabClass(isActive("/write"))}
              onClick={() => navigate("/write")}
              aria-label="Write"
            >
              <PenTool className="h-5 w-5" />
              <span className="text-[11px] font-medium">Write</span>
            </button>
            <button
              className={`${tabClass(isActive("/notifications"))} relative`}
              onClick={() => navigate("/notifications")}
              aria-label="Alerts"
            >
              <div className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-[1rem] px-1 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium">Alerts</span>
            </button>
            <button
              className={tabClass(isActive("/profile"))}
              onClick={() => navigate("/profile")}
              aria-label="Profile"
            >
              <User className="h-5 w-5" />
              <span className="text-[11px] font-medium">Profile</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}