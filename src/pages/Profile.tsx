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
import { Edit, Users, BookOpen, Eye, Heart, ArrowLeft, MoreVertical, MessageSquare } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background"
    >
      <div className="max-w-6xl mx-auto px-0 sm:px-4 pb-8">
        {/* Profile Header with Banner */}
        <div className="w-full relative">
          <div className="h-40 sm:h-56 w-full bg-muted overflow-hidden">
            {displayUser.bannerImage ? (
              <img
                src={displayUser.bannerImage}
                alt="Profile banner"
                className="h-full w-full object-cover"
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
          <Tabs defaultValue="about" className="w-full">
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
                <h2 className="text-2xl font-bold mb-6">
                  {isOwnProfile ? "My Stories" : "Stories"}
                </h2>

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
                          <div className="absolute -top-1 -left-1 h-6 w-6 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-bold">
                            {idx + 1}
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

              {/* Followers grid (preview) */}
              <div className="px-4 sm:px-6 mt-10 mb-8">
                <h2 className="text-2xl font-bold mb-4">Followers</h2>
                {followersList === undefined ? (
                  <div className="text-sm text-muted-foreground">Loading...</div>
                ) : followersList.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No followers yet</div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
                    {followersList.slice(0, 12).map((u: any) => (
                      <div
                        key={u._id}
                        className="flex flex-col items-center gap-2 cursor-pointer"
                        onClick={() => navigate(`/profile/${u._id}`)}
                      >
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={u.image} />
                          <AvatarFallback>{u.name?.charAt(0) || "U"}</AvatarFallback>
                        </Avatar>
                        <div className="text-xs line-clamp-1">{u.name || "User"}</div>
                      </div>
                    ))}
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
                      <Card key={list._id}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg flex items-center justify-between">
                            <span>{list.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {list.storyCount} {list.storyCount === 1 ? "story" : "stories"}
                            </span>
                          </CardTitle>
                          {list.description && (
                            <p className="text-sm text-muted-foreground">{list.description}</p>
                          )}
                        </CardHeader>
                        <CardContent>
                          {list.stories && list.stories.length > 0 ? (
                            <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
                              {list.stories.map((story: any, idx: number) => (
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
                                    <div className="absolute -top-1 -left-1 h-6 w-6 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-bold">
                                      {idx + 1}
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
                            </div>
                          ) : (
                            <div className="text-sm text-muted-foreground">No stories yet</div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ANNOUNCEMENTS TAB */}
            <TabsContent value="announcements" className="mt-4 space-y-4">
              {/* Compose (only owner) */}
              {isOwnProfile && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm mb-2">Post an announcement</div>
                    <Textarea
                      placeholder="Share an update..."
                      value={newAnnouncement}
                      onChange={(e) => setNewAnnouncement(e.target.value)}
                      rows={3}
                    />
                    <div className="flex justify-end mt-3">
                      <Button
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
                  <Card key={a._id}>
                    <CardContent className="pt-6 space-y-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={a.author?.image} />
                          <AvatarFallback>{a.author?.name?.charAt(0) || "U"}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold">{a.author?.name || "User"}</div>
                          <div className="text-xs text-muted-foreground">Announcement</div>
                        </div>
                      </div>
                      <div className="text-sm whitespace-pre-wrap">{a.body}</div>

                      {/* Replies */}
                      <AnnouncementReplies announcementId={a._id as Id<"announcements">} />

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
                          />
                          <Button
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
    </motion.div>
  );
}

// Helper subcomponent for replies list
function AnnouncementReplies({ announcementId }: { announcementId: Id<"announcements"> }) {
  const replies = useQuery(api.announcements.listReplies, { announcementId });
  if (replies === undefined) {
    return <div className="text-xs text-muted-foreground">Loading replies...</div>;
  }
  if (replies.length === 0) return null;
  return (
    <div className="space-y-3">
      {replies.map((r: any) => (
        <div key={r._id} className="flex items-start gap-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src={r.author?.image} />
            <AvatarFallback>{r.author?.name?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="text-xs font-medium">{r.author?.name || "User"}</div>
            <div className="text-sm whitespace-pre-wrap">{r.body}</div>
          </div>
        </div>
      ))}
    </div>
  );
}