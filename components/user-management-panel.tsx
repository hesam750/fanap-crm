/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Plus, Edit, Trash2, Users, Eye, EyeOff, Save, X } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import type { User } from "@/lib/types"
import { useToast } from "@/components/ui/use-toast"

// const AVAILABLE_PERMISSIONS = [
//   { id: "view-dashboard", label: "مشاهده داشبورد" },
//   { id: "view-analytics", label: "مشاهده تحلیل‌ها" },
//   { id: "view-reports", label: "مشاهده گزارش‌ها" },
//   { id: "manage-tasks", label: "مدیریت وظایف" },
//   { id: "assign-tasks", label: "تخصیص وظایف" },
//   { id: "update-tank-levels", label: "بروزرسانی سطح مخازن" },
//   { id: "update-generator-levels", label: "بروزرسانی سطح ژنراتورها" },
//   { id: "acknowledge-alerts", label: "تأیید هشدارها" },
//   { id: "manage-users", label: "مدیریت کاربران" },
//   { id: "manage-system", label: "مدیریت سیستم" },
//   { id: "add-tanks", label: "افزودن مخزن" },
//   { id: "add-generators", label: "افزودن ژنراتور" },
//   { id: "delete-data", label: "حذف داده‌ها" },
// ]

const ROLE_PERMISSIONS = {
  "root": ["*"],
  manager: ["view-dashboard", "view-analytics", "view-reports", "manage-tasks", "assign-tasks", "acknowledge-alerts"],
  supervisor: ["view-dashboard", "view-analytics", "acknowledge-alerts"],
  operator: ["view-dashboard", "update-tank-levels", "update-generator-levels"],
}

export function UserManagementPanel() {
  const [users, setUsers] = useState<User[]>([])
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "operator" as User["role"],
    permissions: [] as string[],
    isActive: true,
  })
  const [editUserData, setEditUserData] = useState({
    name: "",
    email: "",
    role: "operator" as User["role"],
    isActive: true,
    password: "", // برای تغییر رمز عبور
  })

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getUsers()
      setUsers(response.users)
    } catch (error) {
      console.error("Failed to load users:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async () => {
    try {
      const userData = {
        ...newUser,
        permissions: [],
      }

      // Optimistic add
      const tempId = `temp-${Date.now()}`
      const optimisticUser: User = {
        id: tempId,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        permissions: [],
        createdAt: new Date(),
        isActive: newUser.isActive,
      }
      setUsers((prev) => [optimisticUser, ...prev])

      // Close dialog and reset form immediately
      setIsCreateDialogOpen(false)
      setNewUser({
        name: "",
        email: "",
        password: "",
        role: "operator",
        permissions: [],
        isActive: true,
      })

      // Server create
      const response = await apiClient.createUser(userData)
      const created = (response as any)?.user ?? response

      if (created && created.id) {
        // Replace temp user with server user
        setUsers((prev) => prev.map((u) => (u.id === tempId ? created : u)))
      } else {
        // Fallback to reload
        await loadUsers()
      }
    } catch (error) {
      console.error("Failed to create user:", error)
      // Rollback optimistic user
      setUsers((prev) => prev.filter((u) => !u.id.startsWith("temp-")))
      toast({ title: "خطا", description: "ایجاد کاربر ناموفق بود", variant: "destructive" })
    }
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setEditUserData({
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      password: "", // رمز عبور جدید (اختیاری)
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateUser = async () => {
    if (!editingUser) return

    // Snapshot for rollback (moved outside try so it's accessible in catch)
    const snapshot = [...users]

    try {
      const updates: any = {
        name: editUserData.name,
        email: editUserData.email,
        role: editUserData.role,
        isActive: editUserData.isActive,
      }

      if (editUserData.password && editUserData.password.trim() !== '') {
        console.log("Password will be updated")
        updates.password = editUserData.password
      } else {
        console.log("No password update - field is empty")
      }

      console.log("Sending update request:", updates)

      // Optimistic update
      setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? { ...u, ...updates } : u)))

      // Close dialog immediately
      setIsEditDialogOpen(false)
      setEditingUser(null)
      setEditUserData({
        name: "",
        email: "",
        role: "operator",
        isActive: true,
        password: "",
      })

      // Server update
      const response = await apiClient.updateUser(editingUser.id, updates)
      const updated = (response as any)?.user ?? response
      if (updated && updated.id) {
        setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
      } else {
        // Fallback to reload if response shape is unexpected
        await loadUsers()
      }
    } catch (error) {
      console.error("Failed to update user:", error)
      // Rollback
      setUsers(snapshot)
      toast({ title: "خطا", description: "به‌روزرسانی کاربر ناموفق بود", variant: "destructive" })
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (confirm("آیا از حذف این کاربر اطمینان دارید؟")) {
      try {
        const snapshot = [...users]
        // Optimistic removal
        setUsers((prev) => prev.filter((u) => u.id !== userId))

        await apiClient.deleteUser(userId)
        console.log("User deleted successfully")
      } catch (error) {
        console.error("Failed to delete user:", error)
        toast({ title: "خطا", description: "حذف کاربر ناموفق بود", variant: "destructive" })
        // Rollback on error
        await loadUsers()
      }
    }
  }

  const handleRoleChange = (role: User["role"]) => {
    const defaultPermissions = ROLE_PERMISSIONS[role] || []
    setNewUser({
      ...newUser,
      role,
      permissions: role === "root" ? ["*"] : defaultPermissions,
    })
  }

  const handleEditRoleChange = (role: User["role"]) => {
    setEditUserData({
      ...editUserData,
      role,
    })
  }

  // const handlePermissionToggle = (permissionId: string, checked: boolean) => {
  //   if (newUser.role === "root") return

  //   setNewUser({
  //     ...newUser,
  //     permissions: checked
  //       ? [...newUser.permissions, permissionId]
  //       : newUser.permissions.filter((p) => p !== permissionId),
  //   })
  // }

  const getRoleDisplayName = (role: User["role"]) => {
    switch (role) {
      case "root":
        return "مدیر کل سیستم"
      case "manager":
        return "مدیر"
      case "operator":
        return "اپراتور"
      case "supervisor":
        return "ناظر"
      default:
        return "نامشخص"
    }
  }

  const getRoleBadgeVariant = (role: User["role"]) => {
    switch (role) {
      case "root":
        return "destructive"
      case "manager":
        return "default"
      case "supervisor":
        return "secondary"
      case "operator":
        return "outline"
      default:
        return "outline"
    }
  }

  if (loading) {
    return <div className="flex justify-center p-8">در حال بارگذاری...</div>
  }

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              مدیریت کاربران
            </CardTitle>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 ml-2" />
                  افزودن کاربر جدید
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl" dir="rtl">
                <DialogHeader>
                  <DialogTitle>افزودن کاربر جدید</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>نام کامل</Label>
                      <Input
                        value={newUser.name}
                        onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                        placeholder="نام و نام خانوادگی"
                      />
                    </div>
                    <div>
                      <Label>ایمیل</Label>
                      <Input
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        placeholder="user@example.com"
                      />
                    </div>
                    <div>
                      <Label>رمز عبور</Label>
                      <Input
                        type="password"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        placeholder="رمز عبور"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>نقش</Label>
                    <Select value={newUser.role} onValueChange={handleRoleChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="operator">اپراتور</SelectItem>
                        <SelectItem value="supervisor">ناظر</SelectItem>
                        <SelectItem value="manager">مدیر</SelectItem>
                        <SelectItem value="root">مدیر کل سیستم</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Switch
                      id="isActive"
                      checked={newUser.isActive}
                      onCheckedChange={(checked) => setNewUser({ ...newUser, isActive: checked })}
                    />
                    <Label htmlFor="isActive">کاربر فعال</Label>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleCreateUser} className="flex-1">
                      ایجاد کاربر
                    </Button>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="flex-1">
                      انصراف
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نام</TableHead>
                <TableHead>ایمیل</TableHead>
                <TableHead>نقش</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead>آخرین ورود</TableHead>
                <TableHead>عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role)}>{getRoleDisplayName(user.role)}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {user.isActive ? (
                        <Eye className="h-4 w-4 text-green-500" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      )}
                      <span className={user.isActive ? "text-green-600" : "text-gray-400"}>
                        {user.isActive ? "فعال" : "غیرفعال"}
                      </span>
                    </div>
                  </TableCell>
                  {/* <TableCell>
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString("fa-IR") : "هرگز"}
                  </TableCell> */}
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEditUser(user)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={user.role === "root"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* دیالوگ ویرایش کاربر */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>ویرایش کاربر</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>نام کامل</Label>
              <Input
                value={editUserData.name}
                onChange={(e) => setEditUserData({ ...editUserData, name: e.target.value })}
                placeholder="نام و نام خانوادگی"
              />
            </div>
            <div>
              <Label>ایمیل</Label>
              <Input
                type="email"
                value={editUserData.email}
                onChange={(e) => setEditUserData({ ...editUserData, email: e.target.value })}
                placeholder="user@example.com"
              />
            </div>
            <div>
              <Label>رمز عبور جدید (اختیاری)</Label>
              <Input
                type="password"
                value={editUserData.password}
                onChange={(e) => setEditUserData({ ...editUserData, password: e.target.value })}
                placeholder="رمز عبور جدید"
              />
            </div>
            <div>
              <Label>نقش</Label>
              <Select value={editUserData.role} onValueChange={handleEditRoleChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operator">اپراتور</SelectItem>
                  <SelectItem value="supervisor">ناظر</SelectItem>
                  <SelectItem value="manager">مدیر</SelectItem>
                  <SelectItem value="root">مدیر کل سیستم</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <Switch
                id="edit-isActive"
                checked={editUserData.isActive}
                onCheckedChange={(checked) => setEditUserData({ ...editUserData, isActive: checked })}
              />
              <Label htmlFor="edit-isActive">کاربر فعال</Label>
            </div>
            <div className="flex gap-2 pt-4">
              <Button onClick={handleUpdateUser} className="flex-1">
                <Save className="h-4 w-4 ml-2" />
                ذخیره تغییرات
              </Button>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="flex-1">
                <X className="h-4 w-4 ml-2" />
                انصراف
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}