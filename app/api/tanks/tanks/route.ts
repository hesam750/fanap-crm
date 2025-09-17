import { type NextRequest, NextResponse } from "next/server"

export async function GET(_req: NextRequest) {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 })
}

export async function PUT(_req: NextRequest) {
  return NextResponse.json({ error: "Not implemented" }, { status: 501 })
}
