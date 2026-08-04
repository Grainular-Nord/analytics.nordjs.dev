import { PasskeyManager } from '@analytics/auth/client';
import { derived } from '@grainular/grains';
import { html } from '@grainular/nord';
import { Container, PageHeader } from '@analytics/ui';
import { authStore } from '../../lib/auth';

export default () => {
    return Container({
        class: 'flex flex-col gap-6',
        children: html`${PageHeader({
            title: 'Account',
            description: html`${derived(authStore.state.identity, (user) => user?.email ?? '')}`,
        })}
        ${PasskeyManager({ store: authStore })}`,
    });
};
