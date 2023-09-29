import { v2 as compose } from 'docker-compose'

export async function loader() {
  const res = await compose.config({
    cwd: './storage/media',
  })

  if (res.exitCode !== 0) {
    return new Response(res.out, { status: 500 })
  }

  return res.data.config
}
