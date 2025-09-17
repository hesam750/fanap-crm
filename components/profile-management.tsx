"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { User, Settings, Key, Activity, Edit, Save, X } from "lucide-react"
import type { User as UserType, Task } from "@/lib/types"
import { AuthService } from "@/lib/auth"
import { apiClient } from "@/lib/api-client"

interface ProfileManagementProps {
  user: UserType
  onUserUpdate?: (updatedUser: UserType) => void
}

export function ProfileManagement({ user, onUserUpdate }: ProfileManagementProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedUser, setEditedUser] = useState(user)
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [userTasks, setUserTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)

  const auth = AuthService.getInstance()

  useEffect(() => {
    loadUserTasks()
  }, [])

  const loadUserTasks = async () => {
    try {
      setLoading(true)
      const response = await apiClient.getTasks(user.id)
      setUserTasks(response.tasks)
    } catch (error) {
      console.error("Failed to load user tasks:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    try {
      const response = await apiClient.updateUser(user.id, {
        name: editedUser.name,
        email: editedUser.email,
      })

      onUserUpdate?.(response.user)
      setIsEditing(false)
      alert("پروفایل با موفقیت بروزرسانی شد")
    } catch (error) {
      console.error("Failed to update profile:", error)
      alert("خطا در بروزرسانی پروفایل")
    }
  }

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert("رمز عبور جدید و تأیید آن مطابقت ندارند")
      return
    }

    if (passwordData.newPassword.length < 6) {
      alert("رمز عبور باید حداقل ۶ کاراکتر باشد")
      return
    }

    try {
      // In a real app, you would validate the current password
      alert("رمز عبور با موفقیت تغییر کرد")
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      })
    } catch (error) {
      console.error("Failed to change password:", error)
      alert("خطا در تغییر رمز عبور")
    }
  }

  const getRoleDisplayName = (role: UserType["role"]) => {
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

  const getRoleBadgeVariant = (role: UserType["role"]) => {
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

  const getTaskStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "تکمیل شده"
      case "in-progress":
        return "در حال انجام"
      case "pending":
        return "در انتظار"
      default:
        return status
    }
  }

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default"
      case "in-progress":
        return "secondary"
      case "pending":
        return "outline"
      default:
        return "outline"
    }
  }

  const completedTasks = userTasks.filter((task) => task.status === "completed")
  const pendingTasks = userTasks.filter((task) => task.status !== "completed")

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-2 mb-6">
        <User className="h-6 w-6 text-blue-500" />
        <h2 className="text-2xl font-bold">پروفایل کاربری</h2>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">اطلاعات شخصی</TabsTrigger>
          <TabsTrigger value="security">امنیت</TabsTrigger>
          <TabsTrigger value="activity">فعالیت‌ها</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  اطلاعات شخصی
                </CardTitle>
                <Button
                  variant={isEditing ? "outline" : "default"}
                  onClick={() => {
                    if (isEditing) {
                      setEditedUser(user)
                      setIsEditing(false)
                    } else {
                      setIsEditing(true)
                    }
                  }}
                >
                  {isEditing ? (
                    <>
                      <X className="h-4 w-4 ml-2" />
                      انصراف
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4 ml-2" />
                      ویرایش
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src="/placeholder.svg" />
                  <AvatarFallback className="text-lg">
                    {user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">{user.name}</h3>
                  <Badge variant={getRoleBadgeVariant(user.role)}>{getRoleDisplayName(user.role)}</Badge>
                  <p className="text-sm text-muted-foreground">
                    عضو از: {new Date(user.createdAt).toLocaleDateString("fa-IR")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>نام کامل</Label>
                  <Input
                    value={isEditing ? editedUser.name : user.name}
                    onChange={(e) => setEditedUser({ ...editedUser, name: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label>ایمیل</Label>
                  <Input
                    value={isEditing ? editedUser.email : user.email}
                    onChange={(e) => setEditedUser({ ...editedUser, email: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
                <div>
                  <Label>نقش</Label>
                  <Input value={getRoleDisplayName(user.role)} disabled />
                </div>
                <div>
                  <Label>وضعیت</Label>
                  <Input value={user.isActive ? "فعال" : "غیرفعال"} disabled />
                </div>
              </div>

              {isEditing && (
                <div className="flex gap-2">
                  <Button onClick={handleSaveProfile} className="flex-1">
                    <Save className="h-4 w-4 ml-2" />
                    ذخیره تغییرات
                  </Button>
                </div>
              )}

              <div>
                <Label>دسترسی‌ها</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {user.permissions.includes("*") ? (
                    <Badge variant="destructive">دسترسی کامل</Badge>
                  ) : (
                    user.permissions.map((permission) => (
                      <Badge key={permission} variant="outline" className="text-xs">
                        {permission}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                تغییر رمز عبور
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>رمز عبور فعلی</Label>
                <Input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                />
              </div>
              <div>
                <Label>رمز عبور جدید</Label>
                <Input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                />
              </div>
              <div>
                <Label>تأیید رمز عبور جدید</Label>
                <Input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                />
              </div>
              <Button onClick={handleChangePassword} className="w-full">
                تغییر رمز عبور
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                تنظیمات امنیتی
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">آخرین ورود</h4>
                  <p className="text-sm text-muted-foreground">
                    {/* {user.lastLogin ? new Date(user.lastLogin).toLocaleString("fa-IR") : "هرگز"} */}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">وضعیت حساب</h4>
                  <p className="text-sm text-muted-foreground">{user.isActive ? "فعال" : "غیرفعال"}</p>
                </div>
                <Badge variant={user.isActive ? "default" : "secondary"}>{user.isActive ? "فعال" : "غیرفعال"}</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                فعالیت‌های اخیر
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{userTasks.length}</div>
                  <div className="text-sm text-muted-foreground">کل وظایف</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{completedTasks.length}</div>
                  <div className="text-sm text-muted-foreground">تکمیل شده</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{pendingTasks.length}</div>
                  <div className="text-sm text-muted-foreground">در انتظار</div>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8">در حال بارگذاری...</div>
              ) : userTasks.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>عنوان وظیفه</TableHead>
                      <TableHead>وضعیت</TableHead>
                      <TableHead>اولویت</TableHead>
                      <TableHead>تاریخ ایجاد</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userTasks.slice(0, 10).map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">{task.title}</TableCell>
                        <TableCell>
                          <Badge variant={getTaskStatusColor(task.status)}>{getTaskStatusText(task.status)}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={task.priority === "critical" ? "destructive" : "outline"}>
                            {task.priority === "critical"
                              ? "بحرانی"
                              : task.priority === "high"
                                ? "بالا"
                                : task.priority === "medium"
                                  ? "متوسط"
                                  : "پایین"}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(task.createdAt).toLocaleDateString("fa-IR")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center text-muted-foreground py-8">هیچ فعالیتی یافت نشد</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
