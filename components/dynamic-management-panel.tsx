/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Edit, Trash2, Fuel, Droplets, Zap, MapPin } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { apiClient } from "@/lib/api-client"

import type { Tank, Generator, User } from "@/lib/types"

interface DynamicManagementPanelProps {
  currentUser: User
  tanks: Tank[]
  generators: Generator[]
  onRefresh?: () => void
}

export function DynamicManagementPanel({ currentUser, tanks, generators, onRefresh }: DynamicManagementPanelProps) {
  const [isAddTankOpen, setIsAddTankOpen] = useState(false)
  const [isAddGeneratorOpen, setIsAddGeneratorOpen] = useState(false)
  const [editingTank, setEditingTank] = useState<Tank | null>(null)
  const [editingGenerator, setEditingGenerator] = useState<Generator | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const [newTank, setNewTank] = useState({
    name: "",
    type: "fuel" as "fuel" | "water",
    capacity: 0,
    location: "",
  })

  const [newGenerator, setNewGenerator] = useState({
    name: "",
    capacity: 900,
    location: "",
  })

  const handleCreateTank = async () => {
  if (!newTank.name || !newTank.capacity) {
    toast({
      title: "خطا",
      description: "لطفاً نام و ظرفیت را پر کنید",
      variant: "destructive",
    });
    return;
  }

  setLoading(true);
  try {
    const tankData: any = {
      name: newTank.name,
      type: newTank.type.toUpperCase() as "fuel" | "water", // تبدیل به uppercase
      capacity: newTank.capacity,
      createdBy: currentUser.id,
    };

    if (newTank.location.trim() !== '') {
      tankData.location = newTank.location;
    }

    console.log("Sending tank data to API:", tankData);
    
    await apiClient.createTank(tankData);

    toast({
      title: "موفقیت",
      description: "مخزن جدید با موفقیت ایجاد شد",
      variant: "success",
    });
    setNewTank({ name: "", type: "fuel", capacity: 0, location: "" });
    setIsAddTankOpen(false);
    onRefresh?.();
  } catch (error) {
    console.error("Error creating tank:", error);
    toast({
      title: "خطا",
      description: "خطا در ایجاد مخزن",
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
};

  const handleCreateGenerator = async () => {
    if (!newGenerator.name || !newGenerator.capacity) {
      toast({
        title: "خطا",
        description: "لطفاً نام و ظرفیت را پر کنید",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const generatorData: any = {
        name: newGenerator.name,
        capacity: newGenerator.capacity,
        createdBy: currentUser.id,
      }

      if (newGenerator.location.trim() !== '') {
        generatorData.location = newGenerator.location;
      }

      await apiClient.createGenerator(generatorData)

      toast({
        title: "موفقیت",
        description: "ژنراتور جدید با موفقیت ایجاد شد",
        variant: "success",
      })
      setNewGenerator({ name: "", capacity: 900, location: "" })
      setIsAddGeneratorOpen(false)
      onRefresh?.()
    } catch (error) {
      console.error("Error creating generator:", error)
      toast({
        title: "خطا",
        description: "خطا در ایجاد ژنراتور",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // توابع ویرایش
const handleUpdateTank = async () => {
  if (!editingTank) return

  setLoading(true)
  try {
    const updates: any = {
      name: editingTank.name,
      type: editingTank.type,
      capacity: editingTank.capacity,
      updatedBy: currentUser.id,
    }

    if (editingTank.location && editingTank.location.trim() !== '') {
      updates.location = editingTank.location
    }

    console.log("Updating tank:", { id: editingTank.id, updates })
    await apiClient.updateTank(editingTank.id, updates)

    toast({
      title: "موفقیت",
      description: "مخزن با موفقیت بروزرسانی شد",
      variant: "success",
    })
    setEditingTank(null)
    onRefresh?.()
  } catch (error) {
    console.error("Error updating tank:", error)
    toast({
      title: "خطا",
      description: "خطا در بروزرسانی مخزن",
      variant: "destructive",
    })
  } finally {
    setLoading(false)
  }
}

const handleUpdateGenerator = async () => {
  if (!editingGenerator) return

  setLoading(true)
  try {
    const updates: any = {
      name: editingGenerator.name,
      capacity: editingGenerator.capacity,
      status: editingGenerator.status,
      updatedBy: currentUser.id,
    }

    if (editingGenerator.location && editingGenerator.location.trim() !== '') {
      updates.location = editingGenerator.location
    }

    console.log("Updating generator:", { id: editingGenerator.id, updates })
    await apiClient.updateGenerator(editingGenerator.id, updates)

    toast({
      title: "موفقیت",
      description: "ژنراتور با موفقیت بروزرسانی شد",
      variant: "success",
    })
    setEditingGenerator(null)
    onRefresh?.()
  } catch (error) {
    console.error("Error updating generator:", error)
    toast({
      title: "خطا",
      description: "خطا در بروزرسانی ژنراتور",
      variant: "destructive",
    })
  } finally {
    setLoading(false)
  }
}

// توابع حذف
const handleDeleteTank = async (tankId: string, tankName: string) => {
  setLoading(true)
  try {
    console.log("Deleting tank:", tankId)
    await apiClient.deleteTank(tankId)

    toast({
      title: "موفقیت",
      description: `مخزن "${tankName}" با موفقیت حذف شد`,
      variant: "success",
    })
    onRefresh?.()
  } catch (error) {
    console.error("Error deleting tank:", error)
    toast({
      title: "خطا",
      description: "خطا در حذف مخزن",
      variant: "destructive",
    })
  } finally {
    setLoading(false)
  }
}

const handleDeleteGenerator = async (generatorId: string, generatorName: string) => {
  setLoading(true)
  try {
    console.log("Deleting generator:", generatorId)
    await apiClient.deleteGenerator(generatorId)

    toast({
      title: "موفقیت",
      description: `ژنراتور "${generatorName}" با موفقیت حذف شد`,
      variant: "success",
    })
    onRefresh?.()
  } catch (error) {
    console.error("Error deleting generator:", error)
    toast({
      title: "خطا",
      description: "خطا در حذف ژنراتور",
      variant: "destructive",
    })
  } finally {
    setLoading(false)
  }
}

  

  return (
    <div className="space-y-6" dir="rtl">
      {/* Tanks Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Droplets className="h-5 w-5" />
              مدیریت مخازن
              <Badge variant="outline">{tanks.length} مخزن</Badge>
            </CardTitle>
            <Dialog open={isAddTankOpen} onOpenChange={setIsAddTankOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 ml-2" />
                  افزودن مخزن
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md w-[min(100vw-1rem,28rem)]" dir="rtl">
                <DialogHeader>
                  <DialogTitle>افزودن مخزن جدید</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>نام مخزن *</Label>
                    <Input
                      value={newTank.name}
                      onChange={(e) => setNewTank({ ...newTank, name: e.target.value })}
                      placeholder="مثال: مخزن سوخت شماره ۵"
                    />
                  </div>
                  <div>
                    <Label>نوع مخزن *</Label>
                    <Select
                      value={newTank.type}
                      onValueChange={(value: "fuel" | "water") => setNewTank({ ...newTank, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fuel">سوخت</SelectItem>
                        <SelectItem value="water">آب</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>ظرفیت (لیتر) *</Label>
                    <Input
                      type="number"
                      value={newTank.capacity}
                      onChange={(e) => setNewTank({ ...newTank, capacity: Number.parseInt(e.target.value) || 0 })}
                      placeholder="5000"
                    />
                  </div>
                  <div>
                    <Label>موقعیت (اختیاری)</Label>
                    <Input
                      value={newTank.location}
                      onChange={(e) => setNewTank({ ...newTank, location: e.target.value })}
                      placeholder="مثال: سالن اصلی - قسمت شرقی"
                    />
                  </div>
                  <Button onClick={handleCreateTank} disabled={loading} className="w-full">
                    {loading ? "در حال ایجاد..." : "افزودن مخزن"}
                  </Button>
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
                <TableHead>نوع</TableHead>
                <TableHead>ظرفیت</TableHead>
                <TableHead>موقعیت</TableHead>
                <TableHead>سطح فعلی</TableHead>
                <TableHead>عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tanks.map((tank) => (
                <TableRow key={tank.id}>
                  <TableCell className="font-medium">{tank.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {tank.type === "fuel" ? <Fuel className="h-4 w-4" /> : <Droplets className="h-4 w-4" />}
                      {tank.type === "fuel" ? "سوخت" : "آب"}
                    </div>
                  </TableCell>
                  <TableCell>{tank.capacity.toLocaleString()} لیتر</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {tank.location || "نامشخص"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={tank.currentLevel < 20 ? "destructive" : "secondary"}>{tank.currentLevel}%</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditingTank(tank)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent dir="rtl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>حذف مخزن</AlertDialogTitle>
                            <AlertDialogDescription>
                              آیا مطمئن هستید که می‌خواهید مخزن &quot;{tank.name}&quot; را حذف کنید؟ این عمل قابل بازگشت نیست.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>انصراف</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteTank(tank.id, tank.name)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              حذف
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Generators Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              مدیریت ژنراتورها
              <Badge variant="outline">{generators.length} ژنراتور</Badge>
            </CardTitle>
            <Dialog open={isAddGeneratorOpen} onOpenChange={setIsAddGeneratorOpen}>
              <DialogTrigger asChild>
                <Button >
                  <Plus className="h-4 w-4" />
                  افزودن ژنراتور
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md w-[min(100vw-1rem,28rem)]" dir="rtl">
                <DialogHeader>
                  <DialogTitle>افزودن ژنراتور جدید</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>نام ژنراتور *</Label>
                    <Input
                      value={newGenerator.name}
                      onChange={(e) => setNewGenerator({ ...newGenerator, name: e.target.value })}
                      placeholder="مثال: ژنراتور شماره ۵"
                    />
                  </div>
                  <div>
                    <Label>ظرفیت (لیتر) *</Label>
                    <Input
                      type="number"
                      value={newGenerator.capacity}
                      onChange={(e) =>
                        setNewGenerator({ ...newGenerator, capacity: Number.parseInt(e.target.value) || 900 })
                      }
                      placeholder="900"
                    />
                  </div>
                  <div>
                    <Label>موقعیت (اختیاری)</Label>
                    <Input
                      value={newGenerator.location}
                      onChange={(e) => setNewGenerator({ ...newGenerator, location: e.target.value })}
                      placeholder="مثال: اتاق ژنراتور - طبقه همکف"
                    />
                  </div>
                  <Button onClick={handleCreateGenerator} disabled={loading} className="w-full">
                    {loading ? "در حال ایجاد..." : "افزودن ژنراتور"}
                  </Button>
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
                <TableHead>ظرفیت</TableHead>
                <TableHead>موقعیت</TableHead>
                <TableHead>سطح فعلی</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead>عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {generators.map((generator) => (
                <TableRow key={generator.id}>
                  <TableCell className="font-medium">{generator.name}</TableCell>
                  <TableCell>{generator.capacity.toLocaleString()} لیتر</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {generator.location || "نامشخص"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={generator.currentLevel < 20 ? "destructive" : "secondary"}>
                      {generator.currentLevel}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        generator.status === "running"
                          ? "default"
                          : generator.status === "maintenance"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {generator.status === "running"
                        ? "در حال کار"
                        : generator.status === "maintenance"
                        ? "تعمیر"
                        : "متوقف"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditingGenerator(generator)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent dir="rtl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>حذف ژنراتور</AlertDialogTitle>
                            <AlertDialogDescription>
                              آیا مطمئن هستید که می‌خواهید ژنراتور &quot;{generator.name}&quot; را حذف کنید؟ این عمل قابل بازگشت نیست.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>انصراف</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteGenerator(generator.id, generator.name)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              حذف
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* دیالوگ ویرایش مخزن */}
      <Dialog open={!!editingTank} onOpenChange={(open) => !open && setEditingTank(null)}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>ویرایش مخزن</DialogTitle>
          </DialogHeader>
          {editingTank && (
            <div className="space-y-4">
              <div>
                <Label>نام مخزن *</Label>
                <Input
                  value={editingTank.name}
                  onChange={(e) => setEditingTank({ ...editingTank, name: e.target.value })}
                  placeholder="نام مخزن"
                />
              </div>
              <div>
                <Label>نوع مخزن *</Label>
                <Select
                  value={editingTank.type}
                  onValueChange={(value: "fuel" | "water") => setEditingTank({ ...editingTank, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fuel">سوخت</SelectItem>
                    <SelectItem value="water">آب</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>ظرفیت (لیتر) *</Label>
                <Input
                  type="number"
                  value={editingTank.capacity}
                  onChange={(e) => setEditingTank({ ...editingTank, capacity: Number.parseInt(e.target.value) || 0 })}
                  placeholder="ظرفیت"
                />
              </div>
              <div>
                <Label>موقعیت (اختیاری)</Label>
                <Input
                  value={editingTank.location || ""}
                  onChange={(e) => setEditingTank({ ...editingTank, location: e.target.value })}
                  placeholder="موقعیت"
                />
              </div>
              <Button onClick={handleUpdateTank} disabled={loading} className="w-full">
                {loading ? "در حال بروزرسانی..." : "ذخیره تغییرات"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* دیالوگ ویرایش ژنراتور */}
      <Dialog open={!!editingGenerator} onOpenChange={(open) => !open && setEditingGenerator(null)}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>ویرایش ژنراتور</DialogTitle>
          </DialogHeader>
          {editingGenerator && (
            <div className="space-y-4">
              <div>
                <Label>نام ژنراتور *</Label>
                <Input
                  value={editingGenerator.name}
                  onChange={(e) => setEditingGenerator({ ...editingGenerator, name: e.target.value })}
                  placeholder="نام ژنراتور"
                />
              </div>
              <div>
                <Label>ظرفیت (لیتر) *</Label>
                <Input
                  type="number"
                  value={editingGenerator.capacity}
                  onChange={(e) => setEditingGenerator({ ...editingGenerator, capacity: Number.parseInt(e.target.value) || 900 })}
                  placeholder="ظرفیت"
                />
              </div>
              <div>
                <Label>موقعیت (اختیاری)</Label>
                <Input
                  value={editingGenerator.location || ""}
                  onChange={(e) => setEditingGenerator({ ...editingGenerator, location: e.target.value })}
                  placeholder="موقعیت"
                />
              </div>
              <div>
                <Label>وضعیت *</Label>
                <Select
                  value={editingGenerator.status}
                  onValueChange={(value: "running" | "stopped" | "maintenance") => 
                    setEditingGenerator({ ...editingGenerator, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="running">در حال کار</SelectItem>
                    <SelectItem value="stopped">متوقف</SelectItem>
                    <SelectItem value="maintenance">تعمیر</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleUpdateGenerator} disabled={loading} className="w-full">
                {loading ? "در حال بروزرسانی..." : "ذخیره تغییرات"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}