interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const sizes = {
  sm: { icon: 24, text: 14, gap: 8 },
  md: { icon: 32, text: 16, gap: 10 },
  lg: { icon: 48, text: 22, gap: 14 },
};

export function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const s = sizes[size];
  return (
    <span className={`flex items-center ${className}`} style={{ gap: s.gap }}>
      <svg width={s.icon} height={s.icon} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        {/* Architectural Hexagon Node Outline */}
        <path d="M20 4 L34 12 V28 L20 36 L6 28 V12 Z" stroke="#6B462B" strokeWidth="2" strokeLinejoin="round" fill="none" />
        {/* Isometric Cube Edges */}
        <path d="M20 4 V20 M20 20 L6 12 M20 20 L34 12" stroke="#6B462B" strokeWidth="1.5" strokeLinecap="round" />
        {/* Central Architecture Core */}
        <circle cx="20" cy="20" r="3.5" fill="#D4A359" />
        <circle cx="20" cy="12" r="2.5" fill="#6B462B" />
        <circle cx="13" cy="24" r="2.5" fill="#6B462B" />
        <circle cx="27" cy="24" r="2.5" fill="#6B462B" />
      </svg>
      {showText && (
        <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <span style={{ fontWeight: 700, fontSize: s.text, color: 'var(--color-text-primary)', fontFamily: 'Georgia, serif' }}>
            System Designer
          </span>
          {size === 'lg' && (
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 400 }}>
              Architecture Engineering Workspace
            </span>
          )}
        </span>
      )}
    </span>
  );
}
