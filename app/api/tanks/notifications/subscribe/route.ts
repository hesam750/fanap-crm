import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { subscription, userId } = await request.json()

    // Store subscription in database
    // This would typically save to your database
    console.log("[v0] Push subscription received for user:", userId)
    console.log("[v0] Subscription details:", subscription)

    // In a real implementation, you would:
    // 1. Validate the subscription
    // 2. Store it in your database linked to the user
    // 3. Use it to send push notifications via web-push library

    return NextResponse.json({
      success: true,
      message: "Subscription saved successfully",
    })
  } catch (error) {
    console.error("[v0] Error saving push subscription:", error)
    return NextResponse.json({ success: false, error: "Failed to save subscription" }, { status: 500 })
  }
}
