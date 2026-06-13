import { checkNickname, fileUpload } from '../api/signupRequest.js';
import { userModify, userDelete } from '../api/modifyInfoRequest.js';
import { removeAccessToken } from '../utils/request.js';
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
const profilePreview = document.querySelector('#profilePreview');
const removeProfileButton = document.querySelector('#removeProfileButton');

const DEFAULT_PROFILE_IMAGE = '../public/image/profile/default.jpg';
const HTTP_OK = 200;

const normalizeUserInfo = data => ({
    email: data.email,
    nickname: data.nickname,
    profileImageUrl: data.profileImageUrl || data.profile_image || null,
});

const authDataReponse = await authCheck();
const authData = await authDataReponse.json();
const myInfo = normalizeUserInfo(authData.data);

const changeData = {
    nickname: myInfo.nickname,
    profileImageUrl: myInfo.profileImageUrl,
};

const setData = data => {
    if (data.profileImageUrl === null) {
        profilePreview.src = DEFAULT_PROFILE_IMAGE;
        if (removeProfileButton) removeProfileButton.style.display = 'none';
    } else {
        profilePreview.src = resolveImageUrl(
            data.profileImageUrl,
            DEFAULT_PROFILE_IMAGE,
        );
        if (removeProfileButton) removeProfileButton.style.display = 'flex';

        const profileImageUrl = data.profileImageUrl;
        const fileName = profileImageUrl.split('/').pop();
        localStorage.setItem('profileImageUrl', data.profileImageUrl);

        const profileImage = new File(
            [resolveImageUrl(profileImageUrl)],
            fileName,
            { type: '' },
        );

        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(profileImage);
        profileInputElement.files = dataTransfer.files;
    }

    emailTextElement.textContent = data.email;
    nicknameInputElement.value = data.nickname;
};

const observeData = () => {
    const button = document.querySelector('#signupBtn');

    if (
        myInfo.nickname !== changeData.nickname ||
        myInfo.profileImageUrl !== changeData.profileImageUrl
    ) {
        button.disabled = false;
        button.style.backgroundColor = '#7F6AEE';
    } else {
        button.disabled = true;
        button.style.backgroundColor = '#ACA0EB';
    }
};

const changeEventHandler = async (event, uid) => {
    const button = document.querySelector('#signupBtn');

    if (uid === 'nickname') {
        const value = event.target.value;
        const isValidNickname = validNickname(value);
        const helperElement = nicknameHelpElement;
        let isComplete = false;

        if (value === '' || value === null) {
            helperElement.textContent = '*닉네임을 입력해주세요.';
        } else if (!isValidNickname) {
            helperElement.textContent =
                '*닉네임은 2~10자의 영문자, 한글 또는 숫자만 사용할 수 있습니다. 특수 문자와 띄어쓰기는 사용할 수 없습니다.';
        } else if (myInfo.nickname === value) {
            helperElement.textContent = '';
            changeData.nickname = myInfo.nickname;
            button.disabled = true;
            button.style.backgroundColor = '#ACA0EB';
            return;
        } else {
            const { status } = await checkNickname(value);
            if (status === HTTP_OK) {
                helperElement.textContent = '';
                isComplete = true;
            } else {
                helperElement.textContent = '*중복된 닉네임 입니다.';
                button.disabled = true;
                button.style.backgroundColor = '#ACA0EB';
                return;
            }
        }

        changeData.nickname = isComplete ? value : myInfo.nickname;
    } else if (uid === 'profile') {
        const file = event.target.files[0];

        if (!file) {
            localStorage.removeItem('profileImageUrl');
            profilePreview.src = DEFAULT_PROFILE_IMAGE;
            changeData.profileImageUrl = null;
            if (removeProfileButton) removeProfileButton.style.display = 'none';
        } else {
            try {
                const dataUrl = await fileToBase64(file, true);
                const { ok, data } = await fileUpload({
                    name: file.name,
                    dataUrl,
                });

                if (!ok) throw new Error('서버 응답 오류');

                localStorage.setItem('profileImageUrl', data.profile_image);
                changeData.profileImageUrl = data.profile_image;
                profilePreview.src = resolveImageUrl(
                    data.profile_image,
                    DEFAULT_PROFILE_IMAGE,
                );
                if (removeProfileButton)
                    removeProfileButton.style.display = 'flex';
            } catch (error) {
                console.error('업로드 중 오류 발생:', error);
            }
        }
    }

    observeData();
};

const sendModifyData = async () => {
    const button = document.querySelector('#signupBtn');

    if (!button.disabled) {
        if (changeData.nickname === '') {
            Dialog('필수 정보 누락', '닉네임을 입력해주세요.');
        } else {
            const { status } = await userModify(changeData);

            if (status === HTTP_OK) {
                localStorage.removeItem('profileImageUrl');
                saveToastMessage('수정완료');
                location.href = '/html/modifyInfo.html';
            } else {
                localStorage.removeItem('profileImageUrl');
                saveToastMessage('수정실패');
                location.href = '/html/modifyInfo.html';
            }
        }
    }
};

const deleteAccount = async () => {
    const callback = async () => {
        const { status } = await userDelete();

        if (status === HTTP_OK) {
            try {
                await fetch(`${getServerUrl()}/users/logout`, {
                    method: 'DELETE',
                });
            } catch (error) {
                console.error('로그아웃 요청 실패:', error);
            }

            removeAccessToken();
            location.href = '/html/login.html';
        } else {
            Dialog('회원 탈퇴 실패', '회원 탈퇴에 실패했습니다.');
        }
    };

    Dialog(
        '회원탈퇴 하시겠습니까?',
        '작성된 게시글과 댓글은 삭제 됩니다.',
        callback,
    );
};

const addEvent = () => {
    nicknameInputElement.addEventListener('change', event =>
        changeEventHandler(event, 'nickname'),
    );
    profileInputElement.addEventListener('change', event =>
        changeEventHandler(event, 'profile'),
    );

    if (removeProfileButton) {
        removeProfileButton.addEventListener('click', () => {
            localStorage.removeItem('profileImageUrl');
            profilePreview.src = DEFAULT_PROFILE_IMAGE;
            changeData.profileImageUrl = null;
            profileInputElement.value = '';
            removeProfileButton.style.display = 'none';
            observeData();
        });
    }

    modifyBtnElement.addEventListener('click', async () => sendModifyData());
    withdrawBtnElement.addEventListener('click', async () => deleteAccount());
};

const showToast = (message, duration = 3000, callback = null) => {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.classList.add('toastMessage');
    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = 1;
        toast.style.bottom = '30px';
    }, 100);

    setTimeout(() => {
        toast.style.opacity = 0;
        toast.style.bottom = '20px';
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
    if (message) {
        showToast(message, 3000, () => {
            sessionStorage.removeItem('toastMessage');
        });
    }
};

const init = () => {
    const profileImage = resolveImageUrl(
        myInfo.profileImageUrl,
        DEFAULT_PROFILE_IMAGE,
    );

    prependChild(document.body, Header('커뮤니티', 2, profileImage));
    setData(myInfo);
    observeData();
    addEvent();
    displayToastFromStorage();
};

init();