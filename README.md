# Image Processing Service

A Cloudinary-style HTTP service that fetches an image from a URL, transforms it, and returns the result.

## Requirements

- Node.js 24+

## Quick start

```sh
npm install
npm start            # http://localhost:3000 (override with PORT)
```

Then open this in a browser:

```
http://localhost:3000/process?url=https://picsum.photos/id/237/1200/800&width=400&format=webp
```

## API

### `GET /process`

Returns the transformed image bytes with the matching `Content-Type`.

`/image` is an alias for `/process`, following Cloudinary's convention of naming routes by asset type; `/process` matches the challenge's examples.

| Param | Type | Default | Notes |
|---|---|---|---|
| `url` | http(s) URL | required | Source image. URL-encode it if it has its own query string. |
| `width` | integer 1–4096 | source width | |
| `height` | integer 1–4096 | source height | |
| `crop` | `fit` \| `fill` \| `scale` | `fit` | Only applies when both `width` and `height` are set. |
| `format` | `jpeg` \| `png` \| `webp` \| `avif` \| `gif` | source format | `jpg` is accepted as an alias for `jpeg`. |
| `quality` | integer 1–100 | encoder default | |
| `v` | string | – | Cache busting only; ignored during processing. |

Unknown parameters are rejected with a 400, so typos fail loudly instead of being ignored.

Crop modes follow Cloudinary's naming:

- `fit` – resize to fit inside the box, no cropping
- `fill` – fill the box exactly, cropping the overflow
- `scale` – stretch to the exact box, ignoring aspect ratio

#### Examples

```sh
# Resize
curl "localhost:3000/process?url=http://localhost:3000/samples/flower.jpg&width=500&height=300" -o out.jpg

# Convert format
curl "localhost:3000/process?url=http://localhost:3000/samples/transparent.png&format=jpeg&quality=80" -o out.jpg

# Combine
curl "localhost:3000/process?url=http://localhost:3000/samples/flower.jpg&width=800&height=600&format=webp&crop=fill" -o out.webp
```

### Errors

Every error has the same shape:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Invalid query parameters",
    "details": [{ "field": "width", "message": "Too big: expected number to be <=4096" }]
  }
}
```

| Status | Code | When |
|---|---|---|
| 400 | `INVALID_REQUEST` | A query param is missing or invalid (`details` lists each field) |
| 422 | `CONTENT_TOO_LARGE` | Source content is over 10MB |
| 422 | `UNPROCESSABLE_IMAGE` | Source content isn't a supported image, or exceeds the pixel limit |
| 502 | `SOURCE_ERROR` | Source responded with a non-2xx status |
| 502 | `SOURCE_UNREACHABLE` | Source couldn't be reached (DNS, connection) |
| 504 | `SOURCE_TIMEOUT` | Source didn't respond within 5s |
| 500 | `INTERNAL_ERROR` | Unexpected failure |

4xx means the request or its source can't be used; 5xx means something upstream or in the service failed.

### Limits

| Limit | Value |
|---|---|---|
| Source file size | 10MB |
| Source dimensions | 8192 × 8192 pixels |
| Output dimensions | 4096 per side |
| Source fetch timeout | 5s |

## Testing

```sh
npm test                 # all tests
npm run typecheck        # tsc --noEmit
node --test --experimental-test-coverage "src/**/*.test.ts"
```

- **Unit** (`image.transforms.test.ts`, `fetchContent.test.ts`): transform behavior and source-fetch failure paths, including size and timeout boundaries.
- **Integration** (`app.integration.test.ts`): real HTTP against the app, checking status codes, `Content-Type`, and the error shape.

Outbound requests are stubbed with [MSW](https://mswjs.io/); any unmocked request fails the test, so the suite never touches the network. Test images are generated with sharp, so there are no binary fixtures.

## Project structure

```
src/
  app.ts                 Express app, routes, error handler
  server.ts              Entry point
  errors.ts              AppError (status, code, message, details)
  image/
    image.router.ts      validate → fetch → transform → respond
    image.schema.ts      Zod query schema, formats, crop modes
    image.transforms.ts  sharp pipeline (Buffer in, Buffer out)
  util/
    fetchContent.ts      Fetch with timeout and size limit
  testing/               Test server and MSW setup
```
