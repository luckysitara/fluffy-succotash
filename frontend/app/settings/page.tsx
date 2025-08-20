"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProtectedRoute } from "@/components/ui/protected-route"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger
} from "@/components/ui/sidebar"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"
import { Settings, User, Shield, Bell, Save, RefreshCw, KeyRound } from 'lucide-react'
import { apiClient } from "@/lib/api"

export default function SettingsPage() {
  const { user, logout } = useAuth() // NEW: Destructure logout from useAuth
  const { toast } = useToast()

  // Profile Settings
  const [profileSettings, setProfileSettings] = useState({
    full_name: user?.full_name || "",
    email: user?.email || "",
    bio: "",
    timezone: "America/New_York",
    language: "en",
  })

  // Security Settings
  const [securitySettings, setSecuritySettings] = useState({
    two_factor_enabled: false,
    session_timeout: 30,
    password_expiry: 90,
    login_notifications: true,
    suspicious_activity_alerts: true,
  })

  // Notification Settings
  const [notificationSettings, setNotificationSettings] = useState({
    email_notifications: true,
    push_notifications: true,
    case_updates: true,
    scan_completion: true,
    threat_alerts: true,
    weekly_reports: false,
    maintenance_alerts: true,
  })

  // System Preferences
  const [systemSettings, setSystemSettings] = useState({
    theme: "dark",
    items_per_page: 25,
    auto_refresh: true,
    refresh_interval: 30,
    default_priority: "medium",
    auto_case_creation: true,
  })

  // Password Change
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")

  const handleSaveProfile = async () => {
    try {
      // Mock save - replace with actual API call
      console.log("Saving profile settings:", profileSettings)

      toast({
        title: "Success",
        description: "Profile settings saved successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save profile settings",
        variant: "destructive",
      })
    }
  }

  const handleSaveSecurity = async () => {
    try {
      console.log("Saving security settings:", securitySettings)

      toast({
        title: "Success",
        description: "Security settings saved successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save security settings",
        variant: "destructive",
      })
    }
  }

  const handleSaveNotifications = async () => {
    try {
      console.log("Saving notification settings:", notificationSettings)

      toast({
        title: "Success",
        description: "Notification settings saved successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save notification settings",
        variant: "destructive",
      })
    }
  }

  const handleSaveSystem = async () => {
    try {
      console.log("Saving system preferences:", systemSettings)

      toast({
        title: "Success",
        description: "System preferences saved successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save system preferences",
        variant: "destructive",
      })
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmNewPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match.",
        variant: "destructive",
      })
      return
    }

    if (!currentPassword || !newPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields.",
        variant: "destructive",
      })
      return
    }

    try {
      await apiClient.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      })
      toast({
        title: "Success",
        description: "Password changed successfully. Please log in again with your new password.",
      })
      // Clear fields
      setCurrentPassword("")
      setNewPassword("")
      setConfirmNewPassword("")
      
      // NEW: Force logout to invalidate session and require re-authentication
      logout() 
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to change password.",
        variant: "destructive",
      })
    }
  }

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-slate-950">
        <Sidebar />

        <div className="flex-1 ml-64 overflow-auto">
          <div className="flex items-center justify-between p-6 border-b border-slate-800">
            <div className="animate-fade-in-up">
              <h1 className="text-2xl font-bold text-white">Settings</h1>
              <p className="text-slate-400">Manage your account and system preferences</p>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" className="border-slate-700 bg-transparent">
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset to Defaults
              </Button>
            </div>
          </div>

          <div className="p-6">
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-slate-800 mb-6">
                <TabsTrigger value="profile" className="data-[state=active]:bg-blue-600">
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </TabsTrigger>
                <TabsTrigger value="security" className="data-[state=active]:bg-blue-600">
                  <Shield className="w-4 h-4 mr-2" />
                  Security
                </TabsTrigger>
                <TabsTrigger value="notifications" className="data-[state=active]:bg-blue-600">
                  <Bell className="w-4 h-4 mr-2" />
                  Notifications
                </TabsTrigger>
                <TabsTrigger value="system" className="data-[state=active]:bg-blue-600">
                  <Settings className="w-4 h-4 mr-2" />
                  System
                </TabsTrigger>
              </TabsList>

              {/* Profile Settings */}
              <TabsContent value="profile" className="space-y-6">
                <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white">Profile Information</CardTitle>
                    <CardDescription className="text-slate-400">
                      Update your personal information and preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="full_name" className="text-white">
                          Full Name
                        </Label>
                        <Input
                          id="full_name"
                          value={profileSettings.full_name}
                          onChange={(e) => setProfileSettings({ ...profileSettings, full_name: e.target.value })}
                          className="bg-slate-800 border-slate-700 text-white"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email" className="text-white">
                          Email Address
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={profileSettings.email}
                          onChange={(e) => setProfileSettings({ ...profileSettings, email: e.target.value })}
                          className="bg-slate-800 border-slate-700 text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="bio" className="text-white">
                        Bio
                      </Label>
                      <Textarea
                        id="bio"
                        placeholder="Tell us about yourself..."
                        value={profileSettings.bio}
                        onChange={(e) => setProfileSettings({ ...profileSettings, bio: e.target.value })}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="timezone" className="text-white">
                          Timezone
                        </Label>
                        <Select
                          value={profileSettings.timezone}
                          onValueChange={(value) => setProfileSettings({ ...profileSettings, timezone: value })}
                        >
                          <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            <SelectItem value="America/New_York">Eastern Time</SelectItem>
                            <SelectItem value="America/Chicago">Central Time</SelectItem>
                            <SelectItem value="America/Denver">Mountain Time</SelectItem>
                            <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                            <SelectItem value="UTC">UTC</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="language" className="text-white">
                          Language
                        </Label>
                        <Select
                          value={profileSettings.language}
                          onValueChange={(value) => setProfileSettings({ ...profileSettings, language: value })}
                        >
                          <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="es">Spanish</SelectItem>
                            <SelectItem value="fr">French</SelectItem>
                            <SelectItem value="de">German</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button onClick={handleSaveProfile} className="bg-blue-600 hover:bg-blue-700">
                      <Save className="w-4 h-4 mr-2" />
                      Save Profile
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Security Settings */}
              <TabsContent value="security" className="space-y-6">
                <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white">Security Settings</CardTitle>
                    <CardDescription className="text-slate-400">
                      Manage your account security and authentication preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-white">Two-Factor Authentication</Label>
                        <p className="text-sm text-slate-400">Add an extra layer of security to your account</p>
                      </div>
                      <Switch
                        checked={securitySettings.two_factor_enabled}
                        onCheckedChange={(checked) =>
                          setSecuritySettings({ ...securitySettings, two_factor_enabled: checked })
                        }
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="session_timeout" className="text-white">
                          Session Timeout (minutes)
                        </Label>
                        <Input
                          id="session_timeout"
                          type="number"
                          value={securitySettings.session_timeout}
                          onChange={(e) =>
                            setSecuritySettings({
                              ...securitySettings,
                              session_timeout: Number.parseInt(e.target.value),
                            })
                          }
                          className="bg-slate-800 border-slate-700 text-white"
                        />
                      </div>
                      <div>
                        <Label htmlFor="password_expiry" className="text-white">
                          Password Expiry (days)
                        </Label>
                        <Input
                          id="password_expiry"
                          type="number"
                          value={securitySettings.password_expiry}
                          onChange={(e) =>
                            setSecuritySettings({
                              ...securitySettings,
                              password_expiry: Number.parseInt(e.target.value),
                            })
                          }
                          className="bg-slate-800 border-slate-700 text-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label className="text-white">Login Notifications</Label>
                          <p className="text-sm text-slate-400">Get notified when someone logs into your account</p>
                        </div>
                        <Switch
                          checked={securitySettings.login_notifications}
                          onCheckedChange={(checked) =>
                            setSecuritySettings({ ...securitySettings, login_notifications: checked })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label className="text-white">Suspicious Activity Alerts</Label>
                          <p className="text-sm text-slate-400">Get alerted about unusual account activity</p>
                        </div>
                        <Switch
                          checked={securitySettings.suspicious_activity_alerts}
                          onCheckedChange={(checked) =>
                            setSecuritySettings({ ...securitySettings, suspicious_activity_alerts: checked })
                          }
                        />
                      </div>
                    </div>

                    <Button onClick={handleSaveSecurity} className="bg-blue-600 hover:bg-blue-700">
                      <Save className="w-4 h-4 mr-2" />
                      Save Security Settings
                    </Button>
                  </CardContent>
                </Card>

                {/* Password Change Section */}
                <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white">Change Password</CardTitle>
                    <CardDescription className="text-slate-400">
                      Update your account password
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <form onSubmit={handleChangePassword} className="space-y-4">
                      <div>
                        <Label htmlFor="current-password" className="text-white">
                          Current Password
                        </Label>
                        <Input
                          id="current-password"
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="bg-slate-800 border-slate-700 text-white"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="new-password" className="text-white">
                          New Password
                        </Label>
                        <Input
                          id="new-password"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="bg-slate-800 border-slate-700 text-white"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="confirm-new-password" className="text-white">
                          Confirm New Password
                        </Label>
                        <Input
                          id="confirm-new-password"
                          type="password"
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          className="bg-slate-800 border-slate-700 text-white"
                          required
                        />
                      </div>
                      <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                        <KeyRound className="w-4 h-4 mr-2" />
                        Change Password
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notification Settings */}
              <TabsContent value="notifications" className="space-y-6">
                <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white">Notification Preferences</CardTitle>
                    <CardDescription className="text-slate-400">
                      Choose what notifications you want to receive
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label className="text-white">Email Notifications</Label>
                          <p className="text-sm text-slate-400">Receive notifications via email</p>
                        </div>
                        <Switch
                          checked={notificationSettings.email_notifications}
                          onCheckedChange={(checked) =>
                            setNotificationSettings({ ...notificationSettings, email_notifications: checked })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label className="text-white">Push Notifications</Label>
                          <p className="text-sm text-slate-400">Receive browser push notifications</p>
                        </div>
                        <Switch
                          checked={notificationSettings.push_notifications}
                          onCheckedChange={(checked) =>
                            setNotificationSettings({ ...notificationSettings, push_notifications: checked })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label className="text-white">Case Updates</Label>
                          <p className="text-sm text-slate-400">Get notified when cases are updated</p>
                        </div>
                        <Switch
                          checked={notificationSettings.case_updates}
                          onCheckedChange={(checked) =>
                            setNotificationSettings({ ...notificationSettings, case_updates: checked })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label className="text-white">Scan Completion</Label>
                          <p className="text-sm text-slate-400">Get notified when scans complete</p>
                        </div>
                        <Switch
                          checked={notificationSettings.scan_completion}
                          onCheckedChange={(checked) =>
                            setNotificationSettings({ ...notificationSettings, scan_completion: checked })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label className="text-white">Threat Alerts</Label>
                          <p className="text-sm text-slate-400">Get alerted about security threats</p>
                        </div>
                        <Switch
                          checked={notificationSettings.threat_alerts}
                          onCheckedChange={(checked) =>
                            setNotificationSettings({ ...notificationSettings, threat_alerts: checked })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label className="text-white">Weekly Reports</Label>
                          <p className="text-sm text-slate-400">Receive weekly summary reports</p>
                        </div>
                        <Switch
                          checked={notificationSettings.weekly_reports}
                          onCheckedChange={(checked) =>
                            setNotificationSettings({ ...notificationSettings, weekly_reports: checked })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label className="text-white">Maintenance Alerts</Label>
                          <p className="text-sm text-slate-400">Get notified about system maintenance</p>
                        </div>
                        <Switch
                          checked={notificationSettings.maintenance_alerts}
                          onCheckedChange={(checked) =>
                            setNotificationSettings({ ...notificationSettings, maintenance_alerts: checked })
                          }
                        />
                      </div>
                    </div>

                    <Button onClick={handleSaveNotifications} className="bg-blue-600 hover:bg-blue-700">
                      <Save className="w-4 h-4 mr-2" />
                      Save Notification Settings
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* System Settings */}
              <TabsContent value="system" className="space-y-6">
                <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white">System Preferences</CardTitle>
                    <CardDescription className="text-slate-400">
                      Customize your system behavior and interface preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="theme" className="text-white">
                          Theme
                        </Label>
                        <Select
                          value={systemSettings.theme}
                          onValueChange={(value) => setSystemSettings({ ...systemSettings, theme: value })}
                        >
                          <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            <SelectItem value="dark">Dark</SelectItem>
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="auto">Auto</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="items_per_page" className="text-white">
                          Items Per Page
                        </Label>
                        <Select
                          value={systemSettings.items_per_page.toString()}
                          onValueChange={(value) =>
                            setSystemSettings({ ...systemSettings, items_per_page: Number.parseInt(value) })
                          }
                        >
                          <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-white">Auto Refresh</Label>
                        <p className="text-sm text-slate-400">Automatically refresh data in real-time</p>
                      </div>
                      <Switch
                        checked={systemSettings.auto_refresh}
                        onCheckedChange={(checked) => setSystemSettings({ ...systemSettings, auto_refresh: checked })}
                      />
                    </div>

                    {systemSettings.auto_refresh && (
                      <div>
                        <Label htmlFor="refresh_interval" className="text-white">
                          Refresh Interval (seconds)
                        </Label>
                        <Input
                          id="refresh_interval"
                          type="number"
                          value={systemSettings.refresh_interval}
                          onChange={(e) =>
                            setSystemSettings({ ...systemSettings, refresh_interval: Number.parseInt(e.target.value) })
                          }
                          className="bg-slate-800 border-slate-700 text-white"
                        />
                      </div>
                    )}

                    <div>
                      <Label htmlFor="default_priority" className="text-white">
                        Default Case Priority
                      </Label>
                      <Select
                        value={systemSettings.default_priority}
                        onValueChange={(value) => setSystemSettings({ ...systemSettings, default_priority: value })}
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-white">Auto Case Creation</Label>
                        <p className="text-sm text-slate-400">Automatically create cases from intelligence scans</p>
                      </div>
                      <Switch
                        checked={systemSettings.auto_case_creation}
                        onCheckedChange={(checked) =>
                          setSystemSettings({ ...systemSettings, auto_case_creation: checked })
                        }
                      />
                    </div>

                    <Button onClick={handleSaveSystem} className="bg-blue-600 hover:bg-blue-700">
                      <Save className="w-4 h-4 mr-2" />
                      Save System Preferences
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
