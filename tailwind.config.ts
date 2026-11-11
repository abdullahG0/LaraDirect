import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

// LaraDirect brand kit (Nov 2026): deep navy, electric cyan CTAs, teal text accents, sky blue, off-white.
// Cyan is for button fills only (navy text on top). Use brand-600 teal for text/links on white (contrast >= 4.5:1).
const config: Config = {
  darkMode: ['class', 'class'], // admin only; storefront stays light
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        '2xl': '1280px',
      },
    },
    extend: {
      colors: {
        brand: {
          '50': '#EEF5FB',
          '100': '#DCEBF7',
          '600': '#0E7490',
          '700': '#155E75',
          '800': '#16264A',
          '900': '#0E1E3E',
        },
        cta: {
          DEFAULT: '#22D3EE',
          hover: '#06C2DD',
          foreground: '#0E1E3E',
        },
        sky: {
          '300': '#8EC9F3',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
          '500': '#0E8A9A',
        },
        success: {
          '600': '#047857',
        },
        warn: {
          '500': '#F59E0B',
          '700': '#B45309',
        },
        danger: {
          '500': '#DC2626',
        },
        ink: {
          '400': '#94A3B8',
          '600': '#475569',
          '900': '#0F172A',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          alt: '#F4F6F9',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-outfit)', 'var(--font-inter)', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.75rem',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      maxWidth: {
        content: '1280px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(14, 30, 62, 0.06), 0 2px 8px rgba(14, 30, 62, 0.05)',
        'card-hover': '0 4px 12px rgba(14, 30, 62, 0.10), 0 12px 32px rgba(14, 30, 62, 0.08)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [animate],
};

export default config;
