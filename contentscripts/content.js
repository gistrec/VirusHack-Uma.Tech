(function () {
    "use strict";

    window.postMessage({type: "_videostyler_", quit: true}, "*");

    var enabled = false;
    var timeout = null;
    var svgCode = null;
    var elems = [];
    var svgFilterElement = null;
    var filters = {
        'set-brightness': {name: 'brightness', type: '%'},
        'set-contrast': {name: 'contrast', type: '%'},
        'set-saturate': {name: 'saturate', type: '%'},
        'set-grayscale': {name: 'grayscale', type: '%'},
        'set-invert': {name: 'invert', type: '%'},
        'set-sepia': {name: 'sepia', type: '%'},
        'set-hue-rotate': {name: 'hue-rotate', type: 'deg'},
        'set-blur': {name: 'blur', type: 'px'}
    };

    chrome.storage.sync.get(function (opt) {
        for (var filter in filters) {
            if (filters.hasOwnProperty(filter)) {
                filters[filter].val = opt[filter];
            }
        }
        if (opt.svgSelected) {
            svgCode = opt.svgSelected.code;
        }
        if (opt.enabled) {
            enable();
            enabled = true;
        }
    });

    chrome.storage.onChanged.addListener(function (opt) {
        for (var filter in filters) {
            if (filters.hasOwnProperty(filter) && opt[filter]) {
                filters[filter].val = opt[filter].newValue;
            }
        }
        if (opt.enabled) {
            if (opt.enabled.newValue) {
                enabled = true;
            } else {
                disable();
                enabled = false;
            }
        }
        if (opt.svgSelected) {
            if (opt.svgSelected.newValue) {
                svgCode = opt.svgSelected.newValue.code;
            } else {
                svgCode = null;
            }
        }
        if (enabled) {
            enable();
        }
    });

    (function checkQuit() {
        var disabled = false;
        setTimeout(function () {
            window.addEventListener("message", function (e) {
                if (!disabled && e.source === window && e.data.type && e.data.type === "_videostyler_" && e.data.quit) {
                    clearTimeout(timeout);
                    disabled = true;
                }
            }, false);
        }, 100);
    })();

    function disable() {
        elems.forEach(function (el) {
            clearTimeout(timeout);
            el.classList.remove('_videostyler_');
            setStyle(el, null);
            var svgElem = svgFilterElement.parentNode;
            svgElem.parentNode.removeChild(svgElem);
        });
    }

    function enable() {
        var val = null;
        var styles = '';
        checkSVG();
        clearTimeout(timeout);
        elems = Array.prototype.slice.call(document.querySelectorAll('video'));

        for (var filter in filters) {
            if (filters.hasOwnProperty(filter)) {
                val = filters[filter].val;
                if (val === undefined) {
                    continue;
                }
                styles += makeStyle(filters[filter].name, val, filters[filter].type);
            }
        }
        if (svgCode) {
            svgFilterElement.innerHTML = svgCode;
            styles += ' url(#_videostyler_filter_)';
        } else {
            svgFilterElement.innerHTML = '';
        }

        elems.forEach(function (el) {
            if (svgCode) {
                setStyle(el, null);
            }
            el.classList.add('_videostyler_');
            setStyle(el, styles);
        });
        timeout = setTimeout(findElems, 1000);

        function findElems() {
            var newElems = Array.prototype.slice.call(document.querySelectorAll('video:not(._videostyler_)'));
            if (newElems.length) {
                elems = elems.concat(newElems);
                newElems.forEach(function (el) {
                    el.classList.add('_videostyler_');
                    setStyle(el, styles);
                });
            }
            timeout = setTimeout(findElems, 1000);
        }
    }

    function checkSVG() {
        svgFilterElement = document.querySelector('#_videostyler_filter_');
        if (!svgFilterElement) {
            var svgElem = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svgElem.style.display = 'none';
            svgFilterElement = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
            svgFilterElement.id = '_videostyler_filter_';
            svgElem.appendChild(svgFilterElement);
            document.body.insertBefore(svgElem, document.body.firstChild);
        }
    }

    function makeStyle(name, val, type) {
        return name + '(' + val + type + ')';
    }

    function setStyle(el, style) {
        el.style.webkitFilter = style;
        el.style.filter = style;
    }

})();
