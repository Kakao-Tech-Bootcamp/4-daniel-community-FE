import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const storage = new Map();
const localStorageMock = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key),
    clear: () => storage.clear(),
};

globalThis.localStorage = localStorageMock;
globalThis.window = {
    __APP_CONFIG__: { API_BASE_URL: 'https://api.example.test' },
    location: { hostname: 'localhost' },
    localStorage: localStorageMock,
};

let calls = [];
let nextStatus = 200;
let nextBody = { data: {} };

globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return new Response(JSON.stringify(nextBody), {
        status: nextStatus,
        headers: { 'Content-Type': 'application/json' },
    });
};

const { userLogin } = await import('../api/loginRequest.js');
const {
    userSignup,
    checkEmail,
    checkNickname,
    fileUpload: uploadProfileImage,
} = await import('../api/signupRequest.js');
const { getPosts, searchPosts } = await import('../api/indexRequest.js');
const {
    createPost,
    updatePost,
    fileUpload: uploadPostImage,
} = await import('../api/board-writeRequest.js');
const {
    deletePost,
    writeComment,
    getComments,
    likePost,
    unlikePost,
} = await import('../api/boardRequest.js');
const { deleteComment, updateComment } = await import('../api/commentRequest.js');
const { userModify, userDelete } = await import('../api/modifyInfoRequest.js');
const { changePassword } = await import('../api/modifyPasswordRequest.js');

const lastCall = () => calls.at(-1);
const requestBody = call => JSON.parse(call.options.body);

beforeEach(() => {
    calls = [];
    storage.clear();
    nextStatus = 200;
    nextBody = { data: {} };
});

test('login keeps the request contract and stores the access token', async () => {
    nextBody = { data: { access_token: 'access-token' } };

    await userLogin('student@example.com', 'Password1!');

    assert.equal(lastCall().url, 'https://api.example.test/users/login');
    assert.equal(lastCall().options.method, 'POST');
    assert.deepEqual(requestBody(lastCall()), {
        email: 'student@example.com',
        password: 'Password1!',
    });
    assert.equal(storage.get('accessToken'), 'access-token');
});

test('signup and availability checks keep their endpoints and payloads', async () => {
    nextStatus = 201;
    await userSignup({
        email: 'student@example.com',
        password: 'Password1!',
        nickname: '학생1',
        profileImageUrl: '/images/profile.png',
    });

    assert.equal(lastCall().url, 'https://api.example.test/users/signup');
    assert.deepEqual(requestBody(lastCall()), {
        email: 'student@example.com',
        password: 'Password1!',
        nickname: '학생1',
        profile_image: '/images/profile.png',
    });

    await checkEmail('student+test@example.com');
    assert.equal(
        lastCall().url,
        'https://api.example.test/users/emails/student%2Btest%40example.com',
    );

    await checkNickname('KTB 학생');
    assert.equal(
        lastCall().url,
        'https://api.example.test/users/nicknames/KTB%20%ED%95%99%EC%83%9D',
    );

    await uploadProfileImage({ name: 'profile.png', dataUrl: 'data:image/png;base64,AA==' });
    assert.deepEqual(requestBody(lastCall()), {
        profile_image_name: 'profile.png',
        profile_image_data: 'data:image/png;base64,AA==',
    });
});

test('post list and search retain cursor and keyword query parameters', async () => {
    await getPosts('next cursor');
    assert.equal(
        lastCall().url,
        'https://api.example.test/posts?cursor=next+cursor',
    );

    await searchPosts('자바스크립트', 'cursor-2');
    const url = new URL(lastCall().url);
    assert.equal(url.pathname, '/posts/search');
    assert.equal(url.searchParams.get('keyword'), '자바스크립트');
    assert.equal(url.searchParams.get('cursor'), 'cursor-2');
});

test('post creation, update, and image upload keep existing payload names', async () => {
    const post = {
        title: '제목',
        content: '내용',
        attachFileUrl: '/images/post.png',
    };

    nextStatus = 201;
    await createPost(post);
    assert.equal(lastCall().url, 'https://api.example.test/posts');
    assert.deepEqual(requestBody(lastCall()), {
        title: '제목',
        content: '내용',
        post_image: '/images/post.png',
    });

    nextStatus = 200;
    await updatePost(17, post);
    assert.equal(lastCall().url, 'https://api.example.test/posts/17');
    assert.equal(lastCall().options.method, 'PATCH');

    await uploadPostImage({ name: 'post.png', dataUrl: 'data:image/png;base64,AA==' });
    assert.equal(lastCall().url, 'https://api.example.test/posts/images');
    assert.deepEqual(requestBody(lastCall()), {
        post_image_name: 'post.png',
        post_image_data: 'data:image/png;base64,AA==',
    });
});

test('post reactions and comments keep their methods and nested endpoints', async () => {
    await writeComment(3, '좋은 글입니다.');
    assert.equal(lastCall().url, 'https://api.example.test/posts/3/comments');
    assert.equal(lastCall().options.method, 'POST');
    assert.deepEqual(requestBody(lastCall()), { content: '좋은 글입니다.' });

    await getComments(3);
    assert.equal(lastCall().url, 'https://api.example.test/posts/3/comments');

    await likePost(3);
    assert.equal(lastCall().options.method, 'POST');
    await unlikePost(3);
    assert.equal(lastCall().options.method, 'DELETE');

    await deletePost(3);
    assert.equal(lastCall().url, 'https://api.example.test/posts/3');
    assert.equal(lastCall().options.method, 'DELETE');

    await updateComment(3, 9, '수정 댓글');
    assert.equal(
        lastCall().url,
        'https://api.example.test/posts/3/comments/9',
    );
    assert.equal(lastCall().options.method, 'PATCH');
    assert.deepEqual(requestBody(lastCall()), { content: '수정 댓글' });

    await deleteComment(3, 9);
    assert.equal(lastCall().options.method, 'DELETE');
});

test('account update, withdrawal, and password change keep API contracts', async () => {
    await userModify({ nickname: '새닉네임', profileImageUrl: null });
    assert.equal(lastCall().url, 'https://api.example.test/users/me');
    assert.equal(lastCall().options.method, 'PATCH');
    assert.deepEqual(requestBody(lastCall()), {
        nickname: '새닉네임',
        profile_image: null,
    });

    await userDelete();
    assert.equal(lastCall().options.method, 'DELETE');

    await changePassword({
        currentPassword: 'Current1!',
        newPassword: 'NewPassword1!',
    });
    assert.equal(
        lastCall().url,
        'https://api.example.test/users/me/password',
    );
    assert.deepEqual(requestBody(lastCall()), {
        current_password: 'Current1!',
        new_password: 'NewPassword1!',
    });
});

test('authenticated requests still include the bearer token', async () => {
    storage.set('accessToken', 'saved-token');
    await getPosts();

    const headers = new Headers(lastCall().options.headers);
    assert.equal(headers.get('Authorization'), 'Bearer saved-token');
});
