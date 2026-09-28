import { z } from 'zod'

export const OUTPUT_FORMATS = ['jpeg', 'png', 'webp', 'avif', 'gif'] as const

// Cloudinary-style crop names → sharp's fit values (sharp's 'fill' means stretch, not crop)
export const CROP_MODES = {
  scale: 'fill',
  fit: 'inside',
  fill: 'cover',
} as const

type CropMode = keyof typeof CROP_MODES

// Strict, so unknown or misspelled params are rejected rather than ignored
const ImageQuerySchema = z.strictObject({
  // Only http(s) URLs; rejects file:, data:, etc.
  url: z.url({ protocol: /^https?$/ }),
  width: z.coerce.number().int().min(1).max(4096).optional(),
  height: z.coerce.number().int().min(1).max(4096).optional(),
  // Accept the common `jpg` spelling as an alias for `jpeg`
  format: z.enum([...OUTPUT_FORMATS, 'jpg']).transform((f) => (f === 'jpg' ? 'jpeg' : f)).optional(),
  quality: z.coerce.number().int().min(1).max(100).optional(),
  crop: z.enum(Object.keys(CROP_MODES) as CropMode[]).default('fit'),
  // Cache busting only: changes the URL (the cache key) without affecting processing
  v: z.string().max(64).optional(),
})

export default ImageQuerySchema
