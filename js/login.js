import Header from '../component/header/header.js';
import {
    authCheckReverse,
    prependChild,
    validEmail,
} from '../utils/function.js';
import { userLogin } from '../api/loginRequest.js';

const HTTP_OK = 200;
const MIN_PASSWORD_LENGTH = 8;

const emailInput = document.getElementById('id');
const passwordInput = document.getElementById('pw');
const loginButton = document.getElementById('login');
const helperTextElement = document.querySelector('.helperText');
const authForm = document.querySelector('.authForm');

const loginData = {
    id: '',
    password: '',
};

let isSubmitting = false;
let lottieInstance = null;

const updateHelperText = (message = '') => {
    if (helperTextElement) helperTextElement.textContent = message;
};

const setCredentialInvalid = isInvalid => {
    const ariaValue = String(isInvalid);
    emailInput.setAttribute('aria-invalid', ariaValue);
    passwordInput.setAttribute('aria-invalid', ariaValue);
};

const observeLoginData = () => {
    const { id: email, password } = loginData;
    const isValidEmail = validEmail(email);

    updateHelperText(
        isValidEmail || !email
            ? ''
            : '*올바른 이메일 주소 형식을 입력해주세요. (예: example@example.com)',
    );

    emailInput.setAttribute(
        'aria-invalid',
        String(Boolean(email) && !isValidEmail),
    );
    passwordInput.setAttribute('aria-invalid', 'false');
    loginButton.disabled =
        isSubmitting ||
        !email ||
        !isValidEmail ||
        !password ||
        password.length < MIN_PASSWORD_LENGTH;
};

const loginClick = async () => {
    if (loginButton.disabled || isSubmitting) return;

    const { id: email, password } = loginData;
    isSubmitting = true;
    loginButton.disabled = true;
    loginButton.setAttribute('aria-busy', 'true');
    setCredentialInvalid(false);

    try {
        const { ok, status, code } = await userLogin(email, password);

        if (!ok || status !== HTTP_OK) {
            updateHelperText(
                code === 'INVALID_INPUT'
                    ? '*입력값을 확인해주세요.'
                    : '*입력하신 계정 정보가 정확하지 않았습니다.',
            );
            setCredentialInvalid(true);
            return;
        }

        updateHelperText();
        location.href = '/html/index.html';
    } catch (error) {
        console.error('로그인 요청 실패:', error);
        updateHelperText('*로그인에 실패했습니다. 잠시 뒤 다시 시도해주세요.');
        setCredentialInvalid(true);
    } finally {
        isSubmitting = false;
        loginButton.removeAttribute('aria-busy');
        loginButton.disabled =
            !loginData.id ||
            !validEmail(loginData.id) ||
            !loginData.password ||
            loginData.password.length < MIN_PASSWORD_LENGTH;
    }
};

const validateEmailCharacters = input => {
    const validCharacters = /^[A-Za-z0-9@._-]*$/;
    if (!validCharacters.test(input.value)) {
        input.value = input.value.replace(/[^A-Za-z0-9@._-]/g, '');
    }
};

const clearLottieAnimation = () => {
    const container = document.getElementById('lottie-animation');
    if (lottieInstance) {
        lottieInstance.destroy();
        lottieInstance = null;
    }
    if (container) container.innerHTML = '';
};

const lottieAnimation = type => {
    const container = document.getElementById('lottie-animation');
    if (!container || !window.lottie) return;

    const animationPaths = [
        '/public/check_anim.json',
        '/public/denied_anim.json',
    ];

    clearLottieAnimation();
    lottieInstance = window.lottie.loadAnimation({
        container,
        renderer: 'canvas',
        loop: false,
        autoplay: true,
        path: animationPaths[type - 1],
    });
};

const eventSet = () => {
    authForm?.addEventListener('submit', event => {
        event.preventDefault();
        loginClick();
    });

    emailInput.addEventListener('input', event => {
        validateEmailCharacters(event.target);
        loginData.id = event.target.value;
        observeLoginData();
    });

    passwordInput.addEventListener('input', event => {
        loginData.password = event.target.value;
        observeLoginData();
    });

    emailInput.addEventListener('focusout', event => {
        const value = event.target.value;
        if (!value) {
            clearLottieAnimation();
            return;
        }
        lottieAnimation(validEmail(value) ? 1 : 2);
    });
};

const init = () => {
    prependChild(document.body, Header('로그인', 0));
    observeLoginData();
    eventSet();

    authCheckReverse().catch(error => {
        console.error('로그인 상태 확인 실패:', error);
    });
};

init();
