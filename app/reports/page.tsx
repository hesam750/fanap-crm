// app/reports/page.tsx
import { Suspense } from "react"

import { db } from "@/lib/database"
import { ReportSkeleton } from "@/components/report/reports-panel"
import { ReportsPanel } from "@/components/report/reports-panel"

export default async function ReportsPage() {
  try {
    // دریافت داده‌ها از دیتابیس
    const [tanks, generators, alerts] = await Promise.all([
      db.getTanks(),
      db.getGenerators(),
      db.getAlerts()
    ])

    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">سیستم گزارش‌گیری</h1>
            <p className="text-muted-foreground">
              مشاهده و تحلیل جامع داده‌های سیستم
            </p>
          </div>
        </div>

        <Suspense fallback={<ReportSkeleton />}>
          <ReportsPanel 
            tanks={tanks} 
            generators={generators} 
            alerts={alerts} 
          />
        </Suspense>
      </div>
    )
  } catch (error) {
    console.error("Error loading reports page:", error)
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-destructive">خطا در بارگذاری داده‌ها</h2>
          <p className="text-muted-foreground mt-2">
            لطفاً اتصال به دیتابیس را بررسی کنید و دوباره تلاش نمایید.
          </p>
        </div>
      </div>
    )
  }
}