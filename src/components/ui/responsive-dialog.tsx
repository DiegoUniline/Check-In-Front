import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

/**
 * ResponsiveDialog
 * - En móvil renderiza un bottom-sheet (vaul Drawer) — sensación nativa de app.
 * - En desktop renderiza un Dialog tradicional centrado.
 * Misma API mínima: open / onOpenChange / children.
 * Hijos esperados: <ResponsiveDialogHeader/>, <ResponsiveDialogTitle/>, <ResponsiveDialogBody/>, <ResponsiveDialogFooter/>.
 */
interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  children: React.ReactNode;
  /** Ancho máx del Dialog en desktop. Default: max-w-lg */
  className?: string;
  /** Alto máx del Drawer en móvil. Default: 90vh */
  mobileMaxHeight?: string;
}

export function ResponsiveDialog({
  open,
  onOpenChange,
  children,
  className,
  mobileMaxHeight = "90vh",
}: ResponsiveDialogProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent
          className="flex flex-col"
          style={{ maxHeight: mobileMaxHeight, paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("max-w-lg", className)}>{children}</DialogContent>
    </Dialog>
  );
}

export function ResponsiveDialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const isMobile = useIsMobile();
  return isMobile ? (
    <DrawerHeader className={cn("text-left", className)} {...props} />
  ) : (
    <DialogHeader className={className} {...props} />
  );
}

export function ResponsiveDialogTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  const isMobile = useIsMobile();
  return isMobile ? (
    <DrawerTitle className={className} {...props} />
  ) : (
    <DialogTitle className={className} {...props} />
  );
}

export function ResponsiveDialogDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  const isMobile = useIsMobile();
  return isMobile ? (
    <DrawerDescription className={className} {...props} />
  ) : (
    <DialogDescription className={className} {...props} />
  );
}

export function ResponsiveDialogBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-4 sm:px-0 py-2", className)} {...props} />;
}

export function ResponsiveDialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const isMobile = useIsMobile();
  return isMobile ? (
    <DrawerFooter className={className} {...props} />
  ) : (
    <DialogFooter className={className} {...props} />
  );
}