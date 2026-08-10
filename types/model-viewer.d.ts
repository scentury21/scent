import type * as React from "react";

/* JSX typings for Google's <model-viewer> web component (React 19 style —
   augment the react module's JSX.IntrinsicElements namespace). */
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        src?: string;
        poster?: string;
        alt?: string;
        "camera-controls"?: boolean | string;
        "auto-rotate"?: boolean | string;
        "rotation-per-second"?: string;
        "shadow-intensity"?: string;
        exposure?: string;
        "environment-image"?: string;
        ar?: boolean | string;
        "ar-modes"?: string;
        loading?: string;
      };
    }
  }
}
