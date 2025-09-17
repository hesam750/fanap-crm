// "use client"

// import { useState, useEffect } from "react"
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { Badge } from "@/components/ui/badge"
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "@/components/ui/dialog"
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
// import { DatabaseService } from "@/lib/database"
// import { Users, Settings, Database, Activity, Plus, Edit, Trash2, Shield } from "lucide-react"
// import type { User } from "@/lib/types"

// interface RootAdminPanelProps {
//   currentUser: User
// }

// export function RootAdminPanel({ currentUser }: RootAdminPanelProps) {
//   const [users, setUsers] = useState<User[]>([])
//   const [activities, setActivities] = useState<any[]>([])
//   const [isCreateUserOpen, setIsCreateUserOpen] = useState(false)
//   const [editingUser, setEditingUser] = useState<User | null>(null)
//   const [newUser, setNewUser] = useState({
//     name: "",
//     email: "",
//     password: "",
//     role: "operator" as const,
//   })

//   const db = DatabaseService.getInstance()

//   useEffect(() => {
//     loadUsers()
//     loadActivities()
//   }, [])

//   const loadUsers = async () => {
//     try {
//       const userData = await db.getUsers()
//       setUsers(userData)
//     } catch (error) {
//       console.error("Error loading users:", error)
//     }
//   }

//   const loadActivities = async () => {
//     try {
//       // This would be implemented in the database service
//       // const activityData = await db.getActivityLogs()
//       // setActivities(activityData)
//     } catch (error) {
//       console.error("Error loading activities:", error)
//     }
//   }

//   const handleCreateUser = async () => {
//     try {
//       await db.createUser({
//         ...newUser,
//         id: crypto.randomUUID(),
//         createdAt: new Date(),
//         isActive: true,
//       })

//       setNewUser({ name: "", email: "", password: "", role: "operator" })
//       setIsCreateUserOpen(false)
//       loadUsers()

//       await db.logActivity("user_created", `کاربر جدید ${newUser.name} ایجاد شد`, currentUser.id)
//     } catch (error) {
//       console.error("Error creating user:", error)
//     }
//   }

//   const handleUpdateUser = async (userId: string, updates: Partial<User>) => {
//     try {
//       await db.updateUser(userId, updates)
//       loadUsers()
//       setEditingUser(null)

//       await db.logActivity("user_updated", `کاربر ${updates.name || userId} به‌روزرسانی شد`, currentUser.id)
//     } catch (error) {
//       console.error("Error updating user:", error)
//     }
//   }

//   const handleDeleteUser = async (userId: string) => {
//     if (userId === currentUser.id) {
//       alert("نمی‌توانید خودتان را حذف کنید")
//       return
//     }

//     if (confirm("آیا از حذف این کاربر اطمینان دارید؟")) {
//       try {
//         await db.deleteUser(userId)
//         loadUsers()

//         await db.logActivity("user_deleted", `کاربر ${userId} حذف شد`, currentUser.id)
//       } catch (error) {
//         console.error("Error deleting user:", error)
//       }
//     }
//   }

//   const getRoleBadgeColor = (role: string) => {
//     switch (role) {
//       case "root":
//         return "bg-red-500"
//       case "manager":
//         return "bg-blue-500"
//       case "supervisor":
//         return "bg-green-500"
//       case "operator":
//         return "bg-gray-500"
//       default:
//         return "bg-gray-500"
//     }
//   }

//   const getRoleLabel = (role: string) => {
//     switch (role) {
//       case "root":
//         return "ریشه"
//       case "manager":
//         return "مدیر"
//       case "supervisor":
//         return "ناظر"
//       case "operator":
//         return "اپراتور"
//       default:
//         return role
//     }
//   }

//   if (currentUser.role !== "root") {
//     return (
//       <Card>
//         <CardHeader>
//           <CardTitle className="flex items-center gap-2">
//             <Shield className="h-5 w-5" />
//             دسترسی محدود
//           </CardTitle>
//         </CardHeader>
//         <CardContent>
//           <p>شما دسترسی به پنل مدیریت سیستم ندارید.</p>
//         </CardContent>
//       </Card>
//     )
//   }

//   return (
//     <div className="space-y-6">
//       <Card>
//         <CardHeader>
//           <CardTitle className="flex items-center gap-2">
//             <Shield className="h-5 w-5" />
//             پنل مدیریت سیستم (Root Access)
//           </CardTitle>
//           <CardDescription>مدیریت کاربران، تنظیمات سیستم و نظارت بر فعالیت‌ها</CardDescription>
//         </CardHeader>
//       </Card>

//       <Tabs defaultValue="users" className="space-y-4">
//         <TabsList className="grid w-full grid-cols-4">
//           <TabsTrigger value="users" className="flex items-center gap-2">
//             <Users className="h-4 w-4" />
//             کاربران
//           </TabsTrigger>
//           <TabsTrigger value="database" className="flex items-center gap-2">
//             <Database className="h-4 w-4" />
//             پایگاه داده
//           </TabsTrigger>
//           <TabsTrigger value="settings" className="flex items-center gap-2">
//             <Settings className="h-4 w-4" />
//             تنظیمات
//           </TabsTrigger>
//           <TabsTrigger value="activity" className="flex items-center gap-2">
//             <Activity className="h-4 w-4" />
//             فعالیت‌ها
//           </TabsTrigger>
//         </TabsList>

//         <TabsContent value="users" className="space-y-4">
//           <div className="flex justify-between items-center">
//             <h3 className="text-lg font-semibold">مدیریت کاربران</h3>
//             <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
//               <DialogTrigger asChild>
//                 <Button className="flex items-center gap-2">
//                   <Plus className="h-4 w-4" />
//                   کاربر جدید
//                 </Button>
//               </DialogTrigger>
//               <DialogContent>
//                 <DialogHeader>
//                   <DialogTitle>ایجاد کاربر جدید</DialogTitle>
//                   <DialogDescription>اطلاعات کاربر جدید را وارد کنید</DialogDescription>
//                 </DialogHeader>
//                 <div className="space-y-4">
//                   <div>
//                     <Label htmlFor="name">نام</Label>
//                     <Input
//                       id="name"
//                       value={newUser.name}
//                       onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
//                     />
//                   </div>
//                   <div>
//                     <Label htmlFor="email">ایمیل</Label>
//                     <Input
//                       id="email"
//                       type="email"
//                       value={newUser.email}
//                       onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
//                     />
//                   </div>
//                   <div>
//                     <Label htmlFor="password">رمز عبور</Label>
//                     <Input
//                       id="password"
//                       type="password"
//                       value={newUser.password}
//                       onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
//                     />
//                   </div>
//                   <div>
//                     <Label htmlFor="role">نقش</Label>
//                     <Select
//                       value={newUser.role}
//                       onValueChange={(value: any) => setNewUser({ ...newUser, role: value })}
//                     >
//                       <SelectTrigger>
//                         <SelectValue />
//                       </SelectTrigger>
//                       <SelectContent>
//                         <SelectItem value="operator">اپراتور</SelectItem>
//                         <SelectItem value="supervisor">ناظر</SelectItem>
//                         <SelectItem value="manager">مدیر</SelectItem>
//                         <SelectItem value="root">ریشه</SelectItem>
//                       </SelectContent>
//                     </Select>
//                   </div>
//                   <Button onClick={handleCreateUser} className="w-full">
//                     ایجاد کاربر
//                   </Button>
//                 </div>
//               </DialogContent>
//             </Dialog>
//           </div>

//           <Card>
//             <CardContent className="p-0">
//               <Table>
//                 <TableHeader>
//                   <TableRow>
//                     <TableHead>نام</TableHead>
//                     <TableHead>ایمیل</TableHead>
//                     <TableHead>نقش</TableHead>
//                     <TableHead>وضعیت</TableHead>
//                     <TableHead>عملیات</TableHead>
//                   </TableRow>
//                 </TableHeader>
//                 <TableBody>
//                   {users.map((user) => (
//                     <TableRow key={user.id}>
//                       <TableCell className="font-medium">{user.name}</TableCell>
//                       <TableCell>{user.email}</TableCell>
//                       <TableCell>
//                         <Badge className={getRoleBadgeColor(user.role)}>{getRoleLabel(user.role)}</Badge>
//                       </TableCell>
//                       <TableCell>
//                         <Badge variant={user.isActive ? "default" : "secondary"}>
//                           {user.isActive ? "فعال" : "غیرفعال"}
//                         </Badge>
//                       </TableCell>
//                       <TableCell>
//                         <div className="flex items-center gap-2">
//                           <Button size="sm" variant="outline" onClick={() => setEditingUser(user)}>
//                             <Edit className="h-4 w-4" />
//                           </Button>
//                           {user.id !== currentUser.id && (
//                             <Button size="sm" variant="destructive" onClick={() => handleDeleteUser(user.id)}>
//                               <Trash2 className="h-4 w-4" />
//                             </Button>
//                           )}
//                         </div>
//                       </TableCell>
//                     </TableRow>
//                   ))}
//                 </TableBody>
//               </Table>
//             </CardContent>
//           </Card>
//         </TabsContent>

//         <TabsContent value="database" className="space-y-4">
//           <Card>
//             <CardHeader>
//               <CardTitle>وضعیت پایگاه داده</CardTitle>
//             </CardHeader>
//             <CardContent className="space-y-4">
//               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//                 <div className="p-4 border rounded-lg text-center">
//                   <div className="text-2xl font-bold text-blue-500">{users.length}</div>
//                   <div className="text-sm text-muted-foreground">کاربران</div>
//                 </div>
//                 <div className="p-4 border rounded-lg text-center">
//                   <div className="text-2xl font-bold text-green-500">6</div>
//                   <div className="text-sm text-muted-foreground">مخازن</div>
//                 </div>
//                 <div className="p-4 border rounded-lg text-center">
//                   <div className="text-2xl font-bold text-yellow-500">4</div>
//                   <div className="text-sm text-muted-foreground">ژنراتورها</div>
//                 </div>
//                 <div className="p-4 border rounded-lg text-center">
//                   <div className="text-2xl font-bold text-red-500">متصل</div>
//                   <div className="text-sm text-muted-foreground">وضعیت</div>
//                 </div>
//               </div>

//               <div className="space-y-2">
//                 <h4 className="font-semibold">اسکریپت‌های پایگاه داده</h4>
//                 <p className="text-sm text-muted-foreground">
//                   برای راه‌اندازی پایگاه داده، اسکریپت‌های موجود در پوشه scripts را اجرا کنید:
//                 </p>
//                 <ul className="text-sm space-y-1 list-disc list-inside">
//                   <li>01-create-tables.sql - ایجاد جداول و ساختار پایگاه داده</li>
//                   <li>02-seed-data.sql - درج داده‌های اولیه</li>
//                 </ul>
//               </div>
//             </CardContent>
//           </Card>
//         </TabsContent>

//         <TabsContent value="settings" className="space-y-4">
//           <Card>
//             <CardHeader>
//               <CardTitle>تنظیمات سیستم</CardTitle>
//             </CardHeader>
//             <CardContent className="space-y-4">
//               <div className="space-y-4">
//                 <div>
//                   <Label>حد آستانه هشدار (درصد)</Label>
//                   <Input type="number" defaultValue="20" />
//                 </div>
//                 <div>
//                   <Label>فاصله زمانی به‌روزرسانی خودکار (ثانیه)</Label>
//                   <Input type="number" defaultValue="30" />
//                 </div>
//                 <div>
//                   <Label>حداکثر تعداد هشدارهای نمایش داده شده</Label>
//                   <Input type="number" defaultValue="50" />
//                 </div>
//                 <Button>ذخیره تنظیمات</Button>
//               </div>
//             </CardContent>
//           </Card>
//         </TabsContent>

//         <TabsContent value="activity" className="space-y-4">
//           <Card>
//             <CardHeader>
//               <CardTitle>فعالیت‌های اخیر سیستم</CardTitle>
//             </CardHeader>
//             <CardContent>
//               <div className="space-y-2">
//                 <p className="text-sm text-muted-foreground">فعالیت‌های سیستم در اینجا نمایش داده خواهد شد...</p>
//               </div>
//             </CardContent>
//           </Card>
//         </TabsContent>
//       </Tabs>
//     </div>
//   )
// }
