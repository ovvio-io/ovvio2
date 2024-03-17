import React, { useContext, useEffect, useMemo } from 'react';

export interface NewTheme {
  background: BackgroundPallete;

  primary: {
    p1: string;
    p2: string;
    p3: string;
    p4: string;
    p5: string;
    p6: string;
    p7: string;
    p8: string;
    p9: string;
    p10: string;
  };
  secondary: {
    s0: string;
    s1: string;
    s2: string;
    s3: string;
    s4: string;
    s5: string;
    s6: string;
    s7: string;
  };
  mono: {
    m0: string;
    m1: string;
    m2: string;
    m3: string;
    m4: string;
    m5: string;
    m6: string;
    m10: string;
  };
  shadows: {
    z1: string;
    z2: string;
    z3: string;
    z4: string;
  };
  supporting: {
    B1: string;
    B2: string;
    B3: string;
    B4: string;
    G1: string;
    G2: string;
    G3: string;
    G4: string;
    O1: string;
    O2: string;
    O3: string;
    O4: string;
    R1: string;
    R2: string;
    R3: string;
    R4: string;
    C1: string;
    C2: string;
    C4: string;
    L1: string;
    L2: string;
    L4: string;
    V1: string;
    V2: string;
    V4: string;
    T1: string;
    T2: string;
    T4: string;
  };
  colors: {
    text: string;
    grayedText: string;
    background: string;
    main: string;
    primaryButton: string;
    primaryButtonText: string;
    secondaryButton: string;
    secondaryButtonActive: string;
    barActionText: string;
    placeholderText: string;
    toggleButtonActiveIcon: string;
    toggleButtonInactiveIcon: string;
    primaryButtonStroke: string;
  };
}

export const lightColorWheel = {
  primary: {
    p1: '#f5f9fb',
    p2: '#e0eef4',
    p3: '#cce3ed',
    p4: '#abd4ee',
    p5: '#8bc5ee',
    p6: '#6ab6ef',
    p7: '#57a5e9',
    p8: '#5793E0',
    p9: '#3184DD',
    p10: '#1960cf',
  },
  secondary: {
    s0: '#FFFBF5',
    s1: '#FBF6EF',
    s2: '#f5ecdc',
    s3: '#FBEAC8',
    s4: '#FAE2B4',
    s5: '#EFD2AB',
    s6: '#F5C36A',
    s7: '#f9b55a',
  },
  mono: {
    m0: '#ffffff',
    m1: '#e5e5e5',
    m2: '#cccccc',
    m3: '#B3B3B3',
    m4: '#8c8c8c',
    m5: '#4D4D4D',
    m6: '#3f3f3f',
    m10: '#262626',
  },
  supporting: {
    B1: '#EDE1CB',
    B2: '#CEBFA3',
    B3: '#B4A68C',
    B4: '#978461',
    G1: '#C5D9BF',
    G2: '#92AD8A',
    G3: '#75A27E',
    G4: '#4A6144',
    O1: '#FDB797',
    O2: '#E68B60',
    O3: '#C25A3E',
    O4: '#AA4428',
    R1: '#E5AFA2',
    R2: '#B78775',
    R3: '#945A52',
    R4: '#6C2C23',
    C1: '#FBD5B6',
    C2: '#F2B482',
    C4: '#BE6F2F',
    L1: '#E8ECF1',
    L2: '#CDD3DC',
    L4: '#8896AC',
    V1: '#E7E0ED',
    V2: '#C8B9D6',
    V4: '#836C98',
    T1: '#C5EAEC',
    T2: '#8BC7CB',
    T4: '#2B9CA3',
  },
};

export const brandLightTheme: NewTheme = {
  ...lightColorWheel,
  shadows: {
    z1: '0 3px 6px 0 rgba(14, 30, 62, 0.08)',
    z2: '0px 0px 4px rgba(151, 132, 97, 0.25)',
    z3: '0 1px 2px 0 rgb(60 64 67 / 30%), 0 1px 3px 1px rgb(60 64 67 / 15%)',
    z4: '0 1px 3px 0 rgb(60 64 67 / 30%), 0 4px 8px 3px rgb(60 64 67 / 15%)',
  },
  colors: {
    text: lightColorWheel.mono.m10,
    grayedText: lightColorWheel.mono.m3,
    background: lightColorWheel.mono.m0,
    main: lightColorWheel.primary.p6,
    primaryButton: lightColorWheel.primary.p9,
    primaryButtonStroke: lightColorWheel.primary.p10, //amit added (temp)
    primaryButtonText: lightColorWheel.mono.m0,
    secondaryButton: lightColorWheel.secondary.s2,
    secondaryButtonActive: lightColorWheel.secondary.s7,
    barActionText: lightColorWheel.supporting.R4,
    placeholderText: lightColorWheel.mono.m4,
    toggleButtonActiveIcon: lightColorWheel.secondary.s1,
    toggleButtonInactiveIcon: lightColorWheel.secondary.s5,
  },
};

interface BackgroundPallete {
  0: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  text: string;
  textSecondary: string;
  placeholderText: string;
}

interface ColorPallete {
  200: string;
  400: string;
  500: string;
}

export interface Theme {
  background: BackgroundPallete;
  primary: ColorPallete;
  shadows: {
    z1: string;
    z2: string;
    z3: string;
    z4: string;
  };
}

function componentToHex(component: number) {
  const hex = component.toString(16);
  return hex.length === 0 ? `0${hex}` : hex;
}

export function rgbToHex([r, g, b]: [number, number, number]): string {
  return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;
}

export function hexToRgb(hex: string): [number, number, number] {
  if (hex.startsWith('#')) {
    hex = hex.slice(1);
  }
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return [r, g, b];
}

export function makeTransparent(
  [r, g, b, a]: [number, number, number, number],
  background: string
) {
  const [backR, backG, backB] = hexToRgb(background);
  const diffAlpha = 1 - a;
  const newColor: [number, number, number] = [
    ~~(r * a + backR * diffAlpha),
    ~~(g * a + backG * diffAlpha),
    ~~(b * a + backB * diffAlpha),
  ];
  return rgbToHex(newColor);
}

export function unTransparent(
  [r, g, b]: [number, number, number],
  background: string,
  alpha: number
) {
  const [backR, backG, backB] = hexToRgb(background);
  const diffAlpha = 1 - alpha;
  const newColor: [number, number, number] = [
    ~~((r - diffAlpha * backR) / alpha),
    ~~((g - diffAlpha * backG) / alpha),
    ~~((b - diffAlpha * backB) / alpha),
  ];

  return rgbToHex(newColor);
}

export const lightTheme: Theme = {
  background: {
    '0': '#FFFFFF',
    '100': brandLightTheme.secondary.s0,
    '200': '#fbfcff',
    '300': '#f0f3fa',
    '400': brandLightTheme.secondary.s2,
    '500': brandLightTheme.mono.m1,
    '600': brandLightTheme.secondary.s7,
    '700': '#4a4a4a',
    '800': '#11082b',
    '900': '#1e1b33',
    text: brandLightTheme.mono.m10,
    textSecondary: makeTransparent([...hexToRgb('#121212'), 0.6], '#FFFFFF'),
    placeholderText: brandLightTheme.mono.m4,
  },
  primary: {
    '200': brandLightTheme.primary.p1,
    '400': brandLightTheme.primary.p6,
    '500': brandLightTheme.primary.p9,
  },
  shadows: {
    z1: '0 3px 6px 0 rgba(14, 30, 62, 0.08)',
    z2: '0px 4px 4px rgba(0, 0, 0, 0.25), 0px 1px 2px rgba(0, 0, 0, 0.1)',
    z3: '0 1px 2px 0 rgb(60 64 67 / 30%), 0 1px 3px 1px rgb(60 64 67 / 15%)',
    z4: '0 1px 3px 0 rgb(60 64 67 / 30%), 0 4px 8px 3px rgb(60 64 67 / 15%)',
  },
};

export const darkTheme: Theme = {
  background: {
    '0': '#212121',
    '100': '#424242',
    '200': '#616161',
    '300': '#757575',
    '400': '#9E9E9E',
    '500': '#BDBDBD',
    '600': '#E0E0E0',
    '700': '#EEEEEE',
    '800': '#F5F5F5',
    '900': '#FAFAFA',
    text: '#EEEEEE',
    textSecondary: '#121212',
    placeholderText: '#f8faffb3',
  },
  primary: {
    '200': '#fff9f6',
    '400': '#ff8000',
    '500': '#f96500',
  },
  shadows: {
    z1: '0 3px 6px 0 rgba(14, 30, 62, 0.08)',
    z2: '0px 4px 4px rgba(0, 0, 0, 0.25), 0px 1px 2px rgba(0, 0, 0, 0.1)',
    z3: '0 1px 2px 0 rgb(60 64 67 / 30%), 0 1px 3px 1px rgb(60 64 67 / 15%)',
    z4: '0 1px 3px 0 rgb(60 64 67 / 30%), 0 4px 8px 3px rgb(60 64 67 / 15%)',
  },
};

export const cssTheme: Theme = {
  background: {
    '0': `var(--background-0, ${lightTheme.background[0]})`,
    '100': `var(--background-100, ${lightTheme.background[100]})`,
    '200': `var(--background-200, ${lightTheme.background[200]})`,
    '300': `var(--background-300, ${lightTheme.background[300]})`,
    '400': `var(--background-400, ${lightTheme.background[400]})`,
    '500': `var(--background-500, ${lightTheme.background[500]})`,
    '600': `var(--background-600, ${lightTheme.background[600]})`,
    '700': `var(--background-700, ${lightTheme.background[700]})`,
    '800': `var(--background-800, ${lightTheme.background[800]})`,
    '900': `var(--background-900, ${lightTheme.background[900]})`,
    text: `var(--background-text, ${lightTheme.background.text})`,
    textSecondary: `var(--text-secondary, ${lightTheme.background.textSecondary})`,
    placeholderText: `var(--background-placeholder, ${lightTheme.background.placeholderText})`,
  },
  primary: {
    '200': `var(--primary-200, ${lightTheme.primary[200]})`,
    '400': `var(--primary-400, ${lightTheme.primary[400]})`,
    '500': `var(--primary-500, ${lightTheme.primary[500]})`,
  },
  shadows: {
    z1: `var(--shadow-z1, ${lightTheme.shadows.z1})`,
    z2: `var(--shadow-z2, ${lightTheme.shadows.z2})`,
    z3: `var(--shadow-z3, ${lightTheme.shadows.z3})`,
    z4: `var(--shadow-z4, ${lightTheme.shadows.z4})`,
  },
};

const themeContext = React.createContext<Theme>(lightTheme);

export function useTheme() {
  return useContext(themeContext);
}

export type ThemeProviderProps = React.PropsWithChildren<{
  theme: Theme;
  isRoot?: boolean;
}>;

export function ThemeProvider(props: ThemeProviderProps) {
  const { theme, children, isRoot = false } = props;
  const style = useMemo(() => {
    return {
      '--background-0': theme.background[0],
      '--background-100': theme.background[100],
      '--background-200': theme.background[200],
      '--background-300': theme.background[300],
      '--background-400': theme.background[400],
      '--background-500': theme.background[500],
      '--background-600': theme.background[600],
      '--background-700': theme.background[700],
      '--background-800': theme.background[800],
      '--background-900': theme.background[900],
      '--background-text': theme.background.text,
      '--background-text-secondary': theme.background.textSecondary,
      '--background-placeholder': theme.background.placeholderText,
      '--primary-200': theme.primary[200],
      '--primary-400': theme.primary[400],
      '--primary-500': theme.primary[500],
      '--shadows-z1': theme.shadows.z1,
      '--shadows-z2': theme.shadows.z2,
      '--shadows-z3': theme.shadows.z3,
      '--shadows-z4': theme.shadows.z4,
    };
  }, [theme]);
  useEffect(() => {
    if (!isRoot) {
      return;
    }

    for (const [key, value] of Object.entries(style)) {
      document.body.style.setProperty(key, value);
    }
  }, [isRoot, style]);

  return (
    <themeContext.Provider value={theme}>{children}</themeContext.Provider>
  );
}
