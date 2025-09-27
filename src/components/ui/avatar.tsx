"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-full",
        className
      )}
      {...props}
    />
  )
}

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, onError, onLoad, crossOrigin, referrerPolicy, src, ...props }, ref) => {
  // Add: minute-based cache-busting so updated avatars bypass stale caches
  const bust = React.useMemo(() => Math.floor(Date.now() / 60000), []);
  const finalSrc = React.useMemo(() => {
    if (!src) return src as any;
    try {
      const u = new URL(String(src));
      u.searchParams.set("cb", String(bust));
      return u.toString();
    } catch {
      const s = String(src);
      return `${s}${s.includes("?") ? "&" : "?"}cb=${bust}`;
    }
  }, [src, bust]);

  // Remove: do NOT forcibly hide the image on error — let Radix fallback handle it
  const handleError = React.useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      onError?.(e as any);
    },
    [onError],
  );

  // Keep: ensure visible when load succeeds
  const handleLoad = React.useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      onLoad?.(e as any);
    },
    [onLoad],
  );

  return (
    <AvatarPrimitive.Image
      ref={ref}
      src={finalSrc as any}
      crossOrigin={crossOrigin ?? "anonymous"}
      referrerPolicy={referrerPolicy ?? "no-referrer"}
      onError={handleError}
      onLoad={handleLoad}
      loading="lazy"
      decoding="async"
      className={cn("h-full w-full object-cover", className)}
      {...props}
    />
  );
});

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "bg-muted flex size-full items-center justify-center rounded-full",
        className
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback }