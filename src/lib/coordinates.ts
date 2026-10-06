export function parseOptionalCoordinate(value: string | undefined, label: string, min: number, max: number) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const coordinate = Number(trimmed.replace(',', '.'));
  if (!Number.isFinite(coordinate) || coordinate < min || coordinate > max) {
    throw new Error(`${label} mora biti broj između ${min} i ${max}.`);
  }
  return coordinate;
}
