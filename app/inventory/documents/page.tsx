"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { apiClient } from "@/lib/api-client"
import { useAuth } from "@/hooks/useAuth"
import type { Document } from "@/lib/types"
import { Search, RefreshCw, Upload, Download } from "lucide-react"

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function InventoryManagementDocumentsPage() {
  const { currentUser } = useAuth()
  const { toast } = useToast()

  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState("")

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const canUpload = useMemo(() => {
    const role = currentUser?.role
    return !!role && ["root","manager"].includes(role)
  }, [currentUser])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await apiClient.getDocuments()
      setDocuments(res.documents)
    } catch (e) {
      toast({ title: "خطا", description: "دریافت لیست اسناد انجام نشد", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const filtered = useMemo(() => {
    let arr = [...documents]
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      arr = arr.filter(d => (
        (d.name || "").toLowerCase().includes(q) ||
        (d.contentType || "").toLowerCase().includes(q)
      ))
    }
    arr.sort((a, b) => new Date(b.uploadedAt as any).getTime() - new Date(a.uploadedAt as any).getTime())
    return arr
  }, [documents, query])

  const handleFileSelectClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
      fileInputRef.current.click()
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    try {
      const { document } = await apiClient.uploadDocument(file)
      setDocuments(prev => [document, ...prev])
      toast({ title: "بارگذاری شد", description: `سند '${document.name}' با موفقیت ذخیره شد` })
    } catch (err) {
      toast({ title: "خطا", description: "بارگذاری سند انجام نشد (احراز هویت/دسترسی را بررسی کنید)", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>اسناد (مدیریت موجودی)</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="جستجو نام/نوع"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button variant="outline" onClick={loadData} disabled={loading}>
              <RefreshCw className="h-4 w-4 ml-1" /> بروزرسانی
            </Button>
            {canUpload && (
              <Button onClick={handleFileSelectClick} disabled={loading}>
                <Upload className="h-4 w-4 ml-1" /> بارگذاری سند
              </Button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>تاریخ بارگذاری</TableHead>
                <TableHead>نام</TableHead>
                <TableHead>اندازه</TableHead>
                <TableHead>نوع</TableHead>
                <TableHead>دانلود</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(doc => (
                <TableRow key={doc.id}>
                  <TableCell>{new Date(doc.uploadedAt as any).toLocaleString("fa-IR")}</TableCell>
                  <TableCell className="font-medium truncate max-w-[300px]" title={doc.name}>{doc.name}</TableCell>
                  <TableCell>{formatBytes(Number(doc.size))}</TableCell>
                  <TableCell>{doc.contentType || "نامشخص"}</TableCell>
                  <TableCell>
                    <a href={doc.url} target="_blank" rel="noreferrer" className="inline-flex items-center text-primary hover:underline">
                      <Download className="h-4 w-4 ml-1" /> دانلود
                    </a>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">موردی یافت نشد</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}