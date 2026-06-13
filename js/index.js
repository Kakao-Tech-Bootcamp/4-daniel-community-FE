import BoardItem from '../component/board/boardItem.js';
import Dialog from '../component/dialog/dialog.js';
import Header from '../component/header/header.js';
import { authCheck, prependChild, resolveImageUrl } from '../utils/function.js';
import { getPosts, searchPosts } from '../api/indexRequest.js';

const DEFAULT_PROFILE_IMAGE = '../public/image/profile/default.jpg';
const HTTP_NOT_AUTHORIZED = 401;
const SCROLL_THRESHOLD = 0.9;
const DEFAULT_SORT = 'recent';

let currentKeyword = '';
let currentSort = DEFAULT_SORT;
let currentCursor = null;
let isEnd = false;
let isProcessing = false;

const normalizePost = data => ({
    id: data.id || data.post_id,
    createdAt: data.createdAt || data.created_at,
    title: data.title,
    viewCount: data.viewCount ?? data.views,
    profileImageUrl:
        data.author &&
        (data.author.profileImageUrl || data.author.profile_image),
    nickname: data.author ? data.author.nickname : null,
    commentCount: data.commentCount ?? data.comments_count,
    likeCount: data.likeCount ?? data.likes,
});

const updateSortVisibility = () => {
    const sortRow = document.querySelector('#searchSortRow');
    if (!sortRow) return;
    const isSearching = currentKeyword.trim().length > 0;
    sortRow.classList.toggle('isHidden', !isSearching);
    sortRow.setAttribute('aria-hidden', String(!isSearching));
};

const getBoardItem = async () => {
    const result =
        currentKeyword.trim() === ''
            ? await getPosts(currentCursor)
            : await searchPosts(currentKeyword, currentCursor, currentSort);

    if (!result.ok) {
        throw new Error('Failed to load post list.');
    }

    return result.data;
};

const setBoardItem = boardData => {
    const boardList = document.querySelector('.boardList');
    if (boardList && boardData) {
        const itemsHtml = boardData
            .map(data => {
                const post = normalizePost(data);

                return BoardItem(
                    post.id,
                    post.createdAt,
                    post.title,
                    post.viewCount,
                    post.profileImageUrl,
                    post.nickname,
                    post.commentCount,
                    post.likeCount,
                );
            })
            .join('');

        boardList.innerHTML += ` ${itemsHtml}`;
    }
};

const resetBoardList = () => {
    const boardList = document.querySelector('.boardList');
    if (boardList) {
        boardList.innerHTML = '';
    }
};

const loadBoardItems = async ({ reset = false } = {}) => {
    if (isProcessing || (!reset && isEnd)) return;
    isProcessing = true;

    try {
        if (reset) {
            currentCursor = null;
            isEnd = false;
            resetBoardList();
        }

        const result = await getBoardItem();
        const posts = result && result.posts ? result.posts : [];

        if (posts.length === 0) {
            isEnd = true;
            return;
        }

        setBoardItem(posts);
        currentCursor = result.next_cursor;
        isEnd = !result.has_more;
    } catch (error) {
        console.error('Error fetching items:', error);
        isEnd = true;
    } finally {
        isProcessing = false;
    }
};

const addSearchEvent = () => {
    const searchInput = document.querySelector('#searchInput');
    const searchButton = document.querySelector('.searchButton');
    if (!searchInput || !searchButton) return;

    const runSearch = async () => {
        const trimmedKeyword = searchInput.value.trim();
        if (trimmedKeyword.length > 0 && trimmedKeyword.length < 2) {
            Dialog('검색 실패', '검색어는 2글자 이상 입력해주세요.');
            return;
        }
        currentKeyword = trimmedKeyword;
        updateSortVisibility();
        await loadBoardItems({ reset: true });
    };

    searchButton.addEventListener('click', runSearch);
    searchInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            runSearch();
        }
    });
};

const addSortEvent = () => {
    const sortSelect = document.querySelector('#searchSortSelect');
    if (!sortSelect) return;
    sortSelect.value = currentSort;

    sortSelect.addEventListener('change', async () => {
        currentSort = sortSelect.value || DEFAULT_SORT;
        if (currentKeyword.trim().length === 0) return;
        await loadBoardItems({ reset: true });
    });
};

const addInfinityScrollEvent = () => {
    isEnd = false;
    isProcessing = false;

    window.addEventListener('scroll', async () => {
        const hasScrolledToThreshold =
            window.scrollY + window.innerHeight >=
            document.documentElement.scrollHeight * SCROLL_THRESHOLD;
        if (hasScrolledToThreshold) {
            loadBoardItems();
        }
    });
};

const init = async () => {
    try {
        const response = await authCheck();
        const data = await response.json();
        if (response.status === HTTP_NOT_AUTHORIZED) {
            window.location.href = '/html/login.html';
            return;
        }

        const profileImageUrl = resolveImageUrl(
            data.data.profileImageUrl || data.data.profile_image,
            DEFAULT_PROFILE_IMAGE,
        );

        prependChild(
            document.body,
            Header('게시판', 0, profileImageUrl),
        );

        updateSortVisibility();
        await loadBoardItems({ reset: true });

        addSearchEvent();
        addSortEvent();
        addInfinityScrollEvent();
    } catch (error) {
        console.error('Initialization failed:', error);
    }
};

init();