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
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, Loader2, Mail, UserX, Chrome, Eye, EyeOff } from "lucide-react";
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
  // Add: display name (optional, free-form)
  const [suDisplayName, setSuDisplayName] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showSuPassword, setShowSuPassword] = useState(false);
  const [showSuConfirm, setShowSuConfirm] = useState(false);

  const googleEnabled = import.meta.env.VITE_GOOGLE_OAUTH_ENABLED === "true";

  // Add: OTP dialog state
  const [showOTPDialog, setShowOTPDialog] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpEmail, setOtpEmail] = useState("");

  // Add: OTP mutations
  const generateOTP = useMutation(api.otp.generateOTP);
  const verifyOTP = useMutation(api.otp.verifyOTP);

  // Current user + username helper
  const me = useQuery(api.users.currentUser, {});
  const setUsername = useMutation(api.users.setUsername);
  const updateMe = useMutation(api.users.updateMe);
  const isUsernameAvailable = useMutation(api.users.isUsernameAvailable);

  // Helper to resolve username/email
  const getEmailForLogin = useMutation(api.users.getEmailForLogin);

  // Username dialog for Google first-time users
  const [showUsernameDialog, setShowUsernameDialog] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [shouldPromptUsername, setShouldPromptUsername] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated && me) {
      // If username missing, always prompt for it
      if (!me.username) {
        setShowUsernameDialog(true);
        return;
      }
      // Username exists -> proceed to homepage
      console.log("Login successful, redirecting to:", redirectAfterAuth || "/");
      navigate(redirectAfterAuth || "/");
    }
  }, [authLoading, isAuthenticated, me, navigate, redirectAfterAuth]);

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      // Normalize inputs
      const cleanIdentifier = identifier.trim();
      const cleanPassword = password.trim();

      // Validate both fields are filled
      if (!cleanIdentifier || !cleanPassword) {
        setError("Please enter both email/username and password");
        setIsLoading(false);
        return;
      }

      // Resolve email or username -> email for provider
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
        // Navigation handled by effect
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
      // Basic client validation
      const desired = suUsername.trim();
      if (desired.length < 3 || desired.length > 20 || !/^[a-zA-Z0-9_]+$/.test(desired)) {
        setSuUsernameError("Invalid username format");
        return;
      }

      // Email format validation
      const normalizedEmail = suEmail.replace(/\s+/g, "").toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
        setSuEmailError("Enter a valid email address");
        return;
      }

      // Password checks
      if (suPassword.length < 8) {
        setSuPasswordError("Password must be at least 8 characters");
        return;
      }
      if (suPassword !== suConfirm) {
        setError("Passwords do not match");
        return;
      }

      // Check username availability BEFORE sending OTP
      const available = await isUsernameAvailable({ username: desired });
      if (!available) {
        setSuUsernameError("Username is already taken");
        return;
      }

      // Generate and send OTP
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
      // Verify OTP
      await verifyOTP({ email: otpEmail, otp: otpCode });

      // Sign out any existing session
      try {
        await signOut();
      } catch {
        // Ignore
      }

      // Create account
      const fd = new FormData();
      fd.set("email", otpEmail);
      fd.set("password", suPassword);
      fd.set("flow", "signUp");
      await signIn("password", fd);

      // Set username with retries
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

      // Set display name and gender
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
      navigate(redirectAfterAuth || "/");
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

  // Handle Google button (if enabled)
  const handleGoogle = async () => {
    try {
      // Mark that we should prompt for username after Google if missing
      setShouldPromptUsername(true);
      await signIn("google");
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
      setShouldPromptUsername(false);
      navigate("/");
    } catch (e: any) {
      toast.error(e?.message || "Failed to save username");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black dark px-4 py-8">
      {/* Logo Section */}
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

            {/* Forms */}
            {mode === "login" ? (
              <form onSubmit={doLogin}>
                <CardContent className="pt-2 space-y-3">
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
          </Card>
        </div>

      {/* Add: OTP Verification Dialog */}
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