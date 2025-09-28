import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/database"
import { createWriteStream, existsSync, mkdirSync } from "fs"
import { join } from "path"

export const runtime = "nodejs"

export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const uploadDir = join(process.cwd(), "public", "uploads", "avatars")
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true })
    }

    const filenameSafe = `${id}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9_.-]/g, "_")}`
    const filePath = join(uploadDir, filenameSafe)

    await new Promise<void>((resolve, reject) => {
      const stream = createWriteStream(filePath)
      stream.on("error", reject)
      stream.on("finish", resolve)
      stream.write(buffer)
      stream.end()
    })

    const publicUrl = `/uploads/avatars/${filenameSafe}`

    const updatedUser = await db.updateUser(id, { avatarUrl: publicUrl })

    return NextResponse.json({ user: updatedUser, avatarUrl: publicUrl })
  } catch (error) {
    console.error("Avatar upload error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}