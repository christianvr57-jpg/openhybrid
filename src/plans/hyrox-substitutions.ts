import data from './hyrox-substitutions.json'
import { hyroxSubstitutionsSchema } from './schema'

export const hyroxSubstitutions = hyroxSubstitutionsSchema.parse(data)
