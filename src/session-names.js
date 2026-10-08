import { random } from "./music-engine.js";
const MOODS = {
  cosmic: [
    "Orbital",
    "Nebula",
    "Lunar",
    "Andromeda",
    "Celestial",
    "Comet",
    "Astral",
    "Saturn",
  ],
  warm: [
    "Velvet",
    "Honey",
    "Amber",
    "Cashmere",
    "Saffron",
    "Copper",
    "Rosewood",
    "Golden",
  ],
  dark: [
    "Obsidian",
    "Phantom",
    "Shadow",
    "Midnight",
    "Ink",
    "Eclipse",
    "Onyx",
    "Nocturne",
  ],
  bright: [
    "Prism",
    "Electric",
    "Solar",
    "Neon",
    "Aurora",
    "Chrome",
    "Radiant",
    "Iridescent",
  ],
};
const THINGS = [
  "Mirage",
  "Paradox",
  "Frequency",
  "Detour",
  "Alchemy",
  "Current",
  "Constellation",
  "Signal",
  "Daydream",
  "Gravity",
  "Afterglow",
  "Reverie",
  "Voyager",
  "Echo",
  "Orbit",
  "Theory",
  "Undertow",
  "Horizon",
  "Bloom",
  "Odyssey",
  "Lucid",
  "Drift",
  "Pulse",
  "Satellite",
];
const PLACES = [
  "Europa",
  "Venus",
  "Jupiter",
  "Tomorrow",
  "the Sixth Moon",
  "Elsewhere",
  "the Blue Hour",
  "the Other Side",
  "the Aurora",
  "a Parallel Sky",
  "the Quiet Galaxy",
  "the Velvet Coast",
];
export function sessionName(
  settings,
  seed,
  date = new Date(),
  mood = "cosmic",
  recent = [],
) {
  const rng = random((seed ^ (date.getHours() * 2654435761)) >>> 0),
    pick = (list) => list[Math.floor(rng() * list.length)];
  const hour = date.getHours(),
    time =
      hour < 6
        ? "Afterhours"
        : hour < 12
          ? "Daybreak"
          : hour < 18
            ? "Sunlit"
            : "Blue-hour";
  const colors = MOODS[mood] ?? MOODS.cosmic;
  for (let attempt = 0; attempt < 40; attempt++) {
    const feeling = pick(colors),
      thing = pick(THINGS),
      place = pick(PLACES);
    const bass = settings.parts?.bass?.groove,
      edge =
        bass === "trap" || bass === "drill"
          ? "Voltage"
          : settings.style === "cinematic"
            ? "Cinema"
            : settings.style === "lofi"
              ? "Haze"
              : thing;
    const names = [
      `${feeling} ${thing}`,
      `${time} ${feeling} ${edge}`,
      `${thing} on ${place}`,
      `${feeling} ${edge} / ${pick(THINGS)}`,
      `${place.replace(/^the /, "")} in ${feeling}`,
    ];
    const name = pick(names);
    if (!recent.includes(name)) return name;
  }
  return `${pick(colors)} ${pick(THINGS)} ${seed.toString(36).toUpperCase()}`;
}
