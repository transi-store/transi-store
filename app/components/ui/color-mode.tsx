import type { IconButtonProps } from "@chakra-ui/react";
import { ClientOnly, IconButton, Skeleton } from "@chakra-ui/react";
import { ThemeProvider, useTheme } from "next-themes";
import type { ThemeProviderProps } from "next-themes";
import * as React from "react";
import { LuMoon, LuSun } from "react-icons/lu";

type ColorModeProviderProps = ThemeProviderProps;

export function ColorModeProvider(props: ColorModeProviderProps) {
  return (
    <ThemeProvider attribute="class" disableTransitionOnChange {...props} />
  );
}

type ColorMode = "light" | "dark";

interface UseColorModeReturn {
  colorMode: ColorMode;
  setColorMode: (colorMode: ColorMode) => void;
  toggleColorMode: () => void;
}

export function useColorMode(): UseColorModeReturn {
  const { resolvedTheme, setTheme, forcedTheme } = useTheme();
  const colorMode = forcedTheme || resolvedTheme;
  const toggleColorMode = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");

    // if we are on the API doc page, we need to toggle the body class to update the favicon
    // to override scalar's built-in dark mode handling, which relies on body classes.
    if (
      document.body.classList.contains("dark-mode") ||
      document.body.classList.contains("light-mode")
    ) {
      document.body.classList.toggle("dark-mode", colorMode === "light");
      document.body.classList.toggle("light-mode", colorMode === "dark");
    }
  };
  return {
    colorMode: colorMode as ColorMode,
    setColorMode: setTheme,
    toggleColorMode,
  };
}

// export function useColorModeValue<T>(light: T, dark: T) {
//   const { colorMode } = useColorMode();
//   return colorMode === "dark" ? dark : light;
// }

function ColorModeIcon() {
  const { colorMode } = useColorMode();

  return colorMode === "dark" ? <LuMoon /> : <LuSun />;
}

type ColorModeButtonProps = Omit<IconButtonProps, "aria-label">;

export const ColorModeButton = React.forwardRef<
  HTMLButtonElement,
  ColorModeButtonProps
>(function ColorModeButton(props, ref) {
  const { toggleColorMode } = useColorMode();
  return (
    <ClientOnly fallback={<Skeleton boxSize="9" />}>
      <IconButton
        onClick={toggleColorMode}
        variant="ghost"
        aria-label="Toggle color mode"
        size="sm"
        ref={ref}
        {...props}
        css={{
          _icon: {
            width: "5",
            height: "5",
          },
        }}
      >
        <ColorModeIcon />
      </IconButton>
    </ClientOnly>
  );
});

// export const LightMode = React.forwardRef<HTMLSpanElement, SpanProps>(
//   function LightMode(props, ref) {
//     return (
//       <Span
//         color="fg"
//         display="contents"
//         className="chakra-theme light"
//         colorPalette="gray"
//         colorScheme="light"
//         ref={ref}
//         {...props}
//       />
//     );
//   },
// );

// export const DarkMode = React.forwardRef<HTMLSpanElement, SpanProps>(
//   function DarkMode(props, ref) {
//     return (
//       <Span
//         color="fg"
//         display="contents"
//         className="chakra-theme dark"
//         colorPalette="gray"
//         colorScheme="dark"
//         ref={ref}
//         {...props}
//       />
//     );
//   },
// );
