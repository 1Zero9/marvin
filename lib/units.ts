const KG_PER_LB = 0.45359237;
const LB_PER_STONE = 14;
const CM_PER_INCH = 2.54;
const IN_PER_FOOT = 12;

export function kgToStoneLbs(kg: number) {
  const totalLbs = kg / KG_PER_LB;
  const stone = Math.floor(totalLbs / LB_PER_STONE);
  const lbs = Math.round(totalLbs - stone * LB_PER_STONE);
  if (lbs === LB_PER_STONE) return { stone: stone + 1, lbs: 0 };
  return { stone, lbs };
}

export function formatStoneLbs(kg: number) {
  const { stone, lbs } = kgToStoneLbs(kg);
  return `${stone}st ${lbs}lb`;
}

export function cmToFeetInches(cm: number) {
  const totalInches = cm / CM_PER_INCH;
  const feet = Math.floor(totalInches / IN_PER_FOOT);
  const inches = Math.round(totalInches - feet * IN_PER_FOOT);
  if (inches === IN_PER_FOOT) return { feet: feet + 1, inches: 0 };
  return { feet, inches };
}

export function formatFeetInches(cm: number) {
  const { feet, inches } = cmToFeetInches(cm);
  return `${feet}'${inches}"`;
}
