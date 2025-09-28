// Simple SSE event bus to broadcast realtime updates across clients

const clients = new Set<ReadableStreamDefaultController>()
const encoder = new TextEncoder()

export function addClient(controller: ReadableStreamDefaultController) {
  clients.add(controller)
}

export function removeClient(controller: ReadableStreamDefaultController) {
  clients.delete(controller)
}

export function broadcast(event: string, data: unknown) {
  const payload = `event: ${event}\n` + `data: ${JSON.stringify(data)}\n\n`
  const chunk = encoder.encode(payload)
  for (const client of clients) {
    try {
      client.enqueue(chunk)
    } catch (e) {
      // If enqueue fails, remove client
      clients.delete(client)
    }
  }
}