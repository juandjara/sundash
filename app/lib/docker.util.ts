import type Dockerode from "dockerode"
import type { ContainerState } from "./docker.server"

export enum SundashLabels {
  LOGO = 'dev.sundash.logo',
  TITLE = 'dev.sundash.title',
  MAIN = 'dev.sundash.is_main_container',
}

export function defaultLogo(service: string) {
  return `https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/${service}.png`
}

export function getLogoFromContainer(container: Dockerode.ContainerInfo) {
  const labels = container?.Labels || {}
  const service = labels['com.docker.compose.service']
  return labels[SundashLabels.LOGO] || defaultLogo(service)
}

export function getTitleFromContainer(container: Dockerode.ContainerInfo) {
  const labels = container?.Labels || {}
  const service = labels['com.docker.compose.service']
  return labels[SundashLabels.TITLE] || service || container.Names[0]
}

export function getStateColor(state: ContainerState) {
  if (!state || state === 'created') {
    return 'bg-zinc-300'
  }
  if (state === 'exited') {
    return 'bg-red-100'
  }
  if (state === 'running') {
    return 'bg-green-500'
  }
  if (state === 'paused') {
    return 'bg-green-100'
  }
  if (state === 'restarting') {
    return 'bg-yellow-500'
  }
  return 'bg-red-500'
}

