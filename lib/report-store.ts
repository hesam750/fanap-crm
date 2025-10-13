

import { randomUUID } from "crypto"

type ReportContent = string | Uint8Array | Buffer

export interface StoredReport {
  id: string
  content: Uint8Array
  contentType: string
  filename: string
  createdAt: number
}

// Simple in-memory store for generated reports
const store = new Map<string, StoredReport>()

export function saveReport(input: { content: ReportContent; contentType: string; filename: string }): string {
  const id = typeof randomUUID === "function" ? randomUUID() : Math.random().toString(36).slice(2)
  const content =
    typeof input.content === "string"
      ? new TextEncoder().encode(input.content)
      : input.content instanceof Uint8Array
        ? input.content
        : new Uint8Array(input.content)
  const record: StoredReport = {
    id,
    content,
    contentType: input.contentType,
    filename: input.filename,
    createdAt: Date.now(),
  }
  store.set(id, record)
  return id
}

export function getReport(id: string): StoredReport | undefined {
  return store.get(id)
}

export function removeReport(id: string): boolean {
  return store.delete(id)
}

// Optional maintenance: purge reports older than given ttl (ms)
export function purgeExpired(ttlMs: number): number {
  const now = Date.now()
  let removed = 0
  for (const [id, rec] of store.entries()) {
    if (now - rec.createdAt > ttlMs) {
      store.delete(id)
      removed++
    }
  }
  return removed
}