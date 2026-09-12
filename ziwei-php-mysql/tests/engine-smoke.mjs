import { astro } from 'iztro';

const chart = astro.bySolar('1990-6-15', 5, '男', true, 'zh-TW');
const json = chart.toJSON();
if (!json || !Array.isArray(json.palaces) || json.palaces.length !== 12) throw new Error('palaces != 12');
if (!json.fiveElementsClass || !json.soul || !json.body) throw new Error('missing core chart fields');
const major = json.palaces.flatMap(p => p.majorStars || []);
if (major.length < 14) throw new Error(`major stars unexpectedly low: ${major.length}`);

const ds = chart.decadalList();
if (!Array.isArray(ds) || ds.length < 10 || !ds[0].ageRange || !ds[0].yearRange) throw new Error('decadalList invalid');
const ys = chart.yearlyList(0);
if (!Array.isArray(ys) || ys.length !== 10 || !Number.isInteger(ys[0].year)) throw new Error('yearlyList invalid');
const ms = chart.monthlyList(2026);
if (!Array.isArray(ms) || ms.length < 12 || !ms[0].month) throw new Error('monthlyList invalid');

const h = chart.horoscope('2026-09-12', 5);
for (const key of ['decadal','age','yearly','monthly','daily','hourly']) {
  if (!h[key] || typeof h[key].index !== 'number') throw new Error(`horoscope.${key} invalid`);
}
if (!Array.isArray(h.yearly.mutagen) || h.yearly.mutagen.length !== 4) throw new Error('yearly mutagen invalid');

const surrounded = chart.surroundedPalaces('命宮').toJSON();
for (const key of ['target','opposite','wealth','career']) if (!surrounded[key]) throw new Error(`surrounded.${key} missing`);
console.log('iztro engine smoke test passed');
