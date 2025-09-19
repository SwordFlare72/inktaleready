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
    // If user is not fully authenticated (no user doc or anonymous), force /auth for all routes
    const notFullyAuthed = !isAuthenticated || !user || (user as any)?.isAnonymous;
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

  const notFullyAuthed = !isAuthenticated || !user || (user as any)?.isAnonymous;
  if (notFullyAuthed) {
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }
  return children;
}

function BottomNavGate() {
  const { isLoading, isAuthenticated, user } = useAuth();
  const location = useLocation();
  if (isLoading) return null;

  const notFullyAuthed = !isAuthenticated || !user || (user as any)?.isAnonymous;
  if (location.pathname === "/auth" || notFullyAuthed) return null;

  return <BottomNav />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <VlyToolbar />
    <InstrumentationProvider>
      <ConvexAuthProvider client={convex}>
        <BrowserRouter>
          <RouteSyncer />
          <GlobalRedirector />
          <Routes>
            <Route path="/" element={<Landing />} />
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