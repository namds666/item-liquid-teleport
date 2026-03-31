# ConstructBuild linked by auto-scan → lag + crash

## Symptom
Game lags heavily (~1s cycles) then crashes when a matching-category building is under construction and auto-scan is active.

## Cause
`ConstructBuild.block` resolves to `current` (the real block being built), not the `ConstructBlock` scaffolding.
So the building-under-construction passes the category flag check, gets added to links, and triggers a `configure(config())` sync every scan cycle.
In liquid pusher: `lt.block.hasLiquids == true` but `lt.liquids == null` (ConstructBuild allocates no liquid storage) → NPE crash.

## Fix (lib.js)
Skip any `ConstructBuild` in both `autoConnect` and the scan loop:
```js
if (b.getClass().getSimpleName() === "ConstructBuild") continue;
```

## Defensive backstop (chrono-liquid-pusher.js)
Guard both transfer paths against a null liquids module:
```js
if (!lt.block.hasLiquids || lt.liquids == null) continue;
```
