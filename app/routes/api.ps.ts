import type { DockerComposeConfigResult, TypedDockerComposeResult} from 'docker-compose'
import { v2 as compose } from 'docker-compose'
import { exec } from 'child_process'
import { json } from '@remix-run/node'

type Config = TypedDockerComposeResult<DockerComposeConfigResult>

// const path = './storage/media'
const path = './'
export async function loader() {
  try {
    return new Promise((resolve, reject) => {
      exec(`docker compose --project-directory ${path} ps --format json`, (err, stdout, stderr) => {
        if (err) {
          const msg = `${err.stack}`
          reject(new Error(msg))
        }
        resolve(JSON.parse(stdout))
      })
    })
    // const path = './'
    // const res = await compose.ps({
    //   cwd: path,
    //   commandOptions: ['--all'],
    // })
  
    // if (res.exitCode !== 0) {
    //   return new Response(String(res.out), { status: 500 })
    // }
  
    // const config = {
    //   ...res.data,
    //   path,
    // } as typeof res.data & { path: string; }
    // return config
  } catch (e: unknown) {
    console.error(e)
    const errResult = e as Config
    const message = `Error code ${errResult.exitCode}: ${errResult.err}`
    return new Response(message, { status: 500 })
  }
}

function parsePSOutput(out: string) {
  let isQuiet = false
  if (options?.commandOptions) {
    isQuiet =
      options.commandOptions.includes('-q') ||
      options.commandOptions.includes('--quiet') ||
      options.commandOptions.includes('--services')
  }
  const services = output
    .split(`\n`)
    .filter(nonEmptyString)
    .filter((_, index) => isQuiet || index >= 1)
    .map((line) => {
      let nameFragment = line
      let commandFragment = ''
      let imageFragment = ''
      let serviceFragment = ''
      let createdFragment = ''
      let stateFragment = ''
      let untypedPortsFragment = ''
      if (!isQuiet) {
        ;[
          nameFragment,
          imageFragment,
          commandFragment,
          serviceFragment,
          createdFragment,
          stateFragment,
          untypedPortsFragment
        ] = line.split(/\s{3,}/)
      }
      return {
        name: nameFragment.trim(),
        command: commandFragment.trim(),
        state: stateFragment.trim(),
        ports: mapPorts(untypedPortsFragment.trim())
      }
    })
  return { services }
}
