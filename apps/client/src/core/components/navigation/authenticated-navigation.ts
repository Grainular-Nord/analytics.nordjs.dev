import { html, on } from '@grainular/nord';
import { navigate } from '@grainular/router';
import { authStore } from '../../../lib/auth';
import { NavigationLink } from './navigation-link';

const handleLogout = async () => {
    await authStore.actions.logout();
    navigate('/');
};

export const AuthenticatedNavigation = () => html`${NavigationLink({ href: '/dashboard', label: 'Dashboard' })}
    ${NavigationLink({ href: '/sites', label: 'Manage sites' })}
    ${NavigationLink({ href: '/account', label: 'Account' })}
    <button
        class="ml-2 cursor-pointer rounded-xs px-2 py-1 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
        ${on('click', handleLogout)}
    >
        Log out
    </button>`;
