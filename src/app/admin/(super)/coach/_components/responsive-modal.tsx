'use client';

import * as React from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';

/** A picker surface that is a bottom sheet on a phone and a dialog on a desktop.
 *
 *  Why not one or the other: a centred dialog with a search field puts the
 *  on-screen keyboard over its own results, and a bottom sheet on a wide screen
 *  wastes the space. The sheet also keeps the search box within thumb reach.
 *
 *  Both Radix primitives give focus trapping, Escape-to-close and `role=dialog`
 *  for free — the hand-rolled version had none of those.
 */
export function ResponsiveModal({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        {/* Near-full height: the coach is scanning a list, not glancing at a card. */}
        <DrawerContent className="max-h-[92dvh]">
          <DrawerHeader className="text-left pb-2">
            <DrawerTitle>{title}</DrawerTitle>
            {description ? (
              <DrawerDescription>{description}</DrawerDescription>
            ) : null}
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-8">{children}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="overflow-y-auto -mx-6 px-6">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
