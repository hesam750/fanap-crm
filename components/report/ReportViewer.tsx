// // app/reports/components/ReportViewer.tsx
// 'use client'

// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { Button } from "@/components/ui/button"
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
// import { Badge } from "@/components/ui/badge"
// import { Download, Eye, Share2 } from "lucide-react"

// export interface Report {
//   id: string
//   title: string
//   type: 'summary' | 'analytics' | 'export'
//   generatedAt: Date
//   timeframe: string
//   format: 'json' | 'csv' | 'pdf'
//   status: 'pending' | 'completed' | 'failed'
//   downloadUrl?: string
// }

// interface ReportViewerProps {
//   reports: Report[]
//   onView: (report: Report) => void
//   onDownload: (report: Report) => void
//   onShare: (report: Report) => void
// }

// export function ReportViewer({ reports, onView, onDownload, onShare }: ReportViewerProps) {
//   const formatDate = (date: Date) => {
//     return new Intl.DateTimeFormat('fa-IR', {
//       year: 'numeric',
//       month: 'long',
//       day: 'numeric',
//       hour: '2-digit',
//       minute: '2-digit'
//     }).format(date)
//   }

//   const getStatusVariant = (status: Report['status']) => {
//     switch (status) {
//       case 'completed': return 'success'
//       case 'pending': return 'warning'
//       case 'failed': return 'destructive'
//       default: return 'default'
//     }
//   }

//   const getStatusText = (status: Report['status']) => {
//     switch (status) {
//       case 'completed': return 'تکمیل شده'
//       case 'pending': return 'در حال پردازش'
//       case 'failed': return 'ناموفق'
//       default: return 'نامعلوم'
//     }
//   }

//   return (
//     <Card>
//       <CardHeader>
//         <CardTitle>گزارش‌های اخیر</CardTitle>
//         <CardDescription>
//           لیست گزارش‌های تولید شده در سیستم
//         </CardDescription>
//       </CardHeader>
//       <CardContent>
//         <Table>
//           <TableHeader>
//             <TableRow>
//               <TableHead>عنوان گزارش</TableHead>
//               <TableHead>نوع</TableHead>
//               <TableHead>بازه زمانی</TableHead>
//               <TableHead>تاریخ تولید</TableHead>
//               <TableHead>فرمت</TableHead>
//               <TableHead>وضعیت</TableHead>
//               <TableHead className="text-left">عملیات</TableHead>
//             </TableRow>
//           </TableHeader>
//           <TableBody>
//             {reports.map((report) => (
//               <TableRow key={report.id}>
//                 <TableCell className="font-medium">{report.title}</TableCell>
//                 <TableCell>
//                   <Badge variant="outline">
//                     {report.type === 'summary' && 'خلاصه'}
//                     {report.type === 'analytics' && 'تحلیلی'}
//                     {report.type === 'export' && 'خروجی'}
//                   </Badge>
//                 </TableCell>
//                 <TableCell>{report.timeframe}</TableCell>
//                 <TableCell>{formatDate(report.generatedAt)}</TableCell>
//                 <TableCell>
//                   <Badge variant="secondary">
//                     {report.format.toUpperCase()}
//                   </Badge>
//                 </TableCell>
//                 <TableCell>
//                   <Badge variant={getStatusVariant(report.status)}>
//                     {getStatusText(report.status)}
//                   </Badge>
//                 </TableCell>
//                 <TableCell className="flex gap-2 justify-end">
//                   <Button
//                     variant="ghost"
//                     size="icon"
//                     onClick={() => onView(report)}
//                     disabled={report.status !== 'completed'}
//                   >
//                     <Eye className="h-4 w-4" />
//                   </Button>
//                   <Button
//                     variant="ghost"
//                     size="icon"
//                     onClick={() => onDownload(report)}
//                     disabled={report.status !== 'completed' || !report.downloadUrl}
//                   >
//                     <Download className="h-4 w-4" />
//                   </Button>
//                   <Button
//                     variant="ghost"
//                     size="icon"
//                     onClick={() => onShare(report)}
//                     disabled={report.status !== 'completed'}
//                   >
//                     <Share2 className="h-4 w-4" />
//                   </Button>
//                 </TableCell>
//               </TableRow>
//             ))}
//           </TableBody>
//         </Table>

//         {reports.length === 0 && (
//           <div className="text-center py-8 text-muted-foreground">
//             هیچ گزارشی یافت نشد
//           </div>
//         )}
//       </CardContent>
//     </Card>
//   )
// }