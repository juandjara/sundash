import type Dockerode from "dockerode"
import type { ContainerState } from "./docker.server"

export enum SundashLabels {
  LOGO = 'dev.sundash.logo',
  TITLE = 'dev.sundash.title',
  ENABLE = 'dev.sundash.enable',
}

export enum ComposeLabels {
  PROJECT = 'com.docker.compose.project',
  PROJECT_DIR = 'com.docker.compose.project.working_dir',
  PROJECT_CONFIG_FILES = 'com.docker.compose.project.config_files',
  PROJECT_ENV_FILES = 'com.docker.compose.project.environment_file',
  SERVICE = 'com.docker.compose.service',
}

export enum CaddyLabels {
  CADDY_URL = 'caddy',
  CADDY_PROXY_PORT = 'caddy.reverse_proxy',
  CADDY_AUTH = 'caddy.authorize',
}

export function defaultLogo(service: string) {
  return `https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/${service}.png`
}

export function getLogoFromContainer(container: Dockerode.ContainerInfo) {
  const labels = container?.Labels || {}
  const service = labels[ComposeLabels.SERVICE]
  return labels[SundashLabels.LOGO] || defaultLogo(service)
}

export function getTitleFromContainer(container: Dockerode.ContainerInfo) {
  const labels = container?.Labels || {}
  const service = labels[ComposeLabels.SERVICE]
  return labels[SundashLabels.TITLE] || service || container.Names[0]
}

export function getStateColor(state: ContainerState) {
  if (state === 'created') {
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
  return 'bg-transparent'
}

