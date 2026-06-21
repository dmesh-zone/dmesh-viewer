import React from 'react';
import { useThemeContext } from './ThemeContext';
import { IconButton, Tooltip } from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';

const ThemeToggle = () => {
    const { mode, toggleTheme } = useThemeContext();

    return (
        <div className="input-container-style" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2px',
            backgroundColor: 'transparent'
        }}>
            <Tooltip title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>
                <IconButton onClick={toggleTheme} color="inherit" size="small">
                    {mode === 'light' ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
                </IconButton>
            </Tooltip>
        </div>
    );
};

export default ThemeToggle;
