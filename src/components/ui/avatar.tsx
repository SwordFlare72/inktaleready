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
  // Versioned cache-busting that increments only when the `src` actually changes
  const prevSrcRef = React.useRef<string | undefined>(undefined);
  const [version, setVersion] = React.useState(0);
  // Add: one-time retry on error
  const [retryCount, setRetryCount] = React.useState(0);

  React.useEffect(() => {
    const s = src ? String(src) : undefined;
    if (s !== prevSrcRef.current) {
      prevSrcRef.current = s;
      setVersion((v) => v + 1);
      // Reset retry counter when the src changes
      setRetryCount(0);
    }
  }, [src]);

  const finalSrc = React.useMemo(() => {
    if (!src) return src as any;
    try {
      const u = new URL(String(src));
      // preserve existing query params and just add a stable version param
      u.searchParams.set("cb", String(version));
      return u.toString();
    } catch {
      const s = String(src);
      const sep = s.includes("?") ? "&" : "?";
      return `${s}${sep}cb=${version}`;
    }
  }, [src, version]);

  const handleError = React.useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      // Automatic one-time retry to emulate how story covers naturally reload
      if (retryCount < 1) {
        setRetryCount((r) => r + 1);
        setVersion((v) => v + 1); // bump version to force a fresh fetch
        return;
      }
      // After retry, defer to consumer (and Radix fallback will show)
      onError?.(e as any);
    },
    [onError, retryCount],
  );

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