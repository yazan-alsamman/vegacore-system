/**
 * VegaCore brand tokens — extracted from visual/Vega Core - Logo File.ai
 */
export const brand = {
  colors: {
    black: '#231F20',
    white: '#FFFFFF',
    navy: '#2E3192',
    blue: '#2B3990',
    cyan: '#00AEEF',
    red: '#ED1C24',
    green: '#00A651',
    magenta: '#EC008C',
    yellow: '#FFF200',
    gold: '#F7B040',
    teal: '#00A79D',
    purple: '#662D91',
    gray: {
      50: '#F7F8FC',
      100: '#EEF0F7',
      200: '#DDE2EF',
      300: '#C5CCDF',
      400: '#8E97B0',
      500: '#5C6478',
      600: '#3D4455',
      700: '#252A38',
      800: '#15192A',
      900: '#0B0E18',
    },
  },
  gradient: {
    primary: 'linear-gradient(135deg, #2E3192 0%, #00AEEF 55%, #00A651 100%)',
    hero: 'linear-gradient(160deg, #1a1f4e 0%, #2E3192 40%, #00AEEF 100%)',
    sidebar: 'linear-gradient(180deg, #1a1f4e 0%, #231F20 100%)',
    accent: 'linear-gradient(90deg, #ED1C24, #EC008C, #2E3192, #00AEEF, #00A651)',
  },
  fonts: {
    sans: 'var(--font-brand)',
    display: 'var(--font-brand)',
  },
} as const;
