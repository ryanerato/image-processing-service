import express, { type Request, type Response } from 'express'

import ImageQuerySchema from './image.schema.ts'
import { transformImage } from './image.transforms.ts'
import parseQuery from '../util/parseQuery.ts'
import { fetchContent } from '../util/fetchContent.ts'

// sharp reports AVIF output as 'heif'; other formats map directly to image/<format>
const contentType = (format: string) => (format === 'heif' ? 'image/avif' : format)

const router = express.Router()

router.get('/', async (req: Request, res: Response) => {
  const query = parseQuery(req, ImageQuerySchema)
  const image = await fetchContent(query.url)
  const { data, info } = await transformImage(image, query)
  return res.setHeader('Cache-Control', 'public, max-age=604800')
            .status(200).type(contentType(info.format)).send(data)
})

export default router
