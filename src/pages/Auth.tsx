import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useAuth } from "@/hooks/use-auth";
import { Eye, EyeOff } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface AuthProps {
  redirectAfterAuth?: string;
}

// Add Google OAuth helper
const getGoogleAuthUrl = () => {
  const clientId = "49136963756-u8li6bid91ojnvnlbgd7ngoejp90puiv.apps.googleusercontent.com";
  // Use the Convex backend URL for the OAuth callback, not the frontend URL
  const convexUrl = import.meta.env.VITE_CONVEX_URL?.replace('/api', '') || "https://adept-eagle-707.convex.cloud";
  const redirectUri = `${convexUrl}/auth/google/callback`;
  const scope = "openid email profile";
  const state = Math.random().toString(36).substring(7);
  
  return `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope,
    state,
    access_type: "offline",
    prompt: "consent",
  })}`;
};

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn, signOut } = useAuth();
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
  const [suUsernameError, setSuUsernameError] = useState<string | null>(null);
  const [suEmailError, setSuEmailError] = useState<string | null>(null);
  const [suPasswordError, setSuPasswordError] = useState<string | null>(null);
  const [suDisplayName, setSuDisplayName] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showSuPassword, setShowSuPassword] = useState(false);
  const [showSuConfirm, setShowSuConfirm] = useState(false);

  // OTP dialog state
  const [showOTPDialog, setShowOTPDialog] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpEmail, setOtpEmail] = useState("");

  // OTP mutations
  const generateOTP = useMutation(api.otp.generateOTP);
  const verifyOTP = useMutation(api.otp.verifyOTP);

  // Current user + username helper
  const me = useQuery(api.users.currentUser, {});
  const setUsername = useMutation(api.users.setUsername);
  const updateMe = useMutation(api.users.updateMe);
  const isUsernameAvailable = useMutation(api.users.isUsernameAvailable);
  const getEmailForLogin = useMutation(api.users.getEmailForLogin);

  // Username dialog for Google first-time users
  const [showUsernameDialog, setShowUsernameDialog] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");

  // Clean up OAuth callback parameters immediately on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('code') || urlParams.has('state')) {
      console.log("OAuth callback detected, cleaning URL...");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Add: Check for Google OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const googleAuthSuccess = urlParams.get("google_auth");
    const userEmail = urlParams.get("email");
    const error = urlParams.get("error");
    
    if (googleAuthSuccess === "success" && userEmail) {
      // Clean URL immediately
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Show success message
      toast.success("Successfully signed in with Google! Setting up your account...");
      
      // Auto-sign in the user using their email
      // This creates a proper Convex Auth session
      const autoSignIn = async () => {
        try {
          // For Google users, we need to check if they have a username
          // If not, we'll prompt them after authentication
          // For now, just reload to trigger the auth state check
          window.location.reload();
        } catch (err) {
          console.error("Auto sign-in error:", err);
          toast.error("Please sign in manually to complete setup");
        }
      };
      
      autoSignIn();
      return;
    }
    
    if (error) {
      if (error === "oauth_failed") {
        toast.error("Google sign-in failed. Please try again.");
      } else if (error === "no_code") {
        toast.error("No authorization code received. Please try again.");
      } else {
        toast.error(`Authentication error: ${error}`);
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Handle authentication state and redirect
  useEffect(() => {
    if (!authLoading && isAuthenticated && me) {
      // If username missing, always prompt for it
      if (!me.username) {
        setShowUsernameDialog(true);
        return;
      }
      // Username exists -> proceed to dashboard
      console.log("Login successful, redirecting to:", redirectAfterAuth || "/dashboard");
      
      const targetPath = redirectAfterAuth || "/dashboard";
      navigate(targetPath, { replace: true });
    }
  }, [authLoading, isAuthenticated, me, navigate, redirectAfterAuth]);

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const cleanIdentifier = identifier.trim();
      const cleanPassword = password.trim();

      if (!cleanIdentifier || !cleanPassword) {
        setError("Please enter both email/username and password");
        setIsLoading(false);
        return;
      }

      let email: string;
      try {
        email = await getEmailForLogin({ identifier: cleanIdentifier });
      } catch (err: any) {
        const msg = String(err?.message || "").toLowerCase();
        if (msg.includes("not found") || msg.includes("user not found")) {
          setError("User not signed up");
        } else {
          setError("Invalid Email/Username");
        }
        setIsLoading(false);
        return;
      }

      const fd = new FormData();
      fd.set("email", email);
      fd.set("password", cleanPassword);
      fd.set("flow", "signIn");
      
      try {
        await signIn("password", fd);
        setIsLoading(false);
      } catch (signInErr: any) {
        console.error("Sign in error:", signInErr);
        const signInMsg = String(signInErr?.message || "").toLowerCase();
        if (signInMsg.includes("invalid") || signInMsg.includes("incorrect") || signInMsg.includes("wrong")) {
          setError("Invalid Email/Username Or Password");
        } else {
          setError("Login failed. Please check your credentials and try again.");
        }
        setIsLoading(false);
        return;
      }
    } catch (err: any) {
      console.error("Login error:", err);
      const msg = String(err?.message || "").toLowerCase();
      if (msg.includes("network") || msg.includes("failed to fetch")) {
        setError("Network error. Please try again.");
      } else if (
        msg.includes("not found") ||
        msg.includes("no account") ||
        msg.includes("no such user") ||
        msg.includes("user not signed up")
      ) {
        setError("User not signed up");
      } else {
        setError("Invalid Email/Username Or Password");
      }
      setIsLoading(false);
    }
  };

  const doSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuUsernameError(null);
    setSuEmailError(null);
    setSuPasswordError(null);
    try {
      const desired = suUsername.trim();
      if (desired.length < 3 || desired.length > 20 || !/^[a-zA-Z0-9_]+$/.test(desired)) {
        setSuUsernameError("Invalid username format");
        return;
      }

      const normalizedEmail = suEmail.replace(/\s+/g, "").toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
        setSuEmailError("Enter a valid email address");
        return;
      }

      if (suPassword.length < 8) {
        setSuPasswordError("Password must be at least 8 characters");
        return;
      }
      if (suPassword !== suConfirm) {
        setError("Passwords do not match");
        return;
      }

      const available = await isUsernameAvailable({ username: desired });
      if (!available) {
        setSuUsernameError("Username is already taken");
        return;
      }

      try {
        await generateOTP({ email: normalizedEmail });
        setOtpEmail(normalizedEmail);
        setShowOTPDialog(true);
        toast.success("Verification code sent! Check your email.");
      } catch (err: any) {
        const msg = String(err?.message || "").toLowerCase();
        if (msg.includes("invalid") || msg.includes("email")) {
          setSuEmailError("Please provide a valid email address");
        } else {
          setError("Failed to send verification code. Please try again.");
        }
        return;
      }
    } catch (err: any) {
      setError("Sign up failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) {
      toast.error("Please enter the 6-digit code");
      return;
    }

    setIsLoading(true);
    try {
      await verifyOTP({ email: otpEmail, otp: otpCode });

      try {
        await signOut();
      } catch {
        // Ignore
      }

      const fd = new FormData();
      fd.set("email", otpEmail);
      fd.set("password", suPassword);
      fd.set("flow", "signUp");
      await signIn("password", fd);

      let saved = false;
      for (let i = 0; i < 6; i++) {
        try {
          await setUsername({ username: suUsername.trim() });
          saved = true;
          break;
        } catch (err: any) {
          const msg = String(err?.message || "").toLowerCase();
          if (msg.includes("username is already taken")) {
            toast.error("Username is already taken. Please go back and choose another.");
            setShowOTPDialog(false);
            return;
          }
          if (msg.includes("authenticated")) {
            await new Promise((r) => setTimeout(r, 250));
            continue;
          }
          if (i < 5) {
            await new Promise((r) => setTimeout(r, 250));
            continue;
          }
          throw new Error("Failed to set username");
        }
      }

      try {
        const payload: Record<string, string> = {
          name: suDisplayName.trim() || suUsername.trim(),
        };
        if (suGender && suGender.trim()) payload.gender = suGender.trim();
        await updateMe(payload as any);
      } catch (err: any) {
        console.error("Failed to set display name/gender:", err);
      }

      toast.success("Account created successfully!");
      setShowOTPDialog(false);
      navigate(redirectAfterAuth || "/dashboard", { replace: true });
    } catch (err: any) {
      toast.error(err?.message || "Invalid verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      await generateOTP({ email: otpEmail });
      toast.success("New code sent!");
      setOtpCode("");
    } catch (err: any) {
      toast.error("Failed to resend code");
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
      navigate("/dashboard", { replace: true });
    } catch (e: any) {
      toast.error(e?.message || "Failed to save username");
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const authUrl = getGoogleAuthUrl();
      window.location.href = authUrl;
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      setError("Failed to initiate Google sign-in. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black dark px-4 py-8">
      <div className="mb-6">
        <img
          src="https://harmless-tapir-303.convex.cloud/api/storage/a61232eb-6825-4896-80b3-ce2250d9b937"
          alt="InkTale"
          className="h-24 w-24 rounded-2xl shadow-2xl object-cover mx-auto"
        />
      </div>
      
      <div className="w-full max-w-md pb-20">
          <Card className="w-full border shadow-md">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">
                {mode === "login" ? "Welcome Back" : "Create your account"}
              </CardTitle>
              <CardDescription>
                {mode === "login"
                  ? "Enter your credentials to continue"
                  : "Join and start writing & reading"}
              </CardDescription>
            </CardHeader>

            {mode === "login" ? (
              <form onSubmit={doLogin}>
                <CardContent className="pt-2 space-y-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">
                        Or continue with
                      </span>
                    </div>
                  </div>

                  <div>
                    <Label className="mb-1 block">Email or Username</Label>
                    <Input
                      placeholder="Enter your email or username"
                      value={identifier}
                      onChange={(e) => {
                        setIdentifier(e.target.value);
                        if (error) setError(null);
                      }}
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <div>
                    <Label className="mb-1 block">Password</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (error) setError(null);
                        }}
                        disabled={isLoading}
                        required
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
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
                </CardContent>
              </form>
            ) : (
              <form onSubmit={doSignup}>
                <CardContent className="pt-2 space-y-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">
                        Or sign up with email
                      </span>
                    </div>
                  </div>

                  <div>
                    <Label className="mb-1 block">Display Name</Label>
                    <Input
                      placeholder="How your name appears (e.g., Aura Master)"
                      value={suDisplayName}
                      onChange={(e) => {
                        setSuDisplayName(e.target.value);
                        if (error) setError(null);
                      }}
                      disabled={isLoading}
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Shown publicly. You can change this anytime.
                    </p>
                  </div>
                  <div>
                    <Label className="mb-1 block">Username</Label>
                    <Input
                      placeholder="Enter your username"
                      value={suUsername}
                      onChange={(e) => {
                        setSuUsername(e.target.value);
                        if (suUsernameError) setSuUsernameError(null);
                        if (error) setError(null);
                      }}
                      disabled={isLoading}
                      required
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      3–20 chars. Letters, numbers, underscores only. Saved in lowercase.
                    </p>
                    {suUsernameError && (
                      <p className="text-sm text-red-500 mt-1">{suUsernameError}</p>
                    )}
                  </div>
                  <div>
                    <Label className="mb-1 block">Email</Label>
                    <Input
                      type="email"
                      placeholder="name@example.com"
                      value={suEmail}
                      onChange={(e) => {
                        setSuEmail(e.target.value);
                        if (suEmailError) setSuEmailError(null);
                        if (error) setError(null);
                      }}
                      disabled={isLoading}
                      required
                    />
                    {suEmailError && (
                      <p className="text-sm text-red-500 mt-1">{suEmailError}</p>
                    )}
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
                      <div className="relative">
                        <Input
                          type={showSuPassword ? "text" : "password"}
                          placeholder="Create a password"
                          value={suPassword}
                          onChange={(e) => {
                            setSuPassword(e.target.value);
                            if (suPasswordError) setSuPasswordError(null);
                            if (error) setError(null);
                          }}
                          disabled={isLoading}
                          required
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSuPassword(!showSuPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={showSuPassword ? "Hide password" : "Show password"}
                        >
                          {showSuPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {suPasswordError && (
                        <p className="text-sm text-red-500 mt-1">{suPasswordError}</p>
                      )}
                    </div>
                    <div>
                      <Label className="mb-1 block">Confirm Password</Label>
                      <div className="relative">
                        <Input
                          type={showSuConfirm ? "text" : "password"}
                          placeholder="Confirm password"
                          value={suConfirm}
                          onChange={(e) => {
                            setSuConfirm(e.target.value);
                            if (error) setError(null);
                          }}
                          disabled={isLoading}
                          required
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSuConfirm(!showSuConfirm)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={showSuConfirm ? "Hide password" : "Show password"}
                        >
                          {showSuConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <p className="text-sm text-red-500">{error}</p>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={
                      isLoading ||
                      !suUsername.trim() ||
                      !!suUsernameError ||
                      !suEmail.trim() ||
                      !!suEmailError ||
                      !!suPasswordError ||
                      !suPassword ||
                      !suConfirm ||
                      suPassword !== suConfirm
                    }
                  >
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
                        setSuUsernameError(null);
                        setMode("login");
                      }}
                    >
                      Log in
                    </Button>
                  </div>
                </CardContent>
              </form>
            )}
          </Card>
        </div>

      <Dialog open={showOTPDialog} onOpenChange={(open) => setShowOTPDialog(open)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Verify Your Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              We sent a 6-digit code to <strong>{otpEmail}</strong>
            </p>
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otpCode}
                onChange={(value) => setOtpCode(value)}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button 
              onClick={handleVerifyOTP} 
              disabled={otpCode.length !== 6 || isLoading}
              className="w-full"
            >
              {isLoading ? "Verifying..." : "Verify & Create Account"}
            </Button>
            <Button 
              variant="ghost" 
              onClick={handleResendOTP}
              disabled={isLoading}
              className="w-full"
            >
              Resend Code
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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