import { AsyncBoundary, Container, PageHeader } from '@analytics/ui';
import { derived, grain, type Grain, type WritableGrain } from '@grainular/grains';
import { $if, html } from '@grainular/nord';
import { SiteBeaconCard } from './components/site-beacon-card';
import { SiteDangerZone } from './components/site-danger-zone';
import { SiteOriginsCard } from './components/site-origins-card';
import { siteSettingsStore } from './store/site-settings.store';
import type { Site } from './store/sites.store';

type SiteSettingsContentOptions = {
    site: Grain<Site | null>;
    message: WritableGrain<string | null>;
};

const SiteSettingsContent = ({ site, message }: SiteSettingsContentOptions) => {
    const current = site();
    if (!current) return html`<p class="text-sm text-ink-muted">This site is no longer available.</p>`;

    return html`<div class="flex flex-col gap-5">
        ${PageHeader({
            back: { href: '/sites', label: 'Manage sites' },
            title: current.name,
            description: current.domain,
        })}
        ${$if(derived(message, (value) => !!value)).$then(
            () => html`<div class="text-sm text-accent">${message}</div>`,
        )}
        ${SiteBeaconCard({ site, onMessage: message.set })}
        ${SiteOriginsCard({ site: current, onMessage: message.set })}
        ${SiteDangerZone({ site: current, onMessage: message.set })}
    </div>`;
};

export default () => {
    const { site, error, loading } = siteSettingsStore.state;
    const message = grain<string | null>(null);

    return Container({
        class: 'flex flex-col gap-5',
        children: html`${AsyncBoundary({
            loading,
            error,
            loadingText: 'Loading site…',
            children: () => SiteSettingsContent({ site, message }),
        })}`,
    });
};
