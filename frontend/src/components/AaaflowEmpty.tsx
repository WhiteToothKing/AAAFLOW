import { useId, type ReactNode } from 'react';
import { Empty, theme, type EmptyProps } from 'antd';

const GRAY_400 = '#9CA3AF';

function ArtThemedIllustration({ uid }: { uid: string }) {
  return (
    <svg
      width="120"
      height="100"
      viewBox="0 0 120 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id={`aae-g1-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2563EB" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.25" />
        </linearGradient>
        <linearGradient id={`aae-g2-${uid}`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#A78BFA" />
        </linearGradient>
      </defs>
      <rect x="10" y="14" width="100" height="72" rx="10" fill={`url(#aae-g1-${uid})`} />
      <polygon points="24,78 42,38 58,58 76,28 98,70" fill="none" stroke={`url(#aae-g2-${uid})`} strokeWidth="3" strokeLinejoin="round" />
      <rect x="22" y="22" width="22" height="22" rx="4" fill="#2563EB" opacity="0.35" />
      <circle cx="88" cy="36" r="12" fill="#7C3AED" opacity="0.35" />
      <rect x="48" y="48" width="28" height="6" rx="2" fill="#E5E7EB" />
      <rect x="48" y="58" width="20" height="6" rx="2" fill="#E5E7EB" opacity="0.8" />
    </svg>
  );
}

export type AaaflowEmptyProps = EmptyProps & {
  /** Secondary line below the main description, styled as gray-400. */
  subtitle?: ReactNode;
  /** Optional primary action (e.g. button). Renders with any `children` from Empty. */
  action?: ReactNode;
};

/**
 * 统一空状态：几何风插画 + 说明文案；可选副标题与操作区。
 */
export function AaaflowEmpty({
  styles,
  image,
  subtitle,
  action,
  description,
  children,
  className,
  ...rest
}: AaaflowEmptyProps) {
  const { token } = theme.useToken();
  const svgUid = useId().replace(/:/g, '');

  const resolvedImage = image ?? <ArtThemedIllustration uid={svgUid} />;

  const mergedDescription: ReactNode =
    subtitle != null ? (
      <div style={{ textAlign: 'center' as const }}>
        {typeof description === 'string' || typeof description === 'number' ? (
          <div style={{ color: token.colorText, fontSize: token.fontSizeLG }}>{description}</div>
        ) : (
          description
        )}
        <div
          style={{
            color: GRAY_400,
            fontSize: token.fontSize,
            marginTop: 6,
            lineHeight: token.lineHeight,
          }}
        >
          {subtitle}
        </div>
      </div>
    ) : (
      description
    );

  const mergedClassName = ['animate-fade-in-up', className].filter(Boolean).join(' ');

  return (
    <Empty
      image={resolvedImage}
      styles={{
        ...styles,
        description:
          subtitle != null
            ? { marginTop: token.marginXS, ...styles?.description }
            : {
                color: token.colorTextSecondary,
                ...styles?.description,
              },
      }}
      description={mergedDescription}
      className={mergedClassName}
      {...rest}
    >
      {children}
      {action}
    </Empty>
  );
}
