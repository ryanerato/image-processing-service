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
    let img = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, autoOrient: true })

    if (width || height) {
      img = img.resize({ width, height, fit: CROP_MODES[crop] })
    }

    if (format || quality) {
      // sharp reports AVIF sources as 'heif', the container format AVIF uses
      const { format: detected } = await img.metadata()
      const sourceFormat = detected === 'heif' ? 'avif' : detected
      // sharp reads some formats it can't write (e.g. SVG); fall back to PNG
      const fmt = format ?? (isOutputFormat(sourceFormat) ? sourceFormat : 'png')
      if (fmt === 'jpeg') {
        // JPEG does not support transparency
        // Set a fill color, else default is black
        // A caller-selectable background color is future work (see README)
        img = img.flatten({ background: '#ffffff' })
      }
      img = img.toFormat(fmt, { quality })
    }

    // Return both the image and metadata about it
    // Await ensures the error is caught and handled here instead of by each caller
    return await img.toBuffer({ resolveWithObject: true })
  } catch (err) {
    throw new UnprocessableImageError(err)
  }
}
