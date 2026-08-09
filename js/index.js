import BoardItem from '../component/board/boardItem.js';
import Dialog from '../component/dialog/dialog.js';
import Header from '../component/header/header.js';
import { authCheck, prependChild, resolveImageUrl } from '../utils/function.js';
import { getPosts, searchPosts } from '../api/indexRequest.js';

const DEFAULT_PROFILE_IMAGE = '/public/profile_default.svg';
const HTTP_NOT_AUTHORIZED = 401;
const SCROLL_THRESHOLD = 0.9;

let currentKeyword = '';
let currentCursor = null;
let isEnd = false;
let isProcessing = false;
let isScrollScheduled = false;

const normalizePost = data => {
    const post = data || {};
    const author = post.author || {};

    return {
        id: post.id || post.post_id,
        createdAt: post.createdAt || post.created_at,
        title: post.title,
        viewCount: post.viewCount ?? post.views,
        profileImageUrl:
            author.profileImageUrl || author.profile_image || null,
        nickname: author.nickname || post.nickname || null,
        commentCount: post.commentCount ?? post.comments_count,
        likeCount: post.likeCount ?? post.likes,
    };
};

const getBoardList = () => document.querySelector('.boardList');
const getFeedState = () => document.querySelector('#feedState');

const setBusy = busy => {
    const boardList = getBoardList();
    const clearButton = document.querySelector('#searchClearButton');

    if (boardList) boardList.setAttribute('aria-busy', String(busy));
    if (clearButton) clearButton.disabled = busy;
};

const replaceFeedState = (...children) => {
    const feedState = getFeedState();
    if (feedState) feedState.replaceChildren(...children);
};

const createStatePanel = (mark, title, description) => {
    const panel = document.createElement('div');
    panel.className = 'statePanel';

    const markElement = document.createElement('span');
    markElement.className = 'stateMark';
    markElement.textContent = mark;
    markElement.setAttribute('aria-hidden', 'true');

    const titleElement = document.createElement('h3');
    titleElement.textContent = title;

    const descriptionElement = document.createElement('p');
    descriptionElement.textContent = description;

    panel.append(markElement, titleElement, descriptionElement);
    return panel;
};

const showLoadingState = () => {
    const panel = document.createElement('div');
    panel.className = 'statePanel loadingState';

    const spinner = document.createElement('span');
    spinner.className = 'stateSpinner';
    spinner.setAttribute('aria-hidden', 'true');

    const message = document.createElement('p');
    message.textContent = currentCursor
        ? '다음 이야기를 불러오고 있습니다.'
        : '게시글을 불러오고 있습니다.';

    panel.append(spinner, message);
    replaceFeedState(panel);
};

const setSearchSummary = () => {
    const summary = document.querySelector('#searchSummary');
    if (!summary) return;

    summary.hidden = currentKeyword.length === 0;
    summary.textContent = currentKeyword
        ? `“${currentKeyword}” 검색 결과`
        : '';
};

const updateClearButton = () => {
    const input = document.querySelector('#searchInput');
    const clearButton = document.querySelector('#searchClearButton');
    if (!input || !clearButton) return;

    clearButton.hidden = input.value.length === 0;
};

const showEmptyState = () => {
    const isSearching = currentKeyword.length > 0;
    const panel = createStatePanel(
        isSearching ? '?' : '+',
        isSearching ? '검색 결과가 없습니다.' : '아직 작성된 글이 없습니다.',
        isSearching
            ? '검색어를 바꾸거나 전체 게시글을 다시 확인해 보세요.'
            : '첫 번째 이야기를 작성해 동료들과 경험을 나눠보세요.',
    );

    if (isSearching) {
        const resetButton = document.createElement('button');
        resetButton.type = 'button';
        resetButton.className = 'stateAction';
        resetButton.textContent = '전체 글 보기';
        resetButton.addEventListener('click', () => {
            const input = document.querySelector('#searchInput');
            if (input) input.value = '';
            currentKeyword = '';
            updateClearButton();
            setSearchSummary();
            loadBoardItems({ reset: true });
        });
        panel.appendChild(resetButton);
    } else {
        const writeLink = document.createElement('a');
        writeLink.className = 'stateAction';
        writeLink.href = '/html/board-write.html';
        writeLink.textContent = '첫 글 작성하기';
        panel.appendChild(writeLink);
    }

    replaceFeedState(panel);
};

const showErrorState = () => {
    const boardList = getBoardList();
    const hasLoadedItems = Boolean(boardList && boardList.childElementCount > 0);
    const panel = createStatePanel(
        '!',
        '게시글을 불러오지 못했습니다.',
        '네트워크 상태를 확인한 뒤 다시 시도해 주세요.',
    );

    const retryButton = document.createElement('button');
    retryButton.type = 'button';
    retryButton.className = 'stateAction';
    retryButton.textContent = '다시 시도';
    retryButton.addEventListener('click', () => {
        isEnd = false;
        loadBoardItems({ reset: !hasLoadedItems });
    });

    panel.appendChild(retryButton);
    replaceFeedState(panel);
};

const showEndState = () => {
    const panel = document.createElement('div');
    panel.className = 'statePanel endState';

    const message = document.createElement('p');
    message.textContent = currentKeyword
        ? '검색된 게시글을 모두 확인했습니다.'
        : '모든 게시글을 확인했습니다.';

    panel.appendChild(message);
    replaceFeedState(panel);
};

const setBoardItem = boardData => {
    const boardList = getBoardList();
    if (!boardList || !Array.isArray(boardData)) return 0;

    const fragment = document.createDocumentFragment();
    let appendedCount = 0;

    boardData.forEach(data => {
        const post = normalizePost(data);
        const item = BoardItem(
            post.id,
            post.createdAt,
            post.title,
            post.viewCount,
            post.profileImageUrl,
            post.nickname,
            post.commentCount,
            post.likeCount,
        );

        if (item) {
            fragment.appendChild(item);
            appendedCount += 1;
        }
    });

    boardList.appendChild(fragment);
    return appendedCount;
};

const resetBoardList = () => {
    const boardList = getBoardList();
    if (boardList) boardList.replaceChildren();
};

const getBoardData = async () => {
    const result = currentKeyword
        ? await searchPosts(currentKeyword, currentCursor)
        : await getPosts(currentCursor);

    if (!result.ok) {
        throw new Error(result.message || 'Failed to load post list.');
    }

    return result.data || {};
};

const loadBoardItems = async ({ reset = false } = {}) => {
    if (isProcessing || (!reset && isEnd)) return;

    if (reset) {
        currentCursor = null;
        isEnd = false;
        resetBoardList();
    }

    isProcessing = true;
    setBusy(true);
    showLoadingState();

    try {
        const result = await getBoardData();
        const posts = Array.isArray(result.posts) ? result.posts : [];
        setBoardItem(posts);

        currentCursor = result.next_cursor ?? result.nextCursor ?? null;
        const hasMore = result.has_more ?? result.hasMore ?? false;
        isEnd = !Boolean(hasMore);

        const boardList = getBoardList();
        const hasItems = Boolean(boardList && boardList.childElementCount > 0);

        if (!hasItems) {
            isEnd = true;
            showEmptyState();
        } else if (isEnd) {
            showEndState();
        } else {
            replaceFeedState();
        }
    } catch (error) {
        console.error('Error fetching items:', error);
        isEnd = true;
        showErrorState();
    } finally {
        isProcessing = false;
        setBusy(false);
        updateClearButton();
    }
};

const runSearch = async () => {
    if (isProcessing) return;

    const searchInput = document.querySelector('#searchInput');
    if (!searchInput) return;

    const trimmedKeyword = searchInput.value.trim();

    if (trimmedKeyword.length > 0 && trimmedKeyword.length < 2) {
        Dialog('검색 실패', '검색어는 2글자 이상 입력해주세요.');
        return;
    }

    searchInput.value = trimmedKeyword;
    currentKeyword = trimmedKeyword;
    updateClearButton();
    setSearchSummary();
    await loadBoardItems({ reset: true });
};

const addSearchEvent = () => {
    const searchForm = document.querySelector('.searchRow');
    const searchInput = document.querySelector('#searchInput');
    const clearButton = document.querySelector('#searchClearButton');
    if (!searchForm || !searchInput || !clearButton) return;

    searchForm.addEventListener('submit', event => {
        event.preventDefault();
        runSearch();
    });

    searchInput.addEventListener('input', updateClearButton);
    clearButton.addEventListener('click', () => {
        searchInput.value = '';
        updateClearButton();

        if (currentKeyword) {
            runSearch();
        } else {
            searchInput.focus();
        }
    });
};

const addInfinityScrollEvent = () => {
    window.addEventListener(
        'scroll',
        () => {
            if (isScrollScheduled) return;
            isScrollScheduled = true;

            window.requestAnimationFrame(() => {
                const hasScrolledToThreshold =
                    window.scrollY + window.innerHeight >=
                    document.documentElement.scrollHeight * SCROLL_THRESHOLD;

                if (hasScrolledToThreshold) loadBoardItems();
                isScrollScheduled = false;
            });
        },
        { passive: true },
    );
};

const setWelcomeMessage = userData => {
    const welcome = document.querySelector('#welcomeName');
    const nickname = String(userData.nickname || '').trim();

    if (welcome && nickname) {
        welcome.textContent = `${nickname}님, 오늘의 이야기를 만나보세요.`;
    }
};

const insertHeader = profileImageUrl => {
    prependChild(document.body, Header('커뮤니티', 0, profileImageUrl));

    const skipLink = document.querySelector('.skipLink');
    if (skipLink) prependChild(document.body, skipLink);
};

const init = async () => {
    try {
        const response = await authCheck();
        if (!response) return;

        if (response.status === HTTP_NOT_AUTHORIZED) {
            window.location.href = '/html/login.html';
            return;
        }

        const payload = await response.json();
        const userData = payload && payload.data ? payload.data : {};
        const profileImageUrl = resolveImageUrl(
            userData.profileImageUrl || userData.profile_image,
            DEFAULT_PROFILE_IMAGE,
        );

        insertHeader(profileImageUrl);
        setWelcomeMessage(userData);
        setSearchSummary();
        updateClearButton();
        addSearchEvent();
        addInfinityScrollEvent();

        await loadBoardItems({ reset: true });
    } catch (error) {
        console.error('Initialization failed:', error);
        showErrorState();
    }
};

init();
