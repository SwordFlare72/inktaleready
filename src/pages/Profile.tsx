import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import { Edit, Users, BookOpen, Eye, Heart, ArrowLeft, MoreVertical, MessageSquare, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useLocation } from "react-router";
import { toast } from "sonner";
import { DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Settings as SettingsIcon, LogOut } from "lucide-react";
import { Image as ImageIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect } from "react";

export default function Profile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user: currentUser, signOut } = useAuth();
  
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editImage, setEditImage] = useState("");
  const [openFollowers, setOpenFollowers] = useState(false);
  const [openFollowing, setOpenFollowing] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const handleEditProfile = () => {
    const src: any = currentUser || profileUser;
    setEditName(src?.name ?? "");
    setEditBio(src?.bio ?? "");
    setEditImage(src?.image ?? "");
    setShowEditDialog(true);
  };

  const handleFollowUser = async () => {
    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }
    if (!targetUserId) return;
    try {
      const followed = await toggleUserFollow({ userId: targetUserId });
      toast.success(followed ? "Followed" : "Unfollowed");
    } catch {
      toast.error("Failed to update follow");
    }
  };

  const handleSaveProfile = async () => {
    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }
    try {
      const payload: any = {
        name: editName.trim(),
        bio: editBio.trim(),
        image: editImage.trim(),
      };
      await updateMe(payload);
      toast.success("Profile updated");
      setShowEditDialog(false);
    } catch {
      toast.error("Failed to update profile");
    }
  };

  const isOwnProfile = !id || (currentUser && id === currentUser._id);
  const targetUserId = id as Id<"users"> | undefined;

  const profileUser = useQuery(api.users.getUserPublic, 
    targetUserId ? { userId: targetUserId } : "skip"
  );
  
  const userStories = useQuery(api.users.listUserStories,
    isOwnProfile && currentUser ? {
      userId: currentUser._id as Id<"users">,
      paginationOpts: { numItems: 20, cursor: null },
    } : targetUserId ? {
      userId: targetUserId,
      paginationOpts: { numItems: 20, cursor: null },
    } : "skip"
  );

  const storiesToShow = isOwnProfile ? (userStories?.page ?? []) : (profileUser?.stories ?? []);

  const publicLists = useQuery(
    api.library.listPublicListsByUser,
    (isOwnProfile && currentUser)
      ? { userId: currentUser._id as Id<"users"> }
      : targetUserId
        ? { userId: targetUserId }
        : "skip"
  );

  const updateMe = useMutation(api.users.updateMe);
  const toggleUserFollow = useMutation(api.users.toggleUserFollow);
  const deleteAnnouncement = useMutation(api.announcements.deleteAnnouncement);

  const [confirmDeleteAnnId, setConfirmDeleteAnnId] = useState<string | null>(null);
  const [isDeletingAnn, setIsDeletingAnn] = useState(false);

  const isFollowing = useQuery(
    api.users.isFollowingUser,
    !isOwnProfile && targetUserId ? { userId: targetUserId } : "skip"
  );

  const followersList = useQuery(
    api.users.listFollowers,
    isOwnProfile
      ? (currentUser?._id ? { userId: currentUser._id as Id<"users"> } : "skip")
      : (targetUserId ? { userId: targetUserId } : "skip")
  );
  const followingList = useQuery(
    api.users.listFollowing,
    isOwnProfile
      ? (currentUser?._id ? { userId: currentUser._id as Id<"users"> } : "skip")
      : (targetUserId ? { userId: targetUserId } : "skip")
  );

  const displayUser = isOwnProfile ? currentUser : profileUser;

  const readingListCount = Array.isArray(publicLists) ? publicLists.length : 0;
  const followerCount = typeof displayUser?.totalFollowers === "number" ? displayUser.totalFollowers : 0;

  // Announcements data and actions
  const announcements = useQuery(
    api.announcements.listByUser,
    (isOwnProfile && currentUser)
      ? { userId: currentUser._id as Id<"users">, paginationOpts: { numItems: 10, cursor: null } }
      : (targetUserId ? { userId: targetUserId, paginationOpts: { numItems: 10, cursor: null } } : "skip")
  );
  const listReplies = useQuery; // alias to satisfy TS where used inline via useQuery
  const createAnnouncement = useMutation(api.announcements.create);
  const replyToAnnouncement = useMutation(api.announcements.reply);

  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  // Add: per-announcement replies expanded state
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});

  // Read tab and target announcement from URL
  const searchParams = new URLSearchParams(location.search);
  const initialTab = (searchParams.get("tab") === "announcements" ? "announcements" : "about") as "about" | "announcements";
  const targetAnnouncementId = searchParams.get("aid");
  const [activeTab, setActiveTab] = useState<"about" | "announcements">(initialTab);

  // Move the deep-link effect ABOVE any early returns to preserve hook order
  useEffect(() => {
    if (!targetAnnouncementId) return;
    setActiveTab("announcements");
    const t = setTimeout(() => {
      const el = document.getElementById(`ann-${targetAnnouncementId}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 300);
    return () => clearTimeout(t);
  }, [targetAnnouncementId, announcements?.page?.length]);

  if (!isAuthenticated && isOwnProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Sign In Required</h2>
            <p className="text-muted-foreground mb-4">
              Please sign in to view your profile
            </p>
            <Button onClick={() => navigate("/auth")}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!displayUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Effect moved above early returns to preserve hook order.

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background"
    >
      {/* Increase bottom padding so content isn't hidden behind BottomNav and full scrolling works */}
      <div className="max-w-6xl mx-auto px-0 sm:px-4 pb-28">
        {/* Profile Header with Banner */}
        <div className="w-full relative">
          <div className="h-40 sm:h-56 w-full bg-muted overflow-hidden">
            {displayUser.bannerImage ? (
              <img
                src={displayUser.bannerImage}
                alt="Profile banner"
                className="h-full w-full object-cover"
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  try {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  } catch {}
                }}
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm">
                No cover image
              </div>
            )}
          </div>

          {/* Add: Back button when viewing another user's profile */}
          {!isOwnProfile && (
            <>
              <button
                onClick={() => navigate(-1)}
                aria-label="Go back"
                className="absolute top-3 left-3 inline-flex items-center justify-center h-9 w-9 rounded-full border bg-background/80 backdrop-blur hover:bg-background"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              {/* Add: Triple-dot menu on top-right with Direct Message option */}
              <div className="absolute top-3 right-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      aria-label="More options"
                      className="inline-flex items-center justify-center h-9 w-9 rounded-full border bg-background/80 backdrop-blur hover:bg-background"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem
                      onClick={() => {
                        if (!targetUserId) return;
                        navigate("/messages", { state: { partnerId: targetUserId } });
                      }}
                      className="cursor-pointer"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      {`Message ${profileUser?.name || "User"}`}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          )}

          {/* Avatar + name row */}
          <div className="px-4 sm:px-6 -mt-10 sm:-mt-12 relative">
            <div className="flex items-end justify-between gap-3">
              <div className="flex items-end gap-3">
                <Avatar className="h-20 w-20 sm:h-24 sm:w-24 ring-4 ring-background">
                  <AvatarImage src={displayUser.image} />
                  <AvatarFallback className="text-2xl">
                    {displayUser.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="pb-2">
                  <div className="text-2xl sm:text-3xl font-bold leading-tight">
                    {displayUser.name || "Anonymous User"}
                  </div>
                  {/* Username line */}
                  {displayUser.username && (
                    <div className="text-sm text-muted-foreground">@{displayUser.username}</div>
                  )}
                </div>
              </div>

              {/* Settings button on top-right, keep logout in menu; add navigate to edit page */}
              {isOwnProfile ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="mr-4 mt-2 sm:mr-6 sm:mt-3" aria-label="Settings">
                      <SettingsIcon className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Settings</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/profile/edit")}>
                      <Edit className="h-4 w-4 mr-2" />
                      Profile Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setLogoutOpen(true)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="pr-4 sm:pr-6 pt-2">
                  <Button onClick={handleFollowUser}>
                    <Users className="h-4 w-4 mr-2" />
                    {isFollowing ? "Unfollow" : "Follow"}
                  </Button>
                </div>
              )}
            </div>

            {/* Compact stats row */}
            <div className="mt-4 grid grid-cols-3 gap-6 text-center items-center">
              <div className="px-2">
                <div className="text-xl font-semibold">{storiesToShow.length}</div>
                <div className="text-xs text-muted-foreground">Stories</div>
              </div>
              <div className="px-2">
                <div className="text-xl font-semibold">{readingListCount}</div>
                <div className="text-xs text-muted-foreground">Reading Lists</div>
              </div>
              <button className="px-2 text-center w-full" onClick={() => setOpenFollowers(true)}>
                <div className="text-xl font-semibold">{followerCount}</div>
                <div className="text-xs text-muted-foreground">Followers</div>
              </button>
            </div>
          </div>
        </div>

        {/* Tabs: About + Announcements */}
        <div className="px-4 sm:px-6 mt-6">
          <Tabs value={activeTab} onValueChange={(v:any)=>setActiveTab(v)} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="about">About</TabsTrigger>
              <TabsTrigger value="announcements">Announcements</TabsTrigger>
            </TabsList>

            {/* ABOUT TAB */}
            <TabsContent value="about" className="mt-4">
              {/* About / Bio */}
              {displayUser.bio ? (
                <div className="mb-8">
                  <div className="text-lg font-semibold mb-2">About</div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {displayUser.bio}
                  </p>
                </div>
              ) : isOwnProfile ? (
                <div className="mb-8 text-center text-sm text-muted-foreground">
                  Tap Settings → Profile Settings to add a description about yourself.
                </div>
              ) : null}

              {/* Stories */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">
                    {isOwnProfile ? "My Stories" : "Stories"}
                  </h2>
                  {/* Remove right-corner Open; replaced with inline arrow next to title when own profile */}
                </div>

                {/* Inline arrow beside title for owner */}
                {isOwnProfile && (
                  <div className="mb-3 -mt-4">
                    <button
                      onClick={() => navigate("/profile/stories")}
                      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Open all my stories"
                    >
                      <span>Open</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}

                {/* Horizontal scroller like Home */}
                {storiesToShow.length > 0 ? (
                  <div className="flex gap-3 overflow-x-auto pb-2 snap-x px-1">
                    {storiesToShow.map((story: any, idx: number) => (
                      <button
                        key={story._id}
                        onClick={() => navigate(`/story/${story._id}`)}
                        className="w-32 flex-shrink-0 snap-start text-left"
                      >
                        <div className="relative">
                          <div className="aspect-[3/4] w-full overflow-hidden rounded-lg bg-muted">
                            {story.coverImage ? (
                              <img
                                src={story.coverImage}
                                alt={story.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full grid place-items-center">
                                <BookOpen className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="text-sm font-semibold line-clamp-2">{story.title}</div>
                          <div className="text-[11px] text-muted-foreground line-clamp-1">
                            {story.author?.name || "Anonymous"}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      {isOwnProfile ? "You haven't published any stories yet" : "No published stories"}
                    </p>
                    {isOwnProfile && (
                      <Button className="mt-4" onClick={() => navigate("/write")}>
                        Start Writing
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Following grid (preview) */}
              <div className="px-4 sm:px-6 mt-10 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">Following</h2>
                  {/* Remove right-corner Open */}
                </div>

                {/* Inline arrow beside title */}
                <div className="-mt-3 mb-3">
                  <button
                    onClick={() => {
                      if (isOwnProfile) {
                        navigate("/profile/following");
                      } else {
                        setOpenFollowing(true);
                      }
                    }}
                    className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Open full following list"
                  >
                    <span>Open</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                {followingList === undefined ? (
                  <div className="text-sm text-muted-foreground">Loading...</div>
                ) : followingList.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Not following anyone</div>
                ) : (
                  <div className="flex gap-3 overflow-x-auto pb-2 snap-x px-1">
                    {followingList.slice(0, 10).map((u: any) => (
                      <button
                        key={u._id}
                        className="w-24 flex-shrink-0 snap-start text-center"
                        onClick={() => navigate(`/profile/${u._id}`)}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={u.image} />
                            <AvatarFallback>{u.name?.charAt(0) || "U"}</AvatarFallback>
                          </Avatar>
                          <div className="text-xs line-clamp-1">{u.name || "User"}</div>
                        </div>
                      </button>
                    ))}
                    {followingList.length > 10 && (
                      <button
                        onClick={() => setOpenFollowing(true)}
                        className="w-24 flex-shrink-0 snap-start text-center"
                      >
                        <div className="h-12 w-12 rounded-full border grid place-items-center text-xs">
                          View All
                        </div>
                        <div className="text-xs mt-2 text-muted-foreground">+{followingList.length - 10} more</div>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Public Reading Lists */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-6">
                  {isOwnProfile ? "My Public Reading Lists" : "Public Reading Lists"}
                </h2>

                {publicLists === undefined ? (
                  <div className="text-sm text-muted-foreground">Loading reading lists...</div>
                ) : publicLists.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      {isOwnProfile
                        ? "You have no public reading lists yet"
                        : "No public reading lists"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {publicLists.map((list: any) => (
                      <div key={list._id} className="rounded-2xl">
                        <div className="flex items-center justify-between mb-2">
                          {/* Name with arrow that opens full list page */}
                          <button
                            onClick={() =>
                              navigate(`/library/list/${list._id}`, {
                                state: {
                                  from: "profile" as const,
                                  profileId: isOwnProfile && currentUser
                                    ? (currentUser._id as string)
                                    : (targetUserId as string | undefined),
                                },
                              })
                            }
                            className="inline-flex items-center gap-2 text-lg font-semibold hover:underline"
                          >
                            <span>{list.name}</span>
                            <ChevronRight className="h-4 w-4" />
                          </button>
                          <span className="text-xs text-muted-foreground">
                            {list.storyCount} {list.storyCount === 1 ? "story" : "stories"}
                          </span>
                        </div>

                        {/* Borderless content with horizontal scroll from the right side as well */}
                        <div className="overflow-x-auto pb-2 snap-x px-1 pr-4">
                          <div className="flex gap-3">
                            {(list.stories || []).slice(0, 10).map((story: any, idx: number) => (
                              <button
                                key={story._id}
                                onClick={() => navigate(`/story/${story._id}`)}
                                className="w-32 flex-shrink-0 snap-start text-left"
                              >
                                <div className="relative">
                                  <div className="aspect-[3/4] w-full overflow-hidden rounded-lg bg-muted">
                                    {story.coverImage ? (
                                      <img
                                        src={story.coverImage}
                                        alt={story.title}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full grid place-items-center">
                                        <BookOpen className="h-6 w-6 text-muted-foreground" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="mt-2">
                                  <div className="text-sm font-semibold line-clamp-2">
                                    {story.title}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground line-clamp-1">
                                    {story.author?.name ?? "Anonymous"}
                                  </div>
                                </div>
                              </button>
                            ))}

                            {/* View All button after 10 stories */}
                            {Array.isArray(list.stories) && list.stories.length > 10 && (
                              <button
                                onClick={() => navigate(`/library/list/${list._id}`)}
                                className="w-28 h-full flex-shrink-0 snap-start grid place-items-center rounded-lg border border-dashed text-xs text-muted-foreground hover:bg-muted/40"
                                aria-label="View all stories in this list"
                              >
                                View All
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ANNOUNCEMENTS TAB */}
            <TabsContent value="announcements" className="mt-4 space-y-4">
              {/* Compose (only owner) */}
              {isOwnProfile && (
                <Card className="border-muted/60 shadow-sm">
                  <CardContent className="pt-6">
                    <div className="text-sm mb-2 font-semibold">Post an announcement</div>
                    <Textarea
                      placeholder="Share an update..."
                      value={newAnnouncement}
                      onChange={(e) => setNewAnnouncement(e.target.value)}
                      rows={3}
                      className="rounded-lg bg-muted/30 focus-visible:ring-1 focus-visible:ring-ring"
                    />
                    <div className="flex justify-end mt-3">
                      <Button
                        size="sm"
                        disabled={!newAnnouncement.trim()}
                        onClick={async () => {
                          try {
                            await createAnnouncement({ body: newAnnouncement.trim() });
                            setNewAnnouncement("");
                            toast.success("Announcement posted");
                          } catch (e: any) {
                            toast.error(e?.message || "Failed to post");
                          }
                        }}
                      >
                        Post
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* List announcements */}
              {announcements === undefined ? (
                <div className="text-sm text-muted-foreground">Loading announcements...</div>
              ) : (announcements.page?.length ?? 0) === 0 ? (
                <div className="text-sm text-muted-foreground">No announcements yet</div>
              ) : (
                announcements.page.map((a: any) => (
                  <Card key={a._id} id={`ann-${String(a._id)}`} className="border-muted/60 shadow-sm relative">
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={a.author?.image} />
                          <AvatarFallback>{a.author?.name?.charAt(0) || "U"}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold leading-tight">
                            {a.author?.name || "User"}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Announcement • {new Date(a._creationTime).toLocaleString()}
                          </div>
                        </div>

                        {/* Delete button for announcement owner */}
                        {isOwnProfile && (
                          <div className="ml-auto">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" className="h-8 w-8" aria-label="More options">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem
                                  onClick={() => setConfirmDeleteAnnId(String(a._id))}
                                  className="text-red-600 focus:text-red-600 cursor-pointer"
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>

                      <div className="h-px bg-border" />

                      {/* Body with subtle background */}
                      <div className="rounded-md bg-muted/30 p-3 text-base leading-relaxed whitespace-pre-wrap">
                        {a.body}
                      </div>

                      {/* View Replies toggle */}
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={(a.replyCount || 0) === 0}
                          onClick={() =>
                            setExpandedReplies((s) => ({
                              ...s,
                              [String(a._id)]: !s[String(a._id)],
                            }))
                          }
                        >
                          {expandedReplies[String(a._id)]
                            ? "Hide Replies"
                            : `View Replies (${a.replyCount || 0})`}
                        </Button>
                      </div>

                      {/* Replies list (only when expanded) */}
                      {expandedReplies[String(a._id)] && (
                        <AnnouncementReplies
                          announcementId={a._id as Id<"announcements">}
                          announcementAuthorId={a.authorId as Id<"users">}
                        />
                      )}

                      {/* Reply composer */}
                      {isAuthenticated && (
                        <div className="flex items-start gap-2 pt-2">
                          <Textarea
                            placeholder="Write a reply..."
                            rows={2}
                            value={replyInputs[String(a._id)] || ""}
                            onChange={(e) =>
                              setReplyInputs((s) => ({ ...s, [String(a._id)]: e.target.value }))
                            }
                            className="rounded-lg bg-muted/30 focus-visible:ring-1 focus-visible:ring-ring"
                          />
                          <Button
                            size="sm"
                            className="self-end"
                            disabled={!(replyInputs[String(a._id)] || "").trim()}
                            onClick={async () => {
                              try {
                                await replyToAnnouncement({
                                  announcementId: a._id as Id<"announcements">,
                                  body: (replyInputs[String(a._id)] || "").trim(),
                                });
                                setReplyInputs((s) => ({ ...s, [String(a._id)]: "" }));
                              } catch (e: any) {
                                toast.error(e?.message || "Failed to reply");
                              }
                            }}
                          >
                            Reply
                          </Button>
                        </div>
                      )}
                    </CardContent>

                    {/* Confirm delete announcement dialog */}
                    <AlertDialog open={confirmDeleteAnnId === String(a._id)} onOpenChange={(o) => !o && setConfirmDeleteAnnId(null)}>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this announcement?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this announcement? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel disabled={isDeletingAnn} onClick={() => setConfirmDeleteAnnId(null)}>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-600 text-white hover:bg-red-700"
                            disabled={isDeletingAnn}
                            onClick={async () => {
                              setIsDeletingAnn(true);
                              try {
                                await deleteAnnouncement({ announcementId: a._id as any });
                                toast.success("Announcement deleted");
                                setConfirmDeleteAnnId(null);
                              } catch (e: any) {
                                toast.error(e?.message || "Failed to delete");
                              } finally {
                                setIsDeletingAnn(false);
                              }
                            }}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Edit Profile Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Name</label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter your name..."
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Bio</label>
                <Textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={4}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Profile Image URL</label>
                <Input
                  value={editImage}
                  onChange={(e) => setEditImage(e.target.value)}
                  placeholder="Enter image URL..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveProfile}>Save Changes</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Followers Dialog */}
        <Dialog open={openFollowers} onOpenChange={setOpenFollowers}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Followers</DialogTitle>
              <DialogDescription>People who follow this user</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 max-h-[60vh] overflow-auto">
              {followersList === undefined ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : followersList.length === 0 ? (
                <div className="text-sm text-muted-foreground">No followers yet</div>
              ) : (
                followersList.map((u: any) => (
                  <div
                    key={u._id}
                    className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer"
                    onClick={() => {
                      setOpenFollowers(false);
                      navigate(`/profile/${u._id}`);
                    }}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={u.image} />
                      <AvatarFallback>{u.name?.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{u.name || "User"}</div>
                      {u.bio && (
                        <div className="text-xs text-muted-foreground truncate">{u.bio}</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Following Dialog */}
        <Dialog open={openFollowing} onOpenChange={setOpenFollowing}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Following</DialogTitle>
              <DialogDescription>People this user follows</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 max-h-[60vh] overflow-auto">
              {followingList === undefined ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : followingList.length === 0 ? (
                <div className="text-sm text-muted-foreground">Not following anyone</div>
              ) : (
                followingList.map((u: any) => (
                  <div
                    key={u._id}
                    className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer"
                    onClick={() => {
                      setOpenFollowing(false);
                      navigate(`/profile/${u._id}`);
                    }}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={u.image} />
                      <AvatarFallback>{u.name?.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{u.name || "User"}</div>
                      {u.bio && (
                        <div className="text-xs text-muted-foreground truncate">{u.bio}</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Logout Confirmation */}
        <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Log out of Fiction Hub?</AlertDialogTitle>
              <AlertDialogDescription>
                You can always sign back in with your email or continue as a guest. Are you sure you want to log out?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={async () => {
                  try {
                    await signOut();
                  } catch {
                    // non-blocking; auth provider handles errors internally
                  }
                }}
              >
                Log out
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Effect moved to component body (auto-open Announcements tab and scroll to the target announcement) */}
    </motion.div>
  );
}

// Helper subcomponent for replies list
function AnnouncementReplies({ announcementId, announcementAuthorId }: { announcementId: Id<"announcements">, announcementAuthorId: Id<"users"> }) {
  const { user: currentUser } = useAuth();
  const replies = useQuery(api.announcements.listReplies, { announcementId });
  const deleteReply = useMutation(api.announcements.deleteReply);
  const [confirmReplyId, setConfirmReplyId] = useState<string | null>(null);
  const [isDeletingReply, setIsDeletingReply] = useState(false);

  if (replies === undefined) {
    return <div className="text-xs text-muted-foreground">Loading replies...</div>;
  }
  if (replies.length === 0) return null;
  return (
    <div className="space-y-3">
      <div className="pt-2 mt-1 border-t border-border text-xs font-semibold text-muted-foreground tracking-wide uppercase">
        Replies
      </div>
      {replies.map((r: any) => {
        const canDelete = currentUser && (currentUser._id === r.authorId || currentUser._id === announcementAuthorId);
        return (
          <div key={r._id} className="flex items-start gap-2">
            <Avatar className="h-7 w-7">
              <AvatarImage src={r.author?.image} />
              <AvatarFallback>{r.author?.name?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium">{r.author?.name || "User"}</div>
                {canDelete && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="More options">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem
                        onClick={() => setConfirmReplyId(String(r._id))}
                        className="text-red-600 focus:text-red-600 cursor-pointer"
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <div className="text-sm whitespace-pre-wrap leading-relaxed">{r.body}</div>
            </div>

            {/* Confirm delete reply dialog */}
            <AlertDialog open={confirmReplyId === String(r._id)} onOpenChange={(o) => !o && setConfirmReplyId(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this reply?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this reply? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeletingReply} onClick={() => setConfirmReplyId(null)}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 text-white hover:bg-red-700"
                    disabled={isDeletingReply}
                    onClick={async () => {
                      setIsDeletingReply(true);
                      try {
                        await deleteReply({ replyId: r._id as any });
                        toast.success("Reply deleted");
                        setConfirmReplyId(null);
                      } catch (e: any) {
                        toast.error(e?.message || "Failed to delete reply");
                      } finally {
                        setIsDeletingReply(false);
                      }
                    }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
      })}
    </div>
  );
}