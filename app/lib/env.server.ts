import invariant from 'tiny-invariant'

// folder to store app compose files
const configFolder = process.env.CONFIG_FOLDER || './storage'
invariant(configFolder, 'process.env.CONFIG_FOLDER must be defined')

// docker network used by caddy proxy to read services
const dockerProxyNetwork = process.env.DOCKER_PROXY_NETWORK || 'web'
invariant(dockerProxyNetwork, 'process.env.DOCKER_PROXY_NETWORK must be defined')

// base url for all services proxied by caddy
const baseAppsDomain = process.env.BASE_APPS_DOMAIN || 'example.com'
invariant(baseAppsDomain, 'process.env.BASE_APPS_DOMAIN must be defined')

// line for caddyfile label 'caddy.authorize'
const authorizeConfig = process.env.AUTHORIZE_CONFIG || 'with auth_policy'
invariant(authorizeConfig?.startsWith('with '), 'process.env.AUTHORIZE_CONFIG must be defined and start with "with "')

const env = { configFolder, dockerProxyNetwork, baseAppsDomain, authorizeConfig }
export default env
