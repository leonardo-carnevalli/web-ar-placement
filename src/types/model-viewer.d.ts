import type { DetailedHTMLProps, HTMLAttributes } from "react";

/** JSX typing for the <model-viewer> custom element, limited to the attributes this app uses. */
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        src: string;
        alt: string;
        "camera-controls"?: boolean;
        "auto-rotate"?: boolean;
        "shadow-intensity"?: string;
        "environment-image"?: string;
        exposure?: string;
        "camera-orbit"?: string;
        "interaction-prompt"?: string;
        "touch-action"?: string;
      };
    }
  }
}
