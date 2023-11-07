import invariant from 'tiny-invariant'

const configFolder = process.env.CONFIG_FOLDER || './storage'
invariant(configFolder, 'process.env.CONFIG_FOLDER must be defined')

const env = { configFolder }
export default env
