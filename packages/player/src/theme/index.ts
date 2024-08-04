import { createTheme } from '@mui/material/styles';
import { red } from '@mui/material/colors';

let theme = createTheme({ palette: { mode: 'dark' } });

// Create a theme instance.
theme = createTheme(theme, {
  components: {
    MuiCard: {
      defaultProps: {
        variant: 'outlined',
      },
    },

    MuiFormLabel: {
      styleOverrides: {
        root: {
          marginBottom: theme.spacing(0.5),
          fontWeight: theme.typography.fontWeightBold,
        },
      },
    },

    MuiTextField: {
      defaultProps: {
        inputProps: {
          shrink: true,
        },
        size: 'small',
        variant: 'outlined',
      },
    },
    MuiOutlinedInput: {
      defaultProps: {
        notched: false,
        size: 'small',
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
    },
    MuiButtonBase: {
      defaultProps: {
        disableRipple: true,
      },
    },
  },
});

export default theme;
