import { createNetwork } from "~/lib/docker.server"
import env from "~/lib/env.server"

export async function action() {
  await createNetwork(env.dockerProxyNetwork)
  return { msg: `Network ${env.dockerProxyNetwork} created` }
}
