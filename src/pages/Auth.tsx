import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, Loader2, Mail, UserX, Chrome } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface AuthProps {
  redirectAfterAuth?: string;
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();

  // Mode: "login" or "signup"
  const [mode, setMode] = useState<"login" | "signup">("login");

  // Login fields
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  // Signup fields
  const [suUsername, setSuUsername] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPassword, setSuPassword] = useState("");
  const [suConfirm, setSuConfirm] = useState("");
  const [suGender, setSuGender] = useState<string | undefined>(undefined);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const googleEnabled = import.meta.env.VITE_GOOGLE_OAUTH_ENABLED === "true";

  // Current user + username helper
  const me = useQuery(api.users.currentUser, {});
  const setUsername = useMutation(api.users.setUsername);
  const updateMe = useMutation(api.users.updateMe);

  // Helper to resolve username/email
  const getEmailForLogin = useMutation(api.users.getEmailForLogin);

  // Username dialog for Google first-time users
  const [showUsernameDialog, setShowUsernameDialog] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");

  useEffect(() => {
    if (!authLoading && isAuthenticated && me) {
      if (!me.username) {
        setShowUsernameDialog(true);
      } else {
        navigate(redirectAfterAuth || "/");
      }
    }
  }, [authLoading, isAuthenticated, me, navigate, redirectAfterAuth]);

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      // First resolve identifier to a valid email and assert account exists.
      let email: string;
      try {
        email = await getEmailForLogin({ identifier });
      } catch {
        setError("User not signed up");
        return;
      }

      const fd = new FormData();
      fd.set("email", email);
      fd.set("password", password);
      fd.set("flow", "signIn");
      await signIn("password", fd);
      navigate(redirectAfterAuth || "/");
    } catch {
      // Any failure at credential verification stage -> wrong credentials.
      setError("Invalid Username Or Password");
    } finally {
      setIsLoading(false);
    }
  };

  const doSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      if (suPassword !== suConfirm) {
        throw new Error("Passwords do not match");
      }
      // 1) Create account
      const fd = new FormData();
      fd.set("email", suEmail.trim());
      fd.set("password", suPassword);
      fd.set("flow", "signUp");
      await signIn("password", fd);

      // 2) Set username (unique) and optional gender
      await setUsername({ username: suUsername.trim() });
      if (suGender && suGender.trim()) {
        await updateMe({ gender: suGender.trim() });
      }

      toast.success("Account created");
      navigate(redirectAfterAuth || "/");
    } catch (err: any) {
      setError(err?.message || "Sign up failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google button (if enabled)
  const handleGoogle = async () => {
    try {
      await signIn("google");
      // After Google, username dialog may open if missing due to effect
    } catch (e) {
      console.error(e);
      toast.error("Google sign-in failed");
    }
  };

  const handleSaveUsername = async () => {
    const val = usernameInput.trim();
    if (!val) {
      toast.error("Please enter a username");
      return;
    }
    try {
      await setUsername({ username: val });
      toast.success("Username saved!");
      setShowUsernameDialog(false);
      navigate("/");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save username");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-8 pb-28">
        <div className="w-full max-w-md">
          <Card className="w-full border shadow-md">
            <CardHeader className="text-center">
              <div className="flex justify-center">
                <img
                  src="./logo.svg"
                  alt="Logo"
                  width={64}
                  height={64}
                  className="rounded-lg mb-4 mt-2 cursor-pointer"
                  onClick={() => navigate("/")}
                />
              </div>
              <CardTitle className="text-xl">
                {mode === "login" ? "Welcome Back" : "Create your account"}
              </CardTitle>
              <CardDescription>
                {mode === "login"
                  ? "Enter your credentials to continue"
                  : "Join and start writing & reading"}
              </CardDescription>
            </CardHeader>

            {/* Forms */}
            {mode === "login" ? (
              <form onSubmit={doLogin}>
                <CardContent className="pt-2 space-y-3">
                  <div>
                    <Label className="mb-1 block">Email or Username</Label>
                    <Input
                      placeholder="Enter email or username"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <div>
                    <Label className="mb-1 block">Password</Label>
                    <Input
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-red-500">{error}</p>
                  )}

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Log In"}
                  </Button>

                  <div className="text-center text-xs text-muted-foreground">
                    Don&apos;t have an account?{" "}
                    <Button
                      type="button"
                      variant="link"
                      className="px-1"
                      onClick={() => {
                        setError(null);
                        setMode("signup");
                      }}
                    >
                      Sign up
                    </Button>
                  </div>

                  <Button
                    type="button"
                    className="w-full"
                    variant="default"
                    onClick={handleGoogle}
                    disabled={!googleEnabled || isLoading}
                  >
                    <Chrome className="mr-2 h-4 w-4" />
                    Continue with Google
                  </Button>
                </CardContent>
              </form>
            ) : (
              <form onSubmit={doSignup}>
                <CardContent className="pt-2 space-y-3">
                  <div>
                    <Label className="mb-1 block">Username</Label>
                    <Input
                      placeholder="Enter your username"
                      value={suUsername}
                      onChange={(e) => setSuUsername(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      3–20 chars. Letters, numbers, underscores only.
                    </p>
                  </div>
                  <div>
                    <Label className="mb-1 block">Email</Label>
                    <Input
                      type="email"
                      placeholder="name@example.com"
                      value={suEmail}
                      onChange={(e) => setSuEmail(e.target.value)}
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <div>
                    <Label className="mb-1 block">Gender (optional)</Label>
                    <Input
                      placeholder="e.g., Male, Female, Non-binary"
                      value={suGender ?? ""}
                      onChange={(e) => setSuGender(e.target.value || undefined)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="mb-1 block">Password</Label>
                      <Input
                        type="password"
                        placeholder="Create a password"
                        value={suPassword}
                        onChange={(e) => setSuPassword(e.target.value)}
                        disabled={isLoading}
                        required
                      />
                    </div>
                    <div>
                      <Label className="mb-1 block">Confirm Password</Label>
                      <Input
                        type="password"
                        placeholder="Confirm password"
                        value={suConfirm}
                        onChange={(e) => setSuConfirm(e.target.value)}
                        disabled={isLoading}
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <p className="text-sm text-red-500">{error}</p>
                  )}

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Creating..." : "Create Account"}
                  </Button>

                  <div className="text-center text-xs text-muted-foreground">
                    Already have an account?{" "}
                    <Button
                      type="button"
                      variant="link"
                      className="px-1"
                      onClick={() => {
                        setError(null);
                        setMode("login");
                      }}
                    >
                      Log in
                    </Button>
                  </div>

                  <Button
                    type="button"
                    className="w-full"
                    variant="default"
                    onClick={handleGoogle}
                    disabled={!googleEnabled || isLoading}
                  >
                    <Chrome className="mr-2 h-4 w-4" />
                    Continue with Google
                  </Button>
                </CardContent>
              </form>
            )}

            <div className="py-4 px-6 text-xs text-center text-muted-foreground bg-muted border-t rounded-b-lg">
              Secured by{" "}
              <a
                href="https://vly.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-primary transition-colors"
              >
                vly.ai
              </a>
            </div>
          </Card>
        </div>
      </div>

      {/* Username setup dialog for first-time Google users */}
      <Dialog open={showUsernameDialog} onOpenChange={(open) => setShowUsernameDialog(open)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Choose your username</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Enter your username"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              3–20 characters. Letters, numbers, and underscores only.
            </p>
            <Button onClick={handleSaveUsername} disabled={!usernameInput.trim()}>
              Save and continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}