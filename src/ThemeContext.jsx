import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material';

const ThemeContext = createContext();

export const useThemeContext = () => useContext(ThemeContext);

export const CustomThemeProvider = ({ children }) => {
    // Determine initial mode from localStorage or system preference
    const [mode, setMode] = useState(() => {
        const storedTheme = localStorage.getItem('theme');
        if (storedTheme === 'light' || storedTheme === 'dark') {
            return storedTheme;
        }
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });

    const [configTheme, setConfigTheme] = useState(null);

    // Persist mode to localStorage when it changes
    useEffect(() => {
        localStorage.setItem('theme', mode);
        if (mode === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    }, [mode]);

    // Apply config-based theme or base mode
    const theme = useMemo(() => {
        let themeOptions = {
            palette: {
                mode,
                primary: {
                    main: '#6750A4', // M3 seed color
                },
                ...(mode === 'dark' && {
                    background: {
                        default: '#000000',
                        paper: '#1e293b',
                    },
                }),
            },
            typography: {
                fontFamily: 'var(--font-family, "Roboto", "Helvetica", "Arial", sans-serif)',
                h1: { fontFamily: 'var(--font-family-heading, var(--font-family, inherit))' },
                h2: { fontFamily: 'var(--font-family-heading, var(--font-family, inherit))' },
                h3: { fontFamily: 'var(--font-family-heading, var(--font-family, inherit))' },
                h4: { fontFamily: 'var(--font-family-heading, var(--font-family, inherit))' },
                h5: { fontFamily: 'var(--font-family-heading, var(--font-family, inherit))' },
                h6: { fontFamily: 'var(--font-family-heading, var(--font-family, inherit))' },
            },
        };

        if (configTheme) {
            if (typeof configTheme === 'string') {
                // If string, we might just use the active mode unless configTheme itself overrides
                // but Flow.jsx handles appending the CSS link for string-based themes.
                // We'll just stick to our mode for MUI components.
            } else if (typeof configTheme === 'object') {
                // Merge config object into themeOptions. 
                // We map known keys like primary, secondary.
                if (configTheme.mode) {
                    themeOptions.palette.mode = configTheme.mode;
                }
                if (configTheme.primary) {
                    themeOptions.palette.primary = { main: configTheme.primary };
                }
                if (configTheme.secondary) {
                    themeOptions.palette.secondary = { main: configTheme.secondary };
                }
                // Inject CSS variables to root
                const rootStyle = document.documentElement.style;
                Object.keys(configTheme).forEach(key => {
                    if (key.startsWith('--')) {
                        rootStyle.setProperty(key, configTheme[key]);
                    }
                });
            }
        }

        return createTheme(themeOptions);
    }, [mode, configTheme]);

    const toggleTheme = () => {
        setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
    };

    const setThemeFromConfig = (loadedTheme) => {
        setConfigTheme(loadedTheme);
    };

    return (
        <ThemeContext.Provider value={{ mode, toggleTheme, setThemeFromConfig, configTheme }}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                {children}
            </ThemeProvider>
        </ThemeContext.Provider>
    );
};
