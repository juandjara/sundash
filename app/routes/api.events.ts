import type { LoaderArgs } from "@remix-run/node"
import { eventStream } from "remix-utils"
import { emitter } from "~/lib/emitter.server"

export async function loader({ request }: LoaderArgs) {
  return eventStream(request.signal, function setup(send) {
    function handleMessage(message: string) {
      send({ event: "message", data: message })
    }
    emitter.on('message', handleMessage)
    return function cleanup() {
      emitter.off('message', handleMessage)
    }
	})
}
