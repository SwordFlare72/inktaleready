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
import { Edit, Users, BookOpen, Eye, Heart } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";

export default function Profile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user: currentUser } = useAuth();
  
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editImage, setEditImage] = useState("");

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

  const displayUser = isOwnProfile ? currentUser : profileUser;

  const handleEditProfile = () => {
    if (displayUser) {
      setEditName(displayUser.name || "");
      setEditBio(displayUser.bio || "");
      setEditImage(displayUser.image || "");
      setShowEditDialog(true);
    }
  };

  const handleSaveProfile = async () => {
    try {
      await updateMe({
        name: editName.trim() || undefined,
        bio: editBio.trim() || undefined,
        image: editImage.trim() || undefined,
      });
      toast.success("Profile updated successfully!");
      setShowEditDialog(false);
    } catch (error) {
      toast.error("Failed to update profile");
    }
  };

  const handleFollowUser = async () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to follow users");
      return;
    }

    if (!targetUserId) return;

    try {
      const followed = await toggleUserFollow({ userId: targetUserId });
      toast.success(followed ? "User followed!" : "User unfollowed");
    } catch (error) {
      toast.error("Failed to update follow status");
    }
  };

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
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="flex items-start gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={displayUser.image} />
                <AvatarFallback className="text-2xl">
                  {displayUser.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">
                      {displayUser.name || "Anonymous User"}
                    </h1>
                    {displayUser.isWriter && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <BookOpen className="h-4 w-4" />
                        Writer Level {displayUser.writerLevel || 1}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {isOwnProfile ? (
                      <Button onClick={handleEditProfile}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Profile
                      </Button>
                    ) : (
                      <Button onClick={handleFollowUser}>
                        <Users className="h-4 w-4 mr-2" />
                        Follow
                      </Button>
                    )}
                  </div>
                </div>
                
                {displayUser.bio && (
                  <p className="text-muted-foreground mb-4">{displayUser.bio}</p>
                )}
                
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{displayUser.totalFollowers || 0} followers</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    <span>{storiesToShow.length} stories</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stories */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">
            {isOwnProfile ? "My Stories" : "Stories"}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-2 line-clamp-2">{story.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {story.description}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="px-2 py-1 bg-muted rounded-full">
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
      </div>
    </motion.div>
  );
}