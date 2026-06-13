import { getServerUrl } from '../utils/function.js';
import { requestJson } from '../utils/request.js';

export const getPosts = cursor => {
    const query = new URLSearchParams();

    if (cursor) {
        query.set('cursor', cursor);
    }

    const queryString = query.toString();
    const url = queryString
        ? `${getServerUrl()}/posts?${queryString}`
        : `${getServerUrl()}/posts`;

    const result = requestJson(url);

    return result;
};

export const searchPosts = (keyword, cursor) => {
    const query = new URLSearchParams({
        keyword,
    });

    if (cursor) {
        query.set('cursor', cursor);
    }

    const result = requestJson(
        `${getServerUrl()}/posts/search?${query.toString()}`,
    );

    return result;
};