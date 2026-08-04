import { pre } from '@grainular/router';
import type { AuthStore } from './auth.store';

export type AuthGuardPaths = {
    /** Where an unauthenticated visitor is sent. Defaults to '/signin'. */
    signinPath?: string;
    /** Where an already-authenticated visitor is sent away from signinPath. Defaults to '/'. */
    homePath?: string;
};

export const createAuthGuards = (store: AuthStore, paths: AuthGuardPaths = {}) => {
    const signinPath = paths.signinPath ?? '/signin';
    const homePath = paths.homePath ?? '/';

    const isLoggedIn = () =>
        pre(({ redirect }) => {
            if (!store.state.isAuthenticated()) {
                redirect(signinPath);
                return false;
            }
            return true;
        });

    const isNotAuthenticated = () =>
        pre(({ redirect }) => {
            if (!store.state.isAuthenticated()) return true;
            redirect(homePath);
            return false;
        });

    return { isLoggedIn, isNotAuthenticated };
};
