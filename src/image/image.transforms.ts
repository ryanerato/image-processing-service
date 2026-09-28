import { z } from 'zod'
import sharp, { type OutputInfo } from 'sharp'

import ImageQuerySchema, { CROP_MODES, OUTPUT_FORMATS } from './image.schema.ts'
import { UnprocessableImageError } from '../errors.ts'
import { config } from '../config.ts'

export type ImageOptions = Omit<z.infer<typeof ImageQuerySchema>, 'url'>

export type TransformOutput = {
  data: Buffer,
  info: OutputInfo
}

const isOutputFormat = (format: string | undefined): format is (typeof OUTPUT_FORMATS)[number] =>
  (OUTPUT_FORMATS as readonly (string | undefined)[]).includes(format)

export async function transformImage(input: Buffer, options: ImageOptions): Promise<TransformOutput> {
  const { width, height, crop, format, quality } = options

  try {
    const sharpOptions = {
      // Rejects images whose decoded size would exhaust memory (decompression bombs)
      limitInputPixels: config.SOURCE_MAX_PIXELS,
      // If EXIF data is present, ensure picture is in correct orientation
      autoOrient: true
    }
    let img = sharp(input, sharpOptions)

    if (width || height) {
      img = img.resize({ width, height, fit: CROP_MODES[crop] })
    }

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
    // Lower AVIF encoder effort: the default takes seconds per image
    img = img.toFormat(fmt, { quality, ...(fmt === 'avif' ? { effort: 2 } : {}) })

    // Return both the image and metadata about it
    // Await ensures the error is caught and handled here instead of by each caller
    return await img.toBuffer({ resolveWithObject: true })
  } catch (err) {
    throw new UnprocessableImageError(err)
  }
}
