import { changePassword } from '../api/modifyPasswordRequest.js';
import Dialog from '../component/dialog/dialog.js';
import Header from '../component/header/header.js';
import { removeAccessToken } from '../utils/request.js';
import {
    authCheck,
    prependChild,
    resolveImageUrl,
    validPassword,
} from '../utils/function.js';

const button = document.querySelector('#signupBtn');

const DEFAULT_PROFILE_IMAGE = '../public/image/profile/default.jpg';
const HTTP_OK = 200;

const normalizeUserInfo = data => ({
    profileImageUrl: data.profileImageUrl || data.profile_image || null,
});

const dataResponse = await authCheck();
const data = await dataResponse.json();
const myInfo = normalizeUserInfo(data.data);
const profileImage = resolveImageUrl(
    myInfo.profileImageUrl,
    DEFAULT_PROFILE_IMAGE,
);

const modifyData = {
    currentPassword: '',
    newPassword: '',
    newPasswordCheck: '',
};

const observeData = () => {
    const { currentPassword, newPassword, newPasswordCheck } = modifyData;

    if (
        !currentPassword ||
        !newPassword ||
        !newPasswordCheck ||
        newPassword !== newPasswordCheck
    ) {
        button.disabled = true;
        button.style.backgroundColor = '#ACA0EB';
    } else {
        button.disabled = false;
        button.style.backgroundColor = '#7F6AEE';
    }
};

const blurEventHandler = async (event, uid) => {
    if (uid === 'currentPw') {
        const value = event.target.value;
        const helperElement = document.querySelector(
            '.inputBox p[name="currentPw"]',
        );

        if (value === '' || value === null) {
            helperElement.textContent = '*현재 비밀번호를 입력해주세요.';
            modifyData.currentPassword = '';
        } else {
            helperElement.textContent = '';
            modifyData.currentPassword = value;
        }
    } else if (uid === 'pw') {
        const value = event.target.value;
        const isValidPassword = validPassword(value);
        const helperElement = document.querySelector(
            `.inputBox p[name="${uid}"]`,
        );
        const helperElementCheck = document.querySelector(
            '.inputBox p[name="pwck"]',
        );

        if (!helperElement) return;

        if (value === '' || value === null) {
            helperElement.textContent = '*새 비밀번호를 입력해주세요.';
            helperElementCheck.textContent = '';
            modifyData.newPassword = '';
        } else if (!isValidPassword) {
            helperElement.textContent =
                '*비밀번호는 8자 이상, 20자 이하이며, 대문자, 소문자, 숫자, 특수문자를 각각 최소 1개 포함해야 합니다.';
            helperElementCheck.textContent = '';
            modifyData.newPassword = '';
        } else {
            helperElement.textContent = '';
            modifyData.newPassword = value;
        }
    } else if (uid === 'pwck') {
        const value = event.target.value;
        const helperElement = document.querySelector(
            `.inputBox p[name="${uid}"]`,
        );
        const { newPassword } = modifyData;

        if (value === '' || value === null) {
            helperElement.textContent = '*새 비밀번호를 한번 더 입력해주세요.';
            modifyData.newPasswordCheck = '';
        } else if (newPassword !== value) {
            helperElement.textContent = '*비밀번호가 다릅니다.';
            modifyData.newPasswordCheck = '';
        } else {
            helperElement.textContent = '';
            modifyData.newPasswordCheck = value;
        }
    }

    observeData();
};

const addEventForInputElements = () => {
    const InputElement = document.querySelectorAll('input');
    InputElement.forEach(element => {
        const id = element.id;

        element.addEventListener('input', event => blurEventHandler(event, id));
    });
};

const modifyPassword = async () => {
    const { currentPassword, newPassword } = modifyData;

    const { status, code } = await changePassword({
        currentPassword,
        newPassword,
    });

    if (status === HTTP_OK) {
        removeAccessToken();
        localStorage.clear();
        location.href = '/html/login.html';
    } else if (code === 'invalid_password') {
        Dialog('비밀번호 변경 실패', '현재 비밀번호가 일치하지 않습니다.');
    } else {
        Dialog('비밀번호 변경 실패', '비밀번호 변경에 실패했습니다.');
    }
};

const init = () => {
    button.addEventListener('click', modifyPassword);
    prependChild(document.body, Header('커뮤니티', 1, profileImage));
    addEventForInputElements();
    observeData();
};

init();