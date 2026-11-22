// rng.js — one seeded random-number generator (mulberry32).
// The game never calls Math.random and never reads the wall clock for
// gameplay, so a playthrough is reproducible from its inputs alone.

window.Heist = window.Heist || {};

/** A mulberry32 generator: small, fast, and identical on every machine. */
Heist.makeRng = function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** A number in [min, max) from a seeded generator. */
Heist.range = function range(rng, min, max) {
  return min + rng() * (max - min);
};

/** One of the array's items, picked by a seeded generator. */
Heist.pick = function pick(rng, items) {
  return items[Math.floor(rng() * items.length)];
};
