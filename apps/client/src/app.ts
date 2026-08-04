import { html } from '@grainular/nord';
import { $outlet } from '@grainular/router';
import { TopNavigation } from './core/components/top-navigation';
import { router } from './router';

export const App = () => {
    return html`
        ${TopNavigation()}
        <main>
            ${$outlet({
                for: router,
            })}
        </main>
    `;
};
