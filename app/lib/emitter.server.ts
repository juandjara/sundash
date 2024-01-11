import { EventEmitter } from "node:events"
import { remember } from '@epic-web/remember'

export let emitter = remember('emitter', () => new EventEmitter())
