type Point = { date: Date; weightKg: number };

function rollingAverage(points: Point[], window: number) {
  return points.map((_, i) => {
    const slice = points.slice(Math.max(0, i - window + 1), i + 1);
    const sum = slice.reduce((total, p) => total + p.weightKg, 0);
    return sum / slice.length;
  });
}

export default function WeightChart({ points, targetKg }: { points: Point[]; targetKg: number | null }) {
  if (points.length < 2) return null;

  const width = 640;
  const height = 220;
  const padX = 12;
  const padY = 18;

  const weights = points.map((p) => p.weightKg);
  const avg = rollingAverage(points, 7);
  const allValues = [...weights, ...avg, ...(targetKg ? [targetKg] : [])];
  const min = Math.min(...allValues) - 1;
  const max = Math.max(...allValues) + 1;

  const x = (i: number) => padX + (i / (points.length - 1)) * (width - padX * 2);
  const y = (value: number) => height - padY - ((value - min) / (max - min)) * (height - padY * 2);

  const rawPath = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.weightKg).toFixed(1)}`).join(" ");
  const avgPath = avg.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Weight trend chart" style={{ width: "100%", height: "auto" }}>
      {targetKg && (
        <>
          <line x1={padX} y1={y(targetKg)} x2={width - padX} y2={y(targetKg)} stroke="var(--marvin-basil)" strokeWidth={1.5} strokeDasharray="4 4" />
        </>
      )}
      <path d={rawPath} fill="none" stroke="var(--plum-100)" strokeWidth={2} />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.weightKg)} r={2.5} fill="var(--plum-300)" />
      ))}
      <path d={avgPath} fill="none" stroke="var(--marvin-orange)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
