function show(platform, enabled) {
    document.body.classList.add(`platform-${platform}`);

    if (typeof enabled === 'boolean') {
        document.body.classList.toggle('state-on', enabled);
        document.body.classList.toggle('state-off', !enabled);
    } else {
        document.body.classList.remove('state-on', 'state-off');
    }
}

function postNativeAction(action) {
    webkit.messageHandlers.controller.postMessage(action);
}

function showActionMessage(message) {
    document.getElementById('action-message').textContent = message;
}

document.querySelector('button.open-preferences').addEventListener('click', () => {
    postNativeAction('open-preferences');
});

document.body.addEventListener('pointerdown', () => {
    postNativeAction('collapse-actions');
});
