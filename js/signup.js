import Dialog from '../component/dialog/dialog.js';
import Header from '../component/header/header.js';
import {
    authCheckReverse,
    fileToBase64,
    prependChild,
    validEmail,
    validPassword,
    validNickname,
} from '../utils/function.js';
import {
    userSignup,
    checkEmail,
    checkNickname,
    fileUpload,
} from '../api/signupRequest.js';

const MAX_PASSWORD_LENGTH = 20;
const HTTP_OK = 200;
const HTTP_CREATED = 201;

const signupButton = document.querySelector('#signupBtn');
const authForm = document.querySelector('.authForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('pw');
const passwordCheckInput = document.getElementById('pwck');
const nicknameInput = document.getElementById('nickname');
const profileInput = document.getElementById('profile');

const signupData = {
    email: '',
    password: '',
    passwordCheck: '',
    nickname: '',
    profileImageUrl: undefined,
};

let emailRequestSequence = 0;
let nicknameRequestSequence = 0;
let isEmailChecking = false;
let isNicknameChecking = false;
let isProfileUploading = false;
let isSubmitting = false;

const getInput = uid => document.getElementById(uid);

const getHelper = uid =>
    document.querySelector(`.inputBox p[name="${uid}"]`);

const setFieldFeedback = (uid, message = '', isInvalid = false) => {
    const input = getInput(uid);
    const helper = getHelper(uid);

    if (helper) helper.textContent = message;
    if (input) input.setAttribute('aria-invalid', String(isInvalid));
};

const observeSignupData = () => {
    const { email, password, passwordCheck, nickname } = signupData;
    const hasValidRequiredFields = Boolean(
        email &&
            validEmail(email) &&
            password &&
            validPassword(password) &&
            passwordCheck &&
            password === passwordCheck &&
            nickname &&
            validNickname(nickname),
    );

    signupButton.disabled =
        !hasValidRequiredFields ||
        isEmailChecking ||
        isNicknameChecking ||
        isProfileUploading ||
        isSubmitting;
};

const validatePasswordCheck = () => {
    const value = passwordCheckInput.value;
    const password = signupData.password;

    if (!value) {
        signupData.passwordCheck = '';
        setFieldFeedback('pwck', '*비밀번호를 한 번 더 입력해주세요.', true);
    } else if (!password || password !== value) {
        signupData.passwordCheck = '';
        setFieldFeedback('pwck', '*비밀번호가 다릅니다.', true);
    } else {
        signupData.passwordCheck = value;
        setFieldFeedback('pwck');
    }
};

const validateEmailInput = async value => {
    const requestSequence = ++emailRequestSequence;
    signupData.email = '';
    isEmailChecking = false;

    if (!value) {
        setFieldFeedback('email', '*이메일을 입력해주세요.', true);
        observeSignupData();
        return;
    }

    if (!validEmail(value)) {
        setFieldFeedback(
            'email',
            '*올바른 이메일 주소 형식을 입력해주세요. (예: example@example.com)',
            true,
        );
        observeSignupData();
        return;
    }

    isEmailChecking = true;
    setFieldFeedback('email');
    observeSignupData();

    try {
        const { status } = await checkEmail(value);
        if (requestSequence !== emailRequestSequence) return;

        if (status === HTTP_OK) {
            signupData.email = value;
            setFieldFeedback('email');
        } else {
            setFieldFeedback('email', '*중복된 이메일입니다.', true);
        }
    } catch (error) {
        if (requestSequence !== emailRequestSequence) return;
        console.error('이메일 중복 확인 실패:', error);
        setFieldFeedback(
            'email',
            '*이메일 확인에 실패했습니다. 잠시 뒤 다시 시도해주세요.',
            true,
        );
    } finally {
        if (requestSequence === emailRequestSequence) {
            isEmailChecking = false;
            observeSignupData();
        }
    }
};

const validatePasswordInput = value => {
    if (!value) {
        signupData.password = '';
        setFieldFeedback('pw', '*비밀번호를 입력해주세요.', true);
    } else if (!validPassword(value)) {
        signupData.password = '';
        setFieldFeedback(
            'pw',
            '*비밀번호는 8자 이상, 20자 이하이며, 대문자, 소문자, 숫자, 특수문자를 각각 최소 1개 포함해야 합니다.',
            true,
        );
    } else {
        signupData.password = value;
        setFieldFeedback('pw');
    }

    if (passwordCheckInput.value) validatePasswordCheck();
    observeSignupData();
};

const validateNicknameInput = async value => {
    const requestSequence = ++nicknameRequestSequence;
    signupData.nickname = '';
    isNicknameChecking = false;

    if (!value) {
        setFieldFeedback('nickname', '*닉네임을 입력해주세요.', true);
        observeSignupData();
        return;
    }

    if (value.includes(' ')) {
        setFieldFeedback('nickname', '*띄어쓰기를 없애주세요.', true);
        observeSignupData();
        return;
    }

    if (value.length > 10) {
        setFieldFeedback(
            'nickname',
            '*닉네임은 최대 10자까지 작성 가능합니다.',
            true,
        );
        observeSignupData();
        return;
    }

    if (!validNickname(value)) {
        setFieldFeedback(
            'nickname',
            '*닉네임에 특수 문자는 사용할 수 없습니다.',
            true,
        );
        observeSignupData();
        return;
    }

    isNicknameChecking = true;
    setFieldFeedback('nickname');
    observeSignupData();

    try {
        const { status } = await checkNickname(value);
        if (requestSequence !== nicknameRequestSequence) return;

        if (status === HTTP_OK) {
            signupData.nickname = value;
            setFieldFeedback('nickname');
        } else {
            setFieldFeedback('nickname', '*중복된 닉네임입니다.', true);
        }
    } catch (error) {
        if (requestSequence !== nicknameRequestSequence) return;
        console.error('닉네임 중복 확인 실패:', error);
        setFieldFeedback(
            'nickname',
            '*닉네임 확인에 실패했습니다. 잠시 뒤 다시 시도해주세요.',
            true,
        );
    } finally {
        if (requestSequence === nicknameRequestSequence) {
            isNicknameChecking = false;
            observeSignupData();
        }
    }
};

const uploadProfileImage = async event => {
    const file = event.target.files[0];

    if (!file) {
        localStorage.removeItem('profileImageUrl');
        signupData.profileImageUrl = undefined;
        setFieldFeedback('profile');
        observeSignupData();
        return;
    }

    isProfileUploading = true;
    setFieldFeedback('profile');
    observeSignupData();

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
        signupData.profileImageUrl = data.profile_image;
        setFieldFeedback('profile');
    } catch (error) {
        console.error('프로필 이미지 업로드 실패:', error);
        localStorage.removeItem('profileImageUrl');
        signupData.profileImageUrl = undefined;
        profileInput.value = '';
        setFieldFeedback(
            'profile',
            '*이미지 업로드에 실패했습니다. 다른 이미지를 선택해주세요.',
            true,
        );
    } finally {
        isProfileUploading = false;
        observeSignupData();
    }
};

const sendSignupData = async () => {
    const { passwordCheck, ...props } = signupData;
    const savedProfileImageUrl = localStorage.getItem('profileImageUrl');

    if (savedProfileImageUrl) props.profileImageUrl = savedProfileImageUrl;

    if (props.password.length > MAX_PASSWORD_LENGTH) {
        Dialog('비밀번호', '비밀번호는 20자 이하로 입력해주세요.');
        return;
    }

    isSubmitting = true;
    signupButton.setAttribute('aria-busy', 'true');
    observeSignupData();

    try {
        const { status, code } = await userSignup(props);

        if (status === HTTP_CREATED) {
            localStorage.removeItem('profileImageUrl');
            location.href = '/html/login.html';
            return;
        }

        if (code === 'email_duplicated') {
            signupData.email = '';
            Dialog('회원가입 실패', '이미 사용 중인 이메일입니다.');
            setFieldFeedback('email', '*이미 사용 중인 이메일입니다.', true);
        } else if (code === 'nickname_duplicated') {
            signupData.nickname = '';
            Dialog('회원가입 실패', '이미 사용 중인 닉네임입니다.');
            setFieldFeedback('nickname', '*이미 사용 중인 닉네임입니다.', true);
        } else if (code === 'invalid_request') {
            Dialog('회원가입 실패', '입력값을 확인해주세요.');
        } else {
            Dialog('회원가입 실패', '잠시 뒤 다시 시도해 주세요.');
        }

    } catch (error) {
        console.error('회원가입 요청 실패:', error);
        Dialog('회원가입 실패', '잠시 뒤 다시 시도해 주세요.');
    } finally {
        isSubmitting = false;
        signupButton.removeAttribute('aria-busy');
        observeSignupData();
    }
};

const getSignupData = async () => {
    if (signupButton.disabled || isSubmitting) return;

    const { email, password, passwordCheck, nickname } = signupData;
    if (!email || !password || !passwordCheck || !nickname) {
        Dialog('필수 입력 사항', '모든 값을 입력해주세요.');
        return;
    }

    await sendSignupData();
};

const addEvents = () => {
    emailInput.addEventListener('input', event => {
        validateEmailInput(event.target.value);
    });
    passwordInput.addEventListener('input', event => {
        validatePasswordInput(event.target.value);
    });
    passwordCheckInput.addEventListener('input', () => {
        validatePasswordCheck();
        observeSignupData();
    });
    nicknameInput.addEventListener('input', event => {
        validateNicknameInput(event.target.value);
    });
    profileInput.addEventListener('change', uploadProfileImage);

    authForm?.addEventListener('submit', event => {
        event.preventDefault();
        getSignupData();
    });
};

const init = () => {
    prependChild(document.body, Header('회원가입', 1));
    localStorage.removeItem('profileImageUrl');
    setFieldFeedback('email');
    setFieldFeedback('pw');
    setFieldFeedback('pwck');
    setFieldFeedback('nickname');
    setFieldFeedback('profile');
    observeSignupData();
    addEvents();

    authCheckReverse().catch(error => {
        console.error('로그인 상태 확인 실패:', error);
    });
};

init();
