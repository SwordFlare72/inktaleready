import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "convex/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useState } from "react";

function UserRow({ u, onOpen, isFollowing, onToggle }: {
  u: any;
  onOpen: (id: string) => void;
  isFollowing: boolean;
  onToggle: (id: string, currentlyFollowing: boolean) => Promise<void>;
}) {
  return (
    <div
      className="w-full py-3 hover:bg-muted/40 transition-colors px-1 rounded-md"
    >
      <div className="flex items-center gap-3">
        <button className="flex items-center gap-3 flex-1 text-left" onClick={() => onOpen(u._id)}>
          <Avatar className="h-10 w-10">
            <AvatarImage src={u.image} />
            <AvatarFallback>{u.name?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="text-base md:text-lg font-semibold truncate">{u.name || "User"}</div>
            {u.bio && <div className="text-xs text-muted-foreground truncate">{u.bio}</div>}
          </div>
        </button>
        <Button
          variant={isFollowing ? "outline" : "default"}
          size="sm"
          onClick={() => onToggle(u._id, isFollowing)}
          className={isFollowing ? "" : "bg-primary text-primary-foreground"}
        >
          {isFollowing ? "Unfollow" : "Follow"}
        </Button>
      </div>
    </div>
  );
}

export default function FollowingList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  // Ensure the tabs are visible immediately without scrolling
  const [tab, setTab] = useState<"followers" | "following">("following");

  // Fetch both lists
  const following = useQuery(
    api.users.listFollowing,
    user?._id ? { userId: user._id } : "skip"
  );
  const followers = useQuery(
    api.users.listFollowers,
    user?._id ? { userId: user._id } : "skip"
  );

  const toggleUserFollow = useMutation(api.users.toggleUserFollow);

  // Local optimistic set of following ids
  const followingIds = new Set<string>(
    Array.isArray(following) ? following.map((u: any) => String(u._id)) : []
  );

  const openProfile = (id: string) => navigate(`/profile/${id}`);

  const handleToggle = async (id: string, currentlyFollowing: boolean) => {
    try {
      await toggleUserFollow({ userId: id as any });
      toast.success(currentlyFollowing ? "Unfollowed" : "Followed");
    } catch {
      toast.error("Failed to update follow");
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-background">
      {/* Wrap header + content in Tabs so the tab bar stays in the sticky header */}
      <Tabs value={tab} onValueChange={(v:any)=>setTab(v)} className="w-full">
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center">
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <div className="ml-2 font-semibold">Connections</div>
            </div>
            {/* Tabs visible immediately under the header without scrolling */}
            <div className="mt-3">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="followers">Followers</TabsTrigger>
                <TabsTrigger value="following">Following</TabsTrigger>
              </TabsList>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-3 pb-28">
          <TabsContent value="followers" className="mt-4">
            {followers === undefined ? (
              <div className="text-sm text-muted-foreground py-8 text-center">Loading...</div>
            ) : followers.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">No followers yet</div>
            ) : (
              <div className="divide-y divide-border">
                {followers.map((u: any) => (
                  <UserRow
                    key={u._id}
                    u={u}
                    onOpen={openProfile}
                    isFollowing={followingIds.has(String(u._id))}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="following" className="mt-4">
            {following === undefined ? (
              <div className="text-sm text-muted-foreground py-8 text-center">Loading...</div>
            ) : following.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">Not following anyone</div>
            ) : (
              <div className="divide-y divide-border">
                {following.map((u: any) => (
                  <UserRow
                    key={u._id}
                    u={u}
                    onOpen={openProfile}
                    isFollowing={true}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </motion.div>
  );
}