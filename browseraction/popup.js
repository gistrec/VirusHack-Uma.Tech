(function () {
    "use strict";

    var defaultSVG = {
        default: [
            {
                id: 1,
                title: 'Gamma +',
                value: '<feComponentTransfer>\n  <feFuncR type="gamma"\n    amplitude="2" exponent="1"\n    offset="0"></feFuncR>\n  <feFuncG type="gamma"\n    amplitude="2" exponent="1"\n    offset="0"></feFuncG>\n  <feFuncB type="gamma"\n    amplitude="2" exponent="1"\n    offset="0"></feFuncB>\n</feComponentTransfer>'
            },
            {
                id: 2,
                title: 'Gamma -',
                value: '<feComponentTransfer>\n  <feFuncR type="gamma"\n    amplitude="1" exponent="2"\n    offset="0"></feFuncR>\n  <feFuncG type="gamma"\n    amplitude="1" exponent="2"\n    offset="0"></feFuncG>\n  <feFuncB type="gamma"\n    amplitude="1" exponent="2"\n    offset="0"></feFuncB>\n</feComponentTransfer>'
            },
            {
                id: 3,
                title: 'Sharpness',
                value: '<feConvolveMatrix\n  order="3" kernelMatrix="\n     1  -1   1\n    -1  -1  -1\n     1  -1   1">\n</feConvolveMatrix>'
            },
            {
                id: 4,
                title: 'Distortion',
                value: '<feTurbulence type="fractalNoise"\n  baseFrequency="0.015"\n  numOctaves="2"\n  result="turbulence"/>\n<feDisplacementMap\n  xChannelSelector="R"\n  yChannelSelector="G"\n  in="SourceGraphic"\n  in2="turbulence"\n  scale="50"/>'
            },
            {
                id: 5,
                title: 'Discrete',
                value: '<feComponentTransfer>\n  <feFuncR type="discrete"\n    tableValues="0 0.5 1 1"/>\n  <feFuncG type="discrete"\n    tableValues="0 0.5 1"/>\n  <feFuncB type="discrete"\n    tableValues="0 0.5"/>\n</feComponentTransfer>'
            }
        ],
        custom: []
    };
    var appVersion = chrome.runtime.getManifest().version;

    var $voice = $('#voice');
    var $switch = $('#switch');
    var $version = $('#version');
    var $settings = $('.setting');
    var $reset = $('#reset');
    var $preview = $('#preview');
    var $svgConfig = $('#svg-config');
    var $svgConfigButton = $('#svg-config-button');
    var $goBack = $('#go-back');
    var $svgSelectSettings = $('#svg-select-settings');
    var $svgSelectConfig = $('#svg-select-config');
    var $svgFilterValue = $('#svg-filter-value');
    var $svgWrapper = $('#svg-wrapper');
    var $svgCreateInput = $('#svg-create-input');
    var $svgCreateButton = $('#svg-create-button');
    var $svgRenameButton = $('#svg-rename-button');
    var $svgCreateCancel = $('#svg-create-cancel');
    var $svgNew = $('#svg-new');
    var $svgRename = $('#svg-rename');
    var $svgSave = $('#svg-save');
    var $svgDel = $('#svg-del');
    var $svgReset = $('#svg-reset');
    var $svgMessage = $('#svg-message');
    var enabled = false;
    var svgConfigSelected;
    var svgModel;

    $('.setting__reset').attr('title', chrome.i18n.getMessage('settings_reset'));

    chrome.storage.sync.get(function (opt) {
        if (opt.enabled) {
            $switch.addClass('active');
            enabled = true;
        }

        init(opt);
    });

    $version.text('v' + appVersion);

    function log(msg) {
        var time = new Date();
        time = ("0" + time.getHours()).slice(-2)   + ":" + 
               ("0" + time.getMinutes()).slice(-2) + ":" + 
               ("0" + time.getSeconds()).slice(-2);
        chrome.tabs.executeScript({
            code: `console.log("[${time}] ${msg}");`
        });
    }

    var isInit = false;

    $voice.click(function () {
        // Если нажимаем первый раз
        if (!isInit) {
            log("Проигрывание звука 'Приветствие.m4a'")

            var myAudio = new Audio(chrome.runtime.getURL("sounds/Приветствие.m4a"));
            myAudio.play();
            isInit = true;
        }else {
            log('Началась запись команды');

            recognition.start();
        }
    });

    $switch.click(function () {
        if (enabled) {
            enabled = false;
            $switch.removeClass('active');
            chrome.storage.sync.set({'enabled': false});

        } else {
            enabled = true;
            $switch.addClass('active');
            chrome.storage.sync.set({'enabled': true});
        }
    });

    $reset.click(function () {
        var obj = {svgSelected: null};
        $svgSelectSettings.val('off');
        $.each($settings, function (i, setting) {
            var $set = $(setting);
            var data = $set.data();
            var name = 'set-' + data.filter;

            $set.find('.setting__inp').val(data.default);
            $set.find('.setting__val').text(data.default + data.type);
            obj[name] = data.default;
        });
        chrome.storage.sync.set(obj);
    });

    $svgConfigButton.click(function () {
        var val = $svgSelectSettings.val();
        if (val !== 'off') {
            $svgSelectConfig.val(val);
        }
        getSVGvalue();
        $svgConfig.addClass('active');
    });

    $svgSelectSettings.on('change', function () {
        var filter = $svgSelectSettings.val();
        if (filter === 'off') {
            chrome.storage.sync.set({'svgSelected': null});
            return;
        }
        var type = filter[0] === 'd' ? 'default' : 'custom';
        chrome.storage.sync.set({
            'svgSelected': {
                val: filter,
                code: svgModel[type][filter.slice(1)].value
            }
        });
    });

    $svgSelectConfig.on('change', getSVGvalue);

    $goBack.click(function () {
        $svgConfig.removeClass('active');
        closeSVGcreate();
    });

    $svgNew.click(function () {
        $svgCreateInput.val('');
        $svgWrapper.addClass('creating active').on('transitionend', function () {
            $svgWrapper.off('transitionend');
            $svgCreateInput.focus();
        });
    });

    $svgRename.click(function () {
        $svgCreateInput.val(svgConfigSelected.title);
        $svgWrapper.addClass('renaming active').on('transitionend', function () {
            $svgWrapper.off('transitionend');
            $svgCreateInput.select();
        });
    });

    $svgCreateCancel.click(closeSVGcreate);

    $svgCreateButton.click(function () {
        var title = $svgCreateInput.val().trim();
        if (!title.length) {
            highlightSVGfilterInput();
            return;
        }
        var ind = svgModel.custom.length;
        svgModel.custom.push({
            title: title,
            value: ''
        });
        svgConfigSelected = svgModel.custom[ind];
        $svgFilterValue.val('');
        $svgSelectConfig.add($svgSelectSettings).append('<option value="c' + ind + '">' + title + '</option>');
        $svgSelectConfig.val('c' + ind);
        $svgConfig.removeClass('default').addClass('custom');
        chrome.storage.sync.set({'svg': svgModel});
        closeSVGcreate();
        showSVGmessage('created');
    });

    $svgRenameButton.click(function () {
        var title = $svgCreateInput.val().trim();
        if (!title.length) {
            highlightSVGfilterInput();
            return;
        }
        svgConfigSelected.title = title;
        var filter = $svgSelectConfig.val();
        $svgSelectSettings.add($svgSelectConfig).find('option[value="' + filter + '"]').text(title);
        chrome.storage.sync.set({'svg': svgModel});
        closeSVGcreate();
        showSVGmessage('renamed');
    });

    $svgSave.click(function () {
        svgConfigSelected.value = $svgFilterValue.val();
        chrome.storage.sync.set({'svg': svgModel});
        var filter = $svgSelectConfig.val();
        if ($svgSelectSettings.val() === filter) {
            chrome.storage.sync.set({
                'svgSelected': {
                    val: filter,
                    code: svgConfigSelected.value
                }
            });
        }
        showSVGmessage('saved');
    });

    $svgDel.click(function () {
        var filter = $svgSelectConfig.val();
        var type = filter[0];
        if (type !== 'c') {
            return;
        }
        var selectedFilter = $svgSelectSettings.val();
        var selectedModel = svgModel[selectedFilter[0] === 'd' ? 'default' : 'custom'][selectedFilter.slice(1)];
        var i = filter.slice(1);
        var l = svgModel.custom.length;
        svgModel.custom.splice(i, 1);
        chrome.storage.sync.set({'svg': svgModel});
        $svgSelectSettings.add($svgSelectConfig).find('option[value="' + filter + '"]').remove();
        for (++i; i < l; i++) {
            $svgSelectSettings.add($svgSelectConfig).find('option[value="c' + i + '"]').attr('value', 'c' + (i - 1));
            if (selectedFilter === ('c' + i)) {
                chrome.storage.sync.set({
                    'svgSelected': {
                        val: 'c' + (i - 1),
                        code: selectedModel.value
                    }
                });
            }
        }
        $svgSelectConfig.val('d0');
        svgConfigSelected = svgModel.default[0];
        $svgFilterValue.val(svgConfigSelected.value);
        $svgConfig.removeClass('custom').addClass('default');
        if (selectedFilter === filter) {
            chrome.storage.sync.set({'svgSelected': null});
            $svgSelectSettings.val('off');
        }
        showSVGmessage('deleted');
    });

    $svgReset.click(function () {
        var filter = $svgSelectConfig.val();
        var type = filter[0];
        if (type !== 'd') {
            return;
        }
        var selectedFilter = $svgSelectSettings.val();
        var i = filter.slice(1);
        svgConfigSelected.value = defaultSVG.default[i].value;
        svgConfigSelected.title = defaultSVG.default[i].title;
        $svgSelectSettings.add($svgSelectConfig).find('option[value="' + filter + '"]').text(svgConfigSelected.title);
        $svgFilterValue.val(svgConfigSelected.value);
        chrome.storage.sync.set({'svg': svgModel});
        if (selectedFilter === filter) {
            chrome.storage.sync.set({
                'svgSelected': {
                    val: filter,
                    code: svgConfigSelected.value
                }
            });
        }
        showSVGmessage('reset');
    });

    requestAnimationFrame(function () {
        $(document.body).addClass('active');
    });


    function closeSVGcreate() {
        $svgCreateInput.val('').blur();
        $svgWrapper.removeClass('active creating renaming');
    }

    function highlightSVGfilterInput() {
        $svgCreateInput.focus().addClass('highlight').on('transitionend', function () {
            $svgCreateInput.off('transitionend').removeClass('highlight');
        });
    }

    function showSVGmessage(type) {
        $svgMessage.addClass('active ' + type).on('transitionend.a.' + type, function () {
            $svgMessage.off('transitionend.a.' + type).removeClass('active').on('transitionend.b.' + type, function () {
                $svgMessage.off('transitionend.b.' + type).removeClass(type);
            });
        });
    }

    function getSVGvalue() {
        var filter = $svgSelectConfig.val();
        var type = filter[0] === 'd' ? 'default' : 'custom';
        $svgConfig.removeClass('default custom').addClass(type);
        svgConfigSelected = svgModel[type][filter.slice(1)];
        $svgFilterValue.val(svgConfigSelected.value);
    }

    function init(opt) {
        $.each($settings, function (i, setting) {
            var $set = $(setting);
            var data = $set.data();
            var name = 'set-' + data.filter;
            var $inp = $set.find('.setting__inp');
            var $val = $set.find('.setting__val');
            var obj = {};

            if (opt[name] === undefined) {
                $inp.val(data.default);
                obj[name] = data.default;
                chrome.storage.sync.set(obj);
            } else {
                $inp.val(opt[name]);
            }

            $val.text($inp.val() + data.type);
            $inp.change(function () {
                obj[name] = $inp.val();
                chrome.storage.sync.set(obj);
            });
            $inp.on('input', function () {
                $val.text($inp.val() + data.type);
            });

            $set.find('.setting__reset').click(function () {
                $inp.val(data.default);
                $val.text(data.default + data.type);
                obj[name] = data.default;
                chrome.storage.sync.set(obj);
            });
        });

        if (opt.svg === undefined) {
            svgModel = $.extend(true, {}, defaultSVG);
            chrome.storage.sync.set({'svg': svgModel});
        } else {
            svgModel = opt.svg;
            checkDefFilters(opt);
        }
        $.each(svgModel.default, function (i, filter) {
            $svgSelectConfig.add($svgSelectSettings).append('<option value="d' + i + '">' + filter.title + '</option>');
        });
        $.each(svgModel.custom, function (i, filter) {
            $svgSelectConfig.add($svgSelectSettings).append('<option value="c' + i + '">' + filter.title + '</option>');
        });
        if (opt.svgSelected) {
            $svgSelectSettings.val(opt.svgSelected.val);
        }

        if (opt.updated !== appVersion) {
            chrome.storage.sync.set({'updated': appVersion});
        }
    }

    function checkDefFilters(opt) {
        if (opt.updated === appVersion) {
            return;
        }
        var changed = false;
        var ids = [];
        var toBeRemoved = [];
        $.each(svgModel.default, function (i, filter) {
            var id = filter.id;
            var found = false;
            $.each(defaultSVG.default, function (j, filter) {
                if (filter.id === id) {
                    found = true;
                    return false;
                }
            });
            if (!found) {
                toBeRemoved.unshift(i);
                if (opt.svgSelected && opt.svgSelected.val === ('d' + i)) {
                    opt.svgSelected = null;
                    chrome.storage.sync.set({'svgSelected': null});
                }
                changed = true;
            } else {
                ids.push(id);
            }
        });
        $.each(toBeRemoved, function (i, ind) {
            svgModel.default.splice(ind, 1);
        });
        $.each(defaultSVG.default, function (i, filter) {
            var id = filter.id;
            var found = ids.indexOf(id);
            if (found === -1) {
                svgModel.default.push($.extend(true, {}, defaultSVG.default[i]));
                changed = true;
            }
        });
        if (changed) {
            chrome.storage.sync.set({'svg': svgModel});
        }
    }

})();