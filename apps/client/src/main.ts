import { mount } from '@grainular/nord';
import { App } from './app';
import { APP_TITLE } from './core/app-config';
import { authStore } from './lib/auth';

document.title = APP_TITLE;
await authStore.actions.fetchIdentity();
mount(App, { to: document.body });
