const lib = require("lib");

const CRAFT_TIME = 30;
const MAX_OUTPUT_PER_CYCLE = 50;
const DEFAULT_SPEED = 2;
const SPEED_LEVELS = [1, 2, 4, 8, 16, 32, 64, 128];
const BASE_POWER = 0.4;
const OUTPUT_POWER_SCALE = 0.25;
const UPGRADE_POWER_SCALE = 0.6;
const DIFFERENCE_POWER_SCALE = 0.15;
let stringInRegion, stringOutRegion, itemInRegion, itemOutRegion;

const ITEM_VALUES = {
    "copper": 1,
    "lead": 1,
    "scrap": 1,
    "sand": 1,
    "coal": 2,
    "graphite": 3,
    "beryllium": 3,
    "metaglass": 4,
    "titanium": 4,
    "spore-pod": 4,
    "silicon": 5,
    "pyratite": 5,
    "tungsten": 6,
    "blast-compound": 7,
    "thorium": 8,
    "oxide": 8,
    "dormant-cyst": 8,
    "plastanium": 9,
    "fissile-matter": 10,
    "phase-fabric": 12,
    "carbide": 13,
    "surge-alloy": 14
};

function itemValue(item) {
    if (item == null) return 1;
    let value = ITEM_VALUES[item.name];
    if (value != null) return value;
    let cost = item.cost || 1;
    return Math.max(1, Math.ceil(cost));
}

function conversion(inputItem, outputItem) {
    if (inputItem == null || outputItem == null || inputItem == outputItem) {
        return { valid: false, inputAmount: 0, outputAmount: 0, powerUse: 0 };
    }

    let inputValue = itemValue(inputItem);
    let outputValue = itemValue(outputItem);
    let inputAmount = 1;
    let outputAmount = 1;

    if (inputValue < outputValue) {
        inputAmount = Math.ceil(outputValue / inputValue);
    } else {
        outputAmount = Math.min(MAX_OUTPUT_PER_CYCLE, Math.max(1, Math.floor(inputValue / outputValue)));
    }

    let upgrade = Math.max(0, outputValue - inputValue);
    let difference = Math.abs(outputValue - inputValue);
    let powerUse = BASE_POWER + outputValue * OUTPUT_POWER_SCALE + upgrade * UPGRADE_POWER_SCALE + difference * DIFFERENCE_POWER_SCALE;

    return {
        valid: true,
        inputValue: inputValue,
        outputValue: outputValue,
        inputAmount: inputAmount,
        outputAmount: outputAmount,
        powerUse: powerUse
    };
}

function validSpeed(speed) {
    for (let i = 0; i < SPEED_LEVELS.length; i++) {
        if (SPEED_LEVELS[i] == speed) return speed;
    }
    return DEFAULT_SPEED;
}

function speedPowerMultiplier(speed) {
    let level = Math.log(speed) / Math.log(2);
    return speed * (1 + level * 0.35);
}

function converterConfig(inputId, outputId, speed) {
    let seq = new IntSeq(3);
    seq.add(inputId == null ? -1 : inputId);
    seq.add(outputId == null ? -1 : outputId);
    seq.add(validSpeed(speed));
    return seq;
}

const blockType = extend(StorageBlock, "chrono-item-converter", {
    load() {
        this.super$load();
        this.region = lib.loadRegion("chrono-item-converter");
        stringInRegion = lib.loadRegion("chrono-item-converter-string-in");
        stringOutRegion = lib.loadRegion("chrono-item-converter-string-out");
        itemInRegion = lib.loadRegion("chrono-item-converter-item-in");
        itemOutRegion = lib.loadRegion("chrono-item-converter-item-out");
    },

    outputsItems() { return true; },

    setBars() {
        this.super$setBars();
        this.addBar("recipe", lib.func(e => new Bar(
            prov(() => e.recipeText()),
            prov(() => Pal.items),
            floatp(() => e.recipeValid() ? 1 : 0)
        )));
        this.addBar("progress", lib.func(e => new Bar(
            prov(() => Core.bundle.get("bar.progress")),
            prov(() => Pal.ammo),
            floatp(() => e.progressFrac())
        )));
    }
});

blockType.buildVisibility = BuildVisibility.shown;
blockType.alwaysUnlocked = true;
blockType.category = Category.crafting;
blockType.size = 2;
blockType.health = 2147483647;
blockType.buildCost = 0.001;
blockType.update = true;
blockType.solid = true;
blockType.hasItems = true;
blockType.hasPower = true;
blockType.configurable = true;
blockType.saveConfig = true;
blockType.itemCapacity = 200;
blockType.noUpdateDisabled = true;
blockType.requirements = ItemStack.with();
lib.enableAllEnvironments(blockType);

blockType.config(IntSeq, lib.cons2((tile, seq) => {
    tile.setRecipeConfig(seq.size > 0 ? seq.get(0) : -1, seq.size > 1 ? seq.get(1) : -1, seq.size > 2 ? seq.get(2) : DEFAULT_SPEED);
}));
blockType.configClear(tile => { tile.setRecipeConfig(-1, -1, DEFAULT_SPEED); });
blockType.consumePowerDynamic(new Floatf({ get: b => {
    try {
        return b.dynamicPowerUse();
    } catch (e) {
        return 0;
    }
}}));

blockType.buildType = prov(() => {
    let inputItem = null;
    let outputItem = null;
    let speed = DEFAULT_SPEED;
    let progress = 0;

    return new JavaAdapter(StorageBlock.StorageBuild, {
        setRecipeConfig(inputId, outputId, speedValue) {
            inputItem = inputId == null || inputId < 0 ? null : Vars.content.items().get(inputId);
            outputItem = outputId == null || outputId < 0 ? null : Vars.content.items().get(outputId);
            speed = validSpeed(speedValue);
            progress = 0;
        },

        recipe() {
            return conversion(inputItem, outputItem);
        },

        recipeValid() {
            return this.recipe().valid;
        },

        progressFrac() {
            return Mathf.clamp(progress / this.craftTime());
        },

        craftTime() {
            return CRAFT_TIME / speed;
        },

        dynamicPowerUse() {
            let recipe = this.recipe();
            return this.canConvert(recipe) ? recipe.powerUse * speedPowerMultiplier(speed) : 0;
        },

        recipeText() {
            let recipe = this.recipe();
            if (!recipe.valid) return "Select input -> output";
            return speed + "x: " + recipe.inputAmount + " " + inputItem.localizedName + " -> " + recipe.outputAmount + " " + outputItem.localizedName;
        },

        canConvert(recipe) {
            if (!recipe.valid || inputItem == null || outputItem == null) return false;
            if (this.items == null) return false;
            if (this.items.get(inputItem) < recipe.inputAmount) return false;
            return this.items.get(outputItem) + recipe.outputAmount <= this.getMaximumAccepted(outputItem);
        },

        convertOnce(recipe) {
            if (!this.canConvert(recipe)) return false;
            this.items.remove(inputItem, recipe.inputAmount);
            this.items.add(outputItem, recipe.outputAmount);
            return true;
        },

        updateTile() {
            let recipe = this.recipe();
            let active = this.canConvert(recipe) && this.efficiency > 0.001;
            let craftTime = this.craftTime();

            if (active) {
                progress += this.edelta();
                while (progress >= craftTime) {
                    if (!this.convertOnce(recipe)) break;
                    progress -= craftTime;
                }
            } else if (!recipe.valid || !this.canConvert(recipe)) {
                progress = 0;
            }

            if (outputItem != null) {
                for (let i = 0; i < 3; i++) this.dump(outputItem);
            }
        },

        draw() {
            this.super$draw();
            let drawSize = blockType.size * Vars.tilesize;
            if (inputItem != null) {
                Draw.color(inputItem.color);
                Draw.rect(stringInRegion, this.x, this.y, drawSize, drawSize);
                let scale = 1 + Mathf.absin(Time.time, 8, 0.08);
                Draw.rect(itemInRegion, this.x, this.y, drawSize * scale, drawSize * scale);
            }
            if (outputItem != null) {
                Draw.color(outputItem.color);
                Draw.rect(stringOutRegion, this.x, this.y, drawSize, drawSize);
                let scale = 1 + Mathf.absin(Time.time + 4, 8, 0.08);
                Draw.rect(itemOutRegion, this.x, this.y, drawSize * scale, drawSize * scale);
            }
            Draw.reset();
        },

        buildConfiguration(table) {
            table.table(cons(t => {
                t.add("Input").left().row();
                ItemSelection.buildTable(t, Vars.content.items(), prov(() => inputItem), cons(v => {
                    this.configure(converterConfig(v == null ? -1 : v.id, outputItem == null ? -1 : outputItem.id, speed));
                }));
            })).row();
            table.table(cons(t => {
                t.add("Output").left().row();
                ItemSelection.buildTable(t, Vars.content.items(), prov(() => outputItem), cons(v => {
                    this.configure(converterConfig(inputItem == null ? -1 : inputItem.id, v == null ? -1 : v.id, speed));
                }));
            })).row();
            table.table(cons(t => {
                t.add("Speed").left().row();
                for (let i = 0; i < SPEED_LEVELS.length; i++) {
                    let level = SPEED_LEVELS[i];
                    t.button(level + "x", run(() => {
                        this.configure(converterConfig(inputItem == null ? -1 : inputItem.id, outputItem == null ? -1 : outputItem.id, level));
                    })).size(58, 40).pad(2);
                    if (i == 3) t.row();
                }
            })).row();
        },

        config() {
            return converterConfig(inputItem == null ? -1 : inputItem.id, outputItem == null ? -1 : outputItem.id, speed);
        },

        outputsItems() {
            return true;
        },

        canDump(to, item) {
            return outputItem != null && item == outputItem;
        },

        acceptItem(source, item) {
            return inputItem != null && outputItem != null && inputItem != outputItem && item == inputItem && this.items.get(item) < this.getMaximumAccepted(item);
        },

        acceptStack(item, amount, source) {
            if (!this.acceptItem(source, item)) return 0;
            return Math.min(amount, this.getMaximumAccepted(item) - this.items.get(item));
        },

        version() {
            return 2;
        },

        write(write) {
            this.super$write(write);
            write.s(inputItem == null ? -1 : inputItem.id);
            write.s(outputItem == null ? -1 : outputItem.id);
            write.s(speed);
            write.f(progress);
        },

        read(read, revision) {
            this.super$read(read, revision);
            let inputId = read.s();
            let outputId = read.s();
            inputItem = inputId < 0 ? null : Vars.content.items().get(inputId);
            outputItem = outputId < 0 ? null : Vars.content.items().get(outputId);
            speed = revision >= 2 ? validSpeed(read.s()) : DEFAULT_SPEED;
            progress = read.f();
        }
    }, blockType);
});

module.exports = blockType;
