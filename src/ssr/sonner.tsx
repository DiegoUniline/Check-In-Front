import type { ComponentProps } from "react";

type ToasterProps = ComponentProps<"div">;

// Sonner injects styles into `document` as soon as its module is imported.
// During SSG there is no browser, so the server bundle uses this inert shim.
export function Toaster(_props: ToasterProps) {
  return null;
}

const dismiss = () => undefined;

export const toast = Object.assign(
  () => "",
  {
    success: () => "",
    error: () => "",
    info: () => "",
    warning: () => "",
    loading: () => "",
    promise: () => "",
    custom: () => "",
    dismiss,
  },
);