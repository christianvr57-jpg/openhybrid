import data from './hyrox-template.json'
import { hyroxTemplateSchema } from './schema'

export const hyroxTemplate = hyroxTemplateSchema.parse(data)
