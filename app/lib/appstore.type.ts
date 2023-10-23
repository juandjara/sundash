export enum TemplateType {
  CONTAINER = 1,
  SWARM = 2,
  COMPOSE = 3,
}

export type DockerEnv = {
  name: string
  label: string
  description?: string
  default?: string
  preset?: boolean // if set to true, the env var should be hidden from the user
  select?: EnvSelectOption[] // if set, the env var should be a select
}

type EnvSelectOption = {
  text: string
  value: string
  default?: boolean
}

export type DockerVolume = {
  container: string
  bind?: string
  readonly?: boolean
}

type DockerLabel = {
  name: string
  value: string
}

export type Template = {
  version: string
  type: TemplateType
  title: string
  description: string
  image: string // URL, docker image
  'administrator-only'?: boolean
  name?: string
  logo?: string // URL, png file
  registry?: string // docker registry
  command?: string // docker run command
  env?: DockerEnv[]
  netowrk?: 'host' | string // docker network
  volumes?: DockerVolume[]
  ports?: string[]
  labels?: DockerLabel[]
  privileged?: boolean
  interactive?: boolean
  restart_policy?: 'always' | 'unless-stopped' | 'on-failure' | 'no'
  hostname?: string
  note?: string
  platform?: 'linux' | 'windows'
  categories?: string[]
  repository?: {
    url: string
    stackfile: string
  }
}
