"use client"

import Link from "next/link"
import * as React from "react"

type BrandLogoProps = {
  height?: number
  withText?: boolean
  className?: string
}

export function BrandLogo({ height = 28, withText = false, className }: BrandLogoProps) {
  const [src, setSrc] = React.useState<string>("/fanap.png")
  return (
    <Link href="/" className={className} aria-label="Fanap">
      <div className="flex items-center gap-2">
        <img
          src={src}
          alt="Fanap"
          height={height}
          style={{ height, width: "auto" }}
          onError={() => setSrc("/placeholder-logo.svg")}
        />
        {withText && (
          <span className="text-sm font-semibold">FANAP</span>
        )}
      </div>
    </Link>
  )
}