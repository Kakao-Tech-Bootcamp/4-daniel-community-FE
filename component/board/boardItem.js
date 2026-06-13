import { padTo2Digits, resolveImageUrl } from '../../utils/function.js';

const BoardItem = (
    postId,
    date,
    title,
    viewCount,
    imgUrl,
    writer,
    commentCount,
    likeCount,
) => {
    if (!postId || !date || !title) {
        return '';
    }

    const safeViewCount = viewCount ?? 0;
    const safeCommentCount = commentCount ?? 0;
    const safeLikeCount = likeCount ?? 0;
    const safeWriter = writer || '알 수 없음';

    const dateObj = new Date(date);
    const isValidDate = !Number.isNaN(dateObj.getTime());
    const formattedDate = isValidDate
        ? `${dateObj.getFullYear()}-${padTo2Digits(dateObj.getMonth() + 1)}-${padTo2Digits(dateObj.getDate())} ${padTo2Digits(dateObj.getHours())}:${padTo2Digits(dateObj.getMinutes())}:${padTo2Digits(dateObj.getSeconds())}`
        : '';

    const DEFAULT_PROFILE_IMAGE = '../public/image/profile/default.jpg';
    const profileImageUrl = resolveImageUrl(imgUrl, DEFAULT_PROFILE_IMAGE);

    return `
    <a class="boardItemLink" href="/html/board.html?id=${postId}">
        <div class="boardItem">
            <h2 class="title">${title}</h2>
            <div class="info">
                <div class="counts">
                    <h3>좋아요 ${safeLikeCount}</h3>
                    <h3>댓글 ${safeCommentCount}</h3>
                    <h3>조회수 ${safeViewCount}</h3>
                </div>
                <p class="date">${formattedDate}</p>
            </div>
            <div class="writerInfo">
                <picture class="img">
                    <img src="${profileImageUrl}" alt="작성자 프로필">
                </picture>
                <h2 class="writer">${safeWriter}</h2>
            </div>
        </div>
    </a>
`;
};

export default BoardItem;