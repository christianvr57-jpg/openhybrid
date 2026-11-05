import data from './running-template.json'
import { runningTemplateSchema } from './schema'

export const runningTemplate = runningTemplateSchema.parse(data)
