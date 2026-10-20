# Images

Drop files into this folder using these exact filenames. Nothing else needs to change —
the pages already point here. Any file that is missing renders as a labelled placeholder
showing the filename and the size it wants, so the site never breaks while you're still
shooting photos.

> The Ferros arm on the home tile and the scroll sequence are a live 3D scene, not photos —
> nothing to shoot for those. `ferros-hero.jpg` is still worth taking once real hardware
> exists, so the page shows the built machine next to the render.

## What goes here

| Filename | Size (px) | Ratio | Used on | Shows |
| --- | --- | --- | --- | --- |
| `home-hero.jpg` | 2400 × 1350 | 16:9 | Home, under the headline | The bench: printed parts, boards, the arm mid-assembly |
| `signature.png` | 1200 × 400 | 3:1 | Home, under the contact email | Your signature, **transparent background** |
| `ferros-hero.jpg` | 2400 × 1350 | 16:9 | Ferros | Assembled arm under the sensor arch |
| `ferros-head.jpg` | 1600 × 1200 | 4:3 | Ferros | Feeder head and blunt-needle nozzle, close up |
| `ferros-pcb.jpg` | 1600 × 1200 | 4:3 | Ferros | The carrier board |
| `arksef-frame.jpg` | 2400 × 1350 | 16:9 | Drone study | Instrumented test frame with load cells |
| `arksef-rig.jpg` | 1600 × 1200 | 4:3 | Drone study | Drop rig and capture electronics |
| `arksef-poster.jpg` | 1600 × 1200 | 4:3 | Drone study | Competition poster, shot straight on |

Sizes are the **minimum**. Bigger is fine — the browser scales down cleanly. Smaller will
look soft on a Retina screen, because these are displayed at roughly half those dimensions
and the extra pixels are what make them look sharp.

Everything is cropped with `object-fit: cover`, so the frame is filled and the edges are
trimmed rather than squashed. Keep your subject away from the very edge.

## How to prepare them

**On a Mac, no extra software.** Open the photo in Preview, then:

1. `Tools → Adjust Size…` — set the **width** to 2400 (16:9 shots) or 1600 (4:3 shots),
   leave "Scale proportionally" ticked, click OK.
2. If the crop is wrong, drag a selection first, then `Tools → Crop`.
3. `File → Export…` — choose **JPEG**, drag Quality to about 80%, and name it exactly as
   in the table above.

Aim for **under 500 KB per file**. A 3 MB photo straight off a phone will make the page
slow to load, and at this display size nobody can tell the difference.

**The signature.** Sign a white sheet with a black pen, photograph or scan it, then remove
the background so it's a transparent PNG — [remove.bg](https://remove.bg) does this in one
click, or in Preview use the Instant Alpha tool on the white area and delete. Export as
**PNG**, not JPEG, or you'll get a white box around it. The site inverts it automatically
in dark mode, so black ink is the right choice.

## Adding a new photo to a page

Copy this block into the page and change the three values:

```html
<figure>
  <div class="ph r4x3">
    <img src="../images/YOUR-FILE.jpg" alt="Describe what it shows" loading="lazy"
         onerror="this.parentElement.classList.add('missing')">
    <span class="ph-label">images/YOUR-FILE.jpg<br>1600 × 1200 px &middot; 4:3</span>
  </div>
  <figcaption>Fig. 04 — Your caption</figcaption>
</figure>
```

Swap `r4x3` for `r16x9`, `r3x2`, or `r1x1` to change the shape of the frame. On the home
page, drop the `../` from the paths. The `alt` text matters — it's what a screen reader
reads out, and what shows if the image fails.
