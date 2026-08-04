import { Card } from '@analytics/ui';
import { html, on } from '@grainular/nord';
import { siteSettingsStore } from '../store/site-settings.store';
import { sitesStore, type Site } from '../store/sites.store';

type SiteOriginsCardOptions = {
    site: Site;
    onMessage: (message: string) => void;
};

export const SiteOriginsCard = ({ site, onMessage }: SiteOriginsCardOptions) => {
    const saveOrigins = async (event: SubmitEvent) => {
        event.preventDefault();
        const raw = String(new FormData(event.target as HTMLFormElement).get('origins') ?? '');
        const allowedOrigins = raw
            .split(/[\n,]/)
            .map((origin) => origin.trim())
            .filter(Boolean);

        const response = await sitesStore.actions.updateSite(site.id, { allowedOrigins });
        if (response.ok) siteSettingsStore.actions.setLocal(response.data);
        onMessage(response.ok ? 'Origins saved' : response.data.message);
    };

    return Card({
        children: html`<h2 class="text-sm font-semibold">Allowed origins</h2>
            <p class="mt-1 text-sm text-ink-muted">
                Only these origins may send events for this site (one per line or comma separated).
            </p>
            <form class="mt-3 flex flex-col gap-2" ${on('submit', saveOrigins)}>
                <textarea
                    class="min-h-20 w-full rounded-xs border border-line bg-surface px-3 py-2 font-mono text-xs outline-none focus:border-accent"
                    name="origins"
                >
${site.allowedOrigins.join('\n')}</textarea>
                <button
                    type="submit"
                    class="self-start cursor-pointer rounded-xs bg-accent px-4 py-2 text-sm font-semibold text-white"
                >
                    Save origins
                </button>
            </form>`,
    });
};
