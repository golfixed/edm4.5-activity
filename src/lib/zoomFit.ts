/**
 * Style for a full-screen root scaled with CSS `zoom`. A zoomed element's own lengths are scaled
 * too, so `h-screen` at 120% would be 120% of the viewport tall and push the bottom off screen;
 * dividing the height by the zoom keeps the zoomed screen exactly one viewport tall.
 */
export function zoomFit(scale: number): React.CSSProperties {
  return { zoom: scale, height: `calc(100dvh / ${scale})` }
}
