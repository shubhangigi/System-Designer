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
        {/* Outer ring */}
        <circle cx="20" cy="20" r="19" stroke="#4f8ef7" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.4" />
        {/* Center node */}
        <circle cx="20" cy="20" r="5" fill="#4f8ef7" />
        {/* Top node */}
        <circle cx="20" cy="6" r="3.5" fill="#4f8ef7" opacity="0.9" />
        {/* Bottom-left node */}
        <circle cx="8" cy="30" r="3.5" fill="#4f8ef7" opacity="0.9" />
        {/* Bottom-right node */}
        <circle cx="32" cy="30" r="3.5" fill="#4f8ef7" opacity="0.9" />
        {/* Right node */}
        <circle cx="34" cy="14" r="2.5" fill="#a78bfa" opacity="0.8" />
        {/* Left node */}
        <circle cx="6" cy="14" r="2.5" fill="#a78bfa" opacity="0.8" />
        {/* Center to top */}
        <line x1="20" y1="15" x2="20" y2="9.5" stroke="#4f8ef7" strokeWidth="1.5" />
        {/* Center to bottom-left */}
        <line x1="15.8" y1="23.2" x2="10.5" y2="27.3" stroke="#4f8ef7" strokeWidth="1.5" />
        {/* Center to bottom-right */}
        <line x1="24.2" y1="23.2" x2="29.5" y2="27.3" stroke="#4f8ef7" strokeWidth="1.5" />
        {/* Center to right */}
        <line x1="25" y1="18.5" x2="31.5" y2="15.2" stroke="#a78bfa" strokeWidth="1" opacity="0.7" />
        {/* Center to left */}
        <line x1="15" y1="18.5" x2="8.5" y2="15.2" stroke="#a78bfa" strokeWidth="1" opacity="0.7" />
        {/* Top to right */}
        <line x1="23.3" y1="7.5" x2="31.5" y2="12.2" stroke="#a78bfa" strokeWidth="0.8" opacity="0.4" />
        {/* Top to left */}
        <line x1="16.7" y1="7.5" x2="8.5" y2="12.2" stroke="#a78bfa" strokeWidth="0.8" opacity="0.4" />
      </svg>
      {showText && (
        <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <span style={{ fontWeight: 700, fontSize: s.text, color: 'var(--color-text-primary)', fontFamily: 'Inter, sans-serif' }}>
            System Designer
          </span>
          {size === 'lg' && (
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 400 }}>
              AI Architecture Workspace
            </span>
          )}
        </span>
      )}
    </span>
  );
}
