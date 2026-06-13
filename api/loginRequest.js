import { getServerUrl } from '../utils/function.js';
import { requestJson, setAccessToken } from '../utils/request.js';

export const userLogin = async (email, password) => {
    const result = await requestJson(`${getServerUrl()}/users/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            email: email,
            password: password,
        }),
    });

    if (result.ok && result.data && result.data.access_token) {
        setAccessToken(result.data.access_token);
    }

    return result;
};
