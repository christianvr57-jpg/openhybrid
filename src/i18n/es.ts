export const es = {
  'app.name': 'openHybrid',
  'app.tagline': 'Planes de entrenamiento de HYROX y running, gratis y abiertos.',
  'app.status': 'En construcción. Pronto podrás crear aquí tu plan.',
  'language.label': 'Idioma',
  'language.es': 'Español',
  'language.en': 'English',
  'legal.disclaimer':
    'openHybrid es un proyecto independiente, no afiliado, respaldado ni patrocinado por HYROX ni por Upsolut Sports GmbH.',
} as const

export type MessageKey = keyof typeof es
export type Messages = Record<MessageKey, string>
