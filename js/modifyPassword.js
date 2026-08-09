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
const accountForm = document.querySelector('.accountForm');
const currentPasswordInput = document.querySelector('#currentPw');
const newPasswordInput = document.querySelector('#pw');
const newPasswordCheckInput = document.querySelector('#pwck');

const DEFAULT_PROFILE_IMAGE = '/public/profile_default.svg';
const HTTP_OK = 200;

const modifyData = {
    currentPassword: '',
    newPassword: '',
    newPasswordCheck: '',
};

let isSubmitting = false;

const normalizeUserInfo = (data = {}) => ({
    profileImageUrl: data.profileImageUrl || data.profile_image || null,
});

const getHelper = name =>
    document.querySelector(`.inputBox p[name="${name}"]`);

const setFieldFeedback = (input, helperName, message = '', isInvalid = false) => {
    const helper = getHelper(helperName);
    if (helper) helper.textContent = message;
    input.setAttribute('aria-invalid', String(isInvalid));
};

const observeData = () => {
    const { currentPassword, newPassword, newPasswordCheck } = modifyData;

    button.disabled =
        isSubmitting ||
        !currentPassword ||
        !newPassword ||
        !validPassword(newPassword) ||
        !newPasswordCheck ||
        newPassword !== newPasswordCheck;
};

const validatePasswordCheck = () => {
    const value = newPasswordCheckInput.value;

    if (!value) {
        modifyData.newPasswordCheck = '';
        setFieldFeedback(
            newPasswordCheckInput,
            'pwck',
            '*새 비밀번호를 한 번 더 입력해주세요.',
            true,
        );
    } else if (!modifyData.newPassword || modifyData.newPassword !== value) {
        modifyData.newPasswordCheck = '';
        setFieldFeedback(
            newPasswordCheckInput,
            'pwck',
            '*비밀번호가 다릅니다.',
            true,
        );
    } else {
        modifyData.newPasswordCheck = value;
        setFieldFeedback(newPasswordCheckInput, 'pwck');
    }
};

const inputEventHandler = (event, uid) => {
    const value = event.target.value;

    if (uid === 'currentPw') {
        if (!value) {
            modifyData.currentPassword = '';
            setFieldFeedback(
                currentPasswordInput,
                'currentPw',
                '*현재 비밀번호를 입력해주세요.',
                true,
            );
        } else {
            modifyData.currentPassword = value;
            setFieldFeedback(currentPasswordInput, 'currentPw');
        }
    } else if (uid === 'pw') {
        if (!value) {
            modifyData.newPassword = '';
            setFieldFeedback(
                newPasswordInput,
                'pw',
                '*새 비밀번호를 입력해주세요.',
                true,
            );
        } else if (!validPassword(value)) {
            modifyData.newPassword = '';
            setFieldFeedback(
                newPasswordInput,
                'pw',
                '*비밀번호는 8자 이상, 20자 이하이며, 대문자, 소문자, 숫자, 특수문자를 각각 최소 1개 포함해야 합니다.',
                true,
            );
        } else {
            modifyData.newPassword = value;
            setFieldFeedback(newPasswordInput, 'pw');
        }

        if (newPasswordCheckInput.value) validatePasswordCheck();
    } else if (uid === 'pwck') {
        validatePasswordCheck();
    }

    observeData();
};

const modifyPassword = async () => {
    if (button.disabled || isSubmitting) return;

    const { currentPassword, newPassword } = modifyData;
    isSubmitting = true;
    button.setAttribute('aria-busy', 'true');
    observeData();

    try {
        const { status, code } = await changePassword({
            currentPassword,
            newPassword,
        });

        if (status === HTTP_OK) {
            removeAccessToken();
            localStorage.clear();
            location.href = '/html/login.html';
            return;
        }

        if (code === 'invalid_password') {
            setFieldFeedback(
                currentPasswordInput,
                'currentPw',
                '*현재 비밀번호가 일치하지 않습니다.',
                true,
            );
            Dialog('비밀번호 변경 실패', '현재 비밀번호가 일치하지 않습니다.');
        } else {
            Dialog('비밀번호 변경 실패', '비밀번호 변경에 실패했습니다.');
        }
    } catch (error) {
        console.error('비밀번호 변경 요청 실패:', error);
        Dialog('비밀번호 변경 실패', '비밀번호 변경에 실패했습니다.');
    } finally {
        isSubmitting = false;
        button.removeAttribute('aria-busy');
        observeData();
    }
};

const addEvents = () => {
    [currentPasswordInput, newPasswordInput, newPasswordCheckInput].forEach(
        element => {
            element.addEventListener('input', event =>
                inputEventHandler(event, element.id),
            );
        },
    );

    accountForm?.addEventListener('submit', event => {
        event.preventDefault();
        modifyPassword();
    });
};

const init = async () => {
    const authResponse = await authCheck();
    if (!authResponse) return;

    const data = await authResponse.json();
    const myInfo = normalizeUserInfo(data.data || {});
    const profileImage = resolveImageUrl(
        myInfo.profileImageUrl,
        DEFAULT_PROFILE_IMAGE,
    );

    prependChild(document.body, Header('비밀번호 수정', 1, profileImage));
    setFieldFeedback(currentPasswordInput, 'currentPw');
    setFieldFeedback(newPasswordInput, 'pw');
    setFieldFeedback(newPasswordCheckInput, 'pwck');
    observeData();
    addEvents();
};

init();
