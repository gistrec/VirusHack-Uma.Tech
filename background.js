(function () {
    "use strict";

    var disabled = false;

//// Повторно внедряем скрипт при установке/обновлении
    chrome.runtime.onInstalled.addListener(function (details) {
        if (details.reason === 'install' || details.reason === 'update') {
            addStaff();
        }
    });


//// По-дефолту ассистент активен
    chrome.storage.sync.get(function (opt) {
        if (opt.enabled === undefined) {
            chrome.storage.sync.set({'enabled': true});
            return;
        }
        if (!opt.enabled) {
            disabled = true;
            setDisabledIcon();
        }
    });

//// При выключении ассистента
    chrome.storage.onChanged.addListener(function (opt) {
        if (opt.enabled) {
            if (opt.enabled.newValue) {
                disabled = false;
                setActiveIcon();
            } else {
                disabled = true;
                setDisabledIcon();
            }
        }
    });


//// Поиск всех вкладок, в которых открыт pass.media & внедряем скрипт при установки расширения
    function addStaff() {
        var files = chrome.runtime.getManifest().content_scripts[0];
        var script = files.js[0];

        chrome.tabs.query({url: ['<all_urls>']}, function (tabs) {
            tabs.forEach(function (tab) {
                chrome.tabs.executeScript(tab.id, {file: script, allFrames: true});
            });
        });
    }

//// Меняем иконку расширения при включении ассистента
    function setActiveIcon() {
        chrome.browserAction.setIcon({
            path: {
                "32": "/icons/32x32.png"
            }
        });
    }

//// Меняем иконку расширения при выключении ассистента
    function setDisabledIcon() {
        chrome.browserAction.setIcon({
            path: {
                "32": "/icons/disabled/32x32.png"
            }
        });
    }

})();