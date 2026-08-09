import { getServerUrl } from '../../utils/function.js';
import { getAccessToken, removeAccessToken } from '../../utils/request.js';

const createBrand = destination => {
    const brand = document.createElement('a');
    brand.className = 'headerBrand';
    brand.href = destination;
    brand.setAttribute(
        'aria-label',
        destination === '/' ? 'KTB HUB 소개 홈' : 'KTB HUB 커뮤니티 홈',
    );

    const text = document.createElement('span');
    text.className = 'headerBrandText';
    text.textContent = 'KTB HUB';

    brand.appendChild(text);
    return brand;
};

const createBackButton = leftBtn => {
    if (leftBtn !== 1 && leftBtn !== 2) return null;

    const button = document.createElement('button');
    button.className = 'back';
    button.type = 'button';
    button.setAttribute(
        'aria-label',
        leftBtn === 1 ? '이전 페이지로 이동' : '커뮤니티 홈으로 이동',
    );

    const icon = document.createElement('img');
    icon.src = '/public/navigate_before.svg';
    icon.alt = '';
    icon.setAttribute('aria-hidden', 'true');
    button.appendChild(icon);

    button.addEventListener('click', () => {
        if (leftBtn === 1) {
            history.back();
        } else {
            location.href = '/html/index.html';
        }
    });

    return button;
};

const createDropdown = () => {
    const menu = document.createElement('div');
    menu.className = 'drop none';
    menu.id = 'profile-account-panel';

    const label = document.createElement('span');
    label.className = 'dropLabel';
    label.textContent = '내 계정';

    const modifyInfoLink = document.createElement('a');
    modifyInfoLink.href = '/html/modifyInfo.html';
    modifyInfoLink.textContent = '회원정보 수정';

    const modifyPasswordLink = document.createElement('a');
    modifyPasswordLink.href = '/html/modifyPassword.html';
    modifyPasswordLink.textContent = '비밀번호 변경';

    const divider = document.createElement('div');
    divider.className = 'dropDivider';

    const logoutButton = document.createElement('button');
    logoutButton.type = 'button';
    logoutButton.className = 'logoutButton';
    logoutButton.textContent = '로그아웃';
    logoutButton.addEventListener('click', async () => {
        const accessToken = getAccessToken();

        try {
            if (accessToken) {
                await fetch(`${getServerUrl()}/users/logout`, {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                });
            }
        } finally {
            removeAccessToken();
            location.href = '/html/login.html';
        }
    });

    menu.append(label, modifyInfoLink, modifyPasswordLink, divider, logoutButton);
    return menu;
};

const createProfileMenu = profileImage => {
    if (!profileImage) return null;

    const profile = document.createElement('div');
    profile.className = 'profile';

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'profileTrigger';
    trigger.setAttribute('aria-label', '내 계정 메뉴 열기');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', 'profile-account-panel');

    const image = document.createElement('img');
    image.src = profileImage;
    image.alt = '내 프로필';
    image.loading = 'eager';

    const menu = createDropdown();
    trigger.appendChild(image);
    profile.append(trigger, menu);

    trigger.addEventListener('click', event => {
        event.stopPropagation();
        const willOpen = menu.classList.contains('none');
        menu.classList.toggle('none');
        trigger.setAttribute('aria-expanded', String(willOpen));
        trigger.setAttribute(
            'aria-label',
            willOpen ? '내 계정 메뉴 닫기' : '내 계정 메뉴 열기',
        );
    });

    menu.addEventListener('click', event => event.stopPropagation());
    return profile;
};

const Header = (title, leftBtn = 0, profileImage = null) => {
    const header = document.createElement('header');
    header.className = 'siteHeader';

    const inner = document.createElement('div');
    inner.className = 'siteHeaderInner';

    const start = document.createElement('div');
    start.className = 'siteHeaderStart';
    const backButton = createBackButton(leftBtn);
    if (backButton) start.appendChild(backButton);
    start.appendChild(createBrand(profileImage ? '/html/index.html' : '/'));

    const context = document.createElement('p');
    context.className = 'headerContext';
    context.textContent = title || '커뮤니티';

    const actions = document.createElement('div');
    actions.className = 'siteHeaderActions';

    if (profileImage) {
        const communityLink = document.createElement('a');
        communityLink.className = 'headerCommunityLink';
        communityLink.href = '/html/index.html';
        communityLink.textContent = '커뮤니티';
        actions.appendChild(communityLink);

        const profileMenu = createProfileMenu(profileImage);
        if (profileMenu) actions.appendChild(profileMenu);
    }

    inner.append(start, context, actions);
    header.appendChild(inner);
    return header;
};

const closeProfileMenu = () => {
    const menu = document.querySelector('.siteHeader .drop');
    const trigger = document.querySelector('.siteHeader .profileTrigger');

    if (menu && !menu.classList.contains('none')) {
        menu.classList.add('none');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
        if (trigger) trigger.setAttribute('aria-label', '내 계정 메뉴 열기');
        return true;
    }

    return false;
};

window.addEventListener('click', closeProfileMenu);
window.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const didClose = closeProfileMenu();
    if (didClose) {
        const trigger = document.querySelector('.siteHeader .profileTrigger');
        if (trigger) trigger.focus();
    }
});

export default Header;
