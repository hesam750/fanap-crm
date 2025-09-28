import { NextRequest } from "next/server"
import { addClient, removeClient } from "@/lib/event-bus"

export const runtime = "nodejs" // ensure streaming friendly

export async function GET(_req: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      addClient(controller)
      const init = `event: ping\n` + `data: {"ok":true}\n\n`
      controller.enqueue(new TextEncoder().encode(init))
    },
    cancel(controller) {
      removeClient(controller)
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}