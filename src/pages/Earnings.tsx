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
      className="min-h-screen bg-background"
    >
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Earnings Dashboard</h1>
          <p className="text-muted-foreground">
            Track your story performance and future earnings potential
          </p>
        </div>

        {/* Earnings Info */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Monetization Plan For The Future
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <TrendingUp className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Earnings Feature in Development</h3>
              <div className="text-muted-foreground mb-6 max-w-2xl mx-auto space-y-4">
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
                <div className="text-center p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Reader Subscriptions</h4>
                  <p className="text-sm text-muted-foreground">
                    Earn from monthly subscriptions to your premium content
                  </p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Tips & Donations</h4>
                  <p className="text-sm text-muted-foreground">
                    Receive direct support from your readers
                  </p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Premium Chapters</h4>
                  <p className="text-sm text-muted-foreground">
                    Offer exclusive content for paying readers
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Story Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Story Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.stories.map((story) => (
                <div key={story._id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-semibold">{story.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {story.isPublished ? 'Published' : 'Draft'}
                    </p>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <div className="font-semibold">{story.totalViews}</div>
                      <div className="text-muted-foreground">Views</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold">{story.totalLikes}</div>
                      <div className="text-muted-foreground">Likes</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold">{story.totalComments}</div>
                      <div className="text-muted-foreground">Comments</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {stats?.stories.length === 0 && (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">No stories yet</p>
                <Button onClick={() => navigate("/write")}>
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