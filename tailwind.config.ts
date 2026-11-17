import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/renderer/index.html',
    './src/renderer/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        yaru: {
          dark: '#1e1e1e',
          aubergine: '#77216F',
          midAubergine: '#5E2750',
          darkAubergine: '#2C001E',
          orange: '#E95420',
          lightOrange: '#FF7F50',
          warmGrey: '#AEA79F',
          coolGrey: '#333333',
          border: '#3c3b37'
        },
        obsidian: {
          950: '#090a0f',
          900: '#0f1117',
          850: '#151821',
          800: '#1c202c',
          700: '#272d3e',
          600: '#3a425b'
        },
        sensory: {
          emerald: '#10B981',
          amber: '#F59E0B',
          rose: '#F43F5E',
          sapphire: '#3B82F6',
          violet: '#8B5CF6'
        }
      },
      fontFamily: {
        sans: [
          'Ubuntu',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif'
        ],
        mono: [
          '"Ubuntu Mono"',
          'Consolas',
          'monospace'
        ]
      },
      boxShadow: {
        'sensory-glow': '0 0 20px -3px rgba(233, 84, 32, 0.25)',
        'cocoon-glow': '0 0 25px -4px rgba(119, 33, 111, 0.35)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
      }
    }
  },
  plugins: []
}

export default config
