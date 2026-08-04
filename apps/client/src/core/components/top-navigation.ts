import { $if, html, on } from '@grainular/nord';
import { active, navigate } from '@grainular/router';
import { APP_TITLE } from '../app-config';
import { authStore } from '../../lib/auth';

const NavigationLink = (item: { href: string; label: string }) => {
    return html`<a
        class="rounded-xs px-2 py-1 text-sm font-medium text-ink-muted transition-colors hover:text-ink [&.active]:bg-accent-soft [&.active]:text-ink"
        ${active('active')}
        href="${item.href}"
    >
        ${item.label}
    </a>`;
};

const handleLogout = async () => {
    await authStore.actions.logout();
    navigate('/');
};

export const TopNavigation = () => {
    return html`<header class="sticky top-0 z-10 border-b border-line bg-surface/90 backdrop-blur">
        <div
            class="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-2 px-4 py-3 sm:gap-4 sm:px-6"
        >
            <a class="text-sm font-semibold tracking-tight" href="/"> ${APP_TITLE} </a>
            <nav class="flex flex-wrap items-center justify-end gap-1">
                ${NavigationLink({ href: '/', label: 'Dashboard' })}
                ${$if(authStore.state.isAuthenticated)
                    .$then(
                        () => html`${NavigationLink({ href: '/sites', label: 'Manage sites' })}
                            ${NavigationLink({ href: '/account', label: 'Account' })}
                            <button
                                class="ml-2 cursor-pointer rounded-xs px-2 py-1 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
                                ${on('click', handleLogout)}
                            >
                                Log out
                            </button>`,
                    )
                    .$else(() => NavigationLink({ href: '/signin', label: 'Sign in' }))}
            </nav>
        </div>
    </header>`;
};
