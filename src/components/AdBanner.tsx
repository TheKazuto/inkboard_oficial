'use client'

export default function AdBanner({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative overflow-visible ${className}`}
      style={{ minHeight: 90 }}
    >
      {/* Label no canto superior direito da borda */}
      <span style={{
        position: 'absolute',
        top: -8,
        right: 8,
        fontSize: 9,
        lineHeight: 1,
        color: '#c4b5fd',
        background: 'var(--ink-bg, #FAFAFF)',
        padding: '1px 4px',
        borderRadius: 3,
        letterSpacing: '0.04em',
        pointerEvents: 'none',
        zIndex: 1,
        userSelect: 'none',
      }}>
        Ad area
      </span>

      <div style={{
        width: '100%',
        height: '100%',
        minHeight: 90,
        border: '1px dashed #e8e0fe',
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
      }}>
        <p style={{
          fontSize: 13,
          color: '#a78bfa',
          letterSpacing: '0.01em',
          userSelect: 'none',
        }}>
          Advertise here →{' '}
          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLSc4HmUzes30tavHHsK_4SHa9V3ksPIrXXkwQcjx1Cn9eZZhgQ/viewform"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#7c3aed',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Become a partner
          </a>
        </p>
      </div>
    </div>
  )
}
