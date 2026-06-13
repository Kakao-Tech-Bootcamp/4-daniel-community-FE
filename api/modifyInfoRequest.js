import { getServerUrl } from '../utils/function.js';
import { requestJson } from '../utils/request.js';

export const userModify = async changeData => {
    const result = await requestJson(`${getServerUrl()}/users/me`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify ({
            nickname: changeData.nickname,
            profile_image: changeData.profileImageUrl,
        }),
    });
    return result;
};

export const userDelete = async () => {
    const result = await requestJson(`${getServerUrl()}/users/me`, {
        method: 'DELETE',
    });
    return result;
};
