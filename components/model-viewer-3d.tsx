"use client";

/* Side-effect import registers the <model-viewer> custom element. Only ever
   loaded through a `dynamic(..., { ssr: false })` wrapper — never during SSR. */
import "@google/model-viewer";

export default function ModelViewer3D({
  src,
  poster,
}: {
  src: string;
  poster?: string;
}) {
  return (
    <model-viewer
      src={src}
      poster={poster}
      alt="Interactive 3D view of the Scentury21 perfume bottle — drag to rotate"
      camera-controls
      auto-rotate
      rotation-per-second="22deg"
      shadow-intensity="1"
      exposure="1.05"
      environment-image="neutral"
      ar
      ar-modes="webxr scene-viewer quick-look"
      style={{ width: "100%", height: "100%" }}
    />
  );
}
