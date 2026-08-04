import { html } from '@grainular/nord';
import { createRouter, load, navigate, pre } from '@grainular/router';
import { isLoggedIn, isNotAuthenticated } from './lib/auth';
import { siteDashboardStore } from './features/dashboard/store/site-dashboard.store';
import { siteSettingsStore } from './features/sites/store/site-settings.store';
import { sitesStore } from './features/sites/store/sites.store';
import { summaryStore } from './features/summary/store/summary.store';

export const { query, params, ...router } = createRouter('/', [
    {
        path: '/',
        component: () => import('./features/summary/summary.page'),
        use: [isLoggedIn(), load(async () => summaryStore.actions.load())],
    },
    {
        path: '/sites',
        component: () => import('./features/sites/sites.page'),
        use: [isLoggedIn(), load(async () => sitesStore.actions.fetchSites())],
    },
    {
        path: '/sites/:siteId',
        component: () => import('./features/sites/site-detail.page'),
        use: [
            isLoggedIn(),
            load(async (ctx) => {
                if (ctx.params.siteId) siteSettingsStore.actions.load(ctx.params.siteId);
            }),
        ],
    },
    {
        path: '/account',
        component: () => import('./features/account/account.page'),
        use: [isLoggedIn()],
    },

    {
        path: '/signin',
        component: () => import('./features/auth/signin.page'),
        use: [isNotAuthenticated()],
    },
    {
        path: '/auth/magic',
        component: () => import('./features/auth/magic.page'),
    },

    {
        path: '/error/:code',
        component: () => import('./core/components/error-page'),
    },

    {
        // URL is the source of truth for both
        // which site and which time range are shown: `/:siteId?range=90d`.
        // Declared after every static route above so none of them get
        // shadowed by this single dynamic segment.
        path: '/:siteId',
        component: () => import('./features/dashboard/dashboard.page'),
        use: [
            isLoggedIn(),
            load(async (ctx) => {
                sitesStore.actions.fetchSites();
                if (ctx.params.siteId) siteDashboardStore.actions.load(ctx.params.siteId, ctx.query.range);
            }),
        ],
    },
    {
        path: '*',
        component: () => html``,
        use: [pre(({ redirect }) => redirect('/error/404'))],
    },
]);

export { navigate };
