import data from './hyrox-divisions.json'
import { hyroxDivisionsSchema } from './schema'

export const hyroxDivisions = hyroxDivisionsSchema.parse(data)
