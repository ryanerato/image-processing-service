![CI](https://github.com/ryanerato/image-processing-service/actions/workflows/ci.yml/badge.svg)

# Image Processing Service

A Cloudinary-style HTTP service that fetches an image from a URL, transforms it, and returns the result.

## Requirements

- Node.js 24+

## Quick start

```sh
npm install
npm start            # http://localhost:3000
npm run dev          # same, restarting on file changes
```

Then open this in a browser:

```
http://localhost:3000/process?url=http://localhost:3000/samples/flower.jpg&width=400&format=webp
```

More demo links are in [`samples/README.md`](samples/README.md).

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
| `format` | `jpeg` \| `png` \| `webp` \| `avif` \| `gif` | source format (PNG if the source can't be output, e.g. TIFF, SVG) | `jpg` is accepted as an alias for `jpeg`. |
| `quality` | integer 1–100 | encoder default | |
| `v` | string | – | Cache busting only; ignored during processing. |

Unknown parameters are rejected with a 400, so typos fail loudly instead of being ignored.

Crop modes follow Cloudinary's naming:

- `fit` – resize to fit inside the box, no cropping
- `fill` – fill the box exactly, cropping the overflow
- `scale` – stretch to the exact box, ignoring aspect ratio

Images are resized to the requested dimensions, shrinking or enlarging as needed. With only `width` or `height`, the aspect ratio is kept.

**Supported inputs:** JPEG, PNG, WebP, GIF, AVIF, TIFF, SVG. **Outputs:** JPEG, PNG, WebP, AVIF, GIF.

Output images are stripped of metadata such as EXIF, including GPS location. This is sharp's default behavior, kept intentionally.

Successful responses are cacheable for 7 days (`Cache-Control: public, max-age=604800`). Error responses are not cached. Add or change `v` (e.g. `&v=2`) to bypass cached results after a source image changes.

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
| 404 | `NOT_FOUND` | No route matches the request path |
| 422 | `CONTENT_TOO_LARGE` | Source content is over the size limit (default 10MB) |
| 422 | `UNPROCESSABLE_IMAGE` | Source content isn't a supported image, or exceeds the pixel limit |
| 502 | `SOURCE_ERROR` | Source responded with a non-2xx status |
| 502 | `SOURCE_UNREACHABLE` | Source couldn't be reached (DNS, connection) |
| 504 | `SOURCE_TIMEOUT` | Source didn't respond within the timeout (default 5s) |
| 500 | `INTERNAL_ERROR` | Unexpected failure |

4xx means the request or its source can't be used; 5xx means something upstream or in the service failed.

### Limits

| Limit | Default | Env var |
|---|---|---|
| Source file size | 10MB | `SOURCE_MAX_BYTES` |
| Source dimensions | 8192 × 8192 pixels | `SOURCE_MAX_PIXELS` |
| Source fetch timeout | 5s | `SOURCE_TIMEOUT_MS` |
| Output dimensions | 4096 per side | – |

## Configuration

Settings come from environment variables, validated at startup (`src/config.ts`), so an invalid value fails fast with a clear error. A `.env` file in the project root is loaded if present.

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `LOG_LEVEL` | `info` | `fatal`, `error`, `warn`, `info`, `debug`, `trace`, or `silent` |
| `SOURCE_MAX_BYTES` | `10485760` (10MB) | Maximum source file size |
| `SOURCE_MAX_PIXELS` | `67108864` (8192²) | Maximum source width × height |
| `SOURCE_TIMEOUT_MS` | `5000` | Source fetch timeout |

Logs are structured JSON ([pino](https://getpino.io/)), one line per request including its duration.

## Testing

```sh
npm test                 # all tests
npm run typecheck        # tsc --noEmit
node --test --experimental-test-coverage "src/**/*.test.ts"
```

Outbound requests are stubbed with [MSW](https://mswjs.io/); any unmocked request fails the test, so the suite never touches the network. Test images are generated with sharp, so there are no binary fixtures.

## Project structure

```
samples/                 Demo images served at /samples
src/
  app.ts                 Express app, routes, error handler
  server.ts              Entry point
  config.ts              Validated environment configuration
  errors.ts              AppError and translation of other errors into it
  image/
    image.router.ts      validate → fetch → transform → respond
    image.schema.ts      Zod query schema, formats, crop modes
    image.transforms.ts  sharp pipeline (Buffer in, Buffer out)
  util/
    fetchContent.ts      Fetch with timeout and size limit
    logger.ts            pino logger
    parseQuery.ts        Validates a request's query against a schema
  testing/               Test server and MSW setup
```

## Scaling

The service is stateless, so it scales horizontally behind a load balancer. `GET /health` returns `{ "status": "ok" }` for load balancer health checks.

- **Caching:** responses are cacheable for 7 days, so browsers and CDNs serve repeat requests without reprocessing.
- **CPU:** processing is CPU-bound; `sharp` uses multiple cores via `libuv`'s thread pool.
- **Memory:** each request's memory is bounded by the size and pixel limits; how many run at once is left to the surrounding infrastructure (load balancer, autoscaling).
- **Source fetches:** capped by the timeout.

## Known limitations and future work

- **SSRF:** the service fetches any http(s) URL, including private and internal addresses (e.g. `localhost`, cloud metadata endpoints). Blocking needs to happen at connection time so it covers DNS resolution and every redirect hop, not just the initial URL.
- **No server-side cache:** every uncached request refetches and reprocesses the source. A CDN in front of the service is the intended caching layer (see Scaling).
- **No auth or rate limiting:** the service currently accepts requests from any client. An API gateway is the intended auth and rate limiting layer.
- **Animated GIFs:** only the first frame is processed.
- **Camera RAW** formats are not supported.
- **Video thumbnails** (`/video/thumbnail`, bonus): not implemented. It would extract a frame with ffmpeg and reuse the image transform.
- **Streaming:** sources are buffered in memory, which is fine at 10MB. Larger limits would call for streaming.
- **Background color:** transparency is filled with white when converting to JPEG; a caller-selectable color would be a small addition.

## AI assistance

Claude Code was used to scaffold the project, write most of the tests, and draft this README. The design decisions are mine, and I reviewed, edited, and tested everything it produced. Commits it contributed to are marked with an `Assisted-by: Claude Code` trailer.
