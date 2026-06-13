import Dialog from '../component/dialog/dialog.js';
import Header from '../component/header/header.js';
import {
    authCheck,
    fileToBase64,
    getQueryString,
    prependChild,
    resolveImageUrl,
} from '../utils/function.js';
import {
    createPost,
    fileUpload,
    updatePost,
    getBoardItem,
} from '../api/board-writeRequest.js';

const HTTP_OK = 200;
const HTTP_CREATED = 201;

const MAX_TITLE_LENGTH = 26;
const MAX_CONTENT_LENGTH = 1500;

const DEFAULT_PROFILE_IMAGE = '../public/image/profile/default.jpg';

const submitButton = document.querySelector('#submit');
const titleInput = document.querySelector('#title');
const contentInput = document.querySelector('#content');
const imageInput = document.querySelector('#image');
const imagePreviewText = document.getElementById('imagePreviewText');
const contentHelpElement = document.querySelector(
    '.inputBox p[name="content"]',
);

const boardWrite = {
    title: '',
    content: '',
};

let isModifyMode = false;
let modifyData = {};

const normalizeUserInfo = data => ({
    userId: data.userId || data.user_id || data.idx,
    profileImageUrl: data.profileImageUrl || data.profile_image || null,
});

const normalizePostDetail = data => ({
    id: data.id || data.post_id,
    title: data.title,
    content: data.content,
    attachFileUrl:
        data.attachFileUrl ||
        data.fileUrl ||
        data.filePath ||
        data.post_image ||
        null,
    writerId:
        data.writerId ||
        data.userId ||
        data.user_id ||
        (data.author && (data.author.userId || data.author.user_id)) ||
        null,
});

const observeSignupData = () => {
    const { title, content } = boardWrite;
    if (!title || !content || title === '' || content === '') {
        submitButton.disabled = true;
        submitButton.style.backgroundColor = '#ACA0EB';
    } else {
        submitButton.disabled = false;
        submitButton.style.backgroundColor = '#7F6AEE';
    }
};

const getBoardData = () => {
    return {
        title: boardWrite.title,
        content: boardWrite.content,
        attachFileUrl:
            localStorage.getItem('postFileUrl') === null
                ? undefined
                : localStorage.getItem('postFileUrl'),
    };
};

const addBoard = async () => {
    const boardData = getBoardData();

    if (!boardData) return Dialog('게시글', '게시글을 입력해주세요.');

    if (boardData.title.length > MAX_TITLE_LENGTH)
        return Dialog('게시글', '제목은 26자 이하로 입력해주세요.');

    if (!isModifyMode) {
        const { ok, status, data } = await createPost(boardData);
        if (!ok) throw new Error('서버 응답 오류');

        if (status === HTTP_CREATED) {
            const postId = data.post_id || data.postId || data.insertId;
            localStorage.removeItem('postFileUrl');
            window.location.href = `/html/board.html?id=${postId}`;
        } else {
            const helperElement = contentHelpElement;
            helperElement.textContent = '제목, 내용을 모두 작성해주세요.';
        }
    } else {
        const postId = getQueryString('postId');
        const setData = {
            ...boardData,
        };

        const { ok, status } = await updatePost(postId, setData);
        if (!ok) throw new Error('서버 응답 오류');

        if (status === HTTP_OK) {
            localStorage.removeItem('postFileUrl');
            window.location.href = `/html/board.html?id=${postId}`;
        } else {
            Dialog('게시글', '게시글 수정 실패');
        }
    }
};

const changeEventHandler = async (event, uid) => {
    if (uid === 'title') {
        const value = event.target.value;
        const helperElement = contentHelpElement;
        if (!value || value === '') {
            boardWrite[uid] = '';
            helperElement.textContent = '제목을 입력해주세요.';
        } else if (value.length > MAX_TITLE_LENGTH) {
            helperElement.textContent = '제목은 26자 이하로 입력해주세요.';
            titleInput.value = value.substring(0, MAX_TITLE_LENGTH);
            boardWrite[uid] = value.substring(0, MAX_TITLE_LENGTH);
        } else {
            boardWrite[uid] = value;
            helperElement.textContent = '';
        }
    } else if (uid === 'content') {
        const value = event.target.value;
        const helperElement = contentHelpElement;
        if (!value || value === '') {
            boardWrite[uid] = '';
            helperElement.textContent = '내용을 입력해주세요.';
        } else if (value.length > MAX_CONTENT_LENGTH) {
            helperElement.textContent = '내용은 1500자 이하로 입력해주세요.';
            contentInput.value = value.substring(0, MAX_CONTENT_LENGTH);
            boardWrite[uid] = value.substring(0, MAX_CONTENT_LENGTH);
        } else {
            boardWrite[uid] = value;
            helperElement.textContent = '';
        }
    } else if (uid === 'image') {
        const file = event.target.files[0];
        if (!file) {
            console.log('파일이 선택되지 않았습니다.');
            return;
        }

        try {
            const dataUrl = await fileToBase64(file, true);
            const { ok, data, message } = await fileUpload({
                name: file.name,
                dataUrl,
            });

            if (!ok) {
                Dialog(
                    '이미지 업로드',
                    message || '게시글 이미지 업로드에 실패했습니다.',
                );
                return;
            }

            localStorage.setItem('postFileUrl', data.post_image);

            if (imagePreviewText) {
                imagePreviewText.innerHTML =
                    file.name + `<span class="deleteFile">X</span>`;
                imagePreviewText.style.display = 'block';
            }
        } catch (error) {
            console.error('업로드 중 오류 발생:', error);
        }
    } else if (uid === 'imagePreviewText') {
        localStorage.removeItem('postFileUrl');
        imagePreviewText.style.display = 'none';
    }

    observeSignupData();
};

const getBoardModifyData = async postId => {
    const { ok, data } = await getBoardItem(postId);
    if (!ok) throw new Error('서버 응답 오류');
    return normalizePostDetail(data);
};

const checkModifyMode = () => {
    const postId = getQueryString('postId');
    if (!postId) return false;
    return postId;
};

const addEvent = () => {
    submitButton.addEventListener('click', addBoard);
    titleInput.addEventListener('input', event =>
        changeEventHandler(event, 'title'),
    );
    contentInput.addEventListener('input', event =>
        changeEventHandler(event, 'content'),
    );
    imageInput.addEventListener('change', event =>
        changeEventHandler(event, 'image'),
    );
    if (imagePreviewText !== null) {
        imagePreviewText.addEventListener('click', event =>
            changeEventHandler(event, 'imagePreviewText'),
        );
    }
};

const setModifyData = data => {
    titleInput.value = data.title;
    contentInput.value = data.content;

    const fileUrl = data.attachFileUrl;
    if (fileUrl) {
        const resolvedFileUrl = resolveImageUrl(fileUrl);
        const fileName = fileUrl.split('/').pop();
        imagePreviewText.innerHTML =
            fileName + `<span class="deleteFile">X</span>`;
        imagePreviewText.style.display = 'block';
        localStorage.setItem('postFileUrl', fileUrl);

        const attachFile = new File(
            [resolvedFileUrl],
            fileName,
            { type: '' },
        );

        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(attachFile);
        imageInput.files = dataTransfer.files;
    } else {
        imagePreviewText.style.display = 'none';
    }

    boardWrite.title = data.title;
    boardWrite.content = data.content;

    observeSignupData();
};

const init = async () => {
    const dataResponse = await authCheck();
    const authData = await dataResponse.json();
    const myInfo = normalizeUserInfo(authData.data);
    const modifyId = checkModifyMode();

    const profileImage = resolveImageUrl(
        myInfo.profileImageUrl,
        DEFAULT_PROFILE_IMAGE,
    );

    prependChild(document.body, Header('커뮤니티', 1, profileImage));

    if (modifyId) {
        isModifyMode = true;
        modifyData = await getBoardModifyData(modifyId);

        if (
            modifyData.writerId &&
            myInfo.userId &&
            Number(myInfo.userId) !== Number(modifyData.writerId)
        ) {
            Dialog('권한 없음', '권한이 없습니다.', () => {
                window.location.href = '/';
            });
        } else {
            setModifyData(modifyData);
        }
    }

    addEvent();
};

init();