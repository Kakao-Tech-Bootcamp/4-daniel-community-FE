import { getAccessToken } from '../utils/request.js';

const setLandingAuthState = () => {
    const isAuthenticated = Boolean(getAccessToken());
    const destination = isAuthenticated
        ? '/html/index.html'
        : '/html/signup.html';

    document.documentElement.dataset.authState = isAuthenticated
        ? 'authenticated'
        : 'guest';

    document.querySelectorAll('[data-auth-primary]').forEach(link => {
        link.href = destination;
        link.textContent = isAuthenticated
            ? link.dataset.userLabel
            : link.dataset.guestLabel;
    });

    document.querySelectorAll('[data-guest-only]').forEach(element => {
        element.hidden = isAuthenticated;
    });
};

setLandingAuthState();
