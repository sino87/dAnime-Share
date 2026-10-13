// ==UserScript==
// @name         dアニメ共有ボタン
// @namespace    https://greasyfork.org/ja/users/1492018-sino087
// @version      1.3.0
// @description  dアニメストアでエピソードごとに共有ボタンを表示する
// @author       sino
// @homepage     https://github.com/tatsuya087
// @license      MIT
// @match        https://animestore.docomo.ne.jp/animestore/sc_d_pc*
// @match        https://animestore.docomo.ne.jp/animestore/ci_pc*
// @match        https://animestore.docomo.ne.jp/animestore/mp_viw_pc*
// @icon         https://www.google.com/s2/favicons?sz=256&domain_url=https%3A%2F%2Fanimestore.docomo.ne.jp%2Fanimestore%2F
// @grant        GM_setClipboard
// ==/UserScript==

(function() {
    'use strict';

    const page = window.location.pathname.split('/').pop();
    if (!['sc_d_pc', 'ci_pc', 'mp_viw_pc'].includes(page)) return;
    const isMyPage = page === 'mp_viw_pc';

    const style = document.createElement('style');
    style.textContent = `
        .danime-share-container {
            position: fixed;
            top: 15px;
            left: 15px;
            display: flex !important;
            gap: 10px;
            z-index: 9999;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.4s linear, visibility 0.4s linear;
        }
        .videoWrapper:has(> .waitArea > #informationArea.show) ~ .danime-share-container { visibility: visible; }
        .videoWrapper:has(> .waitArea > #informationArea.fadein) ~ .danime-share-container { opacity: 1; }
        .videoWrapper:has(> .waitArea > #informationArea.hide) ~ .danime-share-container {
            opacity: 0;
            visibility: hidden;
            transition: none !important;
        }

        div.itemModule.list[data-danime-share-processed] {
            position: relative !important;
        }
        div.itemModule.list[data-danime-share-processed] > section > a.clearfix {
            box-sizing: border-box;
            padding-right: 54px;
        }
        div.itemModule.list[data-danime-share-processed] > section > a.clearfix > .thumbnailContainer {
            flex-shrink: 0;
        }
        div.itemModule.list[data-danime-share-processed] > section > a.clearfix > .textContainer {
            min-width: 0;
        }
        .itemWrapper div.itemModule.list.danime-share-mypage .itemModuleIn .textContainerIn {
            padding-right: 64px;
        }
        .itemWrapper div.itemModule.list.danime-share-mypage .itemModuleIn + .detail {
            right: 64px;
        }
        .danime-share-inline-container {
            position: absolute;
            top: 50%;
            right: 10px;
            transform: translateY(-50%);
            display: flex;
            flex-direction: column;
            gap: 8px;
            z-index: 10;
        }
        .danime-share-btn {
            width: 34px;
            height: 34px;
            background-color: #fff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 0px 7px rgba(0, 0, 0, 0.3);
            transition: transform 0.1s;
        }
        .danime-share-btn:active { transform: scale(0.95); }
        .danime-share-btn svg { width: 20px; height: 20px; }

        .danime-share-toast {
            position: fixed;
            background-color: #fff;
            color: #333;
            padding: 5px 10px;
            border-radius: 10px;
            font-size: 12px;
            font-weight: 600;
            box-shadow: 0 0px 7px rgba(0, 0, 0, 0.3);
            opacity: 0;
            transition: opacity 0.3s;
            pointer-events: none;
            z-index: 10000;
        }
        .danime-share-toast.show { opacity: 1; }

        a#twitter.c-snsButton.isTwitter { display: none !important; }
    `;
    document.head.appendChild(style);

    const toast = document.createElement('div');
    toast.className = 'danime-share-toast';
    toast.textContent = 'コピーしました';
    document.body.appendChild(toast);
    let toastTimer;

    function showToast() {
        clearTimeout(toastTimer);
        toast.classList.add('show');
        toastTimer = setTimeout(() => {
            toast.classList.remove('show');
        }, 2000);
    }

    const twitterIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 248 204">
            <path fill="#1d9bf0" d="M221.95 51.29c.15 2.17.15 4.34.15 6.53 0 66.73-50.8 143.69-143.69 143.69v-.04c-27.44.04-54.31-7.82-77.41-22.64 3.99.48 8 .72 12.02.73 22.74.02 44.83-7.61 62.72-21.66-21.61-.41-40.56-14.5-47.18-35.07 7.57 1.46 15.37 1.16 22.8-.87-23.56-4.76-40.51-25.46-40.51-49.5v-.64c7.02 3.91 14.88 6.08 22.92 6.32C11.58 63.31 4.74 33.79 18.14 10.71c25.64 31.55 63.47 50.73 104.08 52.76-4.07-17.54 1.49-35.92 14.61-48.25 20.34-19.12 52.33-18.14 71.45 2.19 11.31-2.23 22.15-6.38 32.07-12.26-3.77 11.69-11.66 21.62-22.2 27.93 10.01-1.18 19.79-3.86 29-7.95-6.78 10.16-15.32 19.01-25.2 26.16z"/>
        </svg>
    `;

    const copyIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#333"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>';

    function createShareButton(icon, onClick) {
        const btn = document.createElement('div');
        btn.className = 'danime-share-btn';
        btn.innerHTML = icon;
        btn.addEventListener('click', onClick);
        return btn;
    }

    function createShareButtons(getShareText, direction = 'left') {
        return [
            createShareButton(twitterIcon, () => shareToTwitter(getShareText())),
            createShareButton(copyIcon, (event) => copyToClipboard(getShareText(), event.currentTarget, direction))
        ];
    }

    function formatShareText(text, href) {
        const url = new URL(href);
        const partId = url.searchParams.get('partId');
        const shareUrl = partId
            ? `https://animestore.docomo.ne.jp/animestore/cd?partId=${partId}&ref=twtr`
            : url.href;
        return `${text.trim()}\n${shareUrl}`;
    }

    function shareToTwitter(shareText) {
        const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
        const width = 550;
        const height = 420;
        const left = window.screenX + (window.innerWidth - width) / 2;
        const top = window.screenY + (window.innerHeight - height) / 2;
        window.open(intentUrl, 'twitter_share', `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`);
    }

    function copyToClipboard(shareText, triggerElement, direction) {
        GM_setClipboard(shareText, 'text');

        const rect = triggerElement.getBoundingClientRect();
        const toastRect = toast.getBoundingClientRect();
        toast.style.top = (rect.top + (rect.height - toastRect.height) / 2) + 'px';
        toast.style.left = (direction === 'right' ? rect.right + 10 : rect.left - toastRect.width - 10) + 'px';

        showToast();
    }

    if (page === 'sc_d_pc') {
        runPlayerPageLogic();
    } else {
        runEpisodeListPageLogic();
    }

    function runPlayerPageLogic() {
        const container = document.createElement('div');
        container.className = 'danime-share-container';
        document.body.appendChild(container);

        function getPlayerShareText() {
            const txt1 = document.querySelector('.pauseInfoTxt1')?.textContent.trim() || '';
            const txt2 = document.querySelector('.pauseInfoTxt2')?.textContent.trim() || '';
            const txt3 = document.querySelector('.pauseInfoTxt3')?.textContent.trim() || '';
            return formatShareText(`${txt1} ${txt2} ${txt3}`, window.location.href);
        }

        container.append(...createShareButtons(getPlayerShareText, 'right'));
    }

    function runEpisodeListPageLogic() {
        const cardSelector = 'div.itemModule.list';
        const linkSelector = isMyPage ? 'a.textContainer[href]' : 'a.clearfix[href]';
        const root = document.querySelector(isMyPage ? '.contentsWrapper' : '.episodeWrapper');
        if (!root) return;

        function getAnimeTitle(section) {
            const cardTitle = section.querySelector('.textContainer h2');
            if (cardTitle) return cardTitle.textContent.trim();
            const titleH1 = document.querySelector('div.titleWrap > h1');
            if (!titleH1) return '';
            const clone = titleH1.cloneNode(true);
            const spans = clone.querySelectorAll('span');
            spans.forEach(span => span.remove());
            return clone.textContent.trim();
        }

        function processSection(section) {
            if (section.dataset.danimeShareProcessed) return;
            if (!section.querySelector(linkSelector)) return;
            section.dataset.danimeShareProcessed = 'true';
            if (isMyPage) {
                section.classList.add('danime-share-mypage');
            }

            const container = document.createElement('div');
            container.className = 'danime-share-inline-container';

            container.append(...createShareButtons(() => getListShareText(section)));

            section.insertBefore(container, section.firstChild);
        }

        function getListShareText(section) {
            const animeTitle = getAnimeTitle(section);
            const episode = section.querySelector('span.number')?.textContent.trim() || '';
            const subtitle = section.querySelector('span.episode, span.ui-clamp.webkit2LineClamp')?.textContent.trim() || '';

            const link = section.querySelector(linkSelector);
            return formatShareText(`${animeTitle} ${episode} ${subtitle}`, link.href);
        }

        function processCards(node) {
            if (node.matches(cardSelector)) {
                processSection(node);
            } else {
                node.querySelectorAll(cardSelector).forEach(processSection);
            }
        }

        processCards(root);

        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE && !node.matches('.danime-share-inline-container')) {
                        processCards(node);
                    }
                });
            });
        });
        observer.observe(root, { childList: true, subtree: true });
    }
})();
