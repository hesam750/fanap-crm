import { type NextRequest, NextResponse } from "next/server"

export async function GET(_req: NextRequest) {
  // Placeholder endpoint to satisfy module export during build
  return NextResponse.json({ error: "Not implemented" }, { status: 501 })
}
