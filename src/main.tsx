import { Toaster } from "@/components/ui/sonner";
import { VlyToolbar } from "../vly-toolbar-readonly.tsx";
import { InstrumentationProvider } from "@/instrumentation.tsx";
import AuthPage from "@/pages/Auth.tsx";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes, useLocation, Navigate, useNavigate } from "react-router";
import { useAuth } from "@/hooks/use-auth";
import "./index.css";
import Landing from "./pages/Landing.tsx";
import NotFound from "./pages/NotFound.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Explore from "./pages/Explore.tsx";
import Search from "./pages/Search.tsx";
import Story from "./pages/Story.tsx";
import Reader from "./pages/Reader.tsx";
import Library from "./pages/Library.tsx";
import Write from "./pages/Write.tsx";
import Notifications from "./pages/Notifications.tsx";
import Profile from "./pages/Profile.tsx";
import Earnings from "./pages/Earnings.tsx";
import Messages from "./pages/Messages.tsx";
import BottomNav from "@/components/BottomNav.tsx";
import "./types/global.d.ts";
import ChapterEditor from "./pages/ChapterEditor.tsx";
import StoryChaptersManage from "./pages/StoryChaptersManage.tsx";
import EditProfile from "./pages/EditProfile.tsx";
import ReadingListView from "./pages/ReadingListView.tsx";
import { motion } from "framer-motion";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

function RouteSyncer() {
  const location = useLocation();
  useEffect(() => {
    window.parent.postMessage(
      { type: "iframe-route-change", path: location.pathname },
      "*",
    );
  }, [location.pathname]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "navigate") {
        if (event.data.direction === "back") window.history.back();
        if (event.data.direction === "forward") window.history.forward();
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}

function GlobalRedirector() {
  const { isLoading, isAuthenticated, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Only run once loading is finished
  useEffect(() => {
    // Treat users without a username as not fully authenticated
    const notFullyAuthed =
      !isAuthenticated ||
      !user ||
      !(user as any)?.username ||
      (user as any)?.isAnonymous;

    if (!isLoading && notFullyAuthed && location.pathname !== "/auth") {
      navigate("/auth", { replace: true });
    }
  }, [isLoading, isAuthenticated, user, location.pathname, navigate]);

  return null;
}

function ProtectedRoute({ children }: { children: any }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  if (isLoading) return null;

  // Require a real user with a username (and not anonymous)
  const notFullyAuthed =
    !isAuthenticated ||
    !user ||
    !(user as any)?.username ||
    (user as any)?.isAnonymous;

  if (notFullyAuthed) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }
  return children;
}

function BottomNavGate() {
  const { isLoading, isAuthenticated, user } = useAuth();
  const location = useLocation();
  if (isLoading) return null;

  // Hide nav on /auth (and any nested auth routes), on /profile/edit, and when not fully authed
  const notFullyAuthed =
    !isAuthenticated ||
    !user ||
    !(user as any)?.username ||
    (user as any)?.isAnonymous;

  // Hide nav specifically on chapter editor routes
  const onChapterEditor =
    location.pathname.startsWith("/write/") &&
    location.pathname.includes("/chapter/");

  // Add: Hide nav while reading any chapter
  const onReader = location.pathname.startsWith("/read/");

  // Add: Hide nav when viewing someone else's profile (/profile/:id where id !== current user id)
  const profileMatch = location.pathname.match(/^\/profile\/([^/]+)/);
  const otherUsersProfile =
    !!profileMatch &&
    !!user &&
    String((user as any)._id) !== String(profileMatch[1]);

  // Add: Hide nav on messaging page
  const onMessages = location.pathname.startsWith("/messages");

  // Add: Hide nav on a dedicated reading list page
  const onReadingListView = location.pathname.startsWith("/library/list/");

  if (
    location.pathname.startsWith("/auth") ||
    location.pathname.startsWith("/profile/edit") ||
    notFullyAuthed ||
    onChapterEditor ||
    onReader ||
    otherUsersProfile ||
    onMessages ||
    onReadingListView
  ) return null;

  return <BottomNav />;
}

function HomeGate() {
  const { isLoading, isAuthenticated, user } = useAuth();
  if (isLoading) return null;

  const notFullyAuthed =
    !isAuthenticated ||
    !user ||
    !(user as any)?.username ||
    (user as any)?.isAnonymous;

  if (notFullyAuthed) {
    return <Navigate to="/auth" replace />;
  }
  return <Landing />;
}

function SplashOverlay() {
  const { isLoading } = useAuth();
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="flex flex-col items-center gap-3"
      >
        <img
          src="https://harmless-tapir-303.convex.cloud/api/storage/a61232eb-6825-4896-80b3-ce2250d9b937"
          alt="InkTale"
          width={120}
          height={120}
          className="rounded-2xl shadow-lg object-cover"
        />
      </motion.div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <VlyToolbar />
    <InstrumentationProvider>
      <ConvexAuthProvider client={convex}>
        <BrowserRouter>
          <RouteSyncer />
          <GlobalRedirector />
          <SplashOverlay />
          <Routes>
            <Route path="/" element={<HomeGate />} />
            <Route path="/auth" element={<AuthPage redirectAfterAuth="/" />} />
            <Route path="/dashboard" element={
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />
            <Route path="/explore" element={<Explore />} />
            <Route path="/search" element={<Search />} />
            <Route path="/story/:id" element={<Story />} />
            <Route path="/read/:id" element={<Reader />} />
            <Route path="/library" element={
              <ProtectedRoute><Library /></ProtectedRoute>
            } />
            <Route path="/library/list/:id" element={
              <ProtectedRoute><ReadingListView /></ProtectedRoute>
            } />
            <Route path="/write" element={
              <ProtectedRoute><Write /></ProtectedRoute>
            } />
            <Route path="/write/:storyId/chapter/new" element={
              <ProtectedRoute><ChapterEditor /></ProtectedRoute>
            } />
            <Route path="/write/:storyId/chapter/:chapterId/edit" element={
              <ProtectedRoute><ChapterEditor /></ProtectedRoute>
            } />
            <Route path="/write/:storyId/manage" element={
              <ProtectedRoute><StoryChaptersManage /></ProtectedRoute>
            } />
            <Route path="/notifications" element={
              <ProtectedRoute><Notifications /></ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute><Profile /></ProtectedRoute>
            } />
            <Route path="/profile/:id" element={<Profile />} />
            <Route path="/profile/edit" element={
              <ProtectedRoute><EditProfile /></ProtectedRoute>
            } />
            <Route path="/earnings" element={
              <ProtectedRoute><Earnings /></ProtectedRoute>
            } />
            <Route path="/messages" element={
              <ProtectedRoute><Messages /></ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <BottomNavGate />
        </BrowserRouter>
        <Toaster />
      </ConvexAuthProvider>
    </InstrumentationProvider>
  </StrictMode>,
);