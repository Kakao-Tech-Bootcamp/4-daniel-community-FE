let dialogSequence = 0;

/**
 * @param {string} title 다이얼로그 제목
 * @param {string} description 다이얼로그 내용
 * @param {Function} submitCallBack 확인 버튼 콜백
 * @param {'alert' | 'textarea'} type 다이얼로그 타입
 */
const Dialog = (title, description, submitCallBack, type = 'alert') => {
    const previouslyFocused = document.activeElement;
    const dialogId = `dialog-${++dialogSequence}`;
    const titleId = `${dialogId}-title`;
    const descriptionId = `${dialogId}-description`;

    const background = document.createElement('div');
    background.className = 'dialog-background';

    const dialog = document.createElement('div');
    dialog.className = 'dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', titleId);
    dialog.setAttribute('aria-describedby', descriptionId);

    const titleElement = document.createElement('h2');
    titleElement.className = 'dialog-title';
    titleElement.id = titleId;
    titleElement.textContent = title;

    const descriptionElement = document.createElement(
        type === 'textarea' ? 'textarea' : 'p',
    );
    descriptionElement.className = 'dialog-description';
    descriptionElement.id = descriptionId;

    if (type === 'textarea') {
        descriptionElement.classList.add('dialog-description-textarea');
        descriptionElement.value = description;
    } else {
        descriptionElement.textContent = description;
    }

    const buttonWrap = document.createElement('div');
    buttonWrap.className = 'dialog-button-wrap';

    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'dialog-button dialog-button-cancel';
    cancelButton.textContent = submitCallBack ? '취소' : '닫기';

    const submitButton = document.createElement('button');
    submitButton.type = 'button';
    submitButton.className = 'dialog-button dialog-button-submit';
    submitButton.textContent = '확인';

    if (submitCallBack && /(삭제|탈퇴)/.test(title)) {
        submitButton.classList.add('dialog-button-danger');
    }

    const closeDialog = () => {
        background.remove();
        document.body.classList.remove('noScroll');
        document.removeEventListener('keydown', handleKeydown);
        if (
            previouslyFocused &&
            typeof previouslyFocused.focus === 'function' &&
            document.contains(previouslyFocused)
        ) {
            previouslyFocused.focus();
        }
    };

    const handleKeydown = event => {
        if (event.key === 'Escape') {
            event.preventDefault();
            closeDialog();
            return;
        }

        if (event.key !== 'Tab') return;
        const focusable = dialog.querySelectorAll(
            'button:not(:disabled), textarea:not(:disabled)',
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    };

    cancelButton.addEventListener('click', closeDialog);
    submitButton.addEventListener('click', () => {
        const submittedValue =
            type === 'textarea' ? descriptionElement.value : undefined;
        closeDialog();

        if (submitCallBack) {
            if (type === 'textarea') {
                submitCallBack(submittedValue);
            } else {
                submitCallBack();
            }
        }
    });

    if (submitCallBack) buttonWrap.appendChild(cancelButton);
    buttonWrap.appendChild(submitButton);
    dialog.append(titleElement, descriptionElement, buttonWrap);
    background.appendChild(dialog);
    document.body.appendChild(background);
    document.body.classList.add('noScroll');
    document.addEventListener('keydown', handleKeydown);

    if (type === 'textarea') {
        descriptionElement.focus();
        descriptionElement.select();
    } else {
        submitButton.focus();
    }
};

export default Dialog;
