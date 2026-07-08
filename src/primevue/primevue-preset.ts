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
