import { z } from 'zod'
import sharp, { type OutputInfo } from 'sharp'

import ImageQuerySchema, { CROP_MODES, OUTPUT_FORMATS } from './image.schema.ts'
import { UnprocessableImageError } from '../errors.ts'

export type ImageOptions = Omit<z.infer<typeof ImageQuerySchema>, 'url'>

export type TransformOutput = {
  data: Buffer,
  info: OutputInfo
}

const MAX_INPUT_PIXELS = 8192 * 8192

const isOutputFormat = (format: string | undefined): format is (typeof OUTPUT_FORMATS)[number] =>
  (OUTPUT_FORMATS as readonly (string | undefined)[]).includes(format)

export async function transformImage(input: Buffer, options: ImageOptions): Promise<TransformOutput> {
  const { width, height, crop, format, quality } = options

  try {
    let img = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS })

    if (width || height) {
      img = img.resize({ width, height, fit: CROP_MODES[crop] })
    }

    if (format || quality) {
      // sharp reports AVIF sources as 'heif', the container format AVIF uses
      const { format: detected } = await img.metadata()
      const sourceFormat = detected === 'heif' ? 'avif' : detected
      // sharp reads some formats it can't write (e.g. SVG); fall back to PNG
      const fmt = format ?? (isOutputFormat(sourceFormat) ? sourceFormat : 'png')
      img = img.toFormat(fmt, { quality })
    }

    return await img.toBuffer({ resolveWithObject: true })
  } catch (err) {
    throw new UnprocessableImageError(err)
  }
}
