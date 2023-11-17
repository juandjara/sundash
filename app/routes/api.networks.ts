import type { ActionArgs } from "@remix-run/node"
import { createNetwork } from "~/lib/docker.server"

export async function action({ request }: ActionArgs) {
  const json = await request.json()
  await createNetwork(json.network)
  return { msg: `Network ${json.network} created` }
}
