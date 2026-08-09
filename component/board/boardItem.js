import { padTo2Digits, resolveImageUrl } from '../../utils/function.js';

const DEFAULT_PROFILE_IMAGE = '/public/profile_default.svg';

const normalizeCount = value => {
    const count = Number(value);
    return Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0;
};

const formatDate = value => {
    if (value === null || value === undefined || String(value).trim() === '') {
        return {
            label: '작성일 정보 없음',
            dateTime: '',
        };
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return {
            label: '작성일 정보 없음',
            dateTime: '',
        };
    }

    return {
        label: `${date.getFullYear()}.${padTo2Digits(date.getMonth() + 1)}.${padTo2Digits(date.getDate())} ${padTo2Digits(date.getHours())}:${padTo2Digits(date.getMinutes())}`,
        dateTime: date.toISOString(),
    };
};

const createMetric = (label, value) => {
    const item = document.createElement('li');
    item.className = 'countItem';

    const metricLabel = document.createElement('span');
    metricLabel.className = 'countLabel';
    metricLabel.textContent = label;

    const metricValue = document.createElement('strong');
    metricValue.textContent = normalizeCount(value).toLocaleString('ko-KR');

    item.append(metricLabel, metricValue);
    return item;
};

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
    const safePostId = String(postId ?? '').trim();
    const safeTitle = String(title ?? '').trim();

    if (!safePostId || !safeTitle) return null;

    const safeWriter = String(writer ?? '').trim() || '알 수 없는 작성자';
    const formattedDate = formatDate(date);
    const profileImageUrl = resolveImageUrl(imgUrl, DEFAULT_PROFILE_IMAGE);

    const link = document.createElement('a');
    link.className = 'boardItemLink';
    link.href = `/html/board.html?id=${encodeURIComponent(safePostId)}`;
    link.setAttribute(
        'aria-label',
        `${safeTitle}, ${safeWriter} 작성 게시글 보기`,
    );

    const article = document.createElement('article');
    article.className = 'boardItem';

    const header = document.createElement('header');
    header.className = 'writerInfo';

    const picture = document.createElement('picture');
    picture.className = 'img';

    const profileImage = document.createElement('img');
    profileImage.src = profileImageUrl;
    profileImage.alt = '';
    profileImage.loading = 'lazy';
    profileImage.width = 36;
    profileImage.height = 36;
    profileImage.addEventListener('error', () => {
        profileImage.src = DEFAULT_PROFILE_IMAGE;
    }, { once: true });

    picture.appendChild(profileImage);

    const writerMeta = document.createElement('div');
    writerMeta.className = 'writerMeta';

    const writerName = document.createElement('p');
    writerName.className = 'writer';
    writerName.textContent = safeWriter;

    const createdAt = document.createElement('time');
    createdAt.className = 'date';
    createdAt.textContent = formattedDate.label;
    if (formattedDate.dateTime) {
        createdAt.dateTime = formattedDate.dateTime;
    }

    writerMeta.append(writerName, createdAt);
    header.append(picture, writerMeta);

    const titleElement = document.createElement('h3');
    titleElement.className = 'title';
    titleElement.textContent = safeTitle;

    const info = document.createElement('footer');
    info.className = 'info';

    const counts = document.createElement('ul');
    counts.className = 'counts';
    counts.setAttribute('aria-label', '게시글 반응');
    counts.append(
        createMetric('좋아요', likeCount),
        createMetric('댓글', commentCount),
        createMetric('조회', viewCount),
    );

    const openLabel = document.createElement('span');
    openLabel.className = 'openLabel';
    openLabel.textContent = '읽기';

    info.append(counts, openLabel);
    article.append(header, titleElement, info);
    link.appendChild(article);

    return link;
};

export default BoardItem;
