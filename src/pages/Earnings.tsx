import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { DollarSign, Eye, Heart, MessageCircle, BookOpen, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router";

export default function Earnings() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const stats = useQuery(api.stories.myStats, isAuthenticated ? {} : "skip");

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Sign In Required</h2>
            <p className="text-muted-foreground mb-4">
              Please sign in to view your earnings dashboard
            </p>
            <Button onClick={() => navigate("/auth")}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background pb-32"
    >
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Earnings Dashboard</h1>
          <p className="text-muted-foreground">
            Track your story performance and future earnings potential
          </p>
        </div>

        {/* Monetization Info Card */}
        <Card className="mb-8 border-2 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <DollarSign className="h-6 w-6" />
              Monetization Plan For The Future
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <TrendingUp className="h-20 w-20 mx-auto mb-6 text-primary/60" />
              <h3 className="text-2xl font-semibold mb-4">About Monetization</h3>
              <div className="text-muted-foreground mb-6 max-w-2xl mx-auto space-y-4 text-base leading-relaxed">
                <p>
                  We plan to introduce a writer monetization system in the future where authors can earn from their stories through our platform.
                </p>
                <p>
                  However, this feature will only be introduced if the app becomes successful and generates enough profit to support fair and consistent payouts.
                </p>
                <p>
                  For now, we encourage you to share your stories, build your audience, and be part of our growing community — your support helps make this feature possible.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Story Performance */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-xl">Story Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.stories.map((story) => (
                <div key={story._id} className="flex items-center justify-between p-5 border-2 rounded-xl hover:border-primary/50 transition-colors bg-card/50">
                  <div className="flex-1 min-w-0 mr-4">
                    <h4 className="font-semibold text-lg truncate">{story.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {story.isPublished ? 'Published' : 'Draft'}
                    </p>
                  </div>
                  <div className="flex items-center gap-8 text-sm">
                    <div className="text-center">
                      <div className="font-bold text-lg">{story.totalViews}</div>
                      <div className="text-muted-foreground text-xs">Views</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-lg">{story.totalLikes}</div>
                      <div className="text-muted-foreground text-xs">Likes</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-lg">{story.totalComments}</div>
                      <div className="text-muted-foreground text-xs">Comments</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {stats?.stories.length === 0 && (
              <div className="text-center py-12">
                <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground/60" />
                <p className="text-muted-foreground mb-4 text-lg">No stories yet</p>
                <Button onClick={() => navigate("/write")} size="lg">
                  Create Your First Story
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}