"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ArrowLeft, Eye, EyeOff, LogOut, Edit2, User, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("account");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [isCurrentPasswordVerified, setIsCurrentPasswordVerified] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Mock user data - will be replaced with Supabase data
  const [userData, setUserData] = useState({
    firstName: "Kyle",
    lastName: "Tran",
    email: "kylekhai04@gmail.com",
    initials: "KT",
  });

  const [profileData, setProfileData] = useState({
    firstName: userData.firstName,
    lastName: userData.lastName,
    email: userData.email,
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleProfileChange = (field: string, value: string) => {
    setProfileData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    
    // TODO: Update user data in Supabase
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    setUserData({
      ...userData,
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      email: profileData.email,
      initials: `${profileData.firstName[0]}${profileData.lastName[0]}`,
    });
    
    setIsEditingProfile(false);
    setIsSaving(false);
  };

  const handleSavePassword = async () => {
    setIsSaving(true);
    
    // TODO: Update password in Supabase
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    setIsEditingPassword(false);
    setIsCurrentPasswordVerified(false);
    setIsSaving(false);
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  const handleCancelProfile = () => {
    setIsEditingProfile(false);
    setProfileData({
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
    });
  };

  const handleVerifyCurrentPassword = () => {
    if (passwordData.currentPassword.trim().length > 0) {
      // TODO: Verify current password with Supabase
      setIsCurrentPasswordVerified(true);
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

  const handleSignOut = () => {
    // TODO: Implement sign out logic with Supabase
    console.log("Sign out clicked");
  };

  const fullName = `${userData.firstName} ${userData.lastName}`;

  const navItems = [
    { id: "account", label: "Account Information", icon: User },
    { id: "security", label: "Security", icon: Shield },
    { id: "signout", label: "Sign Out", icon: LogOut },
  ];

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
                        {userData.initials}
                      </AvatarFallback>
                    </Avatar>

                    {/* Name and Info */}
                    <div className="flex-1 space-y-4">
                      {!isEditingProfile ? (
                        <>
                          <div>
                            <h3 className="text-lg font-semibold text-foreground">{fullName}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{userData.email}</p>
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
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground">Name</label>
                            <div className="flex gap-3">
                              <Input
                                type="text"
                                value={profileData.firstName}
                                onChange={(e) => handleProfileChange("firstName", e.target.value)}
                                placeholder="First name"
                                className="flex-1"
                              />
                              <Input
                                type="text"
                                value={profileData.lastName}
                                onChange={(e) => handleProfileChange("lastName", e.target.value)}
                                placeholder="Last name"
                                className="flex-1"
                              />
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
                              className="pr-10"
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
                              disabled={!passwordData.currentPassword.trim()}
                            >
                              Verify
                            </Button>
                          )}
                        </div>
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
                                className="pr-10"
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
                            />
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
