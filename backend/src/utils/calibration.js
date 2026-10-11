export function applyCalibration(raw, offset = 0, scale = 1) {
  return (raw + offset) * scale;
}
