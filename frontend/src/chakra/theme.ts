/* кастом схим */
import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: "dark",
  useSystemColorMode: false,
};

export const theme = extendTheme(
  { config },
  {
    // config,
    colors: {
      brand: {
        100: '#3d84f7',
      },
    },
    styles: {
      global: () => ({
        body: {
          bg: 'whiteAlpha.200' /* https://chakra-ui.com/docs/styled-system/theme тут выбрал тему */,
        },
      }),
    },
  },
);
