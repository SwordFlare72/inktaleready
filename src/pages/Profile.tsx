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

              {/* Add: Triple-dot menu on top-left with Direct Message option */}
              <div className="absolute top-3 left-14">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      aria-label="More options"
                      className="inline-flex items-center justify-center h-9 w-9 rounded-full border bg-background/80 backdrop-blur hover:bg-background"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuItem
                      onClick={() => {
                        if (!targetUserId) return;
                        navigate("/messages", { state: { partnerId: targetUserId } });
                      }}
                      className="cursor-pointer"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      {`Message (${profileUser?.username ? `@${profileUser.username}` : (profileUser?.name || "User")})`}
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
            <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-6 text-center sm:text-left">
              <div className="px-2">
                <div className="text-xl font-semibold">{storiesToShow.length}</div>
                <div className="text-xs text-muted-foreground">Stories</div>
              </div>
              <div className="px-2">
                <div className="text-xl font-semibold">{readingListCount}</div>
                <div className="text-xs text-muted-foreground">Reading Lists</div>
              </div>
              <button className="px-2 text-left" onClick={() => setOpenFollowers(true)}>
                <div className="text-xl font-semibold">{followerCount}</div>
                <div className="text-xs text-muted-foreground">Followers</div>
              </button>
            </div>
          </div>
        </div>

        {/* About / Bio */}
        <div className="px-4 sm:px-6 mt-6">
          {displayUser.bio ? (
            <Card className="mb-8">
              <CardContent className="py-4">
                <div className="text-sm text-foreground whitespace-pre-wrap">{displayUser.bio}</div>
              </CardContent>
            </Card>
          ) : isOwnProfile ? (
            <Card className="mb-8">
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                Tap Settings → Profile Settings to add a description about yourself.
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* Stories */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">
            {isOwnProfile ? "My Stories" : "Stories"}
          </h2>

          {/* Compact cards on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {storiesToShow.map((story: any) => (
              <Card key={story._id} className="cursor-pointer hover:shadow-md transition-shadow">
                <div onClick={() => navigate(`/story/${story._id}`)}>
                  {story.coverImage && (
                    <div className="aspect-[3/4] overflow-hidden rounded-t-lg">
                      <img
                        src={story.coverImage}
                        alt={story.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardContent className="p-3 sm:p-4">
                    <h3 className="font-semibold mb-1 sm:mb-2 line-clamp-2">{story.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2 sm:mb-3 line-clamp-2">
                      {story.description}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="px-2 py-1 bg-muted rounded-full capitalize">
                        {story.genre}
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {story.totalViews}
                        </div>
                        <div className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          {story.totalLikes}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))}
          </div>

          {storiesToShow.length === 0 && (
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publicLists.map((list: any) => (
                <Card key={list._id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{list.name}</CardTitle>
                    {list.description && (
                      <p className="text-sm text-muted-foreground">{list.description}</p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs text-muted-foreground mb-3">
                      {list.storyCount} {list.storyCount === 1 ? "story" : "stories"}
                    </div>
                    <div className="space-y-3">
                      {list.stories.slice(0, 4).map((story: any) => (
                        <div
                          key={story._id}
                          className="flex items-center gap-3 cursor-pointer group"
                          onClick={() => navigate(`/story/${story._id}`)}
                        >
                          <div className="h-12 w-9 rounded bg-muted overflow-hidden flex items-center justify-center">
                            {story.coverImage ? (
                              <img
                                src={story.coverImage}
                                alt={story.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <BookOpen className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate group-hover:underline">
                              {story.title}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {story.author?.name ?? "Anonymous"} • {story.genre}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {list.storyCount > 4 && (
                      <div className="mt-3 text-xs text-muted-foreground">
                        +{list.storyCount - 4} more
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
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