import { checkNickname, fileUpload } from '../api/signupRequest.js';
import { userModify, userDelete } from '../api/modifyInfoRequest.js';
import { getAccessToken, removeAccessToken } from '../utils/request.js';
import Dialog from '../component/dialog/dialog.js';
import Header from '../component/header/header.js';
import {
    authCheck,
    fileToBase64,
    prependChild,
    getServerUrl,
    resolveImageUrl,
    validNickname,
} from '../utils/function.js';

const emailTextElement = document.querySelector('#id');
const nicknameInputElement = document.querySelector('#nickname');
const profileInputElement = document.querySelector('#profile');
const withdrawBtnElement = document.querySelector('#withdrawBtn');
const nicknameHelpElement = document.querySelector(
    '.inputBox p[name="nickname"]',
);
const modifyBtnElement = document.querySelector('#signupBtn');
const accountFormElement = document.querySelector('.accountForm');
const profilePreview = document.querySelector('#profilePreview');
const removeProfileButton = document.querySelector('#removeProfileButton');

const DEFAULT_PROFILE_IMAGE = '/public/profile_default.svg';
const HTTP_OK = 200;

let myInfo = null;
let changeData = null;
let nicknameRequestSequence = 0;
let isNicknameValid = true;
let isNicknameChecking = false;
let isProfileUploading = false;
let isSubmitting = false;

profilePreview.addEventListener('error', () => {
    profilePreview.src = DEFAULT_PROFILE_IMAGE;
}, { once: true });

const normalizeUserInfo = (data = {}) => ({
    email: data.email,
    nickname: data.nickname,
    profileImageUrl: data.profileImageUrl || data.profile_image || null,
});

const setNicknameFeedback = (message = '', isInvalid = false) => {
    nicknameHelpElement.textContent = message;
    nicknameInputElement.setAttribute('aria-invalid', String(isInvalid));
};

const observeData = () => {
    if (!myInfo || !changeData) {
        modifyBtnElement.disabled = true;
        return;
    }

    const hasChanges =
        myInfo.nickname !== changeData.nickname ||
        myInfo.profileImageUrl !== changeData.profileImageUrl;

    modifyBtnElement.disabled =
        !hasChanges ||
        !isNicknameValid ||
        isNicknameChecking ||
        isProfileUploading ||
        isSubmitting;
};

const setData = data => {
    const hasProfileImage = Boolean(data.profileImageUrl);

    profilePreview.src = resolveImageUrl(
        data.profileImageUrl,
        DEFAULT_PROFILE_IMAGE,
    );
    removeProfileButton.hidden = !hasProfileImage;
    profileInputElement.value = '';
    emailTextElement.textContent = data.email;
    nicknameInputElement.value = data.nickname;
    setNicknameFeedback();
};

const validateNickname = async value => {
    const requestSequence = ++nicknameRequestSequence;

    if (!value) {
        isNicknameValid = false;
        changeData.nickname = '';
        setNicknameFeedback('*닉네임을 입력해주세요.', true);
        observeData();
        return;
    }

    if (!validNickname(value)) {
        isNicknameValid = false;
        changeData.nickname = value;
        setNicknameFeedback(
            '*닉네임은 2~10자의 영문자, 한글 또는 숫자만 사용할 수 있습니다. 특수 문자와 띄어쓰기는 사용할 수 없습니다.',
            true,
        );
        observeData();
        return;
    }

    if (myInfo.nickname === value) {
        isNicknameValid = true;
        changeData.nickname = myInfo.nickname;
        setNicknameFeedback();
        observeData();
        return;
    }

    isNicknameChecking = true;
    isNicknameValid = false;
    setNicknameFeedback();
    observeData();

    try {
        const { status } = await checkNickname(value);
        if (requestSequence !== nicknameRequestSequence) return;

        if (status === HTTP_OK) {
            isNicknameValid = true;
            changeData.nickname = value;
            setNicknameFeedback();
        } else {
            isNicknameValid = false;
            changeData.nickname = value;
            setNicknameFeedback('*중복된 닉네임입니다.', true);
        }
    } catch (error) {
        if (requestSequence !== nicknameRequestSequence) return;
        console.error('닉네임 중복 확인 실패:', error);
        isNicknameValid = false;
        setNicknameFeedback(
            '*닉네임 확인에 실패했습니다. 잠시 뒤 다시 시도해주세요.',
            true,
        );
    } finally {
        if (requestSequence === nicknameRequestSequence) {
            isNicknameChecking = false;
            observeData();
        }
    }
};

const changeProfileImage = async event => {
    const file = event.target.files[0];
    if (!file) return;

    isProfileUploading = true;
    observeData();

    try {
        const dataUrl = await fileToBase64(file, true);
        const { ok, data } = await fileUpload({
            name: file.name,
            dataUrl,
        });

        if (!ok || !data || !data.profile_image) {
            throw new Error('서버 응답 오류');
        }

        localStorage.setItem('profileImageUrl', data.profile_image);
        changeData.profileImageUrl = data.profile_image;
        profilePreview.src = resolveImageUrl(
            data.profile_image,
            DEFAULT_PROFILE_IMAGE,
        );
        removeProfileButton.hidden = false;
    } catch (error) {
        console.error('프로필 이미지 업로드 실패:', error);
        profileInputElement.value = '';
        Dialog(
            '이미지 업로드 실패',
            '프로필 이미지 업로드에 실패했습니다. 다시 시도해주세요.',
        );
    } finally {
        isProfileUploading = false;
        observeData();
    }
};

const sendModifyData = async () => {
    if (modifyBtnElement.disabled || isSubmitting) return;

    if (!changeData.nickname) {
        Dialog('필수 정보 누락', '닉네임을 입력해주세요.');
        return;
    }

    isSubmitting = true;
    modifyBtnElement.setAttribute('aria-busy', 'true');
    observeData();

    try {
        const { status } = await userModify(changeData);

        localStorage.removeItem('profileImageUrl');
        saveToastMessage(status === HTTP_OK ? '수정완료' : '수정실패');
        location.href = '/html/modifyInfo.html';
    } catch (error) {
        console.error('회원정보 수정 실패:', error);
        localStorage.removeItem('profileImageUrl');
        saveToastMessage('수정실패');
        location.href = '/html/modifyInfo.html';
    } finally {
        isSubmitting = false;
        modifyBtnElement.removeAttribute('aria-busy');
        observeData();
    }
};

const deleteAccount = () => {
    const callback = async () => {
        let status;

        try {
            const result = await userDelete();
            status = result.status;
        } catch (error) {
            console.error('회원 탈퇴 요청 실패:', error);
            Dialog('회원 탈퇴 실패', '회원 탈퇴에 실패했습니다.');
            return;
        }

        if (status !== HTTP_OK) {
            Dialog('회원 탈퇴 실패', '회원 탈퇴에 실패했습니다.');
            return;
        }

        const accessToken = getAccessToken();
        try {
            await fetch(`${getServerUrl()}/users/logout`, {
                method: 'DELETE',
                headers: accessToken
                    ? { Authorization: `Bearer ${accessToken}` }
                    : {},
            });
        } catch (error) {
            console.error('로그아웃 요청 실패:', error);
        } finally {
            removeAccessToken();
            localStorage.removeItem('profileImageUrl');
            location.href = '/html/login.html';
        }
    };

    Dialog(
        '회원탈퇴 하시겠습니까?',
        '작성된 게시글과 댓글은 삭제됩니다.',
        callback,
    );
};

const addEvents = () => {
    nicknameInputElement.addEventListener('input', event => {
        const value = event.target.value;
        nicknameRequestSequence += 1;
        isNicknameChecking = false;

        if (!value || !validNickname(value)) {
            isNicknameValid = false;
            changeData.nickname = value;
            setNicknameFeedback(
                !value
                    ? '*닉네임을 입력해주세요.'
                    : '*닉네임은 2~10자의 영문자, 한글 또는 숫자만 사용할 수 있습니다. 특수 문자와 띄어쓰기는 사용할 수 없습니다.',
                true,
            );
        } else if (value === myInfo.nickname) {
            isNicknameValid = true;
            changeData.nickname = myInfo.nickname;
            setNicknameFeedback();
        } else {
            isNicknameValid = false;
            changeData.nickname = value;
            setNicknameFeedback();
        }
        observeData();
    });

    nicknameInputElement.addEventListener('change', event => {
        validateNickname(event.target.value);
    });
    profileInputElement.addEventListener('change', changeProfileImage);

    removeProfileButton.addEventListener('click', () => {
        localStorage.removeItem('profileImageUrl');
        profilePreview.src = DEFAULT_PROFILE_IMAGE;
        changeData.profileImageUrl = null;
        profileInputElement.value = '';
        removeProfileButton.hidden = true;
        observeData();
    });

    accountFormElement.addEventListener('submit', event => {
        event.preventDefault();
        sendModifyData();
    });
    withdrawBtnElement.addEventListener('click', deleteAccount);
};

const showToast = (message, duration = 3000, callback = null) => {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.classList.add('toastMessage');
    toast.setAttribute('role', 'status');
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('is-visible');
    }, 100);

    setTimeout(() => {
        toast.classList.remove('is-visible');
        toast.classList.add('is-leaving');
        setTimeout(() => {
            toast.remove();
            if (callback) callback();
        }, 500);
    }, duration);
};

const saveToastMessage = message => {
    sessionStorage.setItem('toastMessage', message);
};

const displayToastFromStorage = () => {
    const message = sessionStorage.getItem('toastMessage');
    if (!message) return;

    showToast(message, 3000, () => {
        sessionStorage.removeItem('toastMessage');
    });
};

const init = async () => {
    const authResponse = await authCheck();
    if (!authResponse) return;

    const authData = await authResponse.json();
    myInfo = normalizeUserInfo(authData.data || {});
    changeData = {
        nickname: myInfo.nickname,
        profileImageUrl: myInfo.profileImageUrl,
    };

    const profileImage = resolveImageUrl(
        myInfo.profileImageUrl,
        DEFAULT_PROFILE_IMAGE,
    );

    prependChild(document.body, Header('회원정보 수정', 2, profileImage));
    setData(myInfo);
    observeData();
    addEvents();
    displayToastFromStorage();
};

init();
