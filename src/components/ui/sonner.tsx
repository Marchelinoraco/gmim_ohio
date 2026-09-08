"use client"

import { useSyncExternalStore } from "react"
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import {
  readThemePref,
  serverThemePref,
  subscribeThemePref,
} from "@/lib/theme"

const Toaster = ({ ...props }: ToasterProps) => {
  // SSR-safe: useSyncExternalStore memakai serverThemePref ('system') saat render
  // server, lalu beralih ke readThemePref (localStorage) di klien tanpa mismatch.
  const pref = useSyncExternalStore(subscribeThemePref, readThemePref, serverThemePref)

  return (
    <Sonner
      theme={pref as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--color-popover)",
          "--normal-text": "var(--color-popover-foreground)",
          "--normal-border": "var(--color-border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
