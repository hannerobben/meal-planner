import Aura from '@primevue/themes/aura';
import { definePreset } from '@primevue/themes';

export const primevuePreset = definePreset(Aura, {
    primitive: {
        green: {
            50: '#F1F8E9',
            100: '#DCEDC8',
            200: '#C5E1A5',
            300: '#AED581',
            400: '#2E7D32',
            500: '#1B5E20',
            600: '#174D1A',
            700: '#133B14',
            800: '#0F2A0F',
            900: '#0A1A0A'
        },
        gray: {
            50: '#F7F7F7',
            100: '#EEEEEE',
            200: '#D5D5D5',
            300: '#BEBEBE',
            400: '#9E9E9E',
            500: '#7E7E7E',
            600: '#5F5F5F',
            700: '#424242',
            800: '#2E2E2E',
            900: '#1C1C1C'
        }
    },
    components: {
        togglebutton: {
            colorScheme: {
                light: {
                    content: {
                        checkedBackground: '#a8d5a2',
                        checkedHoverBackground: '#90c98a',
                        checkedColor: '#1a5c2a',
                    }
                }
            }
        },
        button: {
            colorScheme: {
                light: {
                    root: {
                        primary: {
                            background: '#a8d5a2',
                            hoverBackground: '#90c98a',
                            activeBackground: '#78bc72',
                            borderColor: '#a8d5a2',
                            hoverBorderColor: '#90c98a',
                            activeBorderColor: '#78bc72',
                            color: '#1a5c2a',
                            hoverColor: '#1a5c2a',
                            activeColor: '#1a5c2a',
                        },
                        secondary: {
                            background: '#dbe8f5',
                            hoverBackground: '#c8d9ef',
                            activeBackground: '#b5cae9',
                            borderColor: '#dbe8f5',
                            hoverBorderColor: '#c8d9ef',
                            activeBorderColor: '#b5cae9',
                            color: '#1e3a5f',
                            hoverColor: '#1e3a5f',
                            activeColor: '#1e3a5f',
                        }
                    }
                }
            }
        }
    },
    semantic: {
        colorScheme: {
            light: {
                primary: {
                    color: '{green.400}',
                    50: '{green.50}',
                    100: '{green.100}',
                    200: '{green.200}',
                    300: '{green.300}',
                    400: '{green.400}',
                    500: '{green.500}',
                    600: '{green.600}',
                    700: '{green.700}',
                    800: '{green.800}',
                    900: '{green.900}',
                    hover: { color: '{green.500}' },
                    active: { color: '{green.500}' }
                }
            },
            dark: {}
        }
    }
});
