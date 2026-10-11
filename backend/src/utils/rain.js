export const MM_PER_TIP = 0.2;

export function rainMmFromCounters(counters) {
  if (!counters || counters.length < 2) {
    return 0;
  }

  let totalTips = 0;
  let prev = counters[0];

  for (let i = 1; i < counters.length; i++) {
    const curr = counters[i];

    if (curr >= prev) {
      totalTips += curr - prev;
    } else {
      totalTips += curr;
    }

    prev = curr;
  }

  return Math.round(totalTips * MM_PER_TIP * 100) / 100;
}
