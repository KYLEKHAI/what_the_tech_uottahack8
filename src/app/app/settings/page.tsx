"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ArrowLeft, Eye, EyeOff, LogOut, Edit2, User, Shield, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";
import { useRouter } from "next/navigation";
import { getUserProfile, updateUserProfile, updateUserPassword, verifyUserPassword } from "@/lib/supabase";
import { handleSignOut as signOutUtil } from "@/lib/auth-utils";

export default function SettingsPage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("account");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [isCurrentPasswordVerified, setIsCurrentPasswordVerified] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/signin');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to signin
  }

  // Real user data from database
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const [profileData, setProfileData] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // Load user profile data
  useEffect(() => {
    const loadProfile = async () => {
      if (user?.id) {
        const { data } = await getUserProfile(user.id);
        if (data) {
          setUserProfile(data);
          setProfileData({
            firstName: data.first_name || "",
            lastName: data.last_name || "",
            email: user.email || "",
          });
        }
        setIsLoadingProfile(false);
      }
    };

    loadProfile();
  }, [user]);

  const handleProfileChange = (field: string, value: string) => {
    setProfileData((prev) => ({ ...prev, [field]: value }));
    // Clear any existing errors for this field
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData((prev) => ({ ...prev, [field]: value }));
    // Clear any existing errors for this field
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validateProfile = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!profileData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }
    if (!profileData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }
    if (!profileData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(profileData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!validateProfile()) return;
    
    setIsSaving(true);
    setErrors({});
    
    try {
      const { error } = await updateUserProfile(user!.id, {
        first_name: profileData.firstName,
        last_name: profileData.lastName,
      });

      if (error) {
        setErrors({ general: error });
      } else {
        // Update local state
        setUserProfile((prev: any) => ({
          ...prev,
          first_name: profileData.firstName,
          last_name: profileData.lastName,
        }));
        setIsEditingProfile(false);
      }
    } catch (err) {
      setErrors({ general: "Failed to update profile" });
    } finally {
      setIsSaving(false);
    }
  };

  const validatePassword = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!passwordData.newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (passwordData.newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters";
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSavePassword = async () => {
    if (!validatePassword()) return;
    
    setIsSaving(true);
    setErrors({});
    
    try {
      const { error } = await updateUserPassword(passwordData.newPassword);

      if (error) {
        setErrors({ general: error });
      } else {
        setIsEditingPassword(false);
        setIsCurrentPasswordVerified(false);
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setShowPassword(false);
        setShowNewPassword(false);
      }
    } catch (err) {
      setErrors({ general: "Failed to update password" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelProfile = () => {
    setIsEditingProfile(false);
    setErrors({});
    setProfileData({
      firstName: userProfile?.first_name || "",
      lastName: userProfile?.last_name || "",
      email: user?.email || "",
    });
  };

  const handleVerifyCurrentPassword = async () => {
    if (!passwordData.currentPassword.trim()) {
      setErrors({ currentPassword: "Current password is required" });
      return;
    }

    setIsSaving(true);
    setErrors({});
    
    try {
      const { verified, error } = await verifyUserPassword(
        user!.email!, 
        passwordData.currentPassword
      );

      if (verified) {
        setIsCurrentPasswordVerified(true);
      } else {
        setErrors({ currentPassword: error || "Invalid password" });
      }
    } catch (err) {
      setErrors({ currentPassword: "Failed to verify password" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelPassword = () => {
    setIsEditingPassword(false);
    setIsCurrentPasswordVerified(false);
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setShowPassword(false);
    setShowNewPassword(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isCurrentPasswordVerified) {
      handleVerifyCurrentPassword();
    }
  };

  const handleSignOut = async () => {
    await signOutUtil();
  };

  const fullName = userProfile ? `${userProfile.first_name || ""} ${userProfile.last_name || ""}`.trim() : "User";
  const initials = userProfile ? 
    `${userProfile.first_name?.[0] || ""}${userProfile.last_name?.[0] || ""}`.toUpperCase() || "U" : "U";

  const navItems = [
    { id: "account", label: "Account Information", icon: User },
    { id: "security", label: "Security", icon: Shield },
    { id: "signout", label: "Sign Out", icon: LogOut },
  ];

  if (isLoadingProfile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Top Header */}
      <DashboardHeader />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Back Button */}
          <Link
            href="/app"
            className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>

          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Account Settings</h1>
            <p className="mt-2 text-muted-foreground">
              Manage your account settings and preferences
            </p>
          </div>

          <div className="flex gap-8">
            {/* Main Content Area */}
            <div className="flex-1 space-y-6">
              {/* Account Information Card */}
              <Card id="account">
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>Manage your account information.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Profile Section */}
                  <div className="flex items-start gap-6">
                    {/* Avatar */}
                    <Avatar className="h-20 w-20">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    {/* Name and Info */}
                    <div className="flex-1 space-y-4">
                      {!isEditingProfile ? (
                        <>
                          <div>
                            <h3 className="text-lg font-semibold text-foreground">{fullName}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{user?.email}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsEditingProfile(true)}
                          >
                            <Edit2 className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                        </>
                      ) : (
                        <div className="space-y-4">
                          {errors.general && (
                            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                              {errors.general}
                            </div>
                          )}
                          
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Name</label>
                            <div className="flex gap-3">
                              <div className="flex-1">
                                <Input
                                  type="text"
                                  value={profileData.firstName}
                                  onChange={(e) => handleProfileChange("firstName", e.target.value)}
                                  placeholder="First name"
                                  className={cn("w-full", errors.firstName && "border-red-500")}
                                  error={!!errors.firstName}
                                />
                                {errors.firstName && (
                                  <p className="text-sm text-red-600 mt-1">{errors.firstName}</p>
                                )}
                              </div>
                              <div className="flex-1">
                                <Input
                                  type="text"
                                  value={profileData.lastName}
                                  onChange={(e) => handleProfileChange("lastName", e.target.value)}
                                  placeholder="Last name"
                                  className={cn("w-full", errors.lastName && "border-red-500")}
                                  error={!!errors.lastName}
                                />
                                {errors.lastName && (
                                  <p className="text-sm text-red-600 mt-1">{errors.lastName}</p>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Email</label>
                            <Input
                              type="email"
                              value={profileData.email}
                              disabled
                              className="opacity-60 blur-[0.5px] cursor-not-allowed"
                              placeholder="Email address"
                            />
                            <p className="text-xs text-muted-foreground">
                              Email cannot be changed
                            </p>
                          </div>

                          <div className="flex gap-3">
                            <Button
                              variant="outline"
                              onClick={handleCancelProfile}
                              className="flex-1"
                              disabled={isSaving}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleSaveProfile}
                              className="flex-1"
                              disabled={isSaving}
                            >
                              {isSaving ? "Saving..." : "Save"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Security Card */}
              <Card id="security">
                <CardHeader>
                  <CardTitle>Security</CardTitle>
                  <CardDescription>Change your password to keep your account secure.</CardDescription>
                </CardHeader>
                <CardContent>
                  {!isEditingPassword ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">Password</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingPassword(true)}
                      >
                        <Edit2 className="mr-2 h-4 w-4" />
                        Change Password
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {errors.general && (
                        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                          {errors.general}
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">
                          Current Password
                        </label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              type={showPassword ? "text" : "password"}
                              value={passwordData.currentPassword}
                              onChange={(e) => handlePasswordChange("currentPassword", e.target.value)}
                              onKeyPress={handleKeyPress}
                              placeholder="Enter current password"
                              className={cn("pr-10", errors.currentPassword && "border-red-500")}
                              error={!!errors.currentPassword}
                              disabled={isCurrentPasswordVerified}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                          {!isCurrentPasswordVerified && (
                            <Button
                              onClick={handleVerifyCurrentPassword}
                              disabled={!passwordData.currentPassword.trim() || isSaving}
                            >
                              {isSaving ? "Verifying..." : "Verify"}
                            </Button>
                          )}
                        </div>
                        {errors.currentPassword && (
                          <p className="text-sm text-red-600">{errors.currentPassword}</p>
                        )}
                      </div>

                      {/* Only show new password fields after current password is verified */}
                      {isCurrentPasswordVerified && (
                        <>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">New Password</label>
                            <div className="relative">
                              <Input
                                type={showNewPassword ? "text" : "password"}
                                value={passwordData.newPassword}
                                onChange={(e) => handlePasswordChange("newPassword", e.target.value)}
                                placeholder="Enter new password"
                                className={cn("pr-10", errors.newPassword && "border-red-500")}
                                error={!!errors.newPassword}
                              />
                              <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                {showNewPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                            {errors.newPassword && (
                              <p className="text-sm text-red-600">{errors.newPassword}</p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">
                              Confirm New Password
                            </label>
                            <Input
                              type={showNewPassword ? "text" : "password"}
                              value={passwordData.confirmPassword}
                              onChange={(e) => handlePasswordChange("confirmPassword", e.target.value)}
                              placeholder="Confirm new password"
                              className={cn("", errors.confirmPassword && "border-red-500")}
                              error={!!errors.confirmPassword}
                            />
                            {errors.confirmPassword && (
                              <p className="text-sm text-red-600">{errors.confirmPassword}</p>
                            )}
                          </div>
                        </>
                      )}

                      <div className="flex gap-3 pt-2">
                        <Button
                          variant="outline"
                          onClick={handleCancelPassword}
                          className="flex-1"
                          disabled={isSaving}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSavePassword}
                          className="flex-1"
                          disabled={
                            isSaving ||
                            !isCurrentPasswordVerified ||
                            !passwordData.newPassword.trim() ||
                            !passwordData.confirmPassword.trim()
                          }
                        >
                          {isSaving ? "Saving..." : "Save"}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Sign Out Section */}
              <Card id="signout">
                <CardHeader>
                  <CardTitle>Sign Out</CardTitle>
                  <CardDescription>Sign out of your account.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="destructive"
                    onClick={handleSignOut}
                    className="w-full sm:w-auto"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Right Sidebar Navigation */}
            <div className="hidden lg:block w-64 shrink-0">
              <div className="sticky top-8">
                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeSection === item.id;
                    return (
                      <a
                        key={item.id}
                        href={`#${item.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveSection(item.id);
                          if (item.id === "account") {
                            // Scroll to top of page for account section
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          } else {
                            document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth" });
                          }
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </a>
                    );
                  })}
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
