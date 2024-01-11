import type { LoaderArgs } from "@remix-run/node"
import { eventStream } from "remix-utils"
import { emitter } from "~/lib/emitter.server"

export async function loader({ request }: LoaderArgs) {
  const id = new URL(request.url).searchParams.get('id')
  return eventStream(request.signal, function setup(send) {
    function handleMessage(message: string) {
      send({ event: `log:${id}`, data: message })
    }
    emitter.on(`log:${id}`, handleMessage)
    return function cleanup() {
      emitter.off(`log:${id}`, handleMessage)
    }
	})
}
