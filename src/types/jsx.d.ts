/// <reference types="react" />

export {};

declare global {
  namespace JSX {
    // Fallback to avoid "JSX.IntrinsicElements does not exist" in IDE when next-env.d.ts is unavailable
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}
