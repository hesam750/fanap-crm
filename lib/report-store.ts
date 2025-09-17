

import crypto from "crypto"

export type ReportContent = string | Buffer

export interface StoredReport {
  id: string
  content: ReportContent
  contentType: string
  filename: string
  createdAt: number
  expiresAt: number
}

const STORE = new Map<string, StoredReport>()
const DEFAULT_TTL_MS = 10 * 60 * 1000 // 10 دقیقه

export function saveReport(input: {
  content: ReportContent
  contentType: string
  filename: string
  ttlMs?: number
}): string {
  const id = crypto.randomUUID()
  const now = Date.now()
  const expiresAt = now + (input.ttlMs ?? DEFAULT_TTL_MS)
  const report: StoredReport = {
    id,
    content: input.content,
    contentType: input.contentType,
    filename: input.filename,
    createdAt: now,
    expiresAt,
  }
  STORE.set(id, report)
  return id
}

export function getReport(id: string): StoredReport | null {
  cleanup()
  const report = STORE.get(id) || null
  if (!report) return null
  if (report.expiresAt < Date.now()) {
    STORE.delete(id)
    return null
  }
  return report
}

export function deleteReport(id: string): void {
  STORE.delete(id)
}

function cleanup(): void {
  const now = Date.now()
  for (const [id, rep] of STORE.entries()) {
    if (rep.expiresAt < now) STORE.delete(id)
  }
}