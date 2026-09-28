# Sample images

Images for trying the service locally. The app serves this folder at `/samples`, so with the server running (`npm run dev`) each link below works in a browser.

These are for manual exploration only. Tests generate their own images with sharp and don't depend on these files.

| File | Details | Demonstrates |
|---|---|---|
| `flower.jpg` | 1920×1440 JPEG, landscape photo | Resizing, crop modes, format conversion |
| `transparent.png` | 800×600 PNG with an alpha channel | Transparency filled with white when converting to JPEG |
| `rotated.jpg` | 1200×1800 stored pixels, EXIF orientation 6 | Auto-orientation from EXIF |

## Try it

```
# Crop modes: compare fit (400×300), fill (400×400, cropped), scale (400×400, stretched)
http://localhost:3000/process?url=http://localhost:3000/samples/flower.jpg&width=400&height=400&crop=fit
http://localhost:3000/process?url=http://localhost:3000/samples/flower.jpg&width=400&height=400&crop=fill
http://localhost:3000/process?url=http://localhost:3000/samples/flower.jpg&width=400&height=400&crop=scale

# Transparent PNG → JPEG: transparent areas become white instead of black
http://localhost:3000/process?url=http://localhost:3000/samples/transparent.png&format=jpeg

# EXIF-rotated photo: output is upright landscape (width > height)
http://localhost:3000/process?url=http://localhost:3000/samples/rotated.jpg&width=600
```

Opening `rotated.jpg` directly looks upright because browsers apply the EXIF tag themselves. The problem only appears in processed output, where metadata is stripped.

## Attribution

- **`flower.jpg`**: *Gladiolus dalenii (parrot gladiolus) flower in the rain, Ooty, Tamil Nadu, India* by TA Gonsalves, via [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Gladiolus_dalenii_flower_Ooty_Jul25_A7CR_06187-224_zsp.jpg). Licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
- **`transparent.png`**: *PNG transparency demonstration 1*, via [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:PNG_transparency_demonstration_1.png). By Daniel G. (2005), Ed g2s (2009), and CyberShadow (2019), rendered from POV-Ray source code. Licensed under [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/).
- **`rotated.jpg`**: `Landscape_6.jpg` from [recurser/exif-orientation-examples](https://github.com/recurser/exif-orientation-examples). MIT License, Copyright (c) 2010 Dave Perrett. Original photograph by Pierre Bouillot on Unsplash.
