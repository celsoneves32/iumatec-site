// lib/gtag.ts
export const gtagEvent = ({ action, params }: any) => {
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", action, params);
  }
};
