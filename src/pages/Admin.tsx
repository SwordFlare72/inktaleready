import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { motion } from "framer-motion";
import { Shield, Users, BookOpen, AlertTriangle, BarChart3, Trash2, UserX, Eye, MessageSquare, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminDashboard() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const stats = useQuery(api.adminQueries.getAdminStats, {});
  const allUsers = useQuery(api.adminQueries.getAllUsers, {});
  const allStories = useQuery(api.adminQueries.getAllStories, {});
  const reports = useQuery(api.adminQueries.getAllReports, {});
  
  const updateUserRole = useMutation(api.admin.updateUserRole);
  const deleteUser = useMutation(api.admin.deleteUser);
  const deleteStory = useMutation(api.admin.deleteStoryAsAdmin);
  const updateReportStatus = useMutation(api.admin.updateReportStatus);
  const wipeAll = useMutation(api.admin.wipeAll);
  
  const [showWipeDialog, setShowWipeDialog] = useState(false);
  const [wipeConfirmText, setWipeConfirmText] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);

  // Check if user is admin
  if (!isAuthenticated || !user || (user as any)?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-500" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You don't have permission to access the admin dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/")} className="w-full">
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    try {
      await deleteUser({ userId: userId as any });
      toast.success("User deleted successfully");
    } catch (error) {
      toast.error("Failed to delete user");
    }
  };

  const handleUpdateRole = async (userId: string, role: string) => {
    try {
      await updateUserRole({ userId: userId as any, role: role as any });
      toast.success("User role updated");
    } catch (error) {
      toast.error("Failed to update role");
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    if (!confirm("Are you sure you want to delete this story? This will also delete all chapters and comments.")) return;
    try {
      await deleteStory({ storyId: storyId as any });
      toast.success("Story deleted successfully");
    } catch (error) {
      toast.error("Failed to delete story");
    }
  };

  const handleUpdateReport = async (reportId: string, status: string) => {
    try {
      await updateReportStatus({ reportId: reportId as any, status: status as any });
      toast.success("Report status updated");
    } catch (error) {
      toast.error("Failed to update report");
    }
  };

  const handleWipeAll = async () => {
    if (wipeConfirmText !== "CONFIRM") {
      toast.error("Please type CONFIRM to proceed");
      return;
    }
    try {
      await wipeAll({ confirm: "CONFIRM" });
      toast.success("All data wiped successfully");
      setShowWipeDialog(false);
      setWipeConfirmText("");
    } catch (error) {
      toast.error("Failed to wipe data");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-background pb-20"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          </div>
          <p className="text-purple-100">Manage users, content, and system operations</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.activeUsers || 0} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-500" />
                Total Stories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.totalStories || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.publishedStories || 0} published
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                Pending Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.pendingReports || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.totalReports || 0} total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                Total Views
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.totalViews?.toLocaleString() || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across all stories
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="stories">Stories</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>View and manage all users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {allUsers?.map((u) => (
                    <div key={u._id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={u.avatarImage || u.image || ""} />
                          <AvatarFallback>{(u.name?.[0] || "U").toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate">{u.name || "Anonymous"}</div>
                          <div className="text-sm text-muted-foreground truncate">@{u.username || "no-username"}</div>
                          <div className="text-xs text-muted-foreground truncate">{u.email || "No email"}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                          {u.role || "user"}
                        </Badge>
                        <Select
                          value={u.role || "user"}
                          onValueChange={(role) => handleUpdateRole(u._id, role)}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteUser(u._id)}
                        >
                          <UserX className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stories Tab */}
          <TabsContent value="stories" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Story Management</CardTitle>
                <CardDescription>View and manage all stories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {allStories?.map((story) => (
                    <div key={story._id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex gap-3 flex-1 min-w-0">
                        <div className="w-16 h-20 rounded-lg overflow-hidden bg-muted shrink-0">
                          {story.coverImage ? (
                            <img src={story.coverImage} alt={story.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400">
                              <BookOpen className="w-6 h-6 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate">{story.title}</div>
                          <div className="text-sm text-muted-foreground truncate">
                            by {story.authorName || "Unknown"}
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {story.totalViews}
                            </span>
                            <span className="flex items-center gap-1">
                              <BookOpen className="w-3 h-3" />
                              {story.totalChapters} chapters
                            </span>
                            <Badge variant={story.isPublished ? "default" : "secondary"} className="text-xs">
                              {story.isPublished ? "Published" : "Draft"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/story/${story._id}`)}
                        >
                          View
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteStory(story._id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Content Reports</CardTitle>
                <CardDescription>Review and manage user reports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reports?.map((report) => (
                    <div key={report._id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={
                              report.status === "pending" ? "default" :
                              report.status === "resolved" ? "secondary" : "outline"
                            }>
                              {report.status}
                            </Badge>
                            <span className="text-sm text-muted-foreground capitalize">
                              {report.targetType}
                            </span>
                          </div>
                          <div className="font-semibold mb-1">{report.reason}</div>
                          {report.details && (
                            <p className="text-sm text-muted-foreground">{report.details}</p>
                          )}
                          <div className="text-xs text-muted-foreground mt-2">
                            Reported by: {report.reporterName || "Unknown"}
                          </div>
                        </div>
                        <Select
                          value={report.status}
                          onValueChange={(status) => handleUpdateReport(report._id, status)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="dismissed">Dismissed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                  {(!reports || reports.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      No reports to review
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Operations</CardTitle>
                <CardDescription>Dangerous operations - use with caution</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border-2 border-red-500/50 rounded-lg bg-red-500/5">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-red-500 mb-1">Danger Zone</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        This action will permanently delete ALL data from the database including users, stories, chapters, and all related content. This cannot be undone.
                      </p>
                      <Button
                        variant="destructive"
                        onClick={() => setShowWipeDialog(true)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Wipe All Data
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">System Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Users:</span>
                      <span className="font-medium">{stats?.totalUsers || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Stories:</span>
                      <span className="font-medium">{stats?.totalStories || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Chapters:</span>
                      <span className="font-medium">{stats?.totalChapters || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Comments:</span>
                      <span className="font-medium">{stats?.totalComments || 0}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Wipe Confirmation Dialog */}
      <Dialog open={showWipeDialog} onOpenChange={setShowWipeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="w-5 h-5" />
              Confirm Data Wipe
            </DialogTitle>
            <DialogDescription>
              This will permanently delete ALL data from the database. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type "CONFIRM" to proceed</Label>
              <Input
                value={wipeConfirmText}
                onChange={(e) => setWipeConfirmText(e.target.value)}
                placeholder="CONFIRM"
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowWipeDialog(false);
              setWipeConfirmText("");
            }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleWipeAll}
              disabled={wipeConfirmText !== "CONFIRM"}
            >
              Wipe All Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
