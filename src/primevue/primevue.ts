import { type Plugin } from 'vue';
import PrimeVue from 'primevue/config';
import Ripple from 'primevue/ripple';
import { Card, Checkbox, DatePicker, DialogService, Drawer, ToastService, ToggleSwitch, Tooltip } from 'primevue';
import { primevuePreset } from './primevue-preset.ts';
import Button from 'primevue/button';
import TabMenu from 'primevue/tabmenu';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import Toolbar from 'primevue/toolbar';
import Dialog from 'primevue/dialog';
import Toast from 'primevue/toast';
import Divider from 'primevue/divider';
import Fieldset from 'primevue/fieldset';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import Textarea from 'primevue/textarea';
import SelectButton from 'primevue/selectbutton';
import AutoComplete from 'primevue/autocomplete';

export const primevuePlugin: Plugin = {
    install(app) {
        app.directive('ripple', Ripple);
        app.directive('tooltip', Tooltip);

        app.use(ToastService);
        app.use(DialogService);

        app.use(PrimeVue, {
            ripple: true,
            theme: {
                preset: primevuePreset,
                options: {
                    darkModeSelector: false
                }
            }
        });

        app.component('Button', Button);
        app.component('TabMenu', TabMenu);
        app.component('InputText', InputText);
        app.component('InputNumber', InputNumber);
        app.component('Select', Select);
        app.component('Tag', Tag);
        app.component('Toolbar', Toolbar);
        app.component('Dialog', Dialog);
        app.component('Toast', Toast);
        app.component('Card', Card);
        app.component('Drawer', Drawer);
        app.component('DatePicker', DatePicker);
        app.component('ToggleSwitch', ToggleSwitch);
        app.component('Checkbox', Checkbox);
        app.component('Fieldset', Fieldset);
        app.component('Divider', Divider);
        app.component('IconField', IconField);
        app.component('InputIcon', InputIcon);
        app.component('Textarea', Textarea);
        app.component('SelectButton', SelectButton);
        app.component('AutoComplete', AutoComplete);
    }
};
