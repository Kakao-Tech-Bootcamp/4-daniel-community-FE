import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const readProjectFile = file => readFile(path.join(root, file), 'utf8');

const pageContracts = {
    'html/login.html': ['id', 'pw', 'login', 'lottie-animation'],
    'html/signup.html': ['email', 'pw', 'pwck', 'nickname', 'profile', 'signupBtn'],
    'html/index.html': ['searchInput', 'searchClearButton', 'writeLink', 'feedState'],
    'html/board.html': ['postTitle', 'modifyBtn', 'deleteBtn', 'commentInput'],
    'html/board-write.html': ['postForm', 'title', 'content', 'image', 'submit', 'imagePreviewText'],
    'html/board-modify.html': ['postForm', 'title', 'content', 'image', 'submit', 'imagePreviewText'],
    'html/modifyInfo.html': ['id', 'nickname', 'profile', 'profilePreview', 'removeProfileButton', 'signupBtn', 'withdrawBtn', 'toastContainer'],
    'html/modifyPassword.html': ['currentPw', 'pw', 'pwck', 'signupBtn'],
};

test('HTML pages retain the DOM ids used by existing behavior', async () => {
    for (const [file, ids] of Object.entries(pageContracts)) {
        const html = await readProjectFile(file);
        for (const id of ids) {
            assert.match(html, new RegExp(`\\sid=["']${id}["']`), `${file} is missing #${id}`);
        }
    }
});

test('authentication submit buttons remain inside native forms', async () => {
    const authPages = [
        ['html/login.html', 'login'],
        ['html/signup.html', 'signupBtn'],
        ['html/modifyInfo.html', 'signupBtn'],
        ['html/modifyPassword.html', 'signupBtn'],
    ];

    for (const [file, buttonId] of authPages) {
        const html = await readProjectFile(file);
        assert.match(
            html,
            new RegExp(
                `<form\\b[\\s\\S]*?<button\\b[^>]*\\sid=["']${buttonId}["'][^>]*type=["']submit["'][^>]*>[\\s\\S]*?</form>`,
                'i',
            ),
            `${file} must keep #${buttonId} inside a native submit form`,
        );
    }
});

test('all pages use Korean language metadata and avoid inline presentation', async () => {
    const htmlFiles = (await readdir(path.join(root, 'html')))
        .filter(file => file.endsWith('.html'));

    for (const file of htmlFiles) {
        const html = await readProjectFile(`html/${file}`);
        const ids = [...html.matchAll(/\sid=["']([^"']+)["']/gi)]
            .map(match => match[1]);

        assert.match(html, /<html lang="ko">/);
        assert.equal(
            new Set(ids).size,
            ids.length,
            `${file} contains duplicate ids`,
        );
        assert.doesNotMatch(html, /\sstyle=/i, `${file} contains inline style`);
        assert.doesNotMatch(html, /<svg\b/i, `${file} contains inline SVG`);

        const skipTarget = html.match(
            /<a\b[^>]*class=["'][^"']*skipLink[^"']*["'][^>]*href=["']#([^"']+)["']/i,
        );
        assert.ok(skipTarget, `${file} is missing a skip link`);
        assert.match(
            html,
            new RegExp(`\\sid=["']${skipTarget[1]}["']`),
            `${file} is missing the skip-link target #${skipTarget[1]}`,
        );

        for (const match of html.matchAll(
            /\s(?:for|aria-labelledby|aria-describedby)=["']([^"']+)["']/gi,
        )) {
            for (const referencedId of match[1].split(/\s+/)) {
                assert.ok(
                    ids.includes(referencedId),
                    `${file} references missing #${referencedId}`,
                );
            }
        }
    }
});

test('local absolute assets referenced by HTML exist', async () => {
    const htmlFiles = (await readdir(path.join(root, 'html')))
        .filter(file => file.endsWith('.html'));

    for (const file of htmlFiles) {
        const html = await readProjectFile(`html/${file}`);
        const references = [...html.matchAll(/(?:src|href)="(\/[^"]+)"/g)]
            .map(match => match[1])
            .filter(reference =>
                reference !== '/' &&
                !reference.startsWith('/html/') &&
                reference !== '/config.js',
            );

        for (const reference of references) {
            await assert.doesNotReject(
                access(path.join(root, reference.slice(1))),
                `${file} references missing asset ${reference}`,
            );
        }
    }
});

test('legacy fixed-width and inline purple state styles are absent', async () => {
    const layout = await readProjectFile('css/common/layout.css');
    const javascriptFiles = [
        ...(await readdir(path.join(root, 'js'))).map(file => `js/${file}`),
        'component/board/boardItem.js',
        'component/comment/comment.js',
        'component/dialog/dialog.js',
        'component/header/header.js',
    ];

    assert.doesNotMatch(layout, /calc\(50vw\s*-\s*250px\)/);

    for (const file of javascriptFiles) {
        const source = await readProjectFile(file);
        assert.doesNotMatch(source, /#ACA0EB|#7F6AEE|style\.backgroundColor/i);
        assert.doesNotMatch(source, /\.style\.|renderer:\s*["']svg["']/i);
    }
});
