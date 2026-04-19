/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Manrope', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      colors: {
        background:               '#000000',
        surface:                  '#131313',
        surface_low:              '#1b1b1b',
        surface_mid:              '#1f1f1f',
        surface_high:             '#2a2a2a',
        surface_highest:          '#353535',
        surface_bright:           '#393939',
        primary:    { DEFAULT: '#ff2d55', dim: '#93000a', soft: 'rgba(255,45,85,0.12)' },
        secondary:  { DEFAULT: '#16ff9e', dim: '#00e38b', soft: 'rgba(22,255,158,0.1)' },
        tertiary:   { DEFAULT: '#ffffff', dim: '#c6c6c7', soft: 'rgba(255,255,255,0.06)' },
        cyan:       { DEFAULT: '#06b6d4', dim: '#0891b2', soft: 'rgba(6,182,212,0.1)' },
        violet:     { DEFAULT: '#7c3aed', dim: '#6d28d9', soft: 'rgba(124,58,237,0.1)' },
        on_surface:         '#e2e2e2',
        on_surface_variant: '#888888',
        outline:            '#333333',
        outline_variant:    '#222222',
      },
      boxShadow: {
        'ambient':    '0 20px 60px rgba(0,0,0,0.8)',
        'card-hover': '0 32px 80px rgba(0,0,0,0.9)',
        'red-glow':   '0 0 20px rgba(255,45,85,0.35)',
        'green-glow': '0 0 16px rgba(22,255,158,0.3)',
        'cyan-glow':  '0 0 20px rgba(6,182,212,0.4)',
        'inset-red':  'inset 3px 0 0 #ff2d55',
        'inset-cyan': 'inset 3px 0 0 #06b6d4',
        'glass':      '0 8px 32px rgba(0,0,0,0.4)',
      },
      keyframes: {
        'void-in': {
          '0%':   { opacity: '0', transform: 'translateY(12px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0)  scale(1)' },
        },
        'slide-left': {
          '0%':   { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-right': {
          '0%':   { opacity: '0', transform: 'translateX(100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-up': {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-red': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 0 0 rgba(255,45,85,0.4)' },
          '50%':      { opacity: '0.8', boxShadow: '0 0 0 6px rgba(255,45,85,0)' },
        },
        'pulse-cyan': {
          '0%, 100%': { boxShadow: '0 0 0px rgba(6,182,212,0.5)' },
          '50%':      { boxShadow: '0 0 20px rgba(6,182,212,0.5)' },
        },
        'pulse-green': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.4' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-4px)' },
        },
        'spin-slow': {
          '0%':   { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
        'tilt-in': {
          '0%':   { opacity: '0', transform: 'perspective(600px) rotateX(6deg) translateY(16px)' },
          '100%': { opacity: '1', transform: 'perspective(600px) rotateX(0deg) translateY(0)' },
        },
        scanline: {
          '0%':   { top: '-2px' },
          '100%': { top: '100%' },
        },
        'aurora-1': {
          '0%':   { transform: 'translate(0, 0)' },
          '25%':  { transform: 'translate(80px, -60px)' },
          '50%':  { transform: 'translate(0, -120px)' },
          '75%':  { transform: 'translate(-80px, -60px)' },
          '100%': { transform: 'translate(0, 0)' },
        },
        'aurora-2': {
          '0%':   { transform: 'translate(0, 0)' },
          '25%':  { transform: 'translate(-60px, 80px)' },
          '50%':  { transform: 'translate(0, 120px)' },
          '75%':  { transform: 'translate(60px, 80px)' },
          '100%': { transform: 'translate(0, 0)' },
        },
        'twinkle': {
          '0%, 100%': { opacity: '0.2' },
          '50%':      { opacity: '1' },
        },
        'ripple': {
          '0%':   { transform: 'scale(0)', opacity: '1' },
          '70%':  { transform: 'scale(1.5)', opacity: '0.3' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'marquee': {
          '0%':   { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        'drain': {
          '0%':   { width: '100%' },
          '100%': { width: '0%' },
        },
      },
      animation: {
        'void-in':     'void-in 0.45s cubic-bezier(0.16,1,0.3,1) both',
        'slide-left':  'slide-left 0.35s cubic-bezier(0.16,1,0.3,1) both',
        'slide-right': 'slide-right 0.4s cubic-bezier(0.16,1,0.3,1) both',
        'slide-up':    'slide-up 0.35s cubic-bezier(0.16,1,0.3,1) both',
        'pulse-red':   'pulse-red 2s ease-in-out infinite',
        'pulse-cyan':  'pulse-cyan 2s ease-in-out infinite',
        'pulse-green': 'pulse-green 2s ease-in-out infinite',
        'float':       'float 4s ease-in-out infinite',
        'spin-slow':   'spin-slow 8s linear infinite',
        shimmer:       'shimmer 2s linear infinite',
        'tilt-in':     'tilt-in 0.5s cubic-bezier(0.16,1,0.3,1) both',
        scanline:      'scanline 4s linear infinite',
        'aurora-1':    'aurora-1 20s ease-in-out infinite',
        'aurora-2':    'aurora-2 25s ease-in-out infinite',
        ripple:        'ripple 0.6s ease-out forwards',
        marquee:       'marquee 20s linear infinite',
        drain:         'drain 4s linear forwards',
      },
    },
  },
  plugins: [],
}
