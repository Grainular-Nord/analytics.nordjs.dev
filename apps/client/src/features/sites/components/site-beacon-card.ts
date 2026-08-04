import { Card, Details, Icon } from '@analytics/ui';
import { derived, grain, type Grain } from '@grainular/grains';
import { $if, html, on } from '@grainular/nord';
import { Check, Copy } from 'lucide';
import beaconSource from '../../../../../../packages/beacon/src/beacon.js?raw';
import { API_URL } from '../../../core/services/query';
import type { Site } from '../store/sites.store';

type SiteBeaconCardOptions = {
    site: Grain<Site | null>;
    onMessage: (message: string) => void;
};

export const SiteBeaconCard = ({ site, onMessage }: SiteBeaconCardOptions) => {
    const copied = grain(false);
    const snippet = derived(site, (current) =>
        current ? `<script data-site="${current.key}" data-endpoint="${API_URL}">\n${beaconSource}\n</script>` : '',
    );
    let copiedTimeout: ReturnType<typeof setTimeout> | undefined;

    const copySnippet = async () => {
        try {
            await navigator.clipboard.writeText(snippet());
            onMessage('Snippet copied');
            copied.set(true);
            clearTimeout(copiedTimeout);
            copiedTimeout = setTimeout(() => copied.set(false), 2000);
        } catch {
            onMessage('Could not copy the snippet');
        }
    };

    return Card({
        children: html`<h2 class="text-sm font-semibold">Inline beacon</h2>
            <p class="mt-1 text-sm text-ink-muted">
                Copy the complete, self-contained script into the site's <code>&lt;head&gt;</code>. It sends path +
                referrer only — no cookies, no IPs, no identifiers.
            </p>
            ${Details({
                title: 'Show script',
                children: html`<div class="relative">
                    <pre
                        class="max-w-full overflow-x-auto rounded-xs bg-surface px-3 py-2 pr-11 font-mono text-xs"
                    ><code>${snippet}</code></pre>
                    <button
                        type="button"
                        class="absolute top-2 right-2 grid size-7 shrink-0 cursor-pointer place-items-center rounded-xs border border-line bg-surface-raised text-ink-muted hover:bg-surface hover:text-ink"
                        aria-label="Copy script"
                        title="Copy script"
                        ${on('click', copySnippet)}
                    >
                        ${$if(copied)
                            .$then(() => Icon(Check, { size: 14 }))
                            .$else(() => Icon(Copy, { size: 14 }))}
                    </button>
                </div>`,
            })}`,
    });
};
