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
    "chrono-debuffer"
];

let mod = Vars.mods.locateMod("item-liquid-teleport"); //Get module by name
Log.info(Core.bundle.get("item-liquid-teleport.name"));
if(mod != null && !Vars.headless) { //Check if the mod exists and if the game is not running in headless mode (without a graphical interface)
  mod.meta.displayName = Core.bundle.get("item-liquid-teleport.displayName"); //Core.bundle.get retrieves the translation, then modifies the module's meta tag.
  mod.meta.subtitle = Core.bundle.get("item-liquid-teleport.subtitle");
  mod.meta.description = Core.bundle.get("item-liquid-teleport.description");
};

for (let i = 0; i < optionalScripts.length; i++) {
    const scriptName = optionalScripts[i];
    try {
        require(scriptName);
    } catch (err) {
        Log.err("[item-liquid-teleport] Failed to load script: " + scriptName);
        Log.err(err);
    }
}
