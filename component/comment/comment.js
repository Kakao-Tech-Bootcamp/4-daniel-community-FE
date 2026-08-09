import { resolveImageUrl, padTo2Digits } from '../../utils/function.js';
import Dialog from '../dialog/dialog.js';
import { deleteComment, updateComment } from '../../api/commentRequest.js';

const DEFAULT_PROFILE_IMAGE = '/public/profile_default.svg';
const HTTP_OK = 200;
const MAX_EDIT_COMMENT_LENGTH = 1500;

const normalizeComment = data => ({
    id: data.id || data.comment_id,
    content: data.content || '',
    createdAt: data.createdAt || data.created_at,
    author: {
        userId:
            data.author &&
            (data.author.userId || data.author.user_id || data.author.id),
        nickname: data.author ? data.author.nickname : '',
        profileImageUrl:
            data.author &&
            (data.author.profileImageUrl || data.author.profile_image),
    },
});

const formatCommentDate = value => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return { dateTime: '', label: '' };
    }

    return {
        dateTime: date.toISOString(),
        label: `${date.getFullYear()}-${padTo2Digits(date.getMonth() + 1)}-${padTo2Digits(date.getDate())} ${padTo2Digits(date.getHours())}:${padTo2Digits(date.getMinutes())}:${padTo2Digits(date.getSeconds())}`,
    };
};

const CommentItem = (data, writerId, postId, commentId) => {
    const comment = normalizeComment(data);
    const currentCommentId = commentId || comment.id;
    const authorName = comment.author.nickname || '알 수 없는 사용자';

    const commentItem = document.createElement('article');
    commentItem.className = 'commentItem';
    commentItem.setAttribute('aria-label', `${authorName}님의 댓글`);

    const picture = document.createElement('picture');
    picture.className = 'commentProfile';

    const img = document.createElement('img');
    img.className = 'commentImg';
    img.src = resolveImageUrl(
        comment.author.profileImageUrl,
        DEFAULT_PROFILE_IMAGE,
    );
    img.alt = `${authorName}님의 프로필 이미지`;
    img.loading = 'lazy';
    picture.appendChild(img);

    const commentInfoWrap = document.createElement('div');
    commentInfoWrap.className = 'commentInfoWrap';

    const infoDiv = document.createElement('div');
    infoDiv.className = 'commentInfoHeader';

    const authorHeading = document.createElement('h3');
    authorHeading.textContent = authorName;
    infoDiv.appendChild(authorHeading);

    const time = document.createElement('time');
    const formattedDate = formatCommentDate(comment.createdAt);
    time.dateTime = formattedDate.dateTime;
    time.textContent = formattedDate.label;
    infoDiv.appendChild(time);

    const commentText = document.createElement('p');
    commentText.className = 'commentText';
    commentText.textContent = comment.content;

    const CommentDelete = () => {
        Dialog(
            '댓글을 삭제하시겠습니까?',
            '삭제한 내용은 복구 할 수 없습니다.',
            async () => {
                const { ok, status } = await deleteComment(
                    postId,
                    currentCommentId,
                );
                if (!ok) {
                    Dialog('삭제 실패', '댓글 삭제에 실패하였습니다.');
                    return;
                }

                if (status === HTTP_OK) {
                    location.href = '/html/board.html?id=' + postId;
                }
            },
        );
    };

    const CommentModify = event => {
        const originalContent = commentText.textContent || '';
        const triggerButton = event.currentTarget;

        const textarea = document.createElement('textarea');
        textarea.className = 'commentEditTextarea';
        textarea.value = originalContent;
        textarea.maxLength = MAX_EDIT_COMMENT_LENGTH;
        textarea.setAttribute('aria-label', `${authorName}님의 댓글 수정`);

        const editWrap = document.createElement('div');
        editWrap.className = 'commentEditWrap';

        const editActions = document.createElement('div');
        editActions.className = 'commentEditActions';

        const cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'commentEditCancel';
        cancelButton.textContent = '취소';
        cancelButton.onclick = () => {
            commentInfoWrap.replaceChild(commentText, editWrap);
            triggerButton.focus();
        };

        const saveButton = document.createElement('button');
        saveButton.type = 'button';
        saveButton.className = 'commentEditSave';
        saveButton.textContent = '저장';
        saveButton.onclick = async () => {
            if (textarea.value.length === 0) {
                Dialog('수정 실패', '댓글은 1자 이상 입력해주세요.');
                return;
            }

            const updatedContent = textarea.value;
            saveButton.disabled = true;
            saveButton.setAttribute('aria-busy', 'true');

            const { ok } = await updateComment(
                postId,
                currentCommentId,
                updatedContent,
            );

            if (!ok) {
                saveButton.disabled = false;
                saveButton.removeAttribute('aria-busy');
                Dialog('수정 실패', '댓글 수정에 실패하였습니다.');
                return;
            }

            location.href = '/html/board.html?id=' + postId;
        };

        editActions.append(cancelButton, saveButton);
        editWrap.append(textarea, editActions);
        commentInfoWrap.replaceChild(editWrap, commentText);
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    };

    if (
        comment.author.userId &&
        parseInt(comment.author.userId, 10) === parseInt(writerId, 10)
    ) {
        const buttonWrap = document.createElement('div');
        buttonWrap.className = 'commentActions';
        buttonWrap.setAttribute('aria-label', '댓글 관리');

        const modifyButton = document.createElement('button');
        modifyButton.type = 'button';
        modifyButton.className = 'commentModifyButton';
        modifyButton.textContent = '수정';
        modifyButton.setAttribute('aria-label', `${authorName}님의 댓글 수정`);
        modifyButton.onclick = CommentModify;

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'commentDeleteButton';
        deleteButton.textContent = '삭제';
        deleteButton.setAttribute('aria-label', `${authorName}님의 댓글 삭제`);
        deleteButton.onclick = CommentDelete;

        buttonWrap.append(modifyButton, deleteButton);
        infoDiv.appendChild(buttonWrap);
    }

    commentInfoWrap.append(infoDiv, commentText);
    commentItem.append(picture, commentInfoWrap);

    return commentItem;
};

export default CommentItem;
