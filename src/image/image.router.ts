import express, { type Request, type Response, type NextFunction } from 'express'

import ImageQuerySchema from './image.schema.ts'
import { transformImage } from './image.transforms.ts'
import parseQuery from '../util/parseQuery.ts'

// sharp reports AVIF output as 'heif'; other formats map directly to image/<format>
const contentType = (format: string) => (format === 'heif' ? 'image/avif' : format)

const router = express.Router()

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    const query = parseQuery(req, ImageQuerySchema)
    const response = await fetch(query.url)
    const image = await response.arrayBuffer()
    const { data, info } = await transformImage(image, query)
    return res.status(200).type(contentType(info.format)).send(data)
})

export default router
