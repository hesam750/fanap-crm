import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"
import { validateAuth } from "@/lib/auth-middleware"

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const user = await validateAuth(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await ctx.params
    const generator = await db.getGeneratorById(id)
    if (!generator) {
      return NextResponse.json({ error: "Generator not found" }, { status: 404 })
    }
    
    const history = await db.getGeneratorHistory(id, 168)
    
    if (history.length < 10) {
      return NextResponse.json({
        predictedHours: null,
        recommendation: "داده کافی برای پیش‌بینی وجود ندارد",
        confidence: "low"
      })
    }
    
    // بقیه کد بدون تغییر...
    const latest = history[history.length - 1].level
    const oldest = history[0].level
    const totalConsumption = oldest - latest
    const totalHours = history.length
    const hourlyConsumption = totalConsumption > 0 ? totalConsumption / totalHours : 0
    
    let predictedHours: number | null = null
    let recommendation = "سطح سوخت ثابت است"
    
    if (hourlyConsumption > 0) {
      predictedHours = latest / hourlyConsumption
      
      if (predictedHours < 24) {
        recommendation = "سوخت ژنراتور در حال اتمام است. لطفاً فوراً سوخت‌گیری کنید."
      } else if (predictedHours < 72) {
        recommendation = "سوخت ژنراتور کم است. برنامه‌ریزی برای سوخت‌گیری انجام دهید."
      } else {
        recommendation = "سوخت ژنراتور در سطح مطلوبی قرار دارد."
      }
    }
    
    return NextResponse.json({
      predictedHours: predictedHours ? parseFloat(predictedHours.toFixed(1)) : null,
      predictedDays: predictedHours ? parseFloat((predictedHours / 24).toFixed(1)) : null,
      hourlyConsumption: parseFloat(hourlyConsumption.toFixed(3)),
      currentLevel: latest,
      recommendation,
      confidence: history.length > 48 ? "high" : "medium"
    })
    
  } catch (error) {
    console.error("Get generator prediction error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}