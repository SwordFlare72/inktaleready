import { api } from "@/convex/_generated/api";
import { useMutation, useQuery, useAction } from "convex/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";

export default function EditProfile() {
  const me = useQuery(api.users.currentUser, {});
  const updateMe = useMutation(api.users.updateMe);
  const setUsername = useMutation(api.users.setUsername);
  const isUsernameAvailable = useMutation(api.users.isUsernameAvailable);
  const getUploadUrl = useAction(api.files.getUploadUrl);
  const getFileUrl = useAction(api.files.getFileUrl);
  const changeEmail = useMutation(api.users.changeEmail);
  const { signIn, signOut } = useAuth();

  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [username, setUsernameInput] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState("");

  const [imageUrl, setImageUrl] = useState<string>("");
  const [bannerUrl, setBannerUrl] = useState<string>("");

  const [busy, setBusy] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);

  useEffect(() => {
    if (me) {
      setName(me.name ?? "");
      setUsernameInput(me.username ?? "");
      setBio(me.bio ?? "");
      setGender(me.gender ?? "");
      setImageUrl(me.image ?? "");
      setBannerUrl((me as any).bannerImage ?? "");
    }
  }, [me]);

  async function uploadFileAndGetUrl(file: File): Promise<string> {
    const uploadUrl = await getUploadUrl({});
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(uploadUrl, { method: "POST", body: fd });
    if (!res.ok) throw new Error("Upload failed");
    const { storageId } = await res.json();
    const url = await getFileUrl({ storageId });
    if (!url) throw new Error("Could not get file URL");
    return url;
  }

  async function handleUsernameBlur() {
    const desired = username.trim();
    if (!desired) {
      setUsernameError(null);
      return;
    }
    const ok = await isUsernameAvailable({ username: desired });
    setUsernameError(ok ? null : "Username is already taken");
  }

  async function handleSave() {
    if (!me) return;
    if (usernameError) {
      toast.error("Fix username before saving");
      return;
    }
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    setBusy(true);
    try {
      // Update core profile fields
      await updateMe({
        name: name.trim(),
        bio: bio.trim(),
        gender: gender.trim() || undefined,
        image: imageUrl || undefined,
        bannerImage: bannerUrl || undefined,
      });

      // Update username if changed
      const desired = username.trim();
      if (desired && desired !== (me.username ?? "")) {
        try {
          await setUsername({ username: desired });
        } catch (e: any) {
          const msg = String(e?.message || "");
          if (msg.toLowerCase().includes("already taken")) {
            setUsernameError("Username is already taken");
            toast.error("Username is already taken");
            setBusy(false);
            return;
          }
          throw e;
        }
      }

      toast.success("Profile updated");
      navigate(-1);
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setBusy(false);
    }
  }

  async function handleChangeEmail() {
    if (!me) return;
    const normalized = newEmail.replace(/\s+/g, "").toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalized)) {
      toast.error("Enter a valid email");
      return;
    }
    // Prevent no-op changes (same email)
    const currentEmailNormalized = (((me as any).email || "") as string).replace(/\s+/g, "").toLowerCase();
    if (normalized === currentEmailNormalized) {
      toast.error("New email cannot be the same as your current email");
      return;
    }

    setEmailBusy(true);
    try {
      // Re-authenticate against the provider email (authEmail if present, else email)
      const providerEmail = ((((me as any).authEmail || (me as any).email) || "") as string)
        .replace(/\s+/g, "")
        .toLowerCase();

      const fd = new FormData();
      fd.set("email", providerEmail);
      fd.set("password", confirmPassword.trim());
      fd.set("flow", "signIn");
      await signIn("password", fd);

      // Update visible email only; provider auth email remains unchanged
      await changeEmail({ newEmail: normalized });

      toast.success("Email updated");
      setEmailDialogOpen(false);
      setNewEmail("");
      setConfirmPassword("");
    } catch (e: any) {
      const msg = String(e?.message || "").toLowerCase();
      if (
        msg.includes("invalid") ||
        msg.includes("wrong") ||
        msg.includes("password") ||
        msg.includes("credentials")
      ) {
        toast.error("Incorrect password");
      } else if (msg.includes("in use") || msg.includes("already")) {
        toast.error("Email already in use");
      } else if (msg.includes("network") || msg.includes("failed to fetch")) {
        toast.error("Network error. Please try again.");
      } else {
        toast.error("Could not update email");
      }
    } finally {
      setEmailBusy(false);
    }
  }

  if (!me) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pt-6 pb-28">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Profile & Account Settings
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div>
              <div className="text-xl font-semibold">Profile</div>
              <p className="text-sm text-muted-foreground mt-1">
                The information you enter here will be visible to other users.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt="Profile"
                      className="h-full w-full object-cover"
                      crossOrigin="anonymous"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        try {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        } catch {}
                      }}
                    />
                  ) : (
                    <div className="text-xs text-muted-foreground">No image</div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium">Profile picture</div>
                  <div className="text-xs text-muted-foreground">Tap to change</div>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      id="profile-file"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 5 * 1024 * 1024) {
                          toast.error("Max 5MB");
                          return;
                        }
                        try {
                          setBusy(true);
                          const url = await uploadFileAndGetUrl(file);
                          setImageUrl(url);
                          // Immediately save to backend so it shows everywhere
                          try {
                            await updateMe({ image: url });
                          } catch {}
                          toast.success("Profile image uploaded");
                        } catch {
                          toast.error("Upload failed");
                        } finally {
                          setBusy(false);
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById("profile-file")?.click()}
                      disabled={busy}
                    >
                      Choose Image
                    </Button>
                    {imageUrl && (
                      <Button variant="ghost" onClick={() => setImageUrl("")} disabled={busy}>
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="h-20 w-32 rounded overflow-hidden bg-muted flex items-center justify-center">
                  {bannerUrl ? (
                    <img
                      src={bannerUrl}
                      alt="Banner"
                      className="h-full w-full object-cover"
                      crossOrigin="anonymous"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        try {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        } catch {}
                      }}
                    />
                  ) : (
                    <div className="text-xs text-muted-foreground">No background</div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium">Background picture</div>
                  <div className="text-xs text-muted-foreground">Tap to change</div>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      id="banner-file"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 8 * 1024 * 1024) {
                          toast.error("Max 8MB");
                          return;
                        }
                        try {
                          setBusy(true);
                          const url = await uploadFileAndGetUrl(file);
                          setBannerUrl(url);
                          // Immediately save banner to backend
                          try {
                            await updateMe({ bannerImage: url });
                          } catch {}
                          toast.success("Background image uploaded");
                        } catch {
                          toast.error("Upload failed");
                        } finally {
                          setBusy(false);
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById("banner-file")?.click()}
                      disabled={busy}
                    >
                      Choose Image
                    </Button>
                    {bannerUrl && (
                      <Button variant="ghost" onClick={() => setBannerUrl("")} disabled={busy}>
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t" />

            <div className="space-y-4">
              <div className="text-xl font-semibold">About</div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1 block">Username</Label>
                  <Input
                    value={username}
                    onChange={(e) => {
                      setUsernameInput(e.target.value);
                      if (usernameError) setUsernameError(null);
                    }}
                    onBlur={handleUsernameBlur}
                    placeholder="your_username"
                  />
                  {usernameError && (
                    <div className="text-xs text-red-500 mt-1">{usernameError}</div>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-1">
                    3–20 chars. Letters, numbers, underscores only. Saved in lowercase.
                  </p>
                </div>

                <div>
                  <Label className="mb-1 block">Display Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Shown publicly. Can include spaces and symbols.
                  </p>
                </div>
              </div>

              <div>
                <Label className="mb-1 block">Bio</Label>
                <Textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
              </div>

              <div>
                <Label className="mb-1 block">Gender (optional)</Label>
                <Input
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  placeholder="Male, Female, Non-binary"
                />
              </div>
            </div>

            <div className="border-t" />

            <div className="space-y-4">
              <div className="text-xl font-semibold">Account Settings</div>
              <p className="text-sm text-muted-foreground">
                The information you enter here will not be visible to other users.
              </p>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">Email</div>
                    <div className="font-medium break-all">{(me as any).email || "—"}</div>
                  </div>
                  <Button variant="outline" onClick={() => {
                    setNewEmail("");
                    setConfirmPassword("");
                    setEmailDialogOpen(true);
                  }}>
                    Change
                  </Button>
                </div>

                <div className="border-t" />

                <div>
                  <div className="text-sm text-muted-foreground">Account password</div>
                  <div className="font-medium tracking-widest select-none">••••••••</div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    The dots do not represent your actual password size.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => navigate(-1)} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={busy}>
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change your email</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label className="mb-1 block">New email</Label>
            <Input
              type="email"
              placeholder="name@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              disabled={emailBusy}
            />
            <Label className="mt-3 mb-1 block">Confirm password</Label>
            <Input
              type="password"
              placeholder="Enter your account password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={emailBusy}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEmailDialogOpen(false)} disabled={emailBusy}>
                Cancel
              </Button>
              <Button onClick={handleChangeEmail} disabled={emailBusy || !newEmail.trim() || !confirmPassword.trim()}>
                {emailBusy ? "Updating..." : "Change"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}