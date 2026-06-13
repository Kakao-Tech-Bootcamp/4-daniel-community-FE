export const parseJsonSafe = async response => {
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
        return null;
    }
    try {
        return await response.json();
    } catch (error) {
        return null;
    }
};

const ACCESS_TOKEN_KEY = 'accessToken';

export const getAccessToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const setAccessToken = token => {
    if (typeof window === 'undefined' || !token) return;
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
};

export const removeAccessToken = () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
};

const createHeaders = headers => {
    const nextHeaders = new Headers(headers || {});
    const accessToken = getAccessToken();

    if (accessToken && !nextHeaders.has('Authorization')) {
        nextHeaders.set('Authorization', `Bearer ${accessToken}`);
    }

    return nextHeaders;
};

export const requestJson = async (url, options = {}) => {
    const response = await fetch(url, {
        ...options,
        headers: createHeaders(options.headers),
    });
    const body = await parseJsonSafe(response);

    if (response.status === 401) {
        removeAccessToken();
    }

    return {
        response,
        ok: response.ok,
        status: response.status,
        code: body && body.code
            ? body.code
            : body && body.message
                ? body.message
                : null,
        message: body && body.message ? body.message : null,
        data: body && Object.prototype.hasOwnProperty.call(body, 'data')
            ? body.data
            : null,
        body,
    };
};
