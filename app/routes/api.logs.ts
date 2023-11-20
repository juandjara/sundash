import type { LoaderArgs } from "@remix-run/node"
import { eventStream } from "remix-utils"
import { emitter } from "~/lib/emitter.server"

export async function loader({ request }: LoaderArgs) {
  return eventStream(request.signal, function setup(send) {
    function handleMessage(message: string) {
      send({ event: "log", data: message })
    }
    emitter.on('log', handleMessage)
    return function cleanup() {
      emitter.off('log', handleMessage)
    }
	})
}
