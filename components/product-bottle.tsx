import type { Product } from "@/lib/types";

/**
 * Procedural SVG perfume bottle — no external images needed.
 * The gradient is derived from each product's palette.
 */
export default function ProductBottle({
  product,
  className = "",
}: {
  product: Pick<Product, "id" | "name" | "category" | "palette">;
  className?: string;
}) {
  const uid = product.id.replace(/[^a-zA-Z0-9]/g, "");
  const [c0, c1, c2] = product.palette;
  const bodyId = `body-${uid}`;
  const liquidId = `liquid-${uid}`;
  const shineId = `shine-${uid}`;
  const capId = `cap-${uid}`;

  return (
    <svg
      viewBox="0 0 120 230"
      className={className}
      role="img"
      aria-label={`${product.name} bottle`}
    >
      <defs>
        <linearGradient id={bodyId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={c0} />
          <stop offset="55%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
        <linearGradient id={liquidId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c0} stopOpacity="0.25" />
          <stop offset="100%" stopColor={c2} stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id={shineId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="30%" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="70%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.25" />
        </linearGradient>
        <linearGradient id={capId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f6e3b0" />
          <stop offset="100%" stopColor="#b98c33" />
        </linearGradient>
      </defs>

      {/* soft glow */}
      <ellipse cx="60" cy="150" rx="52" ry="62" fill={c1} opacity="0.16" />

      {/* cap */}
      <rect x="43" y="6" width="34" height="18" rx="5" fill={`url(#${capId})`} />
      <rect x="46" y="24" width="28" height="5" rx="2" fill="#8f6a24" />
      <rect x="50" y="29" width="20" height="10" rx="2" fill={c2} opacity="0.9" />

      {/* body */}
      <path
        d="M42 42 Q42 36 48 36 L72 36 Q78 36 78 42 L78 160 Q78 196 60 196 Q42 196 42 160 Z"
        fill={`url(#${bodyId})`}
      />

      {/* liquid */}
      <path
        d="M47 62 L73 62 L73 156 Q73 190 60 190 Q47 190 47 156 Z"
        fill={`url(#${liquidId})`}
      />

      {/* glass shine */}
      <path
        d="M47 42 Q47 40 50 39 L70 39 Q73 40 73 42 L73 158 L47 158 Z"
        fill={`url(#${shineId})`}
      />

      {/* label */}
      <rect x="36" y="104" width="48" height="42" rx="4" fill="#0d0b18" opacity="0.86" />
      <rect x="36" y="104" width="48" height="42" rx="4" fill="none" stroke="#d4a94a" strokeOpacity="0.5" />
      <text
        x="60"
        y="124"
        textAnchor="middle"
        fontFamily="var(--font-display), Georgia, serif"
        fontWeight="600"
        fontSize="9"
        fill="#eed391"
        letterSpacing="1.5"
      >
        SCENTURY21
      </text>
      <text
        x="60"
        y="138"
        textAnchor="middle"
        fontFamily="var(--font-sans), sans-serif"
        fontSize="5.5"
        fill="#c7c3d8"
        letterSpacing="0.5"
      >
        {product.category.toUpperCase()}
      </text>

      {/* base accent */}
      <rect x="42" y="162" width="36" height="3" rx="1.5" fill="#ffffff" opacity="0.35" />
    </svg>
  );
}
