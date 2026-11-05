import data from './hyrox-splits.json'
import { hyroxSplitsSchema } from './schema'

export const hyroxSplits = hyroxSplitsSchema.parse(data)
