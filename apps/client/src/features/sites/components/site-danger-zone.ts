import { confirmationDialog, openDialog } from '@analytics/ui';
import { html, on } from '@grainular/nord';
import { navigate } from '../../../router';
import { sitesStore, type Site } from '../store/sites.store';

type SiteDangerZoneOptions = {
    site: Site;
    onMessage: (message: string) => void;
};

export const SiteDangerZone = ({ site, onMessage }: SiteDangerZoneOptions) => {
    const deleteSite = async () => {
        const confirmed = await openDialog(confirmationDialog, {
            caption: 'Delete site?',
            variant: 'danger',
            size: 'sm',
            props: {
                message: `Delete ${site.name} and all of its data? This cannot be undone.`,
                confirmLabel: 'Delete site',
                confirmVariant: 'danger',
            },
        });
        if (!confirmed) return;

        const response = await sitesStore.actions.deleteSite(site.id);
        if (response.ok) navigate('/sites');
        else onMessage(response.data.message);
    };

    return html`<section class="rounded-xs border border-danger/30 p-5">
        <h2 class="text-sm font-semibold text-danger">Danger zone</h2>
        <button
            type="button"
            class="mt-3 cursor-pointer rounded-xs border border-danger/40 px-4 py-2 text-sm font-semibold text-danger"
            ${on('click', deleteSite)}
        >
            Delete site and all data
        </button>
    </section>`;
};
