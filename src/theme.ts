// Prayticland-wide typeface: Nunito Sans on every non-mono Base Web typography
// scale (his order 2026-10-11). Mono scales keep their monospace stack.
// The font files ship with the app (src/assets/fonts/ + fonts.css); nothing
// is loaded from the Google Fonts CDN at runtime.
import {createTheme, LightTheme} from 'baseui';

export const FONT_STACK =
  "'Nunito Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const typography = Object.fromEntries(
  Object.entries(LightTheme.typography)
    .filter(([key]) => !key.startsWith('Mono'))
    .map(([key, style]) => [key, {...style, fontFamily: FONT_STACK}]),
);

export const theme = createTheme({typography});
