export const DIRECTORS = [
  {
    title: "Art",
    director: "art-director",
    brief: "art-direction",
    ledger: ".claude/art-ledger.md",
    paths: [/^sprites\//, /^icon\.(png|psd)$/, /^tools\/gen-[\w-]+\.py$/],
    commands: [/\bgen-[\w-]+-sprites\.py\b/],
    tools: [],
  },
  {
    title: "Feel",
    director: "game-feel-director",
    brief: "feel-direction",
    ledger: ".claude/feel-ledger.md",
    paths: [/^scripts\/[\w-]+\.js$/],
    commands: [],
    tools: [],
  },
];
