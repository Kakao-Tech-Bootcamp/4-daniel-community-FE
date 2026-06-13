import { getServerUrl } from '../utils/function.js';
import { requestJson } from '../utils/request.js';

export const createPost = boardData => {
    const result = requestJson(`${getServerUrl()}/posts`, {
        method: 'POST',
        body: JSON.stringify({
            title: boardData.title,
            content: boardData.content,
            post_image: boardData.attachFileUrl,
        }),
        headers: {
            'Content-Type': 'application/json',
        },
    });
    return result;
};

export const updatePost = (postId, boardData) => {
    const result = requestJson(`${getServerUrl()}/posts/${postId}`, {
        method: 'PATCH',
        body: JSON.stringify({
            title: boardData.title,
            content: boardData.content,
            post_image: boardData.attachFileUrl,
        }),
        headers: {
            'Content-Type': 'application/json',
        },
    });

    return result;
};

export const fileUpload = ({ name, dataUrl }) => {
    const result = requestJson(`${getServerUrl()}/posts/images`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            post_image_name: name,
            post_image_data: dataUrl,
        }),
    });

    return result;
};

export const getBoardItem = postId => {
    const result = requestJson(`${getServerUrl()}/posts/${postId}`, {
        method: 'GET',
    });

    return result;
};