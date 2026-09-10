const optionalScripts = [
    "lib",
    "chrono-unloader",
    "chrono-pusher",
    "chrono-liquid-unloader",
    "chrono-liquid-pusher",
    "chrono-item-converter",
    "chrono-core",
    "chrono-mender",
    "chrono-repair-point",
    "chrono-build-tower",
    "chrono-boost-rules",
    "chrono-liquid-tiler",
    "chrono-item-tiler",
    "chrono-booster",
    "chrono-buffer",
    "chrono-debuffer",
    "outpost",
    "outpost-small"
];

const mod = Vars.mods.locateMod("item-liquid-teleport");
if (mod != null && !Vars.headless) {
    ["displayName", "subtitle", "description"].forEach(key => {
        const bundleKey = "item-liquid-teleport." + key;
        if (Core.bundle.has(bundleKey)) mod.meta[key] = Core.bundle.get(bundleKey);
    });
}

for (let i = 0; i < optionalScripts.length; i++) {
    const scriptName = optionalScripts[i];
    try {
        require(scriptName);
    } catch (err) {
        Log.err("[item-liquid-teleport] Failed to load script: " + scriptName);
        Log.err(err);
    }
}
