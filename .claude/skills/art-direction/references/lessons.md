# Art lessons

Format: `- <date>  <lens>  <lesson>`

- 2026-10-27  readability  Before judging a family side by side, `md5 -q` every sibling sprite (block base, `-top`, `-rotator`, `sprites/statuses/*`). Byte twins hide in plain sight: booster/buffer/debuffer, item-tiler/liquid-tiler/liquid-pusher and all 16 status icons were identical files.
- 2026-10-27  readability  A block that `extend`s `OverdriveProjector` keeps vanilla `baseColor`/`phaseColor` unless the script sets them; grep for an override before counting tint as a difference between siblings.
- 2026-10-27  budget  A block that `extend`s plain `Block` draws only `region`; a `-base`/`-glow`/`-top` PNG is drawn only if the script `loadRegion`s it and draws it (units auto-load `-cell`, `-leg`, `-base`). Grep each sprite name in `scripts/` to find orphans and missing layers.
- 2026-10-27  color  `file` shows `color RGB` on a block sprite → its "empty" pixels are opaque, usually pure black (#000). Count pure-black px before calling a dark centre a design choice.
- 2026-10-27  evidence  Vanilla atlas lookup without extracting all: `sprites/sprites.aatls` stores each region as UTF name (2-byte len) then 4 big-endian shorts x,y,w,h; a region belongs to the last `spritesN.png` string at a lower byte offset (`sprites.png`..`sprites4.png`). Find `len+name`, read 8 bytes, crop that page (script kept in scratchpad, not the repo).
- 2026-10-27  vfx  Transfer block hues live in one table, `CHRONO_HUES` in `scripts/lib.js` (sprite glyph, rotator tint, particles). Check each new hue against the `baseColor` of booster/buffer/debuffer too: pusher = debuffer red `#f15454`, unloader = buffer blue `#80a9ff`.
- 2026-10-27  icons  Vanilla `status-<x>` is a white glyph; the tinted `status-<x>-ui` (status colour + `#454545` outline) is baked into `sprites4.png` at build time. A mod status ships only the white PNG, so its in-game tint comes only from runtime `createIcons`: never call status tint "verified" from a contact sheet, ask for a LOOK at the unit status bar.
- 2026-10-27  identity  A frame rim painted at px 1 needs px 0 checked: count accent (non-gray) px on the outer ring. Accents that cross the rim (mender, build tower base, converter) make it read as a stroke laid over the art.
