import { $if, html } from '@grainular/nord';
import { APP_TITLE } from '../app-config';
import { authStore } from '../../lib/auth';
import { AuthenticatedNavigation } from './navigation/authenticated-navigation';
import { NavigationLink } from './navigation/navigation-link';

export const TopNavigation = () => {
    return html`<header class="sticky top-0 z-10 border-b border-line bg-surface/90 backdrop-blur">
        <div
            class="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-6"
        >
            <a class="text-sm font-semibold tracking-tight" href="/"> ${APP_TITLE} </a>
            <nav class="flex flex-wrap items-center justify-end gap-1">
                ${$if(authStore.state.isAuthenticated)
                    .$then(AuthenticatedNavigation)
                    .$else(() => NavigationLink({ href: '/signin', label: 'Sign in' }))}
            </nav>
        </div>
    </header>`;
};
