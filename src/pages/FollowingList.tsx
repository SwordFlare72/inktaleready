import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "convex/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router";

function UserRow({ u, onOpen }: { u: any; onOpen: (id: string) => void }) {
  return (
    <div
      className="w-full cursor-pointer py-3 hover:bg-muted/40 transition-colors px-1 rounded-md"
      onClick={() => onOpen(u._id)}
    >
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={u.image} />
          <AvatarFallback>{u.name?.charAt(0) || "U"}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{u.name || "User"}</div>
          {u.bio && <div className="text-xs text-muted-foreground truncate">{u.bio}</div>}
        </div>
      </div>
    </div>
  );
}

export default function FollowingList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const following = useQuery(
    api.users.listFollowing,
    user?._id ? { userId: user._id } : "skip"
  );

  const openProfile = (id: string) => navigate(`/profile/${id}`);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-3 flex items-center">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div className="ml-2 font-semibold">Following</div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 pb-28">
        {following === undefined ? (
          <div className="text-sm text-muted-foreground py-8 text-center">Loading...</div>
        ) : following.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">Not following anyone</div>
        ) : (
          <div className="divide-y divide-border">
            {following.map((u: any) => (
              <UserRow key={u._id} u={u} onOpen={openProfile} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
