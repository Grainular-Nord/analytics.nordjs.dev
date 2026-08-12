import { MagicLinkStatus } from '@analytics/auth/client';
import { html } from '@grainular/nord';
import { navigate } from '@grainular/router';
import { authStore } from '../../lib/auth';

export default () => {
    return html`<div class="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
        ${MagicLinkStatus({ store: authStore, onVerified: () => navigate('/dashboard') })}
    </div>`;
};
