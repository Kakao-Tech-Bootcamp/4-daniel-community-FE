import { getServerUrl } from '../utils/function.js';
import { requestJson } from '../utils/request.js';

export const userSignup = async data => {
    const result = await requestJson(`${getServerUrl()}/users/signup`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email: data.email,
            password: data.password,
            nickname: data.nickname,
            profile_image: data.profileImageUrl,
        }),
    });
    return result;
};

export const checkEmail = async email => {
    const result = await requestJson(
        `${getServerUrl()}/users/emails/${encodeURIComponent(email)}`,
        {
            method: 'GET',
        },
    );
    return result;
};

export const checkNickname = async nickname => {
    const result = await requestJson(
        `${getServerUrl()}/users/nicknames/${encodeURIComponent(nickname)}`,
        {
            method: 'GET',
        },
    );
    return result;
};

export const fileUpload = async ({ name, dataUrl }) => {
    const result = await requestJson(`${getServerUrl()}/users/profile-images`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            profile_image_name: name,
            profile_image_data: dataUrl,
        }),
    });
    return result;
};