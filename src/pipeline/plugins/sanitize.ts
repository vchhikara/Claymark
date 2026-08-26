import rehypeSanitize from 'rehype-sanitize'
import { sanitizeSchema } from '../sanitize-schema'
import type { PluggableList } from 'unified'

export const sanitizePreset: PluggableList = [[rehypeSanitize, sanitizeSchema]]
