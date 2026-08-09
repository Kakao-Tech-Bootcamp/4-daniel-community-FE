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
const DEFAULT_PROFILE_IMAGE = '/public/profile_default.svg';

const form = document.querySelector('#postForm');
const submitButton = document.querySelector('#submit');
const titleInput = document.querySelector('#title');
const contentInput = document.querySelector('#content');
const imageInput = document.querySelector('#image');
const imagePreviewText = document.querySelector('#imagePreviewText');
const contentHelpElement = document.querySelector(
    '.inputBox p[name="content"]',
);
const titleCount = document.querySelector('#titleCount');
const contentCount = document.querySelector('#contentCount');

const boardWrite = {
    title: '',
    content: '',
};

let isModifyMode = false;
let isSubmitting = false;

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

const updateCharacterCounts = () => {
    if (titleCount) titleCount.textContent = String(titleInput.value.length);
    if (contentCount) contentCount.textContent = String(contentInput.value.length);
};

const updateSubmitState = () => {
    submitButton.disabled =
        isSubmitting || !boardWrite.title.trim() || !boardWrite.content.trim();
};

const setHelperText = message => {
    if (contentHelpElement) contentHelpElement.textContent = message;
};

const getBoardData = () => ({
    title: boardWrite.title.trim(),
    content: boardWrite.content.trim(),
    attachFileUrl: localStorage.getItem('postFileUrl') || undefined,
});

const showAttachedFile = fileName => {
    if (!imagePreviewText) return;

    imagePreviewText.hidden = false;
    imagePreviewText.replaceChildren();

    const name = document.createElement('span');
    name.textContent = fileName;

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'deleteFile';
    removeButton.textContent = '제거';
    removeButton.setAttribute('aria-label', `${fileName} 첨부 이미지 제거`);
    removeButton.addEventListener('click', removeAttachedFile);

    imagePreviewText.append(name, removeButton);
};

const removeAttachedFile = () => {
    localStorage.removeItem('postFileUrl');
    imageInput.value = '';
    if (imagePreviewText) {
        imagePreviewText.hidden = true;
        imagePreviewText.replaceChildren();
    }
};

const submitPost = async () => {
    const boardData = getBoardData();

    if (!boardData.title || !boardData.content) {
        setHelperText('제목과 내용을 모두 작성해주세요.');
        updateSubmitState();
        return;
    }

    if (boardData.title.length > MAX_TITLE_LENGTH) {
        setHelperText('제목은 26자 이하로 입력해주세요.');
        return;
    }

    isSubmitting = true;
    updateSubmitState();

    try {
        if (!isModifyMode) {
            const { ok, status, data, message } = await createPost(boardData);
            if (!ok || status !== HTTP_CREATED) {
                Dialog(
                    '게시글 등록 실패',
                    message || '게시글을 등록하지 못했습니다. 잠시 뒤 다시 시도해주세요.',
                );
                return;
            }

            const postId = data && (data.post_id || data.postId || data.insertId);
            localStorage.removeItem('postFileUrl');
            window.location.href = postId
                ? `/html/board.html?id=${postId}`
                : '/html/index.html';
            return;
        }

        const postId = getQueryString('postId');
        const { ok, status, message } = await updatePost(postId, boardData);

        if (!ok || status !== HTTP_OK) {
            Dialog(
                '게시글 수정 실패',
                message || '게시글을 수정하지 못했습니다. 잠시 뒤 다시 시도해주세요.',
            );
            return;
        }

        localStorage.removeItem('postFileUrl');
        window.location.href = `/html/board.html?id=${postId}`;
    } catch (error) {
        console.error('게시글 저장 실패:', error);
        Dialog('저장 실패', '네트워크 상태를 확인한 뒤 다시 시도해주세요.');
    } finally {
        isSubmitting = false;
        updateSubmitState();
    }
};

const handleTextInput = (event, field) => {
    const maxLength = field === 'title' ? MAX_TITLE_LENGTH : MAX_CONTENT_LENGTH;
    const value = event.target.value.slice(0, maxLength);

    if (event.target.value !== value) event.target.value = value;
    boardWrite[field] = value;

    if (!value.trim()) {
        setHelperText(field === 'title' ? '제목을 입력해주세요.' : '내용을 입력해주세요.');
    } else {
        setHelperText('');
    }

    updateCharacterCounts();
    updateSubmitState();
};

const handleImageChange = async event => {
    const file = event.target.files[0];
    if (!file) return;

    try {
        const dataUrl = await fileToBase64(file, true);
        const { ok, data, message } = await fileUpload({
            name: file.name,
            dataUrl,
        });

        if (!ok || !data || !data.post_image) {
            Dialog(
                '이미지 업로드 실패',
                message || '이미지를 업로드하지 못했습니다.',
            );
            imageInput.value = '';
            return;
        }

        localStorage.setItem('postFileUrl', data.post_image);
        showAttachedFile(file.name);
    } catch (error) {
        console.error('이미지 업로드 실패:', error);
        Dialog('이미지 업로드 실패', '이미지를 처리하지 못했습니다.');
        imageInput.value = '';
    }
};

const getBoardModifyData = async postId => {
    const { ok, data } = await getBoardItem(postId);
    if (!ok || !data) throw new Error('게시글 정보를 불러오지 못했습니다.');
    return normalizePostDetail(data);
};

const setModifyData = data => {
    titleInput.value = data.title || '';
    contentInput.value = data.content || '';
    boardWrite.title = data.title || '';
    boardWrite.content = data.content || '';

    if (data.attachFileUrl) {
        localStorage.setItem('postFileUrl', data.attachFileUrl);
        showAttachedFile(data.attachFileUrl.split('/').pop() || '첨부 이미지');
    } else {
        localStorage.removeItem('postFileUrl');
        if (imagePreviewText) imagePreviewText.hidden = true;
    }

    updateCharacterCounts();
    updateSubmitState();
};

const addEvents = () => {
    form.addEventListener('submit', event => {
        event.preventDefault();
        if (!submitButton.disabled) submitPost();
    });
    titleInput.addEventListener('input', event => handleTextInput(event, 'title'));
    contentInput.addEventListener('input', event => handleTextInput(event, 'content'));
    imageInput.addEventListener('change', handleImageChange);

    const cancelButton = document.querySelector('.editorCancelButton');
    if (cancelButton) cancelButton.addEventListener('click', () => history.back());
};

const init = async () => {
    try {
        const response = await authCheck();
        if (!response) return;

        const authData = await response.json();
        const myInfo = normalizeUserInfo(authData.data || {});
        const modifyId = getQueryString('postId');
        isModifyMode = Boolean(modifyId);

        if (!isModifyMode) localStorage.removeItem('postFileUrl');

        const profileImage = resolveImageUrl(
            myInfo.profileImageUrl,
            DEFAULT_PROFILE_IMAGE,
        );
        prependChild(
            document.body,
            Header(isModifyMode ? '글 수정' : '글쓰기', 1, profileImage),
        );

        if (isModifyMode) {
            const modifyData = await getBoardModifyData(modifyId);

            if (
                modifyData.writerId &&
                myInfo.userId &&
                Number(myInfo.userId) !== Number(modifyData.writerId)
            ) {
                Dialog('권한 없음', '이 게시글을 수정할 권한이 없습니다.', () => {
                    window.location.href = '/html/index.html';
                });
                return;
            }

            setModifyData(modifyData);
        }

        addEvents();
        updateCharacterCounts();
        updateSubmitState();
    } catch (error) {
        console.error('글쓰기 화면 초기화 실패:', error);
        Dialog('화면을 불러오지 못했습니다', '잠시 뒤 다시 시도해주세요.');
    }
};

init();
