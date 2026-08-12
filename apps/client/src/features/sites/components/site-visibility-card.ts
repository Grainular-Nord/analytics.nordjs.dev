import { Card } from '@analytics/ui';
import { html, mounted, on } from '@grainular/nord';
import { siteSettingsStore } from '../store/site-settings.store';
import { sitesStore, type Site } from '../store/sites.store';

type SiteVisibilityCardOptions = {
    site: Site;
    onMessage: (message: string) => void;
};

export const SiteVisibilityCard = ({ site, onMessage }: SiteVisibilityCardOptions) => {
    const saveVisibility = async (event: SubmitEvent) => {
        event.preventDefault();
        const isPublic = new FormData(event.target as HTMLFormElement).get('isPublic') === 'on';
        const response = await sitesStore.actions.updateSite(site.id, { isPublic });
        if (response.ok) siteSettingsStore.actions.setLocal(response.data);
        onMessage(response.ok ? 'Visibility saved' : response.data.message);
    };

    return Card({
        children: html`<h2 class="text-sm font-semibold">Public overview</h2>
            <p class="mt-1 text-sm text-ink-muted">
                Include this site’s aggregate traffic chart on the public dashboard. No site configuration or detailed
                analytics are shared.
            </p>
            <form class="mt-3" ${on('submit', saveVisibility)}>
                <label class="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        name="isPublic"
                        ${mounted((node) => {
                            (node as HTMLInputElement).checked = site.isPublic;
                            return () => {};
                        })}
                    />
                    Show this site publicly
                </label>
                <button
                    type="submit"
                    class="mt-3 cursor-pointer rounded-xs bg-accent px-4 py-2 text-sm font-semibold text-white"
                >
                    Save visibility
                </button>
            </form>`,
    });
};
