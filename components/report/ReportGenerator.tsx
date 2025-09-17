// // app/reports/components/ReportGenerator.tsx
// 'use client'

// import { useState } from 'react'
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { Button } from "@/components/ui/button"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"

// import { Download, Filter, BarChart3 } from "lucide-react"

// interface ReportGeneratorProps {
//   onGenerate: (params: ReportParams) => void
//   isLoading?: boolean
// }

// export interface ReportParams {
//   type: 'summary' | 'analytics' | 'export'
//   entityType: 'tank' | 'generator' | 'all'
//   timeframe: '24h' | '7d' | '30d' | 'custom'
//   startDate?: Date
//   endDate?: Date
//   format: 'json' | 'csv' | 'pdf'
// }

// export function ReportGenerator({ onGenerate, isLoading = false }: ReportGeneratorProps) {
//   const [params, setParams] = useState<ReportParams>({
//     type: 'summary',
//     entityType: 'all',
//     timeframe: '24h',
//     format: 'json'
//   })

//   const handleGenerate = () => {
//     onGenerate(params)
//   }

//   return (
//     <Card>
//       <CardHeader>
//         <CardTitle className="flex items-center gap-2">
//           <BarChart3 className="h-5 w-5" />
//           تولید گزارش
//         </CardTitle>
//         <CardDescription>
//           تنظیم پارامترهای گزارش مورد نظر
//         </CardDescription>
//       </CardHeader>
//       <CardContent className="space-y-4">
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//           <div className="space-y-2">
//             <Label htmlFor="report-type">نوع گزارش</Label>
//             <Select
//               value={params.type}
//               onValueChange={(value: ReportParams['type']) => 
//                 setParams({ ...params, type: value })
//               }
//             >
//               <SelectTrigger id="report-type">
//                 <SelectValue placeholder="انتخاب نوع گزارش" />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="summary">خلاصه وضعیت</SelectItem>
//                 <SelectItem value="analytics">تحلیل و آمار</SelectItem>
//                 <SelectItem value="export">خروجی داده</SelectItem>
//               </SelectContent>
//             </Select>
//           </div>

//           <div className="space-y-2">
//             <Label htmlFor="entity-type">نوع موجودیت</Label>
//             <Select
//               value={params.entityType}
//               onValueChange={(value: ReportParams['entityType']) => 
//                 setParams({ ...params, entityType: value })
//               }
//             >
//               <SelectTrigger id="entity-type">
//                 <SelectValue placeholder="انتخاب نوع موجودیت" />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="all">همه</SelectItem>
//                 <SelectItem value="tank">مخازن</SelectItem>
//                 <SelectItem value="generator">ژنراتورها</SelectItem>
//               </SelectContent>
//             </Select>
//           </div>

//           <div className="space-y-2">
//             <Label htmlFor="timeframe">بازه زمانی</Label>
//             <Select
//               value={params.timeframe}
//               onValueChange={(value: ReportParams['timeframe']) => 
//                 setParams({ ...params, timeframe: value })
//               }
//             >
//               <SelectTrigger id="timeframe">
//                 <SelectValue placeholder="انتخاب بازه زمانی" />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="24h">۲۴ ساعت گذشته</SelectItem>
//                 <SelectItem value="7d">۷ روز گذشته</SelectItem>
//                 <SelectItem value="30d">۳۰ روز گذشته</SelectItem>
//                 <SelectItem value="custom">سفارشی</SelectItem>
//               </SelectContent>
//             </Select>
//           </div>

//           <div className="space-y-2">
//             <Label htmlFor="format">فرمت خروجی</Label>
//             <Select
//               value={params.format}
//               onValueChange={(value: ReportParams['format']) => 
//                 setParams({ ...params, format: value })
//               }
//             >
//               <SelectTrigger id="format">
//                 <SelectValue placeholder="انتخاب فرمت" />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="json">JSON</SelectItem>
//                 <SelectItem value="csv">CSV</SelectItem>
//                 <SelectItem value="pdf">PDF</SelectItem>
//               </SelectContent>
//             </Select>
//           </div>
//         </div>

//         {params.timeframe === 'custom' && (
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
//             <div className="space-y-2">
//               <Label htmlFor="start-date">تاریخ شروع</Label>
//               <DatePicker
//                 selected={params.startDate}
//                 onSelect={(date) => setParams({ ...params, startDate: date })}
//               />
//             </div>
//             <div className="space-y-2">
//               <Label htmlFor="end-date">تاریخ پایان</Label>
//               <DatePicker
//                 selected={params.endDate}
//                 onSelect={(date) => setParams({ ...params, endDate: date })}
//               />
//             </div>
//           </div>
//         )}

//         <div className="flex justify-end gap-2 pt-4">
//           <Button variant="outline" className="flex items-center gap-2">
//             <Filter className="h-4 w-4" />
//             فیلترها
//           </Button>
//           <Button 
//             onClick={handleGenerate} 
//             disabled={isLoading}
//             className="flex items-center gap-2"
//           >
//             {isLoading ? (
//               <>در حال تولید...</>
//             ) : (
//               <>
//                 <Download className="h-4 w-4" />
//                 تولید گزارش
//               </>
//             )}
//           </Button>
//         </div>
//       </CardContent>
//     </Card>
//   )
// }