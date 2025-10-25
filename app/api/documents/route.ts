import { NextRequest, NextResponse } from "next/server"
import { createWriteStream, existsSync, mkdirSync, readdirSync, statSync } from "fs"
import { join, extname } from "path"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function ensureUploadDir(): string {
  const uploadDir = join(process.cwd(), "public", "uploads", "documents")
  if (!existsSync(uploadDir)) {
    mkdirSync(uploadDir, { recursive: true })
  }
  return uploadDir
}

function guessContentType(filename: string): string | undefined {
  const ext = extname(filename).toLowerCase()
  switch (ext) {
    case ".pdf": return "application/pdf"
    case ".doc": return "application/msword"
    case ".docx": return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    case ".xls": return "application/vnd.ms-excel"
    case ".xlsx": return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    case ".csv": return "text/csv"
    case ".txt": return "text/plain"
    case ".png": return "image/png"
    case ".jpg":
    case ".jpeg": return "image/jpeg"
    default: return undefined
  }
}

export async function GET(request: NextRequest) {
  try {
    const uploadDir = ensureUploadDir()
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get("search") || "").trim().toLowerCase()

    if (!existsSync(uploadDir)) {
      return NextResponse.json({ documents: [] })
    }

    const files = readdirSync(uploadDir)
    const docs = files
      .map((fname) => {
        const p = join(uploadDir, fname)
        const s = statSync(p)
        if (!s.isFile()) return null
        const url = `/uploads/documents/${fname}`
        return {
          id: fname,
          name: fname,
          url,
          size: s.size,
          contentType: guessContentType(fname),
          uploadedAt: new Date(s.mtime),
        }
      })
      .filter(Boolean)
      .filter((d) => (q ? (d!.name.toLowerCase().includes(q) || (d!.contentType || "").toLowerCase().includes(q)) : true))
      .sort((a: any, b: any) => (new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()))

    return NextResponse.json({ documents: docs })
  } catch (error) {
    console.error("List documents error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // در حالت توسعه احراز هویت را ساده می‌کنیم؛ برای تولید سخت‌گیرانه‌تر کنید
  // می‌توانید validateAuth را اضافه کنید مشابه سایر مسیرها
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ error: "فایلی ارسال نشده است" }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const uploadDir = ensureUploadDir()
    const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9_.-]/g, "_")}`
    const filePath = join(uploadDir, safeName)

    await new Promise<void>((resolve, reject) => {
      const stream = createWriteStream(filePath)
      stream.on("error", reject)
      stream.on("finish", resolve)
      stream.write(buffer)
      stream.end()
    })

    const publicUrl = `/uploads/documents/${safeName}`

    const doc = {
      id: safeName,
      name: file.name,
      url: publicUrl,
      size: buffer.length,
      contentType: file.type || guessContentType(safeName),
      uploadedAt: new Date().toISOString(),
    }

    return NextResponse.json({ document: doc }, { status: 201 })
  } catch (error) {
    console.error("Upload document error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}