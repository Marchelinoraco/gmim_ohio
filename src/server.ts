import handler from '@tanstack/react-start/server-entry'
import { paraglideMiddleware } from '@/paraglide/server'

export default {
  fetch(req: Request): Promise<Response> {
    // TanStack Router's `rewrite` option de-localizes URLs itself, so pass the
    // original request through to avoid redirect loops.
    return paraglideMiddleware(req, () => handler.fetch(req))
  },
}
