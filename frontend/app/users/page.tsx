"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { ProtectedRoute } from "@/components/ui/protected-route"
import { Sidebar } from "@/components/ui/sidebar"
import { useToast } from "@/hooks/use-toast"
import { usersAPI, apiClient } from "@/lib/api" // Import apiClient
import { Users, Plus, Edit, Trash2, Shield, Eye, UserCheck, UserX, Crown, Activity, KeyRound } from "lucide-react" // Import KeyRound
import { useAuth } from "@/contexts/auth-context" // Import useAuth
import { format } from "date-fns"
import { OrganizationSelect } from "@/components/organization-select"

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const { toast } = useToast()
  const { user: currentUser } = useAuth()

  // State for Admin Password Reset Dialog
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false)
  const [userToResetPasswordFor, setUserToResetPasswordFor] = useState(null)
  const [adminVerificationPassword, setAdminVerificationPassword] = useState("")
  const [newPasswordForUser, setNewPasswordForUser] = useState("")
  const [confirmNewPasswordForUser, setConfirmNewPasswordForUser] = useState("")
  const [showNewPasswordFields, setShowNewPasswordFields] = useState(false)

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState(null)
  const [deleteVerificationPassword, setDeleteVerificationPassword] = useState("")

  const [newUserData, setNewUserData] = useState({
    username: "",
    email: "",
    full_name: "",
    password: "",
    role: "INDIVIDUAL_USER",
    organization_id: currentUser?.organization_id || "",
    is_active: true,
  })

  useEffect(() => {
    fetchUsers()
  }, [currentUser])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      let fetchedUsers = await usersAPI.listUsers()

      if (currentUser?.role === "ORG_ADMIN") {
        fetchedUsers = fetchedUsers.filter((u) => u.organization_id === currentUser.organization_id)
      }
      setUsers(fetchedUsers)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async () => {
    try {
      const userToCreate = { ...newUserData }

      // Only include organization_id for roles that need it
      if (newUserData.role === "INDIVIDUAL_USER") {
        delete userToCreate.organization_id
      } else if (newUserData.organization_id) {
        userToCreate.organization_id = newUserData.organization_id
      }

      const createdUser = await usersAPI.createUser(userToCreate)

      setUsers([...users, createdUser])
      setIsCreateDialogOpen(false)
      setNewUserData({
        username: "",
        email: "",
        full_name: "",
        password: "",
        role: "INDIVIDUAL_USER",
        organization_id: currentUser?.organization_id || "",
        is_active: true,
      })

      toast({
        title: "Success",
        description: "User created successfully",
      })
    } catch (error: any) {
      let errorMessage = "Failed to create user"

      if (error.message) {
        errorMessage = error.message
      } else if (typeof error === "string") {
        errorMessage = error
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const handleUpdateUser = async () => {
    if (!editingUser) return
    try {
      const updatedUser = await usersAPI.updateUser(editingUser.id, {
        full_name: editingUser.full_name,
        email: editingUser.email,
        role: editingUser.role,
        is_active: editingUser.is_active,
        organization_id: editingUser.organization_id,
      })
      setUsers(users.map((user) => (user.id === updatedUser.id ? updatedUser : user)))
      setIsEditDialogOpen(false)
      setEditingUser(null)

      toast({
        title: "Success",
        description: "User updated successfully",
      })
    } catch (error: any) {
      let errorMessage = "Failed to update user"

      if (error.message) {
        errorMessage = error.message
      } else if (typeof error === "string") {
        errorMessage = error
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const openDeleteUserDialog = (user) => {
    setUserToDelete(user)
    setDeleteVerificationPassword("")
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteUserWithVerification = async () => {
    if (!userToDelete || !deleteVerificationPassword) {
      toast({
        title: "Error",
        description: "Please enter your password to verify deletion.",
        variant: "destructive",
      })
      return
    }

    try {
      await apiClient.verifyAdminPassword({
        password: deleteVerificationPassword,
      })

      // If verification succeeds, proceed with deletion
      await usersAPI.deleteUser(userToDelete.id)
      setUsers(users.filter((user) => user.id !== userToDelete.id))

      toast({
        title: "Success",
        description: `User ${userToDelete.full_name} deleted successfully`,
      })

      setIsDeleteDialogOpen(false)
      setUserToDelete(null)
      setDeleteVerificationPassword("")
    } catch (error: any) {
      let errorMessage = "Failed to delete user"

      if (error.message) {
        errorMessage = error.message
      } else if (typeof error === "string") {
        errorMessage = error
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const handleDeleteUser = async (userId) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return

    try {
      await usersAPI.deleteUser(userId)
      setUsers(users.filter((user) => user.id !== userId))
      toast({
        title: "Success",
        description: "User deleted successfully",
      })
    } catch (error: any) {
      let errorMessage = "Failed to delete user"

      if (error.message) {
        errorMessage = error.message
      } else if (typeof error === "string") {
        errorMessage = error
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const openResetPasswordDialog = (user) => {
    setUserToResetPasswordFor(user)
    setAdminVerificationPassword("")
    setNewPasswordForUser("")
    setConfirmNewPasswordForUser("")
    setShowNewPasswordFields(false)
    setIsResetPasswordDialogOpen(true)
  }

  const handleAdminPasswordReset = async () => {
    if (!userToResetPasswordFor) return

    if (newPasswordForUser !== confirmNewPasswordForUser) {
      toast({
        title: "Error",
        description: "New passwords do not match.",
        variant: "destructive",
      })
      return
    }
    if (!newPasswordForUser || !adminVerificationPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields.",
        variant: "destructive",
      })
      return
    }

    try {
      await apiClient.adminResetPassword({
        user_id: userToResetPasswordFor.id,
        new_password: newPasswordForUser,
        admin_password: adminVerificationPassword,
      })

      toast({
        title: "Success",
        description: `Password for ${userToResetPasswordFor.full_name} reset successfully. Their sessions have been invalidated.`,
      })
      setIsResetPasswordDialogOpen(false)
      setUserToResetPasswordFor(null)
    } catch (error: any) {
      let errorMessage = "Failed to reset user password."

      if (error.message) {
        errorMessage = error.message
      } else if (typeof error === "string") {
        errorMessage = error
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const getRoleIcon = (role) => {
    switch (role) {
      case "SUPER_ADMIN":
        return <Crown className="w-4 h-4" />
      case "ORG_ADMIN":
        return <Shield className="w-4 h-4" />
      case "STAFF_USER":
        return <Users className="w-4 h-4" /> // replaced UserRound with Users
      case "INDIVIDUAL_USER":
        return <Eye className="w-4 h-4" />
      default:
        return <Users className="w-4 h-4" />
    }
  }

  const getRoleColor = (role) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "bg-red-600"
      case "ORG_ADMIN":
        return "bg-blue-600"
      case "STAFF_USER":
        return "bg-green-600"
      case "INDIVIDUAL_USER":
        return "bg-gray-600"
      default:
        return "bg-gray-600"
    }
  }

  const getRoleDescription = (role) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "Full system access and organization management"
      case "ORG_ADMIN":
        return "Manages users and cases within their organization"
      case "STAFF_USER":
        return "Conducts OSINT research and manages investigations"
      case "INDIVIDUAL_USER":
        return "Manages personal investigations and uses OSINT tools"
      default:
        return "Standard user access"
    }
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = selectedRoleFilter === "all" || user.role === selectedRoleFilter
    return matchesSearch && matchesRole
  })

  const canManageUsers = currentUser?.role === "SUPER_ADMIN" || currentUser?.role === "ORG_ADMIN"
  const canEditUserRoleAndOrg = currentUser?.role === "SUPER_ADMIN"

  return (
    <ProtectedRoute requiredRoles={["SUPER_ADMIN", "ORG_ADMIN"]}>
      <div className="flex h-screen bg-slate-950">
        <Sidebar />

        <div className="flex-1 ml-64 overflow-auto">
          <div className="flex items-center justify-between p-6 border-b border-slate-800">
            <div className="animate-fade-in-up">
              <h1 className="text-2xl font-bold text-white">User Management</h1>
              <p className="text-slate-400">Manage system users and their permissions</p>
            </div>
            {canManageUsers && (
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-900 border-slate-800">
                  <DialogHeader>
                    <DialogTitle className="text-white">Create New User</DialogTitle>
                    <DialogDescription className="text-slate-400">
                      Add a new user to the OSINT platform
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="username" className="text-white">
                        Username
                      </Label>
                      <Input
                        id="username"
                        value={newUserData.username}
                        onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-white">
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={newUserData.email}
                        onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="full_name" className="text-white">
                        Full Name
                      </Label>
                      <Input
                        id="full_name"
                        value={newUserData.full_name}
                        onChange={(e) => setNewUserData({ ...newUserData, full_name: e.target.value })}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="password" className="text-white">
                        Password
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        value={newUserData.password}
                        onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="role" className="text-white">
                        Role
                      </Label>
                      <Select
                        value={newUserData.role}
                        onValueChange={(value) => setNewUserData({ ...newUserData, role: value })}
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {currentUser?.role === "SUPER_ADMIN" && (
                            <SelectItem value="SUPER_ADMIN">Super Administrator</SelectItem>
                          )}
                          {(currentUser?.role === "SUPER_ADMIN" || currentUser?.role === "ORG_ADMIN") && (
                            <SelectItem value="ORG_ADMIN">Organization Administrator</SelectItem>
                          )}
                          <SelectItem value="STAFF_USER">Staff User</SelectItem>
                          <SelectItem value="INDIVIDUAL_USER">Individual User</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {newUserData.role !== "INDIVIDUAL_USER" && (
                      <div>
                        <Label htmlFor="organization_id" className="text-white">
                          Organization{" "}
                          {newUserData.role === "STAFF_USER" || newUserData.role === "ORG_ADMIN"
                            ? "(Required)"
                            : "(Optional)"}
                        </Label>
                        {newUserData.role === "INDIVIDUAL_USER" ? (
                          <p className="text-sm text-slate-400 mt-1">
                            Individual users operate independently without organization assignment.
                          </p>
                        ) : (
                          <OrganizationSelect
                            value={newUserData.organization_id}
                            onValueChange={(value) => setNewUserData({ ...newUserData, organization_id: value || "" })}
                            placeholder="Select organization..."
                            allowEmpty={newUserData.role === "SUPER_ADMIN"}
                            className="bg-slate-800 border-slate-700 text-white"
                          />
                        )}
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                      className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent"
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleCreateUser} className="bg-blue-600 hover:bg-blue-700">
                      Create User
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <div className="p-6 space-y-6">
            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Total Users</p>
                      <p className="text-2xl font-bold text-white">{users.length}</p>
                    </div>
                    <Users className="w-8 h-8 text-blue-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Active Users</p>
                      <p className="text-2xl font-bold text-green-400">{users.filter((u) => u.is_active).length}</p>
                    </div>
                    <UserCheck className="w-8 h-8 text-green-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Administrators</p>
                      <p className="text-2xl font-bold text-red-400">
                        {users.filter((u) => u.role === "SUPER_ADMIN" || u.role === "ORG_ADMIN").length}
                      </p>
                    </div>
                    <Crown className="w-8 h-8 text-red-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-400">Online Now</p>
                      <p className="text-2xl font-bold text-purple-400">2</p> {/* This is still mock data */}
                    </div>
                    <Activity className="w-8 h-8 text-purple-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <Select value={selectedRoleFilter} onValueChange={setSelectedRoleFilter}>
                    <SelectTrigger className="w-48 bg-slate-800 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="SUPER_ADMIN">Super Administrator</SelectItem>
                      <SelectItem value="ORG_ADMIN">Organization Administrator</SelectItem>
                      <SelectItem value="STAFF_USER">Staff User</SelectItem>
                      <SelectItem value="INDIVIDUAL_USER">Individual User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Users List */}
            <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Users ({filteredUsers.length})</CardTitle>
                <CardDescription className="text-slate-400">Manage user accounts and permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto" />
                      <p className="text-slate-400 mt-2">Loading users...</p>
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                      <p className="text-slate-400">No users found</p>
                    </div>
                  ) : (
                    filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        className="p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800/80 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-medium">{user.full_name.charAt(0)}</span>
                            </div>
                            <div>
                              <h3 className="text-white font-medium">{user.full_name}</h3>
                              <p className="text-sm text-slate-400">@{user.username}</p>
                              <p className="text-sm text-slate-400">{user.email}</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <div className="flex items-center space-x-2 mb-1 justify-end">
                                <Badge className={`${getRoleColor(user.role)} text-white`}>
                                  {getRoleIcon(user.role)}
                                  <span className="ml-1">{user.role.replace("_", " ")}</span>
                                </Badge>
                                <Badge variant={user.is_active ? "default" : "secondary"}>
                                  {user.is_active ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-400">{getRoleDescription(user.role)}</p>
                              {user.created_at && (
                                <p className="text-xs text-slate-500">
                                  Created: {format(new Date(user.created_at), "MMM dd, yyyy")}
                                </p>
                              )}
                            </div>

                            <div className="flex space-x-2">
                              {canManageUsers && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUpdateUser({ ...user, is_active: !user.is_active })}
                                  className="border-slate-700 hover:bg-slate-800"
                                >
                                  {user.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                </Button>
                              )}
                              {canManageUsers && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingUser(user)
                                    setIsEditDialogOpen(true)
                                  }}
                                  className="border-slate-700 hover:bg-slate-800 bg-transparent"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              )}
                              {canManageUsers && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openResetPasswordDialog(user)} // NEW: Reset Password Button
                                  className="border-slate-700 text-blue-400 hover:bg-blue-900/20"
                                >
                                  <KeyRound className="w-4 h-4" />
                                </Button>
                              )}
                              {canManageUsers && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openDeleteUserDialog(user)} // Updated to use verification dialog
                                  className="border-red-700 text-red-400 hover:bg-red-900/20"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Edit User Dialog */}
            {editingUser && (
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="bg-slate-900 border-slate-800">
                  <DialogHeader>
                    <DialogTitle className="text-white">Edit User</DialogTitle>
                    <DialogDescription className="text-slate-400">
                      Update the details for {editingUser.full_name}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="edit-username" className="text-white">
                        Username
                      </Label>
                      <Input
                        id="edit-username"
                        value={editingUser.username}
                        onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                        className="bg-slate-800 border-slate-700 text-white"
                        disabled // Username should not be editable
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-email" className="text-white">
                        Email
                      </Label>
                      <Input
                        id="edit-email"
                        type="email"
                        value={editingUser.email}
                        onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-full_name" className="text-white">
                        Full Name
                      </Label>
                      <Input
                        id="edit-full_name"
                        value={editingUser.full_name}
                        onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                        className="bg-slate-800 border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-role" className="text-white">
                        Role
                      </Label>
                      <Select
                        value={editingUser.role}
                        onValueChange={(value) => setEditingUser({ ...editingUser, role: value })}
                        disabled={!canEditUserRoleAndOrg} // Only Super Admin can change roles
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {currentUser?.role === "SUPER_ADMIN" && (
                            <SelectItem value="SUPER_ADMIN">Super Administrator</SelectItem>
                          )}
                          {(currentUser?.role === "SUPER_ADMIN" || currentUser?.role === "ORG_ADMIN") && (
                            <SelectItem value="ORG_ADMIN">Organization Administrator</SelectItem>
                          )}
                          <SelectItem value="STAFF_USER">Staff User</SelectItem>
                          <SelectItem value="INDIVIDUAL_USER">Individual User</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {canEditUserRoleAndOrg && ( // Only Super Admin can change organization
                      <div>
                        <Label htmlFor="edit-organization_id" className="text-white">
                          Organization (Optional)
                        </Label>
                        <OrganizationSelect
                          value={editingUser.organization_id || ""}
                          onValueChange={(value) => setEditingUser({ ...editingUser, organization_id: value })}
                          placeholder="Select organization..."
                          allowEmpty={true}
                          className="bg-slate-800 border-slate-700 text-white"
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <Label htmlFor="edit-is-active" className="text-white">
                        Active
                      </Label>
                      <Select
                        value={editingUser.is_active ? "true" : "false"}
                        onValueChange={(value) => setEditingUser({ ...editingUser, is_active: value === "true" })}
                      >
                        <SelectTrigger className="w-24 bg-slate-800 border-slate-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="true">Yes</SelectItem>
                          <SelectItem value="false">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditDialogOpen(false)}
                      className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent"
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleUpdateUser} className="bg-blue-600 hover:bg-blue-700">
                      Save Changes
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {/* Admin Password Reset Dialog */}
            {userToResetPasswordFor && (
              <Dialog open={isResetPasswordDialogOpen} onOpenChange={setIsResetPasswordDialogOpen}>
                <DialogContent className="bg-slate-900 border-slate-800">
                  <DialogHeader>
                    <DialogTitle className="text-white">
                      Reset Password for {userToResetPasswordFor.full_name}
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                      {showNewPasswordFields
                        ? "Enter the new password for the user."
                        : "Enter your own password to verify your identity before resetting."}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {!showNewPasswordFields ? (
                      <div>
                        <Label htmlFor="admin-password-verify" className="text-white">
                          Your Admin Password
                        </Label>
                        <Input
                          id="admin-password-verify"
                          type="password"
                          value={adminVerificationPassword}
                          onChange={(e) => setAdminVerificationPassword(e.target.value)}
                          className="bg-slate-800 border-slate-700 text-white"
                          placeholder="Enter your password"
                        />
                      </div>
                    ) : (
                      <>
                        <div>
                          <Label htmlFor="new-user-password" className="text-white">
                            New Password
                          </Label>
                          <Input
                            id="new-user-password"
                            type="password"
                            value={newPasswordForUser}
                            onChange={(e) => setNewPasswordForUser(e.target.value)}
                            className="bg-slate-800 border-slate-700 text-white"
                            placeholder="Enter new password for user"
                          />
                        </div>
                        <div>
                          <Label htmlFor="confirm-new-user-password" className="text-white">
                            Confirm New Password
                          </Label>
                          <Input
                            id="confirm-new-user-password"
                            type="password"
                            value={confirmNewPasswordForUser}
                            onChange={(e) => setConfirmNewPasswordForUser(e.target.value)}
                            className="bg-slate-800 border-slate-700 text-white"
                            placeholder="Confirm new password for user"
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsResetPasswordDialogOpen(false)}
                      className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent"
                    >
                      Cancel
                    </Button>
                    {!showNewPasswordFields ? (
                      <Button onClick={() => setShowNewPasswordFields(true)} className="bg-blue-600 hover:bg-blue-700">
                        Verify & Continue
                      </Button>
                    ) : (
                      <Button onClick={handleAdminPasswordReset} className="bg-blue-600 hover:bg-blue-700">
                        Reset Password
                      </Button>
                    )}
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {/* User Deletion Verification Dialog */}
            {userToDelete && (
              <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="bg-slate-900 border-slate-800">
                  <DialogHeader>
                    <DialogTitle className="text-white text-red-400">Delete User: {userToDelete.full_name}</DialogTitle>
                    <DialogDescription className="text-slate-400">
                      This action cannot be undone. Enter your password to confirm deletion of this user account.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-lg">
                      <div className="flex items-center space-x-2 text-red-400 mb-2">
                        <Trash2 className="w-4 h-4" />
                        <span className="font-medium">Warning: Permanent Deletion</span>
                      </div>
                      <p className="text-sm text-red-300">
                        You are about to permanently delete <strong>{userToDelete.full_name}</strong> (@
                        {userToDelete.username}). All associated data and access will be removed immediately.
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="delete-verification-password" className="text-white">
                        Your Admin Password
                      </Label>
                      <Input
                        id="delete-verification-password"
                        type="password"
                        value={deleteVerificationPassword}
                        onChange={(e) => setDeleteVerificationPassword(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white"
                        placeholder="Enter your password to confirm deletion"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsDeleteDialogOpen(false)}
                      className="border-slate-600 text-slate-300 hover:bg-slate-800 bg-transparent"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleDeleteUserWithVerification}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete User
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
