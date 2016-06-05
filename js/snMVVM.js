(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * Created by snatvb on 27.05.16.
 */

var snKnife = require('../snKnife/index');

/**
 * Default Modules
 */
var testModule = require('./module/test');
var Version = require('./module/version');
/**
 * End Default Modules
 */

/**
 * Список тэгов для обработки
 * @type {string[]}
 */
var LIST_VAL = [
    'input',
    'textarea',
    'select'
];
var LIST_HTML = [
    'div',
    'span',
    'a',
    'td',
    'main',
    'section'
];

if (window.snEvents) var Events = window.snEvents;
else console.warn('snEvents isn\'t defined');

var setElements = function () {
    for (var i = 0; i < 1200; i++) {
        var element;
        var contain = document.createElement('div');
        element = document.createElement('br');
        contain.appendChild(element);
        element = document.createElement('br');
        contain.appendChild(element);

        element = document.createElement('div');
        element.innerHTML = 'Content for div starting here';
        element.setAttribute('sn-model', 'test' + i);
        contain.appendChild(element);

        element = document.createElement('input');
        element.innerHTML = 'Content for div starting here';
        element.setAttribute('type', 'text');
        element.setAttribute('sn-model', 'test' + i);
        contain.appendChild(element);

        document.body.appendChild(contain);
    }
};

/**
 * Синхронизация модели и DOM дерева
 * @param scope
 * @returns {*}
 * @constructor
 * @param stgs
 */
var MVVM = function (scope, stgs) {
    if (typeof stgs != 'object') stgs = {};
    this.scope = scope || {};
    this.stgs = stgs || {};
    return this.init();
};

MVVM.prototype = {
    DEFAULT_MODULE: [Version], // стандартные модули
    USER_MODULE: [],
    __REPEAT_DOM: [], // use repeat.js
    init: function () {
        this.generateSettings();

        Events.trigger('snMVVM.core.startInit');
        this.BODY = document.getElementsByTagName('body')[0];
        /// <reference path="./loader.js"/>
        this.__loadedListModule = this.__loaderModules();
        Events.trigger('snMVVM.core.modulesLoaded');
        /// <reference path="./repeat.js"/>
        this.__initRepeat();
        this.__getDOM();
        if (this.stgs.createObserver) this.__observerCreate(this.BODY);

//        setElements();
//        this.__updateDOM();

        if (this.stgs.firstApply) {
            this.__setScopeDOM();
        } else if (!this.isEmptyScope()) this.__setScopeDOM();
        this.__applyRepeat();

        if (this.stgs.bind) this.__bindListens(this.__DOM);

        Events.trigger('snMVVM.core.endInit');
        return this;
    },
    /**
     * Собираем scope по DOM
     * @param empty
     */
    initHtmlData: function (empty) {
        for (var i = 0; i < this.__DOM.length; i++) {
            var itemDom = this.__DOM.eq(i);
            var model = itemDom.attr(this.stgs.attr);
            var data = this.__getDOMData(itemDom);
            if (empty || data != '') this.scope[model] = data;
        }
    },
    /**
     * Генерируем настройки
     */
    generateSettings: function () {
        var s = this.stgs;
        this.stgs = {
            attrRepeat: s.attrRepeat || 'sn-repeat',
            attr: s.attr || 'sn-model',
            listHTML: s.listHTML || LIST_HTML,
            listVAL: s.listVAL || LIST_VAL
        };

        this.stgs.firstApply = !(typeof s.bind == 'undefined');
        this.stgs.bind = typeof s.bind == 'undefined';
        this.stgs.bindApply = typeof s.bindApply == 'undefined';
        this.stgs.createObserver = typeof s.createObserver != 'undefined';

        this.stgs.replaceModule = typeof s.replaceModule != 'undefined';
        this.stgs.replaceModuleMsg = typeof s.replaceModuleMsg == 'undefined';
        this.stgs.modules = this.stgs.modules || [];

        if (this.stgs.modules instanceof Array) this.USER_MODULE = this.stgs.modules;
    },
    /**
     * Биндим DOM элемент
     * @param itemDom
     * @private
     */
    __bindItemDOM: function (itemDom) {
        if (!this.stgs.bind) return;
        var self = this;
        if (this.__isVAL(itemDom)) {
            snKnife.dom.addEvent('change', itemDom, function (event) {
                self.__syncModels(this);
            });

            snKnife.dom.addEvent('keyup', itemDom, function (event) {
                self.__syncModels(this);
            });
        }
        if (this.__isCHECK(itemDom)) {
            snKnife.dom.addEvent('change', itemDom, function (event) {
                self.__syncModels(this);
            });
        }
    },
    /**
     * Биндим события
     * @private
     */
    __bindListens: function (DOMItems) {
        DOMItems = DOMItems || this.__DOM;
        for (var i = 0; i < DOMItems.length; i++) {
            var itemDom = DOMItems[i];
            this.__bindItemDOM(itemDom);
        }
    },
    /**
     * Собираем данные из дом дерева
     * @private
     */
    __getDOM: function () {
        var result = [],
            elements = document.getElementsByTagName('*');
        for (var i = 0; i < elements.length; i++) {
            var element = elements[i];
            if (element.getAttribute(this.stgs.attr)) {
                result.push(element);
            }
        }

        this.__DOM = result;
    },
    /**
     * Обновляем this.__DOM
     * @private
     */
    __updateDOM: function () {
        var cloneDOM = snKnife.data.clone(this.__DOM),
            elements = document.getElementsByTagName('*'),
            newElements = [];
        var updated = false;
        for (var i = 0; i < elements.length; i++) {
            var element = elements[i];
            if (element.getAttribute(this.stgs.attr)) {
                var exist = 0;
                for (var j = 0; j < this.__DOM.length; j++) {
                    var existElement = this.__DOM[j];
                    if (element == existElement) {
                        exist++;
                    }
                }
                if (!exist) {
                    updated = true;
                    cloneDOM.push(element);
                    newElements.push(element);
                }
            }
        }
        this.__bindListens(newElements);
        this.__DOM = cloneDOM;
    },
    /**
     * Устанавливаем данные scope в DOM
     * @private
     */
    __setScopeDOM: function (DOM, scope) {
        DOM = DOM || this.__DOM;
        scope = scope || this.scope;
        for (var i = 0; i < DOM.length; i++) {
            var itemDom = DOM[i];
            if(!snKnife.dom.isElement(itemDom)) continue;
            var model = itemDom.getAttribute(this.stgs.attr);
            var dataModel = this.getData(model, scope);
            if (typeof dataModel != 'undefined') this.__applyDOM(itemDom, dataModel);
            else this.__applyDOM(itemDom, '');
        }
        return DOM;
//        this.__applyRepeat();
    },
    /**
     * Получить данные от DOM элемента
     * @param itemDOM
     * @returns {*}
     * @private
     */
    __getDOMData: function (itemDOM) {
        if (this.__isCHECK(itemDOM) && itemDOM.getAttribute('checked')) return itemDOM.value;
        if (this.__isVAL(itemDOM)) return itemDOM.value;
        if (this.__isHTML(itemDOM)) return itemDOM.innerHTML;
    },
    /**
     * Применяем для DOM
     * @param itemDOM
     * @param data
     * @returns {*}
     * @private
     */
    __applyDOM: function (itemDOM, data) {
        if (this.__isVAL(itemDOM)) return this.__applyVAL(itemDOM, data);
        if (this.__isHTML(itemDOM)) return this.__applyHTML(itemDOM, data);
        if (this.__isCHECK(itemDOM)) return this.__applyCHECK(itemDOM, data);
    },
    __applyCHECK: function (itemDOM, data) {
        if (data == itemDOM.value) {
            itemDOM.setAttribute('checked', true);
            itemDOM.checked = true;
        } else {
            itemDOM.removeAttribute('checked');
            itemDOM.checked = false;
        }
    },
    /**
     * Применяем VAL
     * @param itemDOM
     * @param data
     * @returns {data}
     * @private
     */
    __applyVAL: function (itemDOM, data) {
        return itemDOM.value = data;
    },
    /**
     * Применяем для изменения HTML
     * @param itemDOM
     * @param data
     * @returns {data}
     * @private
     */
    __applyHTML: function (itemDOM, data) {
        return itemDOM.innerHTML = data;
    },
    /**
     * Инсронизируем модели
     * @param itemModel
     * @private
     */
    __syncModels: function (itemModel) {
        var value = itemModel.value;
        if (this.__isCHECK(itemModel) && !itemModel.checked) value = '';
        var dataModel = this.scope[itemModel.getAttribute(this.stgs.attr)] = value;
        for (var i = 0; i < this.__DOM.length; i++) {
            var itemDOM = this.__DOM[i];
            if (itemDOM[0] != itemModel &&
                itemModel.getAttribute(this.stgs.attr) == itemDOM.getAttribute(this.stgs.attr)) {
                if (this.stgs.bindApply) this.__applyDOM(itemDOM, dataModel);
            }
        }
    },
    /**
     * Проверяем на принадлежность к HTML APPLY
     * @param itemDOM
     * @returns {boolean}
     * @private
     */
    __isHTML: function (itemDOM) {
        if (!itemDOM) return false;
        var list = this.stgs.listHTML;
        for (var i = 0; i < list.length; i++) {
            var tag = list[i];
            if (itemDOM.tagName.toLocaleLowerCase() == tag.toLocaleLowerCase())
                return true;
        }
        return false;
    },
    /**
     * Если надо менять VAL -> APPLY
     * @param itemDOM
     * @returns {boolean}
     * @private
     */
    __isVAL: function (itemDOM) {
        if (!itemDOM) return false;
        var list = this.stgs.listVAL;
        for (var i = 0; i < list.length; i++) {
            var tag = list[i];
            if (tag == 'input' && itemDOM.getAttribute('type') != 'text') continue;
            if (itemDOM.tagName.toLocaleLowerCase() == tag.toLocaleLowerCase())
                return true;
        }
        return false;
    },
    /**
     * Проверка на RADIO и CHECKBOX
     * @param itemDOM
     * @returns {boolean}
     * @private
     */
    __isCHECK: function (itemDOM) {
        if (!itemDOM || itemDOM.tagName.toLocaleLowerCase() != 'input') return false;
        var type = itemDOM.getAttribute('type');
        if (type == 'checkbox') return true;
        return type == 'radio';
    },
    /**
     * Проверка на пустоту объекта
     * @returns {boolean}
     */
    isEmptyScope: function () {
        for (var key in this.scope) {
            if (!this.scope.hasOwnProperty(key)) continue;
            return false;
        }
        return true;
    },
    /**
     * Для получения SCOPE
     * @returns {*|{}}
     */
    getScope: function () {
        return this.scope;
    },
    /**
     * Для получения данных по ключу
     * @param key
     * @returns {*}
     * @param scope
     */
    getData: function (key, scope) {
//        console.log(key, scope);
        if(!key) return;
        key = key.split('.');
        scope = scope || this.scope;
        if (key.length == 1) return scope[key];

        var res = snKnife.data.clone(scope);
        for (var i = 0; i < key.length; i++) {
            var itemKey = key[i];
            if (typeof res[itemKey] == 'undefined') return;
            res = res[itemKey];
        }
        return res;
    },
    /**
     * Уставнока данных
     * @param key
     * @param data
     * @param apply
     * @returns {*|{}}
     */
    setData: function (key, data, apply) {
        this.scope[key] = data;
        if (apply) this.apply();
        return this.scope;
    },
    /**
     * Удалить данные
     * @param key
     * @param apply
     */
    removeData: function (key, apply) {
        delete this.scope[key];
        if (apply) this.apply();
    },
    /**
     * Применяем для DOM
     */
    apply: function () {
        this.__setScopeDOM();
        this.__applyRepeat();
    },
    /**
     * Обновить DOM
     */
    updateDomInit: function () {
        this.__updateDOM();
    },
    /**
     * Добавить один дум элемент в отслеживание
     * @param added
     * @private
     */
    __addItemDOMObserver: function (added) {
        if (!snKnife.dom.isElement(added) || !added.getAttribute(this.stgs.attr)) return;
        this.__DOM.push(added);
        this.__bindItemDOM(added);
        this.debounceApply(100);
    },
    /**
     * Добавить DOM элемненты в слежку
     * @param added
     * @returns {*}
     * @private
     */
    __addDOMObserver: function (added) {
        if (snKnife.dom.isElement(added)) return this.__addItemDOMObserver(added);
        for (var i = 0; i < added.length; i++) {
            var item = added[i];
            this.__addItemDOMObserver(item);
        }
    },
    /**
     * Удаляем лишний DOM елемент
     * @param removed
     * @private
     */
    __removeItemDOMObserver: function (removed) {
        if (!snKnife.dom.isElement(removed) || !removed.getAttribute(this.stgs.attr)) return;
        this.__DOM.splice(this.__DOM.indexOf(removed), 1);
        this.debounceApply(100);
    },
    /**
     * Удаляем лишние элементы DOM
     * @param removed
     * @returns {*}
     * @private
     */
    __removeDOM: function (removed) {
        if (snKnife.dom.isElement(removed)) return this.__removeItemDOMObserver(removed);
        for (var i = 0; i < removed.length; i++) {
            var item = removed[i];
            this.__removeItemDOMObserver(item);
        }
    },
    /**
     * Включаем наблюдение за DOM
     * @param DOMElement
     * @private
     */
    __observerCreate: function (DOMElement) {
        var self = this;
        this.__observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
//                if (mutation.addedNodes && mutation.addedNodes.length) self.__addDOMObserver(mutation.addedNodes);
//                if (mutation.removedNodes && mutation.removedNodes.length) self.__removeDOM(mutation.removedNodes);
                if ((mutation.addedNodes && mutation.addedNodes.length)
                    || (mutation.removedNodes && mutation.removedNodes.length)) {
                    self.debounceUpdate(120);
                    self.debounceApply(120);
                }
            });
        });
        this.__observer.observe(DOMElement,
            { attributes: true, childList: true, characterData: true }
        );
    },
    /**
     * Выключаем наблюдение за DOM
     * @private
     */
    __observerDestroy: function () {
        this.__observer.disconnect();
    },
    /**
     * Применить изменения с задержкой
     * @param time
     */
    debounceApply: function (time) {
        var self = this;
        var debounceApply = snKnife.data.debounce(function () {
            self.apply();
        }, time);
        debounceApply();
    },
    /**
     * Обновить (re int) с задержкой
     * @param time
     */
    debounceUpdate: function (time) {
        var self = this;
        var debounceUpdate = snKnife.data.debounce(function () {
            self.__updateDOM();
        }, time);
        debounceUpdate();
    },
    /**
     * Получить список загруженных модулей
     * @returns {Array|*}
     */
    getListModules: function () {
        var modules = [];
        for (var i = 0; i < this.__loadedListModule.length; i++) {
            var moduleName = this.__loadedListModule[i];
            if (this[moduleName]) modules.push(this[moduleName]);
        }
        return modules;
    },
    /**
     * Получаем список имен загруженных модулей
     * @returns {Array|*}
     */
    getListModulesName: function () {
        return this.__loadedListModule;
    }
};


module.exports = MVVM;
}).call(this,require("rH1JPG"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/core/core.js","/core")
},{"../snKnife/index":11,"./module/test":3,"./module/version":4,"buffer":13,"rH1JPG":15}],2:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * Created by snatvb on 04.06.16.
 */

var snKnife = require('../snKnife/index');

module.exports = function (ns) {

    if (!ns) return console.warn('MVVM not found');

    /**
     * Расширительный модуль загрузки сторонних модулей
     * @type {Object|Function|*}
     */

    var nsp = ns.prototype;
    /**
     * Загрузка модулей
     * @returns {Array}
     * @private
     */
    nsp.__loaderModules = function () {
        /// <reference path="./core.js"/>
        var defaultModulesLoaded = this.__loaderModulesArr(this.DEFAULT_MODULE);
        var userModulesLoaded = this.__loaderModulesArr(this.USER_MODULE);

        return defaultModulesLoaded.concat(userModulesLoaded);
    };
    nsp.__loaderModulesArr = function (modules) {
        var loadedModules = [];
        for (var i = 0; i < modules.length; i++) {
            var module = modules[i];
            var loadModule = this.__loadModule(module);
            if (loadModule) loadedModules.push(loadModule.className);
        }
        return loadedModules;
    };

    /**
     * Есть ли такой модуль
     * @param moduleName
     * @returns {boolean}
     * @private
     */
    nsp.__moduleExist = function (moduleName) {
        return typeof this[moduleName] != 'undefined';
    };

    /**
     * Загрузка одного модуля
     * @param module
     * @returns {*}
     * @private
     */
    nsp.__loadModule = function (module) {
        var newModule = new module(this);
        if (newModule.className) {
            if (this.__moduleExist(newModule.className) && this.stgs.replaceModule) {
                if(this.stgs.replaceModuleMsg)
                    console.warn('Module "' + newModule.className + '" exist, it will be replaced');
                this[newModule.className] = newModule;
                return newModule;
            }
            if (!this.__moduleExist(newModule.className)) {
                this[newModule.className] = newModule;
                return newModule;
            }
        }
        return false;
    };

    return ns;
};
}).call(this,require("rH1JPG"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/core/loader.js","/core")
},{"../snKnife/index":11,"buffer":13,"rH1JPG":15}],3:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * Created by snatvb on 04.06.16.
 */


var testModule = function (core) {
    this.className = 'testModule';
    this.core = core;
    this.init();
};

testModule.prototype = {
    init: function () {
//        console.log(this.className + ' is loaded.');
    }
};

module.exports = testModule;
}).call(this,require("rH1JPG"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/core/module/test.js","/core/module")
},{"buffer":13,"rH1JPG":15}],4:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * Created by snatvb on 04.06.16.
 */

var Version = function (core) {
    this.core = core;
    this.className = 'version';
    this.init();
};

Version.prototype = {
    init: function () {
        this.major = 0;
        this.minor = 2;
        this.dot = 1;
        this.build = 'alpha';
    },
    getWithoutBuild: function () {
        return [this.major, this.minor, this.dot].join('.');
    },
    getFull: function () {
        return this.getWithoutBuild() + ' ' + this.build;
    },
    getObject: function () {
        return {
            full: this.getFull(),
            withoutBuild: this.getWithoutBuild(),
            major: this.major,
            minor: this.minor,
            dot: this.dot,
            build: this.build
        };
    }
};

module.exports = Version;
}).call(this,require("rH1JPG"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/core/module/version.js","/core/module")
},{"buffer":13,"rH1JPG":15}],5:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * Расширительный модуль sn-repeat
 * Created by snatvb on 05.06.16.
 */

var snKnife = require('../snKnife/index');

module.exports = function (ns) {

    if (!ns) return console.warn('MVVM not found');

    var nsp = ns.prototype;

    /**
     * Инициализация sn-repeat
     * @private
     */
    nsp.__initRepeat = function () {
        this.__REPEAT_DOM = this.__getRepeatDOM();
        this.__cutRepeat();
    };

    /**
     * Получаем HTMLELEMENTDOM sn-repeat
     * @private
     */
    nsp.__getRepeatDOM = function (elements, when) {
        when = when || document;
        var result = [];
        elements = elements || when.getElementsByTagName('*');
        for (var i = 0; i < elements.length; i++) {
            var element = elements[i];
            if (element.getAttribute(this.stgs.attrRepeat)) {
                var parentRepeat = snKnife.dom.parentByAttr(element, this.stgs.attrRepeat);
                if (parentRepeat) {
                    element.parentRepeat = parentRepeat;
                    if (parentRepeat.childRepeat) parentRepeat.childRepeat.push(element);
                    else parentRepeat.childRepeat = [element];
                }
//                element.chieldRepeat = snKnife.dom.chieldByAttr(element, this.stgs.attrRepeat);
                result.push(element);
            }
        }
        return result;
    };

    nsp.__cutRepeat = function (REPEAT_DOM) {
        REPEAT_DOM = REPEAT_DOM || this.__REPEAT_DOM;
        for (var i = REPEAT_DOM.length - 1; i >= 0; i--) {
            var repeatItem = REPEAT_DOM[i];
            repeatItem.htmlInner = repeatItem.innerHTML;
//            repeatItem.innerHTML = ' ';
        }
    };

    nsp.__getChildRepeat = function (dom, item) {
        for (var i = 0; i < dom.length; i++) {
            var repeatItem = dom[i];
            if (!repeatItem.outerHTML || !item.outerHTML) continue;
            if (item.outerHTML == repeatItem.outerHTML) return repeatItem;
        }
    };


    nsp.__applyRepeat = function (REPEAT_DOM, scope) {
        REPEAT_DOM = REPEAT_DOM || this.__REPEAT_DOM;
        scope = scope || this.scope;
        for (var i = 0; i < REPEAT_DOM.length; i++) {
            var repeatItem = REPEAT_DOM[i];
            if (REPEAT_DOM == this.__REPEAT_DOM && repeatItem.parentRepeat) continue;
            var domCreatedFromHtml = snKnife.dom.createElementArray(repeatItem.htmlInner);
            var data = repeatItem.getAttribute(this.stgs.attrRepeat);
            data = data.split(' in ');
            if (data.length != 2) return;
            var dataScope = this.getData(data[1], scope);
            repeatItem.innerHTML = this.__renderRepeat(domCreatedFromHtml, dataScope, data, repeatItem);
        }
        return REPEAT_DOM;
    };

    nsp.__renderRepeat = function (element, scope, data, repeatItem) {
        var textInner = '';
        if (!scope) return textInner;
        for (var j = 0; j < scope.length; j++) {
            var itemScope = scope[j];
            var newScope = {};
            newScope[data[0]] = itemScope;
            var rdyDOM = this.__setScopeDOM(element, newScope);
            rdyDOM = this.__insertedRepeat(rdyDOM, newScope, data, repeatItem);
            textInner += snKnife.dom.getTextFromHtml(rdyDOM);
//            console.log(textInner);
        }
        return textInner;
    };

    nsp.__insertedRepeat = function (rdyDOM, scope, data, repeatItem) {
        if (repeatItem.childRepeat) {
            for (var i = 0; i < repeatItem.childRepeat.length; i++) {
                var repeatElement = repeatItem.childRepeat[i];
                var cloneRepeatElement = repeatElement.cloneNode();
                cloneRepeatElement.innerHTML = '';
                var child = this.__getChildRepeat(rdyDOM, cloneRepeatElement);
                if (!child) continue;
                child.innerHTML = snKnife.dom.getTextFromHtml(this.__applyRepeat([repeatElement], scope), 'inner');
            }
        }
        return rdyDOM;
    };

    return ns;
};
}).call(this,require("rH1JPG"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/core/repeat.js","/core")
},{"../snKnife/index":11,"buffer":13,"rH1JPG":15}],6:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * Created by snatvb on 31.05.16.
 */

/**
 * Расширительный модуль для MVVM - save scope
 * Created by snatvb on 28.05.16.
 */

var snKnife = require('../snKnife/index');

module.exports = function (ns) {
    /**
     * Создал для клонирования объектов и массивов
     * @param objective
     * @returns {*}
     */
    var copy = snKnife.data.clone;

    if (!ns) return console.warn('MVVM not found');

    /**
     * МОДУЛЬ СОХРАНЕНИЯ SCOPE
     */

    ns.prototype.saveScope = function () {
        return this.__saveScope();
    };

    ns.prototype.__saveScope = function (update) {
        if  (typeof this['scope'] == 'undefined') return;
        if (this.__SAVE__ && !update) return;
        this.__SAVE__ = copy(this['scope']); // копируем объект
        return this.__SAVE__;
    };

    ns.prototype.updateSaveScope = function () {
        if  (typeof this['__SAVE__'] == 'undefined') return;
        return this.__saveScope(true);
    };

    ns.prototype.removeSaveScope = function () {
        if  (typeof this['__SAVE__'] == 'undefined') return;
        delete this['__SAVE__'];
        return true;
    };

    ns.prototype.getSaveScope = function () {
        return this.__SAVE__;
    };

    /**
     * Сбрасываем сохранение
     * @returns {*}
     */
    ns.prototype.resetSaveScope = function () {
        if  (typeof this['__SAVE__'] == 'undefined') return;
        this.scope = copy(this.__SAVE__);
        this.removeSaveScope();
        return this.scope;
    };
    return ns;
};
}).call(this,require("rH1JPG"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/core/save.js","/core")
},{"../snKnife/index":11,"buffer":13,"rH1JPG":15}],7:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * Добавляем Events
 */
var snEvents = require('./snKnife/index').events;
window.snEvents = new snEvents;
/**
 * End Events
 */

/**
 * Сборка ядра
 * @type {MVVM|exports|module.exports}
 */
var snMVVM = window.snMVVM = require('./core/core');
require('./core/repeat')(snMVVM);
require('./core/save')(snMVVM);
require('./core/loader')(snMVVM);
/**
 * End Build
 */

(function () {
    var mvvm = new snMVVM({
        name: 'snatvb',
        phone: '+7 (800) 000 00 00',
        testData: {tester: {name: 'killarx'}},
        data: [
            {name: 'tester', arra: [1,4,6]},
            {name: 'snatvb', arra: [1,4,6]},
            {name: 'killarx', arra: [1,4,6]}
        ]
    });

    setTimeout(function () {
        mvvm.setData('data', [{name: 'snatvb', arra: [23,423,52]}], true);
    },1000);

    console.log(mvvm.version.getFull());
})();
}).call(this,require("rH1JPG"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/fake_cadb9ed8.js","/")
},{"./core/core":1,"./core/loader":2,"./core/repeat":5,"./core/save":6,"./snKnife/index":11,"buffer":13,"rH1JPG":15}],8:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * Created by snatvb on 31.05.16.
 */

module.exports = {
    /**
     * Клонирование объекта
     * @param objective
     * @returns {*}
     */
    clone: function (objective) {
        if (objective instanceof Array) return objective.slice(0);
        if (typeof objective != 'object') return;
        var subject = {};
        for (var key in objective) {
            if (!objective.hasOwnProperty(key)) continue;
            if(typeof objective[key] == 'object') subject[key] = this.clone(objective[key]); // если объект то клонируем
            else if (typeof objective[key] == 'array') subject[key] = objective[key].slice(0); // если массив, то клонируем
            else subject[key] = objective[key];
        }
        return subject;
    },
    /**
     * Выполнение функций с задержкой
     * @param callback
     * @param wait
     * @param immediate
     * @returns {Function}
     */
    debounce: function (callback, wait, immediate) {
        var timeout;
        return function() {
            var context = this, args = arguments;
            var later = function() {
                timeout = null;
                if (!immediate) callback.apply(context, args);
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) callback.apply(context, args);
        };
    }
};
}).call(this,require("rH1JPG"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/snKnife/data.js","/snKnife")
},{"buffer":13,"rH1JPG":15}],9:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * Created by snatvb on 31.05.16.
 */



module.exports = {
    DIV: document.createElement("div"),
    /**
     * Создать событие
     * @param eventType
     * @param element
     * @param fn
     */
    addEvent: function (eventType, element, fn) {
        if (element.addEventListener) {
            element.addEventListener(eventType, fn, false);
        }
        else if (element.attachEvent) {
            element.attachEvent('on' + eventType, fn);
        }
        else {
            element['on' + eventType] = fn;
        }
    },
    /**
     * Проверить, HTML Element это или нет
     * @param obj
     * @returns {boolean}
     */
    isElement: function (obj) {
        try {
            return obj instanceof HTMLElement;
        }
        catch (e) {
            return (typeof obj === "object") &&
                (obj.nodeType === 1) && (typeof obj.style === "object") &&
                (typeof obj.ownerDocument === "object");
        }
    },
    /**
     * Создать html элемент
     * @param html
     * @returns {Array}
     */
    createElementArray: function (html) {
        var res = [], tmp, add;
        this.DIV.innerHTML = html;
        while (this.DIV.firstChild) {
//            add = !(this.DIV.firstChild.tagName == undefined && this.DIV.firstChild.textContent.trim() == '');
            tmp = this.DIV.removeChild(this.DIV.firstChild);
            res.push(tmp);
//            if (add) res.push(tmp);
        }
        return res;
    },
    createElement: function (htmlString) {
        this.DIV.innerHTML = htmlString.trim();
        return this.DIV.childNodes;
    },
    /**
     * Получить тескт из массива html елементов
     * @param arr
     * @param type
     * @returns {*}
     */
    getTextFromHtml: function (arr, type) {
        type = type || 'outer';
        if (!(arr instanceof Array)) {
            if (this.isElement(arr))
                return arr.outerHeight;
            else return;
        }

        var resultText = '';
        for (var i = 0; i < arr.length; i++) {
            var itemArr = arr[i];
            if (type == 'outer') resultText += itemArr.outerHTML ? itemArr.outerHTML : itemArr.textContent;
            else resultText += itemArr.innerHTML ? itemArr.innerHTML : itemArr.textContent;
        }
        return resultText;
    },
    parentByAttr: function (element, attr) {
        if (!this.isElement((element)) || typeof attr != "string") return;
        var nowBlock = element;
        while (true) {
            nowBlock = nowBlock.parentNode;
            if (!nowBlock || !this.isElement(nowBlock)) return;
            if (nowBlock.getAttribute(attr)) return nowBlock;
        }
    }
};
}).call(this,require("rH1JPG"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/snKnife/dom.js","/snKnife")
},{"buffer":13,"rH1JPG":15}],10:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * Created by snatvb on 04.06.16.
 */

/**
 * События
 * @returns {*}
 * @constructor
 */
var Events = function () {
    return this.init();
};

Events.prototype = {
    init: function () {
        this.ev = [];
        return this;
    },
    on: function (eventName, f) {
        if (!f) return;
        var e = {
            name: eventName,
            f: f
        };
        this.ev.push(e);
    },
    trigger: function (eventName, args) {
        for (var i = 0; i < this.ev.length; i++) {
            if (this.ev[i].name == eventName) {
                this.ev[i].f(args);
            }
        }
    }
};

module.exports = Events;
}).call(this,require("rH1JPG"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/snKnife/events.js","/snKnife")
},{"buffer":13,"rH1JPG":15}],11:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/**
 * Created by snatvb on 31.05.16.
 */

module.exports = {
    dom: require('./dom'),
    data: require('./data'),
    events: require('./events')
};
}).call(this,require("rH1JPG"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/snKnife/index.js","/snKnife")
},{"./data":8,"./dom":9,"./events":10,"buffer":13,"rH1JPG":15}],12:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
var lookup = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

;(function (exports) {
	'use strict';

  var Arr = (typeof Uint8Array !== 'undefined')
    ? Uint8Array
    : Array

	var PLUS   = '+'.charCodeAt(0)
	var SLASH  = '/'.charCodeAt(0)
	var NUMBER = '0'.charCodeAt(0)
	var LOWER  = 'a'.charCodeAt(0)
	var UPPER  = 'A'.charCodeAt(0)
	var PLUS_URL_SAFE = '-'.charCodeAt(0)
	var SLASH_URL_SAFE = '_'.charCodeAt(0)

	function decode (elt) {
		var code = elt.charCodeAt(0)
		if (code === PLUS ||
		    code === PLUS_URL_SAFE)
			return 62 // '+'
		if (code === SLASH ||
		    code === SLASH_URL_SAFE)
			return 63 // '/'
		if (code < NUMBER)
			return -1 //no match
		if (code < NUMBER + 10)
			return code - NUMBER + 26 + 26
		if (code < UPPER + 26)
			return code - UPPER
		if (code < LOWER + 26)
			return code - LOWER + 26
	}

	function b64ToByteArray (b64) {
		var i, j, l, tmp, placeHolders, arr

		if (b64.length % 4 > 0) {
			throw new Error('Invalid string. Length must be a multiple of 4')
		}

		// the number of equal signs (place holders)
		// if there are two placeholders, than the two characters before it
		// represent one byte
		// if there is only one, then the three characters before it represent 2 bytes
		// this is just a cheap hack to not do indexOf twice
		var len = b64.length
		placeHolders = '=' === b64.charAt(len - 2) ? 2 : '=' === b64.charAt(len - 1) ? 1 : 0

		// base64 is 4/3 + up to two characters of the original data
		arr = new Arr(b64.length * 3 / 4 - placeHolders)

		// if there are placeholders, only get up to the last complete 4 chars
		l = placeHolders > 0 ? b64.length - 4 : b64.length

		var L = 0

		function push (v) {
			arr[L++] = v
		}

		for (i = 0, j = 0; i < l; i += 4, j += 3) {
			tmp = (decode(b64.charAt(i)) << 18) | (decode(b64.charAt(i + 1)) << 12) | (decode(b64.charAt(i + 2)) << 6) | decode(b64.charAt(i + 3))
			push((tmp & 0xFF0000) >> 16)
			push((tmp & 0xFF00) >> 8)
			push(tmp & 0xFF)
		}

		if (placeHolders === 2) {
			tmp = (decode(b64.charAt(i)) << 2) | (decode(b64.charAt(i + 1)) >> 4)
			push(tmp & 0xFF)
		} else if (placeHolders === 1) {
			tmp = (decode(b64.charAt(i)) << 10) | (decode(b64.charAt(i + 1)) << 4) | (decode(b64.charAt(i + 2)) >> 2)
			push((tmp >> 8) & 0xFF)
			push(tmp & 0xFF)
		}

		return arr
	}

	function uint8ToBase64 (uint8) {
		var i,
			extraBytes = uint8.length % 3, // if we have 1 byte left, pad 2 bytes
			output = "",
			temp, length

		function encode (num) {
			return lookup.charAt(num)
		}

		function tripletToBase64 (num) {
			return encode(num >> 18 & 0x3F) + encode(num >> 12 & 0x3F) + encode(num >> 6 & 0x3F) + encode(num & 0x3F)
		}

		// go through the array every three bytes, we'll deal with trailing stuff later
		for (i = 0, length = uint8.length - extraBytes; i < length; i += 3) {
			temp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
			output += tripletToBase64(temp)
		}

		// pad the end with zeros, but make sure to not forget the extra bytes
		switch (extraBytes) {
			case 1:
				temp = uint8[uint8.length - 1]
				output += encode(temp >> 2)
				output += encode((temp << 4) & 0x3F)
				output += '=='
				break
			case 2:
				temp = (uint8[uint8.length - 2] << 8) + (uint8[uint8.length - 1])
				output += encode(temp >> 10)
				output += encode((temp >> 4) & 0x3F)
				output += encode((temp << 2) & 0x3F)
				output += '='
				break
		}

		return output
	}

	exports.toByteArray = b64ToByteArray
	exports.fromByteArray = uint8ToBase64
}(typeof exports === 'undefined' ? (this.base64js = {}) : exports))

}).call(this,require("rH1JPG"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/base64-js/lib/b64.js","/../../node_modules/base64-js/lib")
},{"buffer":13,"rH1JPG":15}],13:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = Buffer
exports.INSPECT_MAX_BYTES = 50
Buffer.poolSize = 8192

/**
 * If `Buffer._useTypedArrays`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (compatible down to IE6)
 */
Buffer._useTypedArrays = (function () {
  // Detect if browser supports Typed Arrays. Supported browsers are IE 10+, Firefox 4+,
  // Chrome 7+, Safari 5.1+, Opera 11.6+, iOS 4.2+. If the browser does not support adding
  // properties to `Uint8Array` instances, then that's the same as no `Uint8Array` support
  // because we need to be able to add all the node Buffer API methods. This is an issue
  // in Firefox 4-29. Now fixed: https://bugzilla.mozilla.org/show_bug.cgi?id=695438
  try {
    var buf = new ArrayBuffer(0)
    var arr = new Uint8Array(buf)
    arr.foo = function () { return 42 }
    return 42 === arr.foo() &&
        typeof arr.subarray === 'function' // Chrome 9-10 lack `subarray`
  } catch (e) {
    return false
  }
})()

/**
 * Class: Buffer
 * =============
 *
 * The Buffer constructor returns instances of `Uint8Array` that are augmented
 * with function properties for all the node `Buffer` API functions. We use
 * `Uint8Array` so that square bracket notation works as expected -- it returns
 * a single octet.
 *
 * By augmenting the instances, we can avoid modifying the `Uint8Array`
 * prototype.
 */
function Buffer (subject, encoding, noZero) {
  if (!(this instanceof Buffer))
    return new Buffer(subject, encoding, noZero)

  var type = typeof subject

  // Workaround: node's base64 implementation allows for non-padded strings
  // while base64-js does not.
  if (encoding === 'base64' && type === 'string') {
    subject = stringtrim(subject)
    while (subject.length % 4 !== 0) {
      subject = subject + '='
    }
  }

  // Find the length
  var length
  if (type === 'number')
    length = coerce(subject)
  else if (type === 'string')
    length = Buffer.byteLength(subject, encoding)
  else if (type === 'object')
    length = coerce(subject.length) // assume that object is array-like
  else
    throw new Error('First argument needs to be a number, array or string.')

  var buf
  if (Buffer._useTypedArrays) {
    // Preferred: Return an augmented `Uint8Array` instance for best performance
    buf = Buffer._augment(new Uint8Array(length))
  } else {
    // Fallback: Return THIS instance of Buffer (created by `new`)
    buf = this
    buf.length = length
    buf._isBuffer = true
  }

  var i
  if (Buffer._useTypedArrays && typeof subject.byteLength === 'number') {
    // Speed optimization -- use set if we're copying from a typed array
    buf._set(subject)
  } else if (isArrayish(subject)) {
    // Treat array-ish objects as a byte array
    for (i = 0; i < length; i++) {
      if (Buffer.isBuffer(subject))
        buf[i] = subject.readUInt8(i)
      else
        buf[i] = subject[i]
    }
  } else if (type === 'string') {
    buf.write(subject, 0, encoding)
  } else if (type === 'number' && !Buffer._useTypedArrays && !noZero) {
    for (i = 0; i < length; i++) {
      buf[i] = 0
    }
  }

  return buf
}

// STATIC METHODS
// ==============

Buffer.isEncoding = function (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'binary':
    case 'base64':
    case 'raw':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.isBuffer = function (b) {
  return !!(b !== null && b !== undefined && b._isBuffer)
}

Buffer.byteLength = function (str, encoding) {
  var ret
  str = str + ''
  switch (encoding || 'utf8') {
    case 'hex':
      ret = str.length / 2
      break
    case 'utf8':
    case 'utf-8':
      ret = utf8ToBytes(str).length
      break
    case 'ascii':
    case 'binary':
    case 'raw':
      ret = str.length
      break
    case 'base64':
      ret = base64ToBytes(str).length
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = str.length * 2
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.concat = function (list, totalLength) {
  assert(isArray(list), 'Usage: Buffer.concat(list, [totalLength])\n' +
      'list should be an Array.')

  if (list.length === 0) {
    return new Buffer(0)
  } else if (list.length === 1) {
    return list[0]
  }

  var i
  if (typeof totalLength !== 'number') {
    totalLength = 0
    for (i = 0; i < list.length; i++) {
      totalLength += list[i].length
    }
  }

  var buf = new Buffer(totalLength)
  var pos = 0
  for (i = 0; i < list.length; i++) {
    var item = list[i]
    item.copy(buf, pos)
    pos += item.length
  }
  return buf
}

// BUFFER INSTANCE METHODS
// =======================

function _hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  assert(strLen % 2 === 0, 'Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; i++) {
    var byte = parseInt(string.substr(i * 2, 2), 16)
    assert(!isNaN(byte), 'Invalid hex string')
    buf[offset + i] = byte
  }
  Buffer._charsWritten = i * 2
  return i
}

function _utf8Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf8ToBytes(string), buf, offset, length)
  return charsWritten
}

function _asciiWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(asciiToBytes(string), buf, offset, length)
  return charsWritten
}

function _binaryWrite (buf, string, offset, length) {
  return _asciiWrite(buf, string, offset, length)
}

function _base64Write (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(base64ToBytes(string), buf, offset, length)
  return charsWritten
}

function _utf16leWrite (buf, string, offset, length) {
  var charsWritten = Buffer._charsWritten =
    blitBuffer(utf16leToBytes(string), buf, offset, length)
  return charsWritten
}

Buffer.prototype.write = function (string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length
      length = undefined
    }
  } else {  // legacy
    var swap = encoding
    encoding = offset
    offset = length
    length = swap
  }

  offset = Number(offset) || 0
  var remaining = this.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }
  encoding = String(encoding || 'utf8').toLowerCase()

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexWrite(this, string, offset, length)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Write(this, string, offset, length)
      break
    case 'ascii':
      ret = _asciiWrite(this, string, offset, length)
      break
    case 'binary':
      ret = _binaryWrite(this, string, offset, length)
      break
    case 'base64':
      ret = _base64Write(this, string, offset, length)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leWrite(this, string, offset, length)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toString = function (encoding, start, end) {
  var self = this

  encoding = String(encoding || 'utf8').toLowerCase()
  start = Number(start) || 0
  end = (end !== undefined)
    ? Number(end)
    : end = self.length

  // Fastpath empty strings
  if (end === start)
    return ''

  var ret
  switch (encoding) {
    case 'hex':
      ret = _hexSlice(self, start, end)
      break
    case 'utf8':
    case 'utf-8':
      ret = _utf8Slice(self, start, end)
      break
    case 'ascii':
      ret = _asciiSlice(self, start, end)
      break
    case 'binary':
      ret = _binarySlice(self, start, end)
      break
    case 'base64':
      ret = _base64Slice(self, start, end)
      break
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      ret = _utf16leSlice(self, start, end)
      break
    default:
      throw new Error('Unknown encoding')
  }
  return ret
}

Buffer.prototype.toJSON = function () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function (target, target_start, start, end) {
  var source = this

  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (!target_start) target_start = 0

  // Copy 0 bytes; we're done
  if (end === start) return
  if (target.length === 0 || source.length === 0) return

  // Fatal error conditions
  assert(end >= start, 'sourceEnd < sourceStart')
  assert(target_start >= 0 && target_start < target.length,
      'targetStart out of bounds')
  assert(start >= 0 && start < source.length, 'sourceStart out of bounds')
  assert(end >= 0 && end <= source.length, 'sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length)
    end = this.length
  if (target.length - target_start < end - start)
    end = target.length - target_start + start

  var len = end - start

  if (len < 100 || !Buffer._useTypedArrays) {
    for (var i = 0; i < len; i++)
      target[i + target_start] = this[i + start]
  } else {
    target._set(this.subarray(start, start + len), target_start)
  }
}

function _base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function _utf8Slice (buf, start, end) {
  var res = ''
  var tmp = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++) {
    if (buf[i] <= 0x7F) {
      res += decodeUtf8Char(tmp) + String.fromCharCode(buf[i])
      tmp = ''
    } else {
      tmp += '%' + buf[i].toString(16)
    }
  }

  return res + decodeUtf8Char(tmp)
}

function _asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; i++)
    ret += String.fromCharCode(buf[i])
  return ret
}

function _binarySlice (buf, start, end) {
  return _asciiSlice(buf, start, end)
}

function _hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; i++) {
    out += toHex(buf[i])
  }
  return out
}

function _utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i+1] * 256)
  }
  return res
}

Buffer.prototype.slice = function (start, end) {
  var len = this.length
  start = clamp(start, len, 0)
  end = clamp(end, len, len)

  if (Buffer._useTypedArrays) {
    return Buffer._augment(this.subarray(start, end))
  } else {
    var sliceLen = end - start
    var newBuf = new Buffer(sliceLen, undefined, true)
    for (var i = 0; i < sliceLen; i++) {
      newBuf[i] = this[i + start]
    }
    return newBuf
  }
}

// `get` will be removed in Node 0.13+
Buffer.prototype.get = function (offset) {
  console.log('.get() is deprecated. Access using array indexes instead.')
  return this.readUInt8(offset)
}

// `set` will be removed in Node 0.13+
Buffer.prototype.set = function (v, offset) {
  console.log('.set() is deprecated. Access using array indexes instead.')
  return this.writeUInt8(v, offset)
}

Buffer.prototype.readUInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  return this[offset]
}

function _readUInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    val = buf[offset]
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
  } else {
    val = buf[offset] << 8
    if (offset + 1 < len)
      val |= buf[offset + 1]
  }
  return val
}

Buffer.prototype.readUInt16LE = function (offset, noAssert) {
  return _readUInt16(this, offset, true, noAssert)
}

Buffer.prototype.readUInt16BE = function (offset, noAssert) {
  return _readUInt16(this, offset, false, noAssert)
}

function _readUInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val
  if (littleEndian) {
    if (offset + 2 < len)
      val = buf[offset + 2] << 16
    if (offset + 1 < len)
      val |= buf[offset + 1] << 8
    val |= buf[offset]
    if (offset + 3 < len)
      val = val + (buf[offset + 3] << 24 >>> 0)
  } else {
    if (offset + 1 < len)
      val = buf[offset + 1] << 16
    if (offset + 2 < len)
      val |= buf[offset + 2] << 8
    if (offset + 3 < len)
      val |= buf[offset + 3]
    val = val + (buf[offset] << 24 >>> 0)
  }
  return val
}

Buffer.prototype.readUInt32LE = function (offset, noAssert) {
  return _readUInt32(this, offset, true, noAssert)
}

Buffer.prototype.readUInt32BE = function (offset, noAssert) {
  return _readUInt32(this, offset, false, noAssert)
}

Buffer.prototype.readInt8 = function (offset, noAssert) {
  if (!noAssert) {
    assert(offset !== undefined && offset !== null,
        'missing offset')
    assert(offset < this.length, 'Trying to read beyond buffer length')
  }

  if (offset >= this.length)
    return

  var neg = this[offset] & 0x80
  if (neg)
    return (0xff - this[offset] + 1) * -1
  else
    return this[offset]
}

function _readInt16 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt16(buf, offset, littleEndian, true)
  var neg = val & 0x8000
  if (neg)
    return (0xffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt16LE = function (offset, noAssert) {
  return _readInt16(this, offset, true, noAssert)
}

Buffer.prototype.readInt16BE = function (offset, noAssert) {
  return _readInt16(this, offset, false, noAssert)
}

function _readInt32 (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  var len = buf.length
  if (offset >= len)
    return

  var val = _readUInt32(buf, offset, littleEndian, true)
  var neg = val & 0x80000000
  if (neg)
    return (0xffffffff - val + 1) * -1
  else
    return val
}

Buffer.prototype.readInt32LE = function (offset, noAssert) {
  return _readInt32(this, offset, true, noAssert)
}

Buffer.prototype.readInt32BE = function (offset, noAssert) {
  return _readInt32(this, offset, false, noAssert)
}

function _readFloat (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 3 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 23, 4)
}

Buffer.prototype.readFloatLE = function (offset, noAssert) {
  return _readFloat(this, offset, true, noAssert)
}

Buffer.prototype.readFloatBE = function (offset, noAssert) {
  return _readFloat(this, offset, false, noAssert)
}

function _readDouble (buf, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset + 7 < buf.length, 'Trying to read beyond buffer length')
  }

  return ieee754.read(buf, offset, littleEndian, 52, 8)
}

Buffer.prototype.readDoubleLE = function (offset, noAssert) {
  return _readDouble(this, offset, true, noAssert)
}

Buffer.prototype.readDoubleBE = function (offset, noAssert) {
  return _readDouble(this, offset, false, noAssert)
}

Buffer.prototype.writeUInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'trying to write beyond buffer length')
    verifuint(value, 0xff)
  }

  if (offset >= this.length) return

  this[offset] = value
}

function _writeUInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 2); i < j; i++) {
    buf[offset + i] =
        (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
            (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt16BE = function (value, offset, noAssert) {
  _writeUInt16(this, value, offset, false, noAssert)
}

function _writeUInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'trying to write beyond buffer length')
    verifuint(value, 0xffffffff)
  }

  var len = buf.length
  if (offset >= len)
    return

  for (var i = 0, j = Math.min(len - offset, 4); i < j; i++) {
    buf[offset + i] =
        (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeUInt32BE = function (value, offset, noAssert) {
  _writeUInt32(this, value, offset, false, noAssert)
}

Buffer.prototype.writeInt8 = function (value, offset, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset < this.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7f, -0x80)
  }

  if (offset >= this.length)
    return

  if (value >= 0)
    this.writeUInt8(value, offset, noAssert)
  else
    this.writeUInt8(0xff + value + 1, offset, noAssert)
}

function _writeInt16 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 1 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fff, -0x8000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt16(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt16(buf, 0xffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt16LE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt16BE = function (value, offset, noAssert) {
  _writeInt16(this, value, offset, false, noAssert)
}

function _writeInt32 (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifsint(value, 0x7fffffff, -0x80000000)
  }

  var len = buf.length
  if (offset >= len)
    return

  if (value >= 0)
    _writeUInt32(buf, value, offset, littleEndian, noAssert)
  else
    _writeUInt32(buf, 0xffffffff + value + 1, offset, littleEndian, noAssert)
}

Buffer.prototype.writeInt32LE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, true, noAssert)
}

Buffer.prototype.writeInt32BE = function (value, offset, noAssert) {
  _writeInt32(this, value, offset, false, noAssert)
}

function _writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 3 < buf.length, 'Trying to write beyond buffer length')
    verifIEEE754(value, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 23, 4)
}

Buffer.prototype.writeFloatLE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function (value, offset, noAssert) {
  _writeFloat(this, value, offset, false, noAssert)
}

function _writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    assert(value !== undefined && value !== null, 'missing value')
    assert(typeof littleEndian === 'boolean', 'missing or invalid endian')
    assert(offset !== undefined && offset !== null, 'missing offset')
    assert(offset + 7 < buf.length,
        'Trying to write beyond buffer length')
    verifIEEE754(value, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }

  var len = buf.length
  if (offset >= len)
    return

  ieee754.write(buf, value, offset, littleEndian, 52, 8)
}

Buffer.prototype.writeDoubleLE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function (value, offset, noAssert) {
  _writeDouble(this, value, offset, false, noAssert)
}

// fill(value, start=0, end=buffer.length)
Buffer.prototype.fill = function (value, start, end) {
  if (!value) value = 0
  if (!start) start = 0
  if (!end) end = this.length

  if (typeof value === 'string') {
    value = value.charCodeAt(0)
  }

  assert(typeof value === 'number' && !isNaN(value), 'value is not a number')
  assert(end >= start, 'end < start')

  // Fill 0 bytes; we're done
  if (end === start) return
  if (this.length === 0) return

  assert(start >= 0 && start < this.length, 'start out of bounds')
  assert(end >= 0 && end <= this.length, 'end out of bounds')

  for (var i = start; i < end; i++) {
    this[i] = value
  }
}

Buffer.prototype.inspect = function () {
  var out = []
  var len = this.length
  for (var i = 0; i < len; i++) {
    out[i] = toHex(this[i])
    if (i === exports.INSPECT_MAX_BYTES) {
      out[i + 1] = '...'
      break
    }
  }
  return '<Buffer ' + out.join(' ') + '>'
}

/**
 * Creates a new `ArrayBuffer` with the *copied* memory of the buffer instance.
 * Added in Node 0.12. Only available in browsers that support ArrayBuffer.
 */
Buffer.prototype.toArrayBuffer = function () {
  if (typeof Uint8Array !== 'undefined') {
    if (Buffer._useTypedArrays) {
      return (new Buffer(this)).buffer
    } else {
      var buf = new Uint8Array(this.length)
      for (var i = 0, len = buf.length; i < len; i += 1)
        buf[i] = this[i]
      return buf.buffer
    }
  } else {
    throw new Error('Buffer.toArrayBuffer not supported in this browser')
  }
}

// HELPER FUNCTIONS
// ================

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

var BP = Buffer.prototype

/**
 * Augment a Uint8Array *instance* (not the Uint8Array class!) with Buffer methods
 */
Buffer._augment = function (arr) {
  arr._isBuffer = true

  // save reference to original Uint8Array get/set methods before overwriting
  arr._get = arr.get
  arr._set = arr.set

  // deprecated, will be removed in node 0.13+
  arr.get = BP.get
  arr.set = BP.set

  arr.write = BP.write
  arr.toString = BP.toString
  arr.toLocaleString = BP.toString
  arr.toJSON = BP.toJSON
  arr.copy = BP.copy
  arr.slice = BP.slice
  arr.readUInt8 = BP.readUInt8
  arr.readUInt16LE = BP.readUInt16LE
  arr.readUInt16BE = BP.readUInt16BE
  arr.readUInt32LE = BP.readUInt32LE
  arr.readUInt32BE = BP.readUInt32BE
  arr.readInt8 = BP.readInt8
  arr.readInt16LE = BP.readInt16LE
  arr.readInt16BE = BP.readInt16BE
  arr.readInt32LE = BP.readInt32LE
  arr.readInt32BE = BP.readInt32BE
  arr.readFloatLE = BP.readFloatLE
  arr.readFloatBE = BP.readFloatBE
  arr.readDoubleLE = BP.readDoubleLE
  arr.readDoubleBE = BP.readDoubleBE
  arr.writeUInt8 = BP.writeUInt8
  arr.writeUInt16LE = BP.writeUInt16LE
  arr.writeUInt16BE = BP.writeUInt16BE
  arr.writeUInt32LE = BP.writeUInt32LE
  arr.writeUInt32BE = BP.writeUInt32BE
  arr.writeInt8 = BP.writeInt8
  arr.writeInt16LE = BP.writeInt16LE
  arr.writeInt16BE = BP.writeInt16BE
  arr.writeInt32LE = BP.writeInt32LE
  arr.writeInt32BE = BP.writeInt32BE
  arr.writeFloatLE = BP.writeFloatLE
  arr.writeFloatBE = BP.writeFloatBE
  arr.writeDoubleLE = BP.writeDoubleLE
  arr.writeDoubleBE = BP.writeDoubleBE
  arr.fill = BP.fill
  arr.inspect = BP.inspect
  arr.toArrayBuffer = BP.toArrayBuffer

  return arr
}

// slice(start, end)
function clamp (index, len, defaultValue) {
  if (typeof index !== 'number') return defaultValue
  index = ~~index;  // Coerce to integer.
  if (index >= len) return len
  if (index >= 0) return index
  index += len
  if (index >= 0) return index
  return 0
}

function coerce (length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length)
  return length < 0 ? 0 : length
}

function isArray (subject) {
  return (Array.isArray || function (subject) {
    return Object.prototype.toString.call(subject) === '[object Array]'
  })(subject)
}

function isArrayish (subject) {
  return isArray(subject) || Buffer.isBuffer(subject) ||
      subject && typeof subject === 'object' &&
      typeof subject.length === 'number'
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    var b = str.charCodeAt(i)
    if (b <= 0x7F)
      byteArray.push(str.charCodeAt(i))
    else {
      var start = i
      if (b >= 0xD800 && b <= 0xDFFF) i++
      var h = encodeURIComponent(str.slice(start, i+1)).substr(1).split('%')
      for (var j = 0; j < h.length; j++)
        byteArray.push(parseInt(h[j], 16))
    }
  }
  return byteArray
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; i++) {
    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(str)
}

function blitBuffer (src, dst, offset, length) {
  var pos
  for (var i = 0; i < length; i++) {
    if ((i + offset >= dst.length) || (i >= src.length))
      break
    dst[i + offset] = src[i]
  }
  return i
}

function decodeUtf8Char (str) {
  try {
    return decodeURIComponent(str)
  } catch (err) {
    return String.fromCharCode(0xFFFD) // UTF 8 invalid char
  }
}

/*
 * We have to make sure that the value is a valid integer. This means that it
 * is non-negative. It has no fractional component and that it does not
 * exceed the maximum allowed value.
 */
function verifuint (value, max) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value >= 0, 'specified a negative value for writing an unsigned value')
  assert(value <= max, 'value is larger than maximum value for type')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifsint (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
  assert(Math.floor(value) === value, 'value has a fractional component')
}

function verifIEEE754 (value, max, min) {
  assert(typeof value === 'number', 'cannot write a non-number as a number')
  assert(value <= max, 'value larger than maximum allowed value')
  assert(value >= min, 'value smaller than minimum allowed value')
}

function assert (test, message) {
  if (!test) throw new Error(message || 'Failed assertion')
}

}).call(this,require("rH1JPG"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/buffer/index.js","/../../node_modules/buffer")
},{"base64-js":12,"buffer":13,"ieee754":14,"rH1JPG":15}],14:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

}).call(this,require("rH1JPG"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/ieee754/index.js","/../../node_modules/ieee754")
},{"buffer":13,"rH1JPG":15}],15:[function(require,module,exports){
(function (process,global,Buffer,__argument0,__argument1,__argument2,__argument3,__filename,__dirname){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

}).call(this,require("rH1JPG"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer,arguments[3],arguments[4],arguments[5],arguments[6],"/../../node_modules/process/browser.js","/../../node_modules/process")
},{"buffer":13,"rH1JPG":15}]},{},[7])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9hbmRyZXdhdnNlbmluL1Byb2plY3RzL3NuTVZWTS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL2FuZHJld2F2c2VuaW4vUHJvamVjdHMvc25NVlZNL2pzL3NuTVZWTS9jb3JlL2NvcmUuanMiLCIvVXNlcnMvYW5kcmV3YXZzZW5pbi9Qcm9qZWN0cy9zbk1WVk0vanMvc25NVlZNL2NvcmUvbG9hZGVyLmpzIiwiL1VzZXJzL2FuZHJld2F2c2VuaW4vUHJvamVjdHMvc25NVlZNL2pzL3NuTVZWTS9jb3JlL21vZHVsZS90ZXN0LmpzIiwiL1VzZXJzL2FuZHJld2F2c2VuaW4vUHJvamVjdHMvc25NVlZNL2pzL3NuTVZWTS9jb3JlL21vZHVsZS92ZXJzaW9uLmpzIiwiL1VzZXJzL2FuZHJld2F2c2VuaW4vUHJvamVjdHMvc25NVlZNL2pzL3NuTVZWTS9jb3JlL3JlcGVhdC5qcyIsIi9Vc2Vycy9hbmRyZXdhdnNlbmluL1Byb2plY3RzL3NuTVZWTS9qcy9zbk1WVk0vY29yZS9zYXZlLmpzIiwiL1VzZXJzL2FuZHJld2F2c2VuaW4vUHJvamVjdHMvc25NVlZNL2pzL3NuTVZWTS9mYWtlX2NhZGI5ZWQ4LmpzIiwiL1VzZXJzL2FuZHJld2F2c2VuaW4vUHJvamVjdHMvc25NVlZNL2pzL3NuTVZWTS9zbktuaWZlL2RhdGEuanMiLCIvVXNlcnMvYW5kcmV3YXZzZW5pbi9Qcm9qZWN0cy9zbk1WVk0vanMvc25NVlZNL3NuS25pZmUvZG9tLmpzIiwiL1VzZXJzL2FuZHJld2F2c2VuaW4vUHJvamVjdHMvc25NVlZNL2pzL3NuTVZWTS9zbktuaWZlL2V2ZW50cy5qcyIsIi9Vc2Vycy9hbmRyZXdhdnNlbmluL1Byb2plY3RzL3NuTVZWTS9qcy9zbk1WVk0vc25LbmlmZS9pbmRleC5qcyIsIi9Vc2Vycy9hbmRyZXdhdnNlbmluL1Byb2plY3RzL3NuTVZWTS9ub2RlX21vZHVsZXMvYmFzZTY0LWpzL2xpYi9iNjQuanMiLCIvVXNlcnMvYW5kcmV3YXZzZW5pbi9Qcm9qZWN0cy9zbk1WVk0vbm9kZV9tb2R1bGVzL2J1ZmZlci9pbmRleC5qcyIsIi9Vc2Vycy9hbmRyZXdhdnNlbmluL1Byb2plY3RzL3NuTVZWTS9ub2RlX21vZHVsZXMvaWVlZTc1NC9pbmRleC5qcyIsIi9Vc2Vycy9hbmRyZXdhdnNlbmluL1Byb2plY3RzL3NuTVZWTS9ub2RlX21vZHVsZXMvcHJvY2Vzcy9icm93c2VyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ppQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdmxDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4vKipcbiAqIENyZWF0ZWQgYnkgc25hdHZiIG9uIDI3LjA1LjE2LlxuICovXG5cbnZhciBzbktuaWZlID0gcmVxdWlyZSgnLi4vc25LbmlmZS9pbmRleCcpO1xuXG4vKipcbiAqIERlZmF1bHQgTW9kdWxlc1xuICovXG52YXIgdGVzdE1vZHVsZSA9IHJlcXVpcmUoJy4vbW9kdWxlL3Rlc3QnKTtcbnZhciBWZXJzaW9uID0gcmVxdWlyZSgnLi9tb2R1bGUvdmVyc2lvbicpO1xuLyoqXG4gKiBFbmQgRGVmYXVsdCBNb2R1bGVzXG4gKi9cblxuLyoqXG4gKiDQodC/0LjRgdC+0Log0YLRjdCz0L7QsiDQtNC70Y8g0L7QsdGA0LDQsdC+0YLQutC4XG4gKiBAdHlwZSB7c3RyaW5nW119XG4gKi9cbnZhciBMSVNUX1ZBTCA9IFtcbiAgICAnaW5wdXQnLFxuICAgICd0ZXh0YXJlYScsXG4gICAgJ3NlbGVjdCdcbl07XG52YXIgTElTVF9IVE1MID0gW1xuICAgICdkaXYnLFxuICAgICdzcGFuJyxcbiAgICAnYScsXG4gICAgJ3RkJyxcbiAgICAnbWFpbicsXG4gICAgJ3NlY3Rpb24nXG5dO1xuXG5pZiAod2luZG93LnNuRXZlbnRzKSB2YXIgRXZlbnRzID0gd2luZG93LnNuRXZlbnRzO1xuZWxzZSBjb25zb2xlLndhcm4oJ3NuRXZlbnRzIGlzblxcJ3QgZGVmaW5lZCcpO1xuXG52YXIgc2V0RWxlbWVudHMgPSBmdW5jdGlvbiAoKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCAxMjAwOyBpKyspIHtcbiAgICAgICAgdmFyIGVsZW1lbnQ7XG4gICAgICAgIHZhciBjb250YWluID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIGVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdicicpO1xuICAgICAgICBjb250YWluLmFwcGVuZENoaWxkKGVsZW1lbnQpO1xuICAgICAgICBlbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnInKTtcbiAgICAgICAgY29udGFpbi5hcHBlbmRDaGlsZChlbGVtZW50KTtcblxuICAgICAgICBlbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgICAgIGVsZW1lbnQuaW5uZXJIVE1MID0gJ0NvbnRlbnQgZm9yIGRpdiBzdGFydGluZyBoZXJlJztcbiAgICAgICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ3NuLW1vZGVsJywgJ3Rlc3QnICsgaSk7XG4gICAgICAgIGNvbnRhaW4uYXBwZW5kQ2hpbGQoZWxlbWVudCk7XG5cbiAgICAgICAgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2lucHV0Jyk7XG4gICAgICAgIGVsZW1lbnQuaW5uZXJIVE1MID0gJ0NvbnRlbnQgZm9yIGRpdiBzdGFydGluZyBoZXJlJztcbiAgICAgICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ3R5cGUnLCAndGV4dCcpO1xuICAgICAgICBlbGVtZW50LnNldEF0dHJpYnV0ZSgnc24tbW9kZWwnLCAndGVzdCcgKyBpKTtcbiAgICAgICAgY29udGFpbi5hcHBlbmRDaGlsZChlbGVtZW50KTtcblxuICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGNvbnRhaW4pO1xuICAgIH1cbn07XG5cbi8qKlxuICog0KHQuNC90YXRgNC+0L3QuNC30LDRhtC40Y8g0LzQvtC00LXQu9C4INC4IERPTSDQtNC10YDQtdCy0LBcbiAqIEBwYXJhbSBzY29wZVxuICogQHJldHVybnMgeyp9XG4gKiBAY29uc3RydWN0b3JcbiAqIEBwYXJhbSBzdGdzXG4gKi9cbnZhciBNVlZNID0gZnVuY3Rpb24gKHNjb3BlLCBzdGdzKSB7XG4gICAgaWYgKHR5cGVvZiBzdGdzICE9ICdvYmplY3QnKSBzdGdzID0ge307XG4gICAgdGhpcy5zY29wZSA9IHNjb3BlIHx8IHt9O1xuICAgIHRoaXMuc3RncyA9IHN0Z3MgfHwge307XG4gICAgcmV0dXJuIHRoaXMuaW5pdCgpO1xufTtcblxuTVZWTS5wcm90b3R5cGUgPSB7XG4gICAgREVGQVVMVF9NT0RVTEU6IFtWZXJzaW9uXSwgLy8g0YHRgtCw0L3QtNCw0YDRgtC90YvQtSDQvNC+0LTRg9C70LhcbiAgICBVU0VSX01PRFVMRTogW10sXG4gICAgX19SRVBFQVRfRE9NOiBbXSwgLy8gdXNlIHJlcGVhdC5qc1xuICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5nZW5lcmF0ZVNldHRpbmdzKCk7XG5cbiAgICAgICAgRXZlbnRzLnRyaWdnZXIoJ3NuTVZWTS5jb3JlLnN0YXJ0SW5pdCcpO1xuICAgICAgICB0aGlzLkJPRFkgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnYm9keScpWzBdO1xuICAgICAgICAvLy8gPHJlZmVyZW5jZSBwYXRoPVwiLi9sb2FkZXIuanNcIi8+XG4gICAgICAgIHRoaXMuX19sb2FkZWRMaXN0TW9kdWxlID0gdGhpcy5fX2xvYWRlck1vZHVsZXMoKTtcbiAgICAgICAgRXZlbnRzLnRyaWdnZXIoJ3NuTVZWTS5jb3JlLm1vZHVsZXNMb2FkZWQnKTtcbiAgICAgICAgLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vcmVwZWF0LmpzXCIvPlxuICAgICAgICB0aGlzLl9faW5pdFJlcGVhdCgpO1xuICAgICAgICB0aGlzLl9fZ2V0RE9NKCk7XG4gICAgICAgIGlmICh0aGlzLnN0Z3MuY3JlYXRlT2JzZXJ2ZXIpIHRoaXMuX19vYnNlcnZlckNyZWF0ZSh0aGlzLkJPRFkpO1xuXG4vLyAgICAgICAgc2V0RWxlbWVudHMoKTtcbi8vICAgICAgICB0aGlzLl9fdXBkYXRlRE9NKCk7XG5cbiAgICAgICAgaWYgKHRoaXMuc3Rncy5maXJzdEFwcGx5KSB7XG4gICAgICAgICAgICB0aGlzLl9fc2V0U2NvcGVET00oKTtcbiAgICAgICAgfSBlbHNlIGlmICghdGhpcy5pc0VtcHR5U2NvcGUoKSkgdGhpcy5fX3NldFNjb3BlRE9NKCk7XG4gICAgICAgIHRoaXMuX19hcHBseVJlcGVhdCgpO1xuXG4gICAgICAgIGlmICh0aGlzLnN0Z3MuYmluZCkgdGhpcy5fX2JpbmRMaXN0ZW5zKHRoaXMuX19ET00pO1xuXG4gICAgICAgIEV2ZW50cy50cmlnZ2VyKCdzbk1WVk0uY29yZS5lbmRJbml0Jyk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICog0KHQvtCx0LjRgNCw0LXQvCBzY29wZSDQv9C+IERPTVxuICAgICAqIEBwYXJhbSBlbXB0eVxuICAgICAqL1xuICAgIGluaXRIdG1sRGF0YTogZnVuY3Rpb24gKGVtcHR5KSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fX0RPTS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGl0ZW1Eb20gPSB0aGlzLl9fRE9NLmVxKGkpO1xuICAgICAgICAgICAgdmFyIG1vZGVsID0gaXRlbURvbS5hdHRyKHRoaXMuc3Rncy5hdHRyKTtcbiAgICAgICAgICAgIHZhciBkYXRhID0gdGhpcy5fX2dldERPTURhdGEoaXRlbURvbSk7XG4gICAgICAgICAgICBpZiAoZW1wdHkgfHwgZGF0YSAhPSAnJykgdGhpcy5zY29wZVttb2RlbF0gPSBkYXRhO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiDQk9C10L3QtdGA0LjRgNGD0LXQvCDQvdCw0YHRgtGA0L7QudC60LhcbiAgICAgKi9cbiAgICBnZW5lcmF0ZVNldHRpbmdzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBzID0gdGhpcy5zdGdzO1xuICAgICAgICB0aGlzLnN0Z3MgPSB7XG4gICAgICAgICAgICBhdHRyUmVwZWF0OiBzLmF0dHJSZXBlYXQgfHwgJ3NuLXJlcGVhdCcsXG4gICAgICAgICAgICBhdHRyOiBzLmF0dHIgfHwgJ3NuLW1vZGVsJyxcbiAgICAgICAgICAgIGxpc3RIVE1MOiBzLmxpc3RIVE1MIHx8IExJU1RfSFRNTCxcbiAgICAgICAgICAgIGxpc3RWQUw6IHMubGlzdFZBTCB8fCBMSVNUX1ZBTFxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuc3Rncy5maXJzdEFwcGx5ID0gISh0eXBlb2Ygcy5iaW5kID09ICd1bmRlZmluZWQnKTtcbiAgICAgICAgdGhpcy5zdGdzLmJpbmQgPSB0eXBlb2Ygcy5iaW5kID09ICd1bmRlZmluZWQnO1xuICAgICAgICB0aGlzLnN0Z3MuYmluZEFwcGx5ID0gdHlwZW9mIHMuYmluZEFwcGx5ID09ICd1bmRlZmluZWQnO1xuICAgICAgICB0aGlzLnN0Z3MuY3JlYXRlT2JzZXJ2ZXIgPSB0eXBlb2Ygcy5jcmVhdGVPYnNlcnZlciAhPSAndW5kZWZpbmVkJztcblxuICAgICAgICB0aGlzLnN0Z3MucmVwbGFjZU1vZHVsZSA9IHR5cGVvZiBzLnJlcGxhY2VNb2R1bGUgIT0gJ3VuZGVmaW5lZCc7XG4gICAgICAgIHRoaXMuc3Rncy5yZXBsYWNlTW9kdWxlTXNnID0gdHlwZW9mIHMucmVwbGFjZU1vZHVsZU1zZyA9PSAndW5kZWZpbmVkJztcbiAgICAgICAgdGhpcy5zdGdzLm1vZHVsZXMgPSB0aGlzLnN0Z3MubW9kdWxlcyB8fCBbXTtcblxuICAgICAgICBpZiAodGhpcy5zdGdzLm1vZHVsZXMgaW5zdGFuY2VvZiBBcnJheSkgdGhpcy5VU0VSX01PRFVMRSA9IHRoaXMuc3Rncy5tb2R1bGVzO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICog0JHQuNC90LTQuNC8IERPTSDRjdC70LXQvNC10L3RglxuICAgICAqIEBwYXJhbSBpdGVtRG9tXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfX2JpbmRJdGVtRE9NOiBmdW5jdGlvbiAoaXRlbURvbSkge1xuICAgICAgICBpZiAoIXRoaXMuc3Rncy5iaW5kKSByZXR1cm47XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgaWYgKHRoaXMuX19pc1ZBTChpdGVtRG9tKSkge1xuICAgICAgICAgICAgc25LbmlmZS5kb20uYWRkRXZlbnQoJ2NoYW5nZScsIGl0ZW1Eb20sIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgIHNlbGYuX19zeW5jTW9kZWxzKHRoaXMpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIHNuS25pZmUuZG9tLmFkZEV2ZW50KCdrZXl1cCcsIGl0ZW1Eb20sIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICAgICAgICAgIHNlbGYuX19zeW5jTW9kZWxzKHRoaXMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRoaXMuX19pc0NIRUNLKGl0ZW1Eb20pKSB7XG4gICAgICAgICAgICBzbktuaWZlLmRvbS5hZGRFdmVudCgnY2hhbmdlJywgaXRlbURvbSwgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgICAgICAgICAgc2VsZi5fX3N5bmNNb2RlbHModGhpcyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgLyoqXG4gICAgICog0JHQuNC90LTQuNC8INGB0L7QsdGL0YLQuNGPXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfX2JpbmRMaXN0ZW5zOiBmdW5jdGlvbiAoRE9NSXRlbXMpIHtcbiAgICAgICAgRE9NSXRlbXMgPSBET01JdGVtcyB8fCB0aGlzLl9fRE9NO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IERPTUl0ZW1zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgaXRlbURvbSA9IERPTUl0ZW1zW2ldO1xuICAgICAgICAgICAgdGhpcy5fX2JpbmRJdGVtRE9NKGl0ZW1Eb20pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiDQodC+0LHQuNGA0LDQtdC8INC00LDQvdC90YvQtSDQuNC3INC00L7QvCDQtNC10YDQtdCy0LBcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9fZ2V0RE9NOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSBbXSxcbiAgICAgICAgICAgIGVsZW1lbnRzID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJyonKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbGVtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGVsZW1lbnQgPSBlbGVtZW50c1tpXTtcbiAgICAgICAgICAgIGlmIChlbGVtZW50LmdldEF0dHJpYnV0ZSh0aGlzLnN0Z3MuYXR0cikpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQucHVzaChlbGVtZW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuX19ET00gPSByZXN1bHQ7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiDQntCx0L3QvtCy0LvRj9C10LwgdGhpcy5fX0RPTVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX191cGRhdGVET006IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGNsb25lRE9NID0gc25LbmlmZS5kYXRhLmNsb25lKHRoaXMuX19ET00pLFxuICAgICAgICAgICAgZWxlbWVudHMgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnKicpLFxuICAgICAgICAgICAgbmV3RWxlbWVudHMgPSBbXTtcbiAgICAgICAgdmFyIHVwZGF0ZWQgPSBmYWxzZTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBlbGVtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIGVsZW1lbnQgPSBlbGVtZW50c1tpXTtcbiAgICAgICAgICAgIGlmIChlbGVtZW50LmdldEF0dHJpYnV0ZSh0aGlzLnN0Z3MuYXR0cikpIHtcbiAgICAgICAgICAgICAgICB2YXIgZXhpc3QgPSAwO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgdGhpcy5fX0RPTS5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZXhpc3RFbGVtZW50ID0gdGhpcy5fX0RPTVtqXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQgPT0gZXhpc3RFbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBleGlzdCsrO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmICghZXhpc3QpIHtcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGNsb25lRE9NLnB1c2goZWxlbWVudCk7XG4gICAgICAgICAgICAgICAgICAgIG5ld0VsZW1lbnRzLnB1c2goZWxlbWVudCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuX19iaW5kTGlzdGVucyhuZXdFbGVtZW50cyk7XG4gICAgICAgIHRoaXMuX19ET00gPSBjbG9uZURPTTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqINCj0YHRgtCw0L3QsNCy0LvQuNCy0LDQtdC8INC00LDQvdC90YvQtSBzY29wZSDQsiBET01cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9fc2V0U2NvcGVET006IGZ1bmN0aW9uIChET00sIHNjb3BlKSB7XG4gICAgICAgIERPTSA9IERPTSB8fCB0aGlzLl9fRE9NO1xuICAgICAgICBzY29wZSA9IHNjb3BlIHx8IHRoaXMuc2NvcGU7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgRE9NLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgaXRlbURvbSA9IERPTVtpXTtcbiAgICAgICAgICAgIGlmKCFzbktuaWZlLmRvbS5pc0VsZW1lbnQoaXRlbURvbSkpIGNvbnRpbnVlO1xuICAgICAgICAgICAgdmFyIG1vZGVsID0gaXRlbURvbS5nZXRBdHRyaWJ1dGUodGhpcy5zdGdzLmF0dHIpO1xuICAgICAgICAgICAgdmFyIGRhdGFNb2RlbCA9IHRoaXMuZ2V0RGF0YShtb2RlbCwgc2NvcGUpO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBkYXRhTW9kZWwgIT0gJ3VuZGVmaW5lZCcpIHRoaXMuX19hcHBseURPTShpdGVtRG9tLCBkYXRhTW9kZWwpO1xuICAgICAgICAgICAgZWxzZSB0aGlzLl9fYXBwbHlET00oaXRlbURvbSwgJycpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBET007XG4vLyAgICAgICAgdGhpcy5fX2FwcGx5UmVwZWF0KCk7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiDQn9C+0LvRg9GH0LjRgtGMINC00LDQvdC90YvQtSDQvtGCIERPTSDRjdC70LXQvNC10L3RgtCwXG4gICAgICogQHBhcmFtIGl0ZW1ET01cbiAgICAgKiBAcmV0dXJucyB7Kn1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9fZ2V0RE9NRGF0YTogZnVuY3Rpb24gKGl0ZW1ET00pIHtcbiAgICAgICAgaWYgKHRoaXMuX19pc0NIRUNLKGl0ZW1ET00pICYmIGl0ZW1ET00uZ2V0QXR0cmlidXRlKCdjaGVja2VkJykpIHJldHVybiBpdGVtRE9NLnZhbHVlO1xuICAgICAgICBpZiAodGhpcy5fX2lzVkFMKGl0ZW1ET00pKSByZXR1cm4gaXRlbURPTS52YWx1ZTtcbiAgICAgICAgaWYgKHRoaXMuX19pc0hUTUwoaXRlbURPTSkpIHJldHVybiBpdGVtRE9NLmlubmVySFRNTDtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqINCf0YDQuNC80LXQvdGP0LXQvCDQtNC70Y8gRE9NXG4gICAgICogQHBhcmFtIGl0ZW1ET01cbiAgICAgKiBAcGFyYW0gZGF0YVxuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX19hcHBseURPTTogZnVuY3Rpb24gKGl0ZW1ET00sIGRhdGEpIHtcbiAgICAgICAgaWYgKHRoaXMuX19pc1ZBTChpdGVtRE9NKSkgcmV0dXJuIHRoaXMuX19hcHBseVZBTChpdGVtRE9NLCBkYXRhKTtcbiAgICAgICAgaWYgKHRoaXMuX19pc0hUTUwoaXRlbURPTSkpIHJldHVybiB0aGlzLl9fYXBwbHlIVE1MKGl0ZW1ET00sIGRhdGEpO1xuICAgICAgICBpZiAodGhpcy5fX2lzQ0hFQ0soaXRlbURPTSkpIHJldHVybiB0aGlzLl9fYXBwbHlDSEVDSyhpdGVtRE9NLCBkYXRhKTtcbiAgICB9LFxuICAgIF9fYXBwbHlDSEVDSzogZnVuY3Rpb24gKGl0ZW1ET00sIGRhdGEpIHtcbiAgICAgICAgaWYgKGRhdGEgPT0gaXRlbURPTS52YWx1ZSkge1xuICAgICAgICAgICAgaXRlbURPTS5zZXRBdHRyaWJ1dGUoJ2NoZWNrZWQnLCB0cnVlKTtcbiAgICAgICAgICAgIGl0ZW1ET00uY2hlY2tlZCA9IHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpdGVtRE9NLnJlbW92ZUF0dHJpYnV0ZSgnY2hlY2tlZCcpO1xuICAgICAgICAgICAgaXRlbURPTS5jaGVja2VkID0gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIC8qKlxuICAgICAqINCf0YDQuNC80LXQvdGP0LXQvCBWQUxcbiAgICAgKiBAcGFyYW0gaXRlbURPTVxuICAgICAqIEBwYXJhbSBkYXRhXG4gICAgICogQHJldHVybnMge2RhdGF9XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfX2FwcGx5VkFMOiBmdW5jdGlvbiAoaXRlbURPTSwgZGF0YSkge1xuICAgICAgICByZXR1cm4gaXRlbURPTS52YWx1ZSA9IGRhdGE7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiDQn9GA0LjQvNC10L3Rj9C10Lwg0LTQu9GPINC40LfQvNC10L3QtdC90LjRjyBIVE1MXG4gICAgICogQHBhcmFtIGl0ZW1ET01cbiAgICAgKiBAcGFyYW0gZGF0YVxuICAgICAqIEByZXR1cm5zIHtkYXRhfVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX19hcHBseUhUTUw6IGZ1bmN0aW9uIChpdGVtRE9NLCBkYXRhKSB7XG4gICAgICAgIHJldHVybiBpdGVtRE9NLmlubmVySFRNTCA9IGRhdGE7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiDQmNC90YHRgNC+0L3QuNC30LjRgNGD0LXQvCDQvNC+0LTQtdC70LhcbiAgICAgKiBAcGFyYW0gaXRlbU1vZGVsXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfX3N5bmNNb2RlbHM6IGZ1bmN0aW9uIChpdGVtTW9kZWwpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gaXRlbU1vZGVsLnZhbHVlO1xuICAgICAgICBpZiAodGhpcy5fX2lzQ0hFQ0soaXRlbU1vZGVsKSAmJiAhaXRlbU1vZGVsLmNoZWNrZWQpIHZhbHVlID0gJyc7XG4gICAgICAgIHZhciBkYXRhTW9kZWwgPSB0aGlzLnNjb3BlW2l0ZW1Nb2RlbC5nZXRBdHRyaWJ1dGUodGhpcy5zdGdzLmF0dHIpXSA9IHZhbHVlO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuX19ET00ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBpdGVtRE9NID0gdGhpcy5fX0RPTVtpXTtcbiAgICAgICAgICAgIGlmIChpdGVtRE9NWzBdICE9IGl0ZW1Nb2RlbCAmJlxuICAgICAgICAgICAgICAgIGl0ZW1Nb2RlbC5nZXRBdHRyaWJ1dGUodGhpcy5zdGdzLmF0dHIpID09IGl0ZW1ET00uZ2V0QXR0cmlidXRlKHRoaXMuc3Rncy5hdHRyKSkge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLnN0Z3MuYmluZEFwcGx5KSB0aGlzLl9fYXBwbHlET00oaXRlbURPTSwgZGF0YU1vZGVsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG4gICAgLyoqXG4gICAgICog0J/RgNC+0LLQtdGA0Y/QtdC8INC90LAg0L/RgNC40L3QsNC00LvQtdC20L3QvtGB0YLRjCDQuiBIVE1MIEFQUExZXG4gICAgICogQHBhcmFtIGl0ZW1ET01cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9faXNIVE1MOiBmdW5jdGlvbiAoaXRlbURPTSkge1xuICAgICAgICBpZiAoIWl0ZW1ET00pIHJldHVybiBmYWxzZTtcbiAgICAgICAgdmFyIGxpc3QgPSB0aGlzLnN0Z3MubGlzdEhUTUw7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIHRhZyA9IGxpc3RbaV07XG4gICAgICAgICAgICBpZiAoaXRlbURPTS50YWdOYW1lLnRvTG9jYWxlTG93ZXJDYXNlKCkgPT0gdGFnLnRvTG9jYWxlTG93ZXJDYXNlKCkpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICog0JXRgdC70Lgg0L3QsNC00L4g0LzQtdC90Y/RgtGMIFZBTCAtPiBBUFBMWVxuICAgICAqIEBwYXJhbSBpdGVtRE9NXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfX2lzVkFMOiBmdW5jdGlvbiAoaXRlbURPTSkge1xuICAgICAgICBpZiAoIWl0ZW1ET00pIHJldHVybiBmYWxzZTtcbiAgICAgICAgdmFyIGxpc3QgPSB0aGlzLnN0Z3MubGlzdFZBTDtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgdGFnID0gbGlzdFtpXTtcbiAgICAgICAgICAgIGlmICh0YWcgPT0gJ2lucHV0JyAmJiBpdGVtRE9NLmdldEF0dHJpYnV0ZSgndHlwZScpICE9ICd0ZXh0JykgY29udGludWU7XG4gICAgICAgICAgICBpZiAoaXRlbURPTS50YWdOYW1lLnRvTG9jYWxlTG93ZXJDYXNlKCkgPT0gdGFnLnRvTG9jYWxlTG93ZXJDYXNlKCkpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICog0J/RgNC+0LLQtdGA0LrQsCDQvdCwIFJBRElPINC4IENIRUNLQk9YXG4gICAgICogQHBhcmFtIGl0ZW1ET01cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9faXNDSEVDSzogZnVuY3Rpb24gKGl0ZW1ET00pIHtcbiAgICAgICAgaWYgKCFpdGVtRE9NIHx8IGl0ZW1ET00udGFnTmFtZS50b0xvY2FsZUxvd2VyQ2FzZSgpICE9ICdpbnB1dCcpIHJldHVybiBmYWxzZTtcbiAgICAgICAgdmFyIHR5cGUgPSBpdGVtRE9NLmdldEF0dHJpYnV0ZSgndHlwZScpO1xuICAgICAgICBpZiAodHlwZSA9PSAnY2hlY2tib3gnKSByZXR1cm4gdHJ1ZTtcbiAgICAgICAgcmV0dXJuIHR5cGUgPT0gJ3JhZGlvJztcbiAgICB9LFxuICAgIC8qKlxuICAgICAqINCf0YDQvtCy0LXRgNC60LAg0L3QsCDQv9GD0YHRgtC+0YLRgyDQvtCx0YrQtdC60YLQsFxuICAgICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGlzRW1wdHlTY29wZTogZnVuY3Rpb24gKCkge1xuICAgICAgICBmb3IgKHZhciBrZXkgaW4gdGhpcy5zY29wZSkge1xuICAgICAgICAgICAgaWYgKCF0aGlzLnNjb3BlLmhhc093blByb3BlcnR5KGtleSkpIGNvbnRpbnVlO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICog0JTQu9GPINC/0L7Qu9GD0YfQtdC90LjRjyBTQ09QRVxuICAgICAqIEByZXR1cm5zIHsqfHt9fVxuICAgICAqL1xuICAgIGdldFNjb3BlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnNjb3BlO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICog0JTQu9GPINC/0L7Qu9GD0YfQtdC90LjRjyDQtNCw0L3QvdGL0YUg0L/QviDQutC70Y7Rh9GDXG4gICAgICogQHBhcmFtIGtleVxuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqIEBwYXJhbSBzY29wZVxuICAgICAqL1xuICAgIGdldERhdGE6IGZ1bmN0aW9uIChrZXksIHNjb3BlKSB7XG4vLyAgICAgICAgY29uc29sZS5sb2coa2V5LCBzY29wZSk7XG4gICAgICAgIGlmKCFrZXkpIHJldHVybjtcbiAgICAgICAga2V5ID0ga2V5LnNwbGl0KCcuJyk7XG4gICAgICAgIHNjb3BlID0gc2NvcGUgfHwgdGhpcy5zY29wZTtcbiAgICAgICAgaWYgKGtleS5sZW5ndGggPT0gMSkgcmV0dXJuIHNjb3BlW2tleV07XG5cbiAgICAgICAgdmFyIHJlcyA9IHNuS25pZmUuZGF0YS5jbG9uZShzY29wZSk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgaXRlbUtleSA9IGtleVtpXTtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgcmVzW2l0ZW1LZXldID09ICd1bmRlZmluZWQnKSByZXR1cm47XG4gICAgICAgICAgICByZXMgPSByZXNbaXRlbUtleV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlcztcbiAgICB9LFxuICAgIC8qKlxuICAgICAqINCj0YHRgtCw0LLQvdC+0LrQsCDQtNCw0L3QvdGL0YVcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogQHBhcmFtIGRhdGFcbiAgICAgKiBAcGFyYW0gYXBwbHlcbiAgICAgKiBAcmV0dXJucyB7Knx7fX1cbiAgICAgKi9cbiAgICBzZXREYXRhOiBmdW5jdGlvbiAoa2V5LCBkYXRhLCBhcHBseSkge1xuICAgICAgICB0aGlzLnNjb3BlW2tleV0gPSBkYXRhO1xuICAgICAgICBpZiAoYXBwbHkpIHRoaXMuYXBwbHkoKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2NvcGU7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiDQo9C00LDQu9C40YLRjCDQtNCw0L3QvdGL0LVcbiAgICAgKiBAcGFyYW0ga2V5XG4gICAgICogQHBhcmFtIGFwcGx5XG4gICAgICovXG4gICAgcmVtb3ZlRGF0YTogZnVuY3Rpb24gKGtleSwgYXBwbHkpIHtcbiAgICAgICAgZGVsZXRlIHRoaXMuc2NvcGVba2V5XTtcbiAgICAgICAgaWYgKGFwcGx5KSB0aGlzLmFwcGx5KCk7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiDQn9GA0LjQvNC10L3Rj9C10Lwg0LTQu9GPIERPTVxuICAgICAqL1xuICAgIGFwcGx5OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX19zZXRTY29wZURPTSgpO1xuICAgICAgICB0aGlzLl9fYXBwbHlSZXBlYXQoKTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqINCe0LHQvdC+0LLQuNGC0YwgRE9NXG4gICAgICovXG4gICAgdXBkYXRlRG9tSW5pdDogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9fdXBkYXRlRE9NKCk7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiDQlNC+0LHQsNCy0LjRgtGMINC+0LTQuNC9INC00YPQvCDRjdC70LXQvNC10L3RgiDQsiDQvtGC0YHQu9C10LbQuNCy0LDQvdC40LVcbiAgICAgKiBAcGFyYW0gYWRkZWRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9fYWRkSXRlbURPTU9ic2VydmVyOiBmdW5jdGlvbiAoYWRkZWQpIHtcbiAgICAgICAgaWYgKCFzbktuaWZlLmRvbS5pc0VsZW1lbnQoYWRkZWQpIHx8ICFhZGRlZC5nZXRBdHRyaWJ1dGUodGhpcy5zdGdzLmF0dHIpKSByZXR1cm47XG4gICAgICAgIHRoaXMuX19ET00ucHVzaChhZGRlZCk7XG4gICAgICAgIHRoaXMuX19iaW5kSXRlbURPTShhZGRlZCk7XG4gICAgICAgIHRoaXMuZGVib3VuY2VBcHBseSgxMDApO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICog0JTQvtCx0LDQstC40YLRjCBET00g0Y3Qu9C10LzQvdC10L3RgtGLINCyINGB0LvQtdC20LrRg1xuICAgICAqIEBwYXJhbSBhZGRlZFxuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgX19hZGRET01PYnNlcnZlcjogZnVuY3Rpb24gKGFkZGVkKSB7XG4gICAgICAgIGlmIChzbktuaWZlLmRvbS5pc0VsZW1lbnQoYWRkZWQpKSByZXR1cm4gdGhpcy5fX2FkZEl0ZW1ET01PYnNlcnZlcihhZGRlZCk7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYWRkZWQubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBpdGVtID0gYWRkZWRbaV07XG4gICAgICAgICAgICB0aGlzLl9fYWRkSXRlbURPTU9ic2VydmVyKGl0ZW0pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiDQo9C00LDQu9GP0LXQvCDQu9C40YjQvdC40LkgRE9NINC10LvQtdC80LXQvdGCXG4gICAgICogQHBhcmFtIHJlbW92ZWRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9fcmVtb3ZlSXRlbURPTU9ic2VydmVyOiBmdW5jdGlvbiAocmVtb3ZlZCkge1xuICAgICAgICBpZiAoIXNuS25pZmUuZG9tLmlzRWxlbWVudChyZW1vdmVkKSB8fCAhcmVtb3ZlZC5nZXRBdHRyaWJ1dGUodGhpcy5zdGdzLmF0dHIpKSByZXR1cm47XG4gICAgICAgIHRoaXMuX19ET00uc3BsaWNlKHRoaXMuX19ET00uaW5kZXhPZihyZW1vdmVkKSwgMSk7XG4gICAgICAgIHRoaXMuZGVib3VuY2VBcHBseSgxMDApO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICog0KPQtNCw0LvRj9C10Lwg0LvQuNGI0L3QuNC1INGN0LvQtdC80LXQvdGC0YsgRE9NXG4gICAgICogQHBhcmFtIHJlbW92ZWRcbiAgICAgKiBAcmV0dXJucyB7Kn1cbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9fcmVtb3ZlRE9NOiBmdW5jdGlvbiAocmVtb3ZlZCkge1xuICAgICAgICBpZiAoc25LbmlmZS5kb20uaXNFbGVtZW50KHJlbW92ZWQpKSByZXR1cm4gdGhpcy5fX3JlbW92ZUl0ZW1ET01PYnNlcnZlcihyZW1vdmVkKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCByZW1vdmVkLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgaXRlbSA9IHJlbW92ZWRbaV07XG4gICAgICAgICAgICB0aGlzLl9fcmVtb3ZlSXRlbURPTU9ic2VydmVyKGl0ZW0pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiDQktC60LvRjtGH0LDQtdC8INC90LDQsdC70Y7QtNC10L3QuNC1INC30LAgRE9NXG4gICAgICogQHBhcmFtIERPTUVsZW1lbnRcbiAgICAgKiBAcHJpdmF0ZVxuICAgICAqL1xuICAgIF9fb2JzZXJ2ZXJDcmVhdGU6IGZ1bmN0aW9uIChET01FbGVtZW50KSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdGhpcy5fX29ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoZnVuY3Rpb24gKG11dGF0aW9ucykge1xuICAgICAgICAgICAgbXV0YXRpb25zLmZvckVhY2goZnVuY3Rpb24gKG11dGF0aW9uKSB7XG4vLyAgICAgICAgICAgICAgICBpZiAobXV0YXRpb24uYWRkZWROb2RlcyAmJiBtdXRhdGlvbi5hZGRlZE5vZGVzLmxlbmd0aCkgc2VsZi5fX2FkZERPTU9ic2VydmVyKG11dGF0aW9uLmFkZGVkTm9kZXMpO1xuLy8gICAgICAgICAgICAgICAgaWYgKG11dGF0aW9uLnJlbW92ZWROb2RlcyAmJiBtdXRhdGlvbi5yZW1vdmVkTm9kZXMubGVuZ3RoKSBzZWxmLl9fcmVtb3ZlRE9NKG11dGF0aW9uLnJlbW92ZWROb2Rlcyk7XG4gICAgICAgICAgICAgICAgaWYgKChtdXRhdGlvbi5hZGRlZE5vZGVzICYmIG11dGF0aW9uLmFkZGVkTm9kZXMubGVuZ3RoKVxuICAgICAgICAgICAgICAgICAgICB8fCAobXV0YXRpb24ucmVtb3ZlZE5vZGVzICYmIG11dGF0aW9uLnJlbW92ZWROb2Rlcy5sZW5ndGgpKSB7XG4gICAgICAgICAgICAgICAgICAgIHNlbGYuZGVib3VuY2VVcGRhdGUoMTIwKTtcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5kZWJvdW5jZUFwcGx5KDEyMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLl9fb2JzZXJ2ZXIub2JzZXJ2ZShET01FbGVtZW50LFxuICAgICAgICAgICAgeyBhdHRyaWJ1dGVzOiB0cnVlLCBjaGlsZExpc3Q6IHRydWUsIGNoYXJhY3RlckRhdGE6IHRydWUgfVxuICAgICAgICApO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICog0JLRi9C60LvRjtGH0LDQtdC8INC90LDQsdC70Y7QtNC10L3QuNC1INC30LAgRE9NXG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBfX29ic2VydmVyRGVzdHJveTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9fb2JzZXJ2ZXIuZGlzY29ubmVjdCgpO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICog0J/RgNC40LzQtdC90LjRgtGMINC40LfQvNC10L3QtdC90LjRjyDRgSDQt9Cw0LTQtdGA0LbQutC+0LlcbiAgICAgKiBAcGFyYW0gdGltZVxuICAgICAqL1xuICAgIGRlYm91bmNlQXBwbHk6IGZ1bmN0aW9uICh0aW1lKSB7XG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdmFyIGRlYm91bmNlQXBwbHkgPSBzbktuaWZlLmRhdGEuZGVib3VuY2UoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgc2VsZi5hcHBseSgpO1xuICAgICAgICB9LCB0aW1lKTtcbiAgICAgICAgZGVib3VuY2VBcHBseSgpO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICog0J7QsdC90L7QstC40YLRjCAocmUgaW50KSDRgSDQt9Cw0LTQtdGA0LbQutC+0LlcbiAgICAgKiBAcGFyYW0gdGltZVxuICAgICAqL1xuICAgIGRlYm91bmNlVXBkYXRlOiBmdW5jdGlvbiAodGltZSkge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHZhciBkZWJvdW5jZVVwZGF0ZSA9IHNuS25pZmUuZGF0YS5kZWJvdW5jZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBzZWxmLl9fdXBkYXRlRE9NKCk7XG4gICAgICAgIH0sIHRpbWUpO1xuICAgICAgICBkZWJvdW5jZVVwZGF0ZSgpO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICog0J/QvtC70YPRh9C40YLRjCDRgdC/0LjRgdC+0Log0LfQsNCz0YDRg9C20LXQvdC90YvRhSDQvNC+0LTRg9C70LXQuVxuICAgICAqIEByZXR1cm5zIHtBcnJheXwqfVxuICAgICAqL1xuICAgIGdldExpc3RNb2R1bGVzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBtb2R1bGVzID0gW107XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5fX2xvYWRlZExpc3RNb2R1bGUubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBtb2R1bGVOYW1lID0gdGhpcy5fX2xvYWRlZExpc3RNb2R1bGVbaV07XG4gICAgICAgICAgICBpZiAodGhpc1ttb2R1bGVOYW1lXSkgbW9kdWxlcy5wdXNoKHRoaXNbbW9kdWxlTmFtZV0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBtb2R1bGVzO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICog0J/QvtC70YPRh9Cw0LXQvCDRgdC/0LjRgdC+0Log0LjQvNC10L0g0LfQsNCz0YDRg9C20LXQvdC90YvRhSDQvNC+0LTRg9C70LXQuVxuICAgICAqIEByZXR1cm5zIHtBcnJheXwqfVxuICAgICAqL1xuICAgIGdldExpc3RNb2R1bGVzTmFtZTogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fX2xvYWRlZExpc3RNb2R1bGU7XG4gICAgfVxufTtcblxuXG5tb2R1bGUuZXhwb3J0cyA9IE1WVk07XG59KS5jYWxsKHRoaXMscmVxdWlyZShcInJIMUpQR1wiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiL2NvcmUvY29yZS5qc1wiLFwiL2NvcmVcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4vKipcbiAqIENyZWF0ZWQgYnkgc25hdHZiIG9uIDA0LjA2LjE2LlxuICovXG5cbnZhciBzbktuaWZlID0gcmVxdWlyZSgnLi4vc25LbmlmZS9pbmRleCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChucykge1xuXG4gICAgaWYgKCFucykgcmV0dXJuIGNvbnNvbGUud2FybignTVZWTSBub3QgZm91bmQnKTtcblxuICAgIC8qKlxuICAgICAqINCg0LDRgdGI0LjRgNC40YLQtdC70YzQvdGL0Lkg0LzQvtC00YPQu9GMINC30LDQs9GA0YPQt9C60Lgg0YHRgtC+0YDQvtC90L3QuNGFINC80L7QtNGD0LvQtdC5XG4gICAgICogQHR5cGUge09iamVjdHxGdW5jdGlvbnwqfVxuICAgICAqL1xuXG4gICAgdmFyIG5zcCA9IG5zLnByb3RvdHlwZTtcbiAgICAvKipcbiAgICAgKiDQl9Cw0LPRgNGD0LfQutCwINC80L7QtNGD0LvQtdC5XG4gICAgICogQHJldHVybnMge0FycmF5fVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgbnNwLl9fbG9hZGVyTW9kdWxlcyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8vIDxyZWZlcmVuY2UgcGF0aD1cIi4vY29yZS5qc1wiLz5cbiAgICAgICAgdmFyIGRlZmF1bHRNb2R1bGVzTG9hZGVkID0gdGhpcy5fX2xvYWRlck1vZHVsZXNBcnIodGhpcy5ERUZBVUxUX01PRFVMRSk7XG4gICAgICAgIHZhciB1c2VyTW9kdWxlc0xvYWRlZCA9IHRoaXMuX19sb2FkZXJNb2R1bGVzQXJyKHRoaXMuVVNFUl9NT0RVTEUpO1xuXG4gICAgICAgIHJldHVybiBkZWZhdWx0TW9kdWxlc0xvYWRlZC5jb25jYXQodXNlck1vZHVsZXNMb2FkZWQpO1xuICAgIH07XG4gICAgbnNwLl9fbG9hZGVyTW9kdWxlc0FyciA9IGZ1bmN0aW9uIChtb2R1bGVzKSB7XG4gICAgICAgIHZhciBsb2FkZWRNb2R1bGVzID0gW107XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbW9kdWxlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIG1vZHVsZSA9IG1vZHVsZXNbaV07XG4gICAgICAgICAgICB2YXIgbG9hZE1vZHVsZSA9IHRoaXMuX19sb2FkTW9kdWxlKG1vZHVsZSk7XG4gICAgICAgICAgICBpZiAobG9hZE1vZHVsZSkgbG9hZGVkTW9kdWxlcy5wdXNoKGxvYWRNb2R1bGUuY2xhc3NOYW1lKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbG9hZGVkTW9kdWxlcztcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICog0JXRgdGC0Ywg0LvQuCDRgtCw0LrQvtC5INC80L7QtNGD0LvRjFxuICAgICAqIEBwYXJhbSBtb2R1bGVOYW1lXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBuc3AuX19tb2R1bGVFeGlzdCA9IGZ1bmN0aW9uIChtb2R1bGVOYW1lKSB7XG4gICAgICAgIHJldHVybiB0eXBlb2YgdGhpc1ttb2R1bGVOYW1lXSAhPSAndW5kZWZpbmVkJztcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICog0JfQsNCz0YDRg9C30LrQsCDQvtC00L3QvtCz0L4g0LzQvtC00YPQu9GPXG4gICAgICogQHBhcmFtIG1vZHVsZVxuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgbnNwLl9fbG9hZE1vZHVsZSA9IGZ1bmN0aW9uIChtb2R1bGUpIHtcbiAgICAgICAgdmFyIG5ld01vZHVsZSA9IG5ldyBtb2R1bGUodGhpcyk7XG4gICAgICAgIGlmIChuZXdNb2R1bGUuY2xhc3NOYW1lKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5fX21vZHVsZUV4aXN0KG5ld01vZHVsZS5jbGFzc05hbWUpICYmIHRoaXMuc3Rncy5yZXBsYWNlTW9kdWxlKSB7XG4gICAgICAgICAgICAgICAgaWYodGhpcy5zdGdzLnJlcGxhY2VNb2R1bGVNc2cpXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignTW9kdWxlIFwiJyArIG5ld01vZHVsZS5jbGFzc05hbWUgKyAnXCIgZXhpc3QsIGl0IHdpbGwgYmUgcmVwbGFjZWQnKTtcbiAgICAgICAgICAgICAgICB0aGlzW25ld01vZHVsZS5jbGFzc05hbWVdID0gbmV3TW9kdWxlO1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXdNb2R1bGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIXRoaXMuX19tb2R1bGVFeGlzdChuZXdNb2R1bGUuY2xhc3NOYW1lKSkge1xuICAgICAgICAgICAgICAgIHRoaXNbbmV3TW9kdWxlLmNsYXNzTmFtZV0gPSBuZXdNb2R1bGU7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ld01vZHVsZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcblxuICAgIHJldHVybiBucztcbn07XG59KS5jYWxsKHRoaXMscmVxdWlyZShcInJIMUpQR1wiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiL2NvcmUvbG9hZGVyLmpzXCIsXCIvY29yZVwiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbi8qKlxuICogQ3JlYXRlZCBieSBzbmF0dmIgb24gMDQuMDYuMTYuXG4gKi9cblxuXG52YXIgdGVzdE1vZHVsZSA9IGZ1bmN0aW9uIChjb3JlKSB7XG4gICAgdGhpcy5jbGFzc05hbWUgPSAndGVzdE1vZHVsZSc7XG4gICAgdGhpcy5jb3JlID0gY29yZTtcbiAgICB0aGlzLmluaXQoKTtcbn07XG5cbnRlc3RNb2R1bGUucHJvdG90eXBlID0ge1xuICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcbi8vICAgICAgICBjb25zb2xlLmxvZyh0aGlzLmNsYXNzTmFtZSArICcgaXMgbG9hZGVkLicpO1xuICAgIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gdGVzdE1vZHVsZTtcbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwickgxSlBHXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvY29yZS9tb2R1bGUvdGVzdC5qc1wiLFwiL2NvcmUvbW9kdWxlXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuLyoqXG4gKiBDcmVhdGVkIGJ5IHNuYXR2YiBvbiAwNC4wNi4xNi5cbiAqL1xuXG52YXIgVmVyc2lvbiA9IGZ1bmN0aW9uIChjb3JlKSB7XG4gICAgdGhpcy5jb3JlID0gY29yZTtcbiAgICB0aGlzLmNsYXNzTmFtZSA9ICd2ZXJzaW9uJztcbiAgICB0aGlzLmluaXQoKTtcbn07XG5cblZlcnNpb24ucHJvdG90eXBlID0ge1xuICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5tYWpvciA9IDA7XG4gICAgICAgIHRoaXMubWlub3IgPSAyO1xuICAgICAgICB0aGlzLmRvdCA9IDE7XG4gICAgICAgIHRoaXMuYnVpbGQgPSAnYWxwaGEnO1xuICAgIH0sXG4gICAgZ2V0V2l0aG91dEJ1aWxkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBbdGhpcy5tYWpvciwgdGhpcy5taW5vciwgdGhpcy5kb3RdLmpvaW4oJy4nKTtcbiAgICB9LFxuICAgIGdldEZ1bGw6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZ2V0V2l0aG91dEJ1aWxkKCkgKyAnICcgKyB0aGlzLmJ1aWxkO1xuICAgIH0sXG4gICAgZ2V0T2JqZWN0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBmdWxsOiB0aGlzLmdldEZ1bGwoKSxcbiAgICAgICAgICAgIHdpdGhvdXRCdWlsZDogdGhpcy5nZXRXaXRob3V0QnVpbGQoKSxcbiAgICAgICAgICAgIG1ham9yOiB0aGlzLm1ham9yLFxuICAgICAgICAgICAgbWlub3I6IHRoaXMubWlub3IsXG4gICAgICAgICAgICBkb3Q6IHRoaXMuZG90LFxuICAgICAgICAgICAgYnVpbGQ6IHRoaXMuYnVpbGRcbiAgICAgICAgfTtcbiAgICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFZlcnNpb247XG59KS5jYWxsKHRoaXMscmVxdWlyZShcInJIMUpQR1wiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiL2NvcmUvbW9kdWxlL3ZlcnNpb24uanNcIixcIi9jb3JlL21vZHVsZVwiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbi8qKlxuICog0KDQsNGB0YjQuNGA0LjRgtC10LvRjNC90YvQuSDQvNC+0LTRg9C70Ywgc24tcmVwZWF0XG4gKiBDcmVhdGVkIGJ5IHNuYXR2YiBvbiAwNS4wNi4xNi5cbiAqL1xuXG52YXIgc25LbmlmZSA9IHJlcXVpcmUoJy4uL3NuS25pZmUvaW5kZXgnKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAobnMpIHtcblxuICAgIGlmICghbnMpIHJldHVybiBjb25zb2xlLndhcm4oJ01WVk0gbm90IGZvdW5kJyk7XG5cbiAgICB2YXIgbnNwID0gbnMucHJvdG90eXBlO1xuXG4gICAgLyoqXG4gICAgICog0JjQvdC40YbQuNCw0LvQuNC30LDRhtC40Y8gc24tcmVwZWF0XG4gICAgICogQHByaXZhdGVcbiAgICAgKi9cbiAgICBuc3AuX19pbml0UmVwZWF0ID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9fUkVQRUFUX0RPTSA9IHRoaXMuX19nZXRSZXBlYXRET00oKTtcbiAgICAgICAgdGhpcy5fX2N1dFJlcGVhdCgpO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiDQn9C+0LvRg9GH0LDQtdC8IEhUTUxFTEVNRU5URE9NIHNuLXJlcGVhdFxuICAgICAqIEBwcml2YXRlXG4gICAgICovXG4gICAgbnNwLl9fZ2V0UmVwZWF0RE9NID0gZnVuY3Rpb24gKGVsZW1lbnRzLCB3aGVuKSB7XG4gICAgICAgIHdoZW4gPSB3aGVuIHx8IGRvY3VtZW50O1xuICAgICAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgICAgIGVsZW1lbnRzID0gZWxlbWVudHMgfHwgd2hlbi5nZXRFbGVtZW50c0J5VGFnTmFtZSgnKicpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGVsZW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgZWxlbWVudCA9IGVsZW1lbnRzW2ldO1xuICAgICAgICAgICAgaWYgKGVsZW1lbnQuZ2V0QXR0cmlidXRlKHRoaXMuc3Rncy5hdHRyUmVwZWF0KSkge1xuICAgICAgICAgICAgICAgIHZhciBwYXJlbnRSZXBlYXQgPSBzbktuaWZlLmRvbS5wYXJlbnRCeUF0dHIoZWxlbWVudCwgdGhpcy5zdGdzLmF0dHJSZXBlYXQpO1xuICAgICAgICAgICAgICAgIGlmIChwYXJlbnRSZXBlYXQpIHtcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5wYXJlbnRSZXBlYXQgPSBwYXJlbnRSZXBlYXQ7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwYXJlbnRSZXBlYXQuY2hpbGRSZXBlYXQpIHBhcmVudFJlcGVhdC5jaGlsZFJlcGVhdC5wdXNoKGVsZW1lbnQpO1xuICAgICAgICAgICAgICAgICAgICBlbHNlIHBhcmVudFJlcGVhdC5jaGlsZFJlcGVhdCA9IFtlbGVtZW50XTtcbiAgICAgICAgICAgICAgICB9XG4vLyAgICAgICAgICAgICAgICBlbGVtZW50LmNoaWVsZFJlcGVhdCA9IHNuS25pZmUuZG9tLmNoaWVsZEJ5QXR0cihlbGVtZW50LCB0aGlzLnN0Z3MuYXR0clJlcGVhdCk7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnB1c2goZWxlbWVudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9O1xuXG4gICAgbnNwLl9fY3V0UmVwZWF0ID0gZnVuY3Rpb24gKFJFUEVBVF9ET00pIHtcbiAgICAgICAgUkVQRUFUX0RPTSA9IFJFUEVBVF9ET00gfHwgdGhpcy5fX1JFUEVBVF9ET007XG4gICAgICAgIGZvciAodmFyIGkgPSBSRVBFQVRfRE9NLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgICAgICB2YXIgcmVwZWF0SXRlbSA9IFJFUEVBVF9ET01baV07XG4gICAgICAgICAgICByZXBlYXRJdGVtLmh0bWxJbm5lciA9IHJlcGVhdEl0ZW0uaW5uZXJIVE1MO1xuLy8gICAgICAgICAgICByZXBlYXRJdGVtLmlubmVySFRNTCA9ICcgJztcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBuc3AuX19nZXRDaGlsZFJlcGVhdCA9IGZ1bmN0aW9uIChkb20sIGl0ZW0pIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBkb20ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciByZXBlYXRJdGVtID0gZG9tW2ldO1xuICAgICAgICAgICAgaWYgKCFyZXBlYXRJdGVtLm91dGVySFRNTCB8fCAhaXRlbS5vdXRlckhUTUwpIGNvbnRpbnVlO1xuICAgICAgICAgICAgaWYgKGl0ZW0ub3V0ZXJIVE1MID09IHJlcGVhdEl0ZW0ub3V0ZXJIVE1MKSByZXR1cm4gcmVwZWF0SXRlbTtcbiAgICAgICAgfVxuICAgIH07XG5cblxuICAgIG5zcC5fX2FwcGx5UmVwZWF0ID0gZnVuY3Rpb24gKFJFUEVBVF9ET00sIHNjb3BlKSB7XG4gICAgICAgIFJFUEVBVF9ET00gPSBSRVBFQVRfRE9NIHx8IHRoaXMuX19SRVBFQVRfRE9NO1xuICAgICAgICBzY29wZSA9IHNjb3BlIHx8IHRoaXMuc2NvcGU7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgUkVQRUFUX0RPTS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIHJlcGVhdEl0ZW0gPSBSRVBFQVRfRE9NW2ldO1xuICAgICAgICAgICAgaWYgKFJFUEVBVF9ET00gPT0gdGhpcy5fX1JFUEVBVF9ET00gJiYgcmVwZWF0SXRlbS5wYXJlbnRSZXBlYXQpIGNvbnRpbnVlO1xuICAgICAgICAgICAgdmFyIGRvbUNyZWF0ZWRGcm9tSHRtbCA9IHNuS25pZmUuZG9tLmNyZWF0ZUVsZW1lbnRBcnJheShyZXBlYXRJdGVtLmh0bWxJbm5lcik7XG4gICAgICAgICAgICB2YXIgZGF0YSA9IHJlcGVhdEl0ZW0uZ2V0QXR0cmlidXRlKHRoaXMuc3Rncy5hdHRyUmVwZWF0KTtcbiAgICAgICAgICAgIGRhdGEgPSBkYXRhLnNwbGl0KCcgaW4gJyk7XG4gICAgICAgICAgICBpZiAoZGF0YS5sZW5ndGggIT0gMikgcmV0dXJuO1xuICAgICAgICAgICAgdmFyIGRhdGFTY29wZSA9IHRoaXMuZ2V0RGF0YShkYXRhWzFdLCBzY29wZSk7XG4gICAgICAgICAgICByZXBlYXRJdGVtLmlubmVySFRNTCA9IHRoaXMuX19yZW5kZXJSZXBlYXQoZG9tQ3JlYXRlZEZyb21IdG1sLCBkYXRhU2NvcGUsIGRhdGEsIHJlcGVhdEl0ZW0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBSRVBFQVRfRE9NO1xuICAgIH07XG5cbiAgICBuc3AuX19yZW5kZXJSZXBlYXQgPSBmdW5jdGlvbiAoZWxlbWVudCwgc2NvcGUsIGRhdGEsIHJlcGVhdEl0ZW0pIHtcbiAgICAgICAgdmFyIHRleHRJbm5lciA9ICcnO1xuICAgICAgICBpZiAoIXNjb3BlKSByZXR1cm4gdGV4dElubmVyO1xuICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IHNjb3BlLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICB2YXIgaXRlbVNjb3BlID0gc2NvcGVbal07XG4gICAgICAgICAgICB2YXIgbmV3U2NvcGUgPSB7fTtcbiAgICAgICAgICAgIG5ld1Njb3BlW2RhdGFbMF1dID0gaXRlbVNjb3BlO1xuICAgICAgICAgICAgdmFyIHJkeURPTSA9IHRoaXMuX19zZXRTY29wZURPTShlbGVtZW50LCBuZXdTY29wZSk7XG4gICAgICAgICAgICByZHlET00gPSB0aGlzLl9faW5zZXJ0ZWRSZXBlYXQocmR5RE9NLCBuZXdTY29wZSwgZGF0YSwgcmVwZWF0SXRlbSk7XG4gICAgICAgICAgICB0ZXh0SW5uZXIgKz0gc25LbmlmZS5kb20uZ2V0VGV4dEZyb21IdG1sKHJkeURPTSk7XG4vLyAgICAgICAgICAgIGNvbnNvbGUubG9nKHRleHRJbm5lcik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRleHRJbm5lcjtcbiAgICB9O1xuXG4gICAgbnNwLl9faW5zZXJ0ZWRSZXBlYXQgPSBmdW5jdGlvbiAocmR5RE9NLCBzY29wZSwgZGF0YSwgcmVwZWF0SXRlbSkge1xuICAgICAgICBpZiAocmVwZWF0SXRlbS5jaGlsZFJlcGVhdCkge1xuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCByZXBlYXRJdGVtLmNoaWxkUmVwZWF0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgdmFyIHJlcGVhdEVsZW1lbnQgPSByZXBlYXRJdGVtLmNoaWxkUmVwZWF0W2ldO1xuICAgICAgICAgICAgICAgIHZhciBjbG9uZVJlcGVhdEVsZW1lbnQgPSByZXBlYXRFbGVtZW50LmNsb25lTm9kZSgpO1xuICAgICAgICAgICAgICAgIGNsb25lUmVwZWF0RWxlbWVudC5pbm5lckhUTUwgPSAnJztcbiAgICAgICAgICAgICAgICB2YXIgY2hpbGQgPSB0aGlzLl9fZ2V0Q2hpbGRSZXBlYXQocmR5RE9NLCBjbG9uZVJlcGVhdEVsZW1lbnQpO1xuICAgICAgICAgICAgICAgIGlmICghY2hpbGQpIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIGNoaWxkLmlubmVySFRNTCA9IHNuS25pZmUuZG9tLmdldFRleHRGcm9tSHRtbCh0aGlzLl9fYXBwbHlSZXBlYXQoW3JlcGVhdEVsZW1lbnRdLCBzY29wZSksICdpbm5lcicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZHlET007XG4gICAgfTtcblxuICAgIHJldHVybiBucztcbn07XG59KS5jYWxsKHRoaXMscmVxdWlyZShcInJIMUpQR1wiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiL2NvcmUvcmVwZWF0LmpzXCIsXCIvY29yZVwiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbi8qKlxuICogQ3JlYXRlZCBieSBzbmF0dmIgb24gMzEuMDUuMTYuXG4gKi9cblxuLyoqXG4gKiDQoNCw0YHRiNC40YDQuNGC0LXQu9GM0L3Ri9C5INC80L7QtNGD0LvRjCDQtNC70Y8gTVZWTSAtIHNhdmUgc2NvcGVcbiAqIENyZWF0ZWQgYnkgc25hdHZiIG9uIDI4LjA1LjE2LlxuICovXG5cbnZhciBzbktuaWZlID0gcmVxdWlyZSgnLi4vc25LbmlmZS9pbmRleCcpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChucykge1xuICAgIC8qKlxuICAgICAqINCh0L7Qt9C00LDQuyDQtNC70Y8g0LrQu9C+0L3QuNGA0L7QstCw0L3QuNGPINC+0LHRitC10LrRgtC+0LIg0Lgg0LzQsNGB0YHQuNCy0L7QslxuICAgICAqIEBwYXJhbSBvYmplY3RpdmVcbiAgICAgKiBAcmV0dXJucyB7Kn1cbiAgICAgKi9cbiAgICB2YXIgY29weSA9IHNuS25pZmUuZGF0YS5jbG9uZTtcblxuICAgIGlmICghbnMpIHJldHVybiBjb25zb2xlLndhcm4oJ01WVk0gbm90IGZvdW5kJyk7XG5cbiAgICAvKipcbiAgICAgKiDQnNCe0JTQo9Cb0Kwg0KHQntCl0KDQkNCd0JXQndCY0K8gU0NPUEVcbiAgICAgKi9cblxuICAgIG5zLnByb3RvdHlwZS5zYXZlU2NvcGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9fc2F2ZVNjb3BlKCk7XG4gICAgfTtcblxuICAgIG5zLnByb3RvdHlwZS5fX3NhdmVTY29wZSA9IGZ1bmN0aW9uICh1cGRhdGUpIHtcbiAgICAgICAgaWYgICh0eXBlb2YgdGhpc1snc2NvcGUnXSA9PSAndW5kZWZpbmVkJykgcmV0dXJuO1xuICAgICAgICBpZiAodGhpcy5fX1NBVkVfXyAmJiAhdXBkYXRlKSByZXR1cm47XG4gICAgICAgIHRoaXMuX19TQVZFX18gPSBjb3B5KHRoaXNbJ3Njb3BlJ10pOyAvLyDQutC+0L/QuNGA0YPQtdC8INC+0LHRitC10LrRglxuICAgICAgICByZXR1cm4gdGhpcy5fX1NBVkVfXztcbiAgICB9O1xuXG4gICAgbnMucHJvdG90eXBlLnVwZGF0ZVNhdmVTY29wZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgICh0eXBlb2YgdGhpc1snX19TQVZFX18nXSA9PSAndW5kZWZpbmVkJykgcmV0dXJuO1xuICAgICAgICByZXR1cm4gdGhpcy5fX3NhdmVTY29wZSh0cnVlKTtcbiAgICB9O1xuXG4gICAgbnMucHJvdG90eXBlLnJlbW92ZVNhdmVTY29wZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgICh0eXBlb2YgdGhpc1snX19TQVZFX18nXSA9PSAndW5kZWZpbmVkJykgcmV0dXJuO1xuICAgICAgICBkZWxldGUgdGhpc1snX19TQVZFX18nXTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcblxuICAgIG5zLnByb3RvdHlwZS5nZXRTYXZlU2NvcGUgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9fU0FWRV9fO1xuICAgIH07XG5cbiAgICAvKipcbiAgICAgKiDQodCx0YDQsNGB0YvQstCw0LXQvCDRgdC+0YXRgNCw0L3QtdC90LjQtVxuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqL1xuICAgIG5zLnByb3RvdHlwZS5yZXNldFNhdmVTY29wZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgICh0eXBlb2YgdGhpc1snX19TQVZFX18nXSA9PSAndW5kZWZpbmVkJykgcmV0dXJuO1xuICAgICAgICB0aGlzLnNjb3BlID0gY29weSh0aGlzLl9fU0FWRV9fKTtcbiAgICAgICAgdGhpcy5yZW1vdmVTYXZlU2NvcGUoKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuc2NvcGU7XG4gICAgfTtcbiAgICByZXR1cm4gbnM7XG59O1xufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJySDFKUEdcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi9jb3JlL3NhdmUuanNcIixcIi9jb3JlXCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuLyoqXG4gKiDQlNC+0LHQsNCy0LvRj9C10LwgRXZlbnRzXG4gKi9cbnZhciBzbkV2ZW50cyA9IHJlcXVpcmUoJy4vc25LbmlmZS9pbmRleCcpLmV2ZW50cztcbndpbmRvdy5zbkV2ZW50cyA9IG5ldyBzbkV2ZW50cztcbi8qKlxuICogRW5kIEV2ZW50c1xuICovXG5cbi8qKlxuICog0KHQsdC+0YDQutCwINGP0LTRgNCwXG4gKiBAdHlwZSB7TVZWTXxleHBvcnRzfG1vZHVsZS5leHBvcnRzfVxuICovXG52YXIgc25NVlZNID0gd2luZG93LnNuTVZWTSA9IHJlcXVpcmUoJy4vY29yZS9jb3JlJyk7XG5yZXF1aXJlKCcuL2NvcmUvcmVwZWF0Jykoc25NVlZNKTtcbnJlcXVpcmUoJy4vY29yZS9zYXZlJykoc25NVlZNKTtcbnJlcXVpcmUoJy4vY29yZS9sb2FkZXInKShzbk1WVk0pO1xuLyoqXG4gKiBFbmQgQnVpbGRcbiAqL1xuXG4oZnVuY3Rpb24gKCkge1xuICAgIHZhciBtdnZtID0gbmV3IHNuTVZWTSh7XG4gICAgICAgIG5hbWU6ICdzbmF0dmInLFxuICAgICAgICBwaG9uZTogJys3ICg4MDApIDAwMCAwMCAwMCcsXG4gICAgICAgIHRlc3REYXRhOiB7dGVzdGVyOiB7bmFtZTogJ2tpbGxhcngnfX0sXG4gICAgICAgIGRhdGE6IFtcbiAgICAgICAgICAgIHtuYW1lOiAndGVzdGVyJywgYXJyYTogWzEsNCw2XX0sXG4gICAgICAgICAgICB7bmFtZTogJ3NuYXR2YicsIGFycmE6IFsxLDQsNl19LFxuICAgICAgICAgICAge25hbWU6ICdraWxsYXJ4JywgYXJyYTogWzEsNCw2XX1cbiAgICAgICAgXVxuICAgIH0pO1xuXG4gICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgIG12dm0uc2V0RGF0YSgnZGF0YScsIFt7bmFtZTogJ3NuYXR2YicsIGFycmE6IFsyMyw0MjMsNTJdfV0sIHRydWUpO1xuICAgIH0sMTAwMCk7XG5cbiAgICBjb25zb2xlLmxvZyhtdnZtLnZlcnNpb24uZ2V0RnVsbCgpKTtcbn0pKCk7XG59KS5jYWxsKHRoaXMscmVxdWlyZShcInJIMUpQR1wiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiL2Zha2VfY2FkYjllZDguanNcIixcIi9cIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG4vKipcbiAqIENyZWF0ZWQgYnkgc25hdHZiIG9uIDMxLjA1LjE2LlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIC8qKlxuICAgICAqINCa0LvQvtC90LjRgNC+0LLQsNC90LjQtSDQvtCx0YrQtdC60YLQsFxuICAgICAqIEBwYXJhbSBvYmplY3RpdmVcbiAgICAgKiBAcmV0dXJucyB7Kn1cbiAgICAgKi9cbiAgICBjbG9uZTogZnVuY3Rpb24gKG9iamVjdGl2ZSkge1xuICAgICAgICBpZiAob2JqZWN0aXZlIGluc3RhbmNlb2YgQXJyYXkpIHJldHVybiBvYmplY3RpdmUuc2xpY2UoMCk7XG4gICAgICAgIGlmICh0eXBlb2Ygb2JqZWN0aXZlICE9ICdvYmplY3QnKSByZXR1cm47XG4gICAgICAgIHZhciBzdWJqZWN0ID0ge307XG4gICAgICAgIGZvciAodmFyIGtleSBpbiBvYmplY3RpdmUpIHtcbiAgICAgICAgICAgIGlmICghb2JqZWN0aXZlLmhhc093blByb3BlcnR5KGtleSkpIGNvbnRpbnVlO1xuICAgICAgICAgICAgaWYodHlwZW9mIG9iamVjdGl2ZVtrZXldID09ICdvYmplY3QnKSBzdWJqZWN0W2tleV0gPSB0aGlzLmNsb25lKG9iamVjdGl2ZVtrZXldKTsgLy8g0LXRgdC70Lgg0L7QsdGK0LXQutGCINGC0L4g0LrQu9C+0L3QuNGA0YPQtdC8XG4gICAgICAgICAgICBlbHNlIGlmICh0eXBlb2Ygb2JqZWN0aXZlW2tleV0gPT0gJ2FycmF5Jykgc3ViamVjdFtrZXldID0gb2JqZWN0aXZlW2tleV0uc2xpY2UoMCk7IC8vINC10YHQu9C4INC80LDRgdGB0LjQsiwg0YLQviDQutC70L7QvdC40YDRg9C10LxcbiAgICAgICAgICAgIGVsc2Ugc3ViamVjdFtrZXldID0gb2JqZWN0aXZlW2tleV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN1YmplY3Q7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiDQktGL0L/QvtC70L3QtdC90LjQtSDRhNGD0L3QutGG0LjQuSDRgSDQt9Cw0LTQtdGA0LbQutC+0LlcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tcbiAgICAgKiBAcGFyYW0gd2FpdFxuICAgICAqIEBwYXJhbSBpbW1lZGlhdGVcbiAgICAgKiBAcmV0dXJucyB7RnVuY3Rpb259XG4gICAgICovXG4gICAgZGVib3VuY2U6IGZ1bmN0aW9uIChjYWxsYmFjaywgd2FpdCwgaW1tZWRpYXRlKSB7XG4gICAgICAgIHZhciB0aW1lb3V0O1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgY29udGV4dCA9IHRoaXMsIGFyZ3MgPSBhcmd1bWVudHM7XG4gICAgICAgICAgICB2YXIgbGF0ZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB0aW1lb3V0ID0gbnVsbDtcbiAgICAgICAgICAgICAgICBpZiAoIWltbWVkaWF0ZSkgY2FsbGJhY2suYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdmFyIGNhbGxOb3cgPSBpbW1lZGlhdGUgJiYgIXRpbWVvdXQ7XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG4gICAgICAgICAgICB0aW1lb3V0ID0gc2V0VGltZW91dChsYXRlciwgd2FpdCk7XG4gICAgICAgICAgICBpZiAoY2FsbE5vdykgY2FsbGJhY2suYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgICAgIH07XG4gICAgfVxufTtcbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwickgxSlBHXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvc25LbmlmZS9kYXRhLmpzXCIsXCIvc25LbmlmZVwiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbi8qKlxuICogQ3JlYXRlZCBieSBzbmF0dmIgb24gMzEuMDUuMTYuXG4gKi9cblxuXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIERJVjogZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKSxcbiAgICAvKipcbiAgICAgKiDQodC+0LfQtNCw0YLRjCDRgdC+0LHRi9GC0LjQtVxuICAgICAqIEBwYXJhbSBldmVudFR5cGVcbiAgICAgKiBAcGFyYW0gZWxlbWVudFxuICAgICAqIEBwYXJhbSBmblxuICAgICAqL1xuICAgIGFkZEV2ZW50OiBmdW5jdGlvbiAoZXZlbnRUeXBlLCBlbGVtZW50LCBmbikge1xuICAgICAgICBpZiAoZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKSB7XG4gICAgICAgICAgICBlbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlLCBmbiwgZmFsc2UpO1xuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGVsZW1lbnQuYXR0YWNoRXZlbnQpIHtcbiAgICAgICAgICAgIGVsZW1lbnQuYXR0YWNoRXZlbnQoJ29uJyArIGV2ZW50VHlwZSwgZm4pO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZWxlbWVudFsnb24nICsgZXZlbnRUeXBlXSA9IGZuO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiDQn9GA0L7QstC10YDQuNGC0YwsIEhUTUwgRWxlbWVudCDRjdGC0L4g0LjQu9C4INC90LXRglxuICAgICAqIEBwYXJhbSBvYmpcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBpc0VsZW1lbnQ6IGZ1bmN0aW9uIChvYmopIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJldHVybiBvYmogaW5zdGFuY2VvZiBIVE1MRWxlbWVudDtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZSkge1xuICAgICAgICAgICAgcmV0dXJuICh0eXBlb2Ygb2JqID09PSBcIm9iamVjdFwiKSAmJlxuICAgICAgICAgICAgICAgIChvYmoubm9kZVR5cGUgPT09IDEpICYmICh0eXBlb2Ygb2JqLnN0eWxlID09PSBcIm9iamVjdFwiKSAmJlxuICAgICAgICAgICAgICAgICh0eXBlb2Ygb2JqLm93bmVyRG9jdW1lbnQgPT09IFwib2JqZWN0XCIpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiDQodC+0LfQtNCw0YLRjCBodG1sINGN0LvQtdC80LXQvdGCXG4gICAgICogQHBhcmFtIGh0bWxcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9XG4gICAgICovXG4gICAgY3JlYXRlRWxlbWVudEFycmF5OiBmdW5jdGlvbiAoaHRtbCkge1xuICAgICAgICB2YXIgcmVzID0gW10sIHRtcCwgYWRkO1xuICAgICAgICB0aGlzLkRJVi5pbm5lckhUTUwgPSBodG1sO1xuICAgICAgICB3aGlsZSAodGhpcy5ESVYuZmlyc3RDaGlsZCkge1xuLy8gICAgICAgICAgICBhZGQgPSAhKHRoaXMuRElWLmZpcnN0Q2hpbGQudGFnTmFtZSA9PSB1bmRlZmluZWQgJiYgdGhpcy5ESVYuZmlyc3RDaGlsZC50ZXh0Q29udGVudC50cmltKCkgPT0gJycpO1xuICAgICAgICAgICAgdG1wID0gdGhpcy5ESVYucmVtb3ZlQ2hpbGQodGhpcy5ESVYuZmlyc3RDaGlsZCk7XG4gICAgICAgICAgICByZXMucHVzaCh0bXApO1xuLy8gICAgICAgICAgICBpZiAoYWRkKSByZXMucHVzaCh0bXApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXM7XG4gICAgfSxcbiAgICBjcmVhdGVFbGVtZW50OiBmdW5jdGlvbiAoaHRtbFN0cmluZykge1xuICAgICAgICB0aGlzLkRJVi5pbm5lckhUTUwgPSBodG1sU3RyaW5nLnRyaW0oKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuRElWLmNoaWxkTm9kZXM7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiDQn9C+0LvRg9GH0LjRgtGMINGC0LXRgdC60YIg0LjQtyDQvNCw0YHRgdC40LLQsCBodG1sINC10LvQtdC80LXQvdGC0L7QslxuICAgICAqIEBwYXJhbSBhcnJcbiAgICAgKiBAcGFyYW0gdHlwZVxuICAgICAqIEByZXR1cm5zIHsqfVxuICAgICAqL1xuICAgIGdldFRleHRGcm9tSHRtbDogZnVuY3Rpb24gKGFyciwgdHlwZSkge1xuICAgICAgICB0eXBlID0gdHlwZSB8fCAnb3V0ZXInO1xuICAgICAgICBpZiAoIShhcnIgaW5zdGFuY2VvZiBBcnJheSkpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmlzRWxlbWVudChhcnIpKVxuICAgICAgICAgICAgICAgIHJldHVybiBhcnIub3V0ZXJIZWlnaHQ7XG4gICAgICAgICAgICBlbHNlIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciByZXN1bHRUZXh0ID0gJyc7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgaXRlbUFyciA9IGFycltpXTtcbiAgICAgICAgICAgIGlmICh0eXBlID09ICdvdXRlcicpIHJlc3VsdFRleHQgKz0gaXRlbUFyci5vdXRlckhUTUwgPyBpdGVtQXJyLm91dGVySFRNTCA6IGl0ZW1BcnIudGV4dENvbnRlbnQ7XG4gICAgICAgICAgICBlbHNlIHJlc3VsdFRleHQgKz0gaXRlbUFyci5pbm5lckhUTUwgPyBpdGVtQXJyLmlubmVySFRNTCA6IGl0ZW1BcnIudGV4dENvbnRlbnQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdFRleHQ7XG4gICAgfSxcbiAgICBwYXJlbnRCeUF0dHI6IGZ1bmN0aW9uIChlbGVtZW50LCBhdHRyKSB7XG4gICAgICAgIGlmICghdGhpcy5pc0VsZW1lbnQoKGVsZW1lbnQpKSB8fCB0eXBlb2YgYXR0ciAhPSBcInN0cmluZ1wiKSByZXR1cm47XG4gICAgICAgIHZhciBub3dCbG9jayA9IGVsZW1lbnQ7XG4gICAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgICAgICBub3dCbG9jayA9IG5vd0Jsb2NrLnBhcmVudE5vZGU7XG4gICAgICAgICAgICBpZiAoIW5vd0Jsb2NrIHx8ICF0aGlzLmlzRWxlbWVudChub3dCbG9jaykpIHJldHVybjtcbiAgICAgICAgICAgIGlmIChub3dCbG9jay5nZXRBdHRyaWJ1dGUoYXR0cikpIHJldHVybiBub3dCbG9jaztcbiAgICAgICAgfVxuICAgIH1cbn07XG59KS5jYWxsKHRoaXMscmVxdWlyZShcInJIMUpQR1wiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiL3NuS25pZmUvZG9tLmpzXCIsXCIvc25LbmlmZVwiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbi8qKlxuICogQ3JlYXRlZCBieSBzbmF0dmIgb24gMDQuMDYuMTYuXG4gKi9cblxuLyoqXG4gKiDQodC+0LHRi9GC0LjRj1xuICogQHJldHVybnMgeyp9XG4gKiBAY29uc3RydWN0b3JcbiAqL1xudmFyIEV2ZW50cyA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5pbml0KCk7XG59O1xuXG5FdmVudHMucHJvdG90eXBlID0ge1xuICAgIGluaXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5ldiA9IFtdO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIG9uOiBmdW5jdGlvbiAoZXZlbnROYW1lLCBmKSB7XG4gICAgICAgIGlmICghZikgcmV0dXJuO1xuICAgICAgICB2YXIgZSA9IHtcbiAgICAgICAgICAgIG5hbWU6IGV2ZW50TmFtZSxcbiAgICAgICAgICAgIGY6IGZcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5ldi5wdXNoKGUpO1xuICAgIH0sXG4gICAgdHJpZ2dlcjogZnVuY3Rpb24gKGV2ZW50TmFtZSwgYXJncykge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuZXYubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmICh0aGlzLmV2W2ldLm5hbWUgPT0gZXZlbnROYW1lKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5ldltpXS5mKGFyZ3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBFdmVudHM7XG59KS5jYWxsKHRoaXMscmVxdWlyZShcInJIMUpQR1wiKSx0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30scmVxdWlyZShcImJ1ZmZlclwiKS5CdWZmZXIsYXJndW1lbnRzWzNdLGFyZ3VtZW50c1s0XSxhcmd1bWVudHNbNV0sYXJndW1lbnRzWzZdLFwiL3NuS25pZmUvZXZlbnRzLmpzXCIsXCIvc25LbmlmZVwiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbi8qKlxuICogQ3JlYXRlZCBieSBzbmF0dmIgb24gMzEuMDUuMTYuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgZG9tOiByZXF1aXJlKCcuL2RvbScpLFxuICAgIGRhdGE6IHJlcXVpcmUoJy4vZGF0YScpLFxuICAgIGV2ZW50czogcmVxdWlyZSgnLi9ldmVudHMnKVxufTtcbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwickgxSlBHXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvc25LbmlmZS9pbmRleC5qc1wiLFwiL3NuS25pZmVcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG52YXIgbG9va3VwID0gJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXowMTIzNDU2Nzg5Ky8nO1xuXG47KGZ1bmN0aW9uIChleHBvcnRzKSB7XG5cdCd1c2Ugc3RyaWN0JztcblxuICB2YXIgQXJyID0gKHR5cGVvZiBVaW50OEFycmF5ICE9PSAndW5kZWZpbmVkJylcbiAgICA/IFVpbnQ4QXJyYXlcbiAgICA6IEFycmF5XG5cblx0dmFyIFBMVVMgICA9ICcrJy5jaGFyQ29kZUF0KDApXG5cdHZhciBTTEFTSCAgPSAnLycuY2hhckNvZGVBdCgwKVxuXHR2YXIgTlVNQkVSID0gJzAnLmNoYXJDb2RlQXQoMClcblx0dmFyIExPV0VSICA9ICdhJy5jaGFyQ29kZUF0KDApXG5cdHZhciBVUFBFUiAgPSAnQScuY2hhckNvZGVBdCgwKVxuXHR2YXIgUExVU19VUkxfU0FGRSA9ICctJy5jaGFyQ29kZUF0KDApXG5cdHZhciBTTEFTSF9VUkxfU0FGRSA9ICdfJy5jaGFyQ29kZUF0KDApXG5cblx0ZnVuY3Rpb24gZGVjb2RlIChlbHQpIHtcblx0XHR2YXIgY29kZSA9IGVsdC5jaGFyQ29kZUF0KDApXG5cdFx0aWYgKGNvZGUgPT09IFBMVVMgfHxcblx0XHQgICAgY29kZSA9PT0gUExVU19VUkxfU0FGRSlcblx0XHRcdHJldHVybiA2MiAvLyAnKydcblx0XHRpZiAoY29kZSA9PT0gU0xBU0ggfHxcblx0XHQgICAgY29kZSA9PT0gU0xBU0hfVVJMX1NBRkUpXG5cdFx0XHRyZXR1cm4gNjMgLy8gJy8nXG5cdFx0aWYgKGNvZGUgPCBOVU1CRVIpXG5cdFx0XHRyZXR1cm4gLTEgLy9ubyBtYXRjaFxuXHRcdGlmIChjb2RlIDwgTlVNQkVSICsgMTApXG5cdFx0XHRyZXR1cm4gY29kZSAtIE5VTUJFUiArIDI2ICsgMjZcblx0XHRpZiAoY29kZSA8IFVQUEVSICsgMjYpXG5cdFx0XHRyZXR1cm4gY29kZSAtIFVQUEVSXG5cdFx0aWYgKGNvZGUgPCBMT1dFUiArIDI2KVxuXHRcdFx0cmV0dXJuIGNvZGUgLSBMT1dFUiArIDI2XG5cdH1cblxuXHRmdW5jdGlvbiBiNjRUb0J5dGVBcnJheSAoYjY0KSB7XG5cdFx0dmFyIGksIGosIGwsIHRtcCwgcGxhY2VIb2xkZXJzLCBhcnJcblxuXHRcdGlmIChiNjQubGVuZ3RoICUgNCA+IDApIHtcblx0XHRcdHRocm93IG5ldyBFcnJvcignSW52YWxpZCBzdHJpbmcuIExlbmd0aCBtdXN0IGJlIGEgbXVsdGlwbGUgb2YgNCcpXG5cdFx0fVxuXG5cdFx0Ly8gdGhlIG51bWJlciBvZiBlcXVhbCBzaWducyAocGxhY2UgaG9sZGVycylcblx0XHQvLyBpZiB0aGVyZSBhcmUgdHdvIHBsYWNlaG9sZGVycywgdGhhbiB0aGUgdHdvIGNoYXJhY3RlcnMgYmVmb3JlIGl0XG5cdFx0Ly8gcmVwcmVzZW50IG9uZSBieXRlXG5cdFx0Ly8gaWYgdGhlcmUgaXMgb25seSBvbmUsIHRoZW4gdGhlIHRocmVlIGNoYXJhY3RlcnMgYmVmb3JlIGl0IHJlcHJlc2VudCAyIGJ5dGVzXG5cdFx0Ly8gdGhpcyBpcyBqdXN0IGEgY2hlYXAgaGFjayB0byBub3QgZG8gaW5kZXhPZiB0d2ljZVxuXHRcdHZhciBsZW4gPSBiNjQubGVuZ3RoXG5cdFx0cGxhY2VIb2xkZXJzID0gJz0nID09PSBiNjQuY2hhckF0KGxlbiAtIDIpID8gMiA6ICc9JyA9PT0gYjY0LmNoYXJBdChsZW4gLSAxKSA/IDEgOiAwXG5cblx0XHQvLyBiYXNlNjQgaXMgNC8zICsgdXAgdG8gdHdvIGNoYXJhY3RlcnMgb2YgdGhlIG9yaWdpbmFsIGRhdGFcblx0XHRhcnIgPSBuZXcgQXJyKGI2NC5sZW5ndGggKiAzIC8gNCAtIHBsYWNlSG9sZGVycylcblxuXHRcdC8vIGlmIHRoZXJlIGFyZSBwbGFjZWhvbGRlcnMsIG9ubHkgZ2V0IHVwIHRvIHRoZSBsYXN0IGNvbXBsZXRlIDQgY2hhcnNcblx0XHRsID0gcGxhY2VIb2xkZXJzID4gMCA/IGI2NC5sZW5ndGggLSA0IDogYjY0Lmxlbmd0aFxuXG5cdFx0dmFyIEwgPSAwXG5cblx0XHRmdW5jdGlvbiBwdXNoICh2KSB7XG5cdFx0XHRhcnJbTCsrXSA9IHZcblx0XHR9XG5cblx0XHRmb3IgKGkgPSAwLCBqID0gMDsgaSA8IGw7IGkgKz0gNCwgaiArPSAzKSB7XG5cdFx0XHR0bXAgPSAoZGVjb2RlKGI2NC5jaGFyQXQoaSkpIDw8IDE4KSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMSkpIDw8IDEyKSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMikpIDw8IDYpIHwgZGVjb2RlKGI2NC5jaGFyQXQoaSArIDMpKVxuXHRcdFx0cHVzaCgodG1wICYgMHhGRjAwMDApID4+IDE2KVxuXHRcdFx0cHVzaCgodG1wICYgMHhGRjAwKSA+PiA4KVxuXHRcdFx0cHVzaCh0bXAgJiAweEZGKVxuXHRcdH1cblxuXHRcdGlmIChwbGFjZUhvbGRlcnMgPT09IDIpIHtcblx0XHRcdHRtcCA9IChkZWNvZGUoYjY0LmNoYXJBdChpKSkgPDwgMikgfCAoZGVjb2RlKGI2NC5jaGFyQXQoaSArIDEpKSA+PiA0KVxuXHRcdFx0cHVzaCh0bXAgJiAweEZGKVxuXHRcdH0gZWxzZSBpZiAocGxhY2VIb2xkZXJzID09PSAxKSB7XG5cdFx0XHR0bXAgPSAoZGVjb2RlKGI2NC5jaGFyQXQoaSkpIDw8IDEwKSB8IChkZWNvZGUoYjY0LmNoYXJBdChpICsgMSkpIDw8IDQpIHwgKGRlY29kZShiNjQuY2hhckF0KGkgKyAyKSkgPj4gMilcblx0XHRcdHB1c2goKHRtcCA+PiA4KSAmIDB4RkYpXG5cdFx0XHRwdXNoKHRtcCAmIDB4RkYpXG5cdFx0fVxuXG5cdFx0cmV0dXJuIGFyclxuXHR9XG5cblx0ZnVuY3Rpb24gdWludDhUb0Jhc2U2NCAodWludDgpIHtcblx0XHR2YXIgaSxcblx0XHRcdGV4dHJhQnl0ZXMgPSB1aW50OC5sZW5ndGggJSAzLCAvLyBpZiB3ZSBoYXZlIDEgYnl0ZSBsZWZ0LCBwYWQgMiBieXRlc1xuXHRcdFx0b3V0cHV0ID0gXCJcIixcblx0XHRcdHRlbXAsIGxlbmd0aFxuXG5cdFx0ZnVuY3Rpb24gZW5jb2RlIChudW0pIHtcblx0XHRcdHJldHVybiBsb29rdXAuY2hhckF0KG51bSlcblx0XHR9XG5cblx0XHRmdW5jdGlvbiB0cmlwbGV0VG9CYXNlNjQgKG51bSkge1xuXHRcdFx0cmV0dXJuIGVuY29kZShudW0gPj4gMTggJiAweDNGKSArIGVuY29kZShudW0gPj4gMTIgJiAweDNGKSArIGVuY29kZShudW0gPj4gNiAmIDB4M0YpICsgZW5jb2RlKG51bSAmIDB4M0YpXG5cdFx0fVxuXG5cdFx0Ly8gZ28gdGhyb3VnaCB0aGUgYXJyYXkgZXZlcnkgdGhyZWUgYnl0ZXMsIHdlJ2xsIGRlYWwgd2l0aCB0cmFpbGluZyBzdHVmZiBsYXRlclxuXHRcdGZvciAoaSA9IDAsIGxlbmd0aCA9IHVpbnQ4Lmxlbmd0aCAtIGV4dHJhQnl0ZXM7IGkgPCBsZW5ndGg7IGkgKz0gMykge1xuXHRcdFx0dGVtcCA9ICh1aW50OFtpXSA8PCAxNikgKyAodWludDhbaSArIDFdIDw8IDgpICsgKHVpbnQ4W2kgKyAyXSlcblx0XHRcdG91dHB1dCArPSB0cmlwbGV0VG9CYXNlNjQodGVtcClcblx0XHR9XG5cblx0XHQvLyBwYWQgdGhlIGVuZCB3aXRoIHplcm9zLCBidXQgbWFrZSBzdXJlIHRvIG5vdCBmb3JnZXQgdGhlIGV4dHJhIGJ5dGVzXG5cdFx0c3dpdGNoIChleHRyYUJ5dGVzKSB7XG5cdFx0XHRjYXNlIDE6XG5cdFx0XHRcdHRlbXAgPSB1aW50OFt1aW50OC5sZW5ndGggLSAxXVxuXHRcdFx0XHRvdXRwdXQgKz0gZW5jb2RlKHRlbXAgPj4gMilcblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSgodGVtcCA8PCA0KSAmIDB4M0YpXG5cdFx0XHRcdG91dHB1dCArPSAnPT0nXG5cdFx0XHRcdGJyZWFrXG5cdFx0XHRjYXNlIDI6XG5cdFx0XHRcdHRlbXAgPSAodWludDhbdWludDgubGVuZ3RoIC0gMl0gPDwgOCkgKyAodWludDhbdWludDgubGVuZ3RoIC0gMV0pXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUodGVtcCA+PiAxMClcblx0XHRcdFx0b3V0cHV0ICs9IGVuY29kZSgodGVtcCA+PiA0KSAmIDB4M0YpXG5cdFx0XHRcdG91dHB1dCArPSBlbmNvZGUoKHRlbXAgPDwgMikgJiAweDNGKVxuXHRcdFx0XHRvdXRwdXQgKz0gJz0nXG5cdFx0XHRcdGJyZWFrXG5cdFx0fVxuXG5cdFx0cmV0dXJuIG91dHB1dFxuXHR9XG5cblx0ZXhwb3J0cy50b0J5dGVBcnJheSA9IGI2NFRvQnl0ZUFycmF5XG5cdGV4cG9ydHMuZnJvbUJ5dGVBcnJheSA9IHVpbnQ4VG9CYXNlNjRcbn0odHlwZW9mIGV4cG9ydHMgPT09ICd1bmRlZmluZWQnID8gKHRoaXMuYmFzZTY0anMgPSB7fSkgOiBleHBvcnRzKSlcblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJySDFKUEdcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi8uLi8uLi9ub2RlX21vZHVsZXMvYmFzZTY0LWpzL2xpYi9iNjQuanNcIixcIi8uLi8uLi9ub2RlX21vZHVsZXMvYmFzZTY0LWpzL2xpYlwiKSIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwsQnVmZmVyLF9fYXJndW1lbnQwLF9fYXJndW1lbnQxLF9fYXJndW1lbnQyLF9fYXJndW1lbnQzLF9fZmlsZW5hbWUsX19kaXJuYW1lKXtcbi8qIVxuICogVGhlIGJ1ZmZlciBtb2R1bGUgZnJvbSBub2RlLmpzLCBmb3IgdGhlIGJyb3dzZXIuXG4gKlxuICogQGF1dGhvciAgIEZlcm9zcyBBYm91a2hhZGlqZWggPGZlcm9zc0BmZXJvc3Mub3JnPiA8aHR0cDovL2Zlcm9zcy5vcmc+XG4gKiBAbGljZW5zZSAgTUlUXG4gKi9cblxudmFyIGJhc2U2NCA9IHJlcXVpcmUoJ2Jhc2U2NC1qcycpXG52YXIgaWVlZTc1NCA9IHJlcXVpcmUoJ2llZWU3NTQnKVxuXG5leHBvcnRzLkJ1ZmZlciA9IEJ1ZmZlclxuZXhwb3J0cy5TbG93QnVmZmVyID0gQnVmZmVyXG5leHBvcnRzLklOU1BFQ1RfTUFYX0JZVEVTID0gNTBcbkJ1ZmZlci5wb29sU2l6ZSA9IDgxOTJcblxuLyoqXG4gKiBJZiBgQnVmZmVyLl91c2VUeXBlZEFycmF5c2A6XG4gKiAgID09PSB0cnVlICAgIFVzZSBVaW50OEFycmF5IGltcGxlbWVudGF0aW9uIChmYXN0ZXN0KVxuICogICA9PT0gZmFsc2UgICBVc2UgT2JqZWN0IGltcGxlbWVudGF0aW9uIChjb21wYXRpYmxlIGRvd24gdG8gSUU2KVxuICovXG5CdWZmZXIuX3VzZVR5cGVkQXJyYXlzID0gKGZ1bmN0aW9uICgpIHtcbiAgLy8gRGV0ZWN0IGlmIGJyb3dzZXIgc3VwcG9ydHMgVHlwZWQgQXJyYXlzLiBTdXBwb3J0ZWQgYnJvd3NlcnMgYXJlIElFIDEwKywgRmlyZWZveCA0KyxcbiAgLy8gQ2hyb21lIDcrLCBTYWZhcmkgNS4xKywgT3BlcmEgMTEuNissIGlPUyA0LjIrLiBJZiB0aGUgYnJvd3NlciBkb2VzIG5vdCBzdXBwb3J0IGFkZGluZ1xuICAvLyBwcm9wZXJ0aWVzIHRvIGBVaW50OEFycmF5YCBpbnN0YW5jZXMsIHRoZW4gdGhhdCdzIHRoZSBzYW1lIGFzIG5vIGBVaW50OEFycmF5YCBzdXBwb3J0XG4gIC8vIGJlY2F1c2Ugd2UgbmVlZCB0byBiZSBhYmxlIHRvIGFkZCBhbGwgdGhlIG5vZGUgQnVmZmVyIEFQSSBtZXRob2RzLiBUaGlzIGlzIGFuIGlzc3VlXG4gIC8vIGluIEZpcmVmb3ggNC0yOS4gTm93IGZpeGVkOiBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD02OTU0MzhcbiAgdHJ5IHtcbiAgICB2YXIgYnVmID0gbmV3IEFycmF5QnVmZmVyKDApXG4gICAgdmFyIGFyciA9IG5ldyBVaW50OEFycmF5KGJ1ZilcbiAgICBhcnIuZm9vID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gNDIgfVxuICAgIHJldHVybiA0MiA9PT0gYXJyLmZvbygpICYmXG4gICAgICAgIHR5cGVvZiBhcnIuc3ViYXJyYXkgPT09ICdmdW5jdGlvbicgLy8gQ2hyb21lIDktMTAgbGFjayBgc3ViYXJyYXlgXG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxufSkoKVxuXG4vKipcbiAqIENsYXNzOiBCdWZmZXJcbiAqID09PT09PT09PT09PT1cbiAqXG4gKiBUaGUgQnVmZmVyIGNvbnN0cnVjdG9yIHJldHVybnMgaW5zdGFuY2VzIG9mIGBVaW50OEFycmF5YCB0aGF0IGFyZSBhdWdtZW50ZWRcbiAqIHdpdGggZnVuY3Rpb24gcHJvcGVydGllcyBmb3IgYWxsIHRoZSBub2RlIGBCdWZmZXJgIEFQSSBmdW5jdGlvbnMuIFdlIHVzZVxuICogYFVpbnQ4QXJyYXlgIHNvIHRoYXQgc3F1YXJlIGJyYWNrZXQgbm90YXRpb24gd29ya3MgYXMgZXhwZWN0ZWQgLS0gaXQgcmV0dXJuc1xuICogYSBzaW5nbGUgb2N0ZXQuXG4gKlxuICogQnkgYXVnbWVudGluZyB0aGUgaW5zdGFuY2VzLCB3ZSBjYW4gYXZvaWQgbW9kaWZ5aW5nIHRoZSBgVWludDhBcnJheWBcbiAqIHByb3RvdHlwZS5cbiAqL1xuZnVuY3Rpb24gQnVmZmVyIChzdWJqZWN0LCBlbmNvZGluZywgbm9aZXJvKSB7XG4gIGlmICghKHRoaXMgaW5zdGFuY2VvZiBCdWZmZXIpKVxuICAgIHJldHVybiBuZXcgQnVmZmVyKHN1YmplY3QsIGVuY29kaW5nLCBub1plcm8pXG5cbiAgdmFyIHR5cGUgPSB0eXBlb2Ygc3ViamVjdFxuXG4gIC8vIFdvcmthcm91bmQ6IG5vZGUncyBiYXNlNjQgaW1wbGVtZW50YXRpb24gYWxsb3dzIGZvciBub24tcGFkZGVkIHN0cmluZ3NcbiAgLy8gd2hpbGUgYmFzZTY0LWpzIGRvZXMgbm90LlxuICBpZiAoZW5jb2RpbmcgPT09ICdiYXNlNjQnICYmIHR5cGUgPT09ICdzdHJpbmcnKSB7XG4gICAgc3ViamVjdCA9IHN0cmluZ3RyaW0oc3ViamVjdClcbiAgICB3aGlsZSAoc3ViamVjdC5sZW5ndGggJSA0ICE9PSAwKSB7XG4gICAgICBzdWJqZWN0ID0gc3ViamVjdCArICc9J1xuICAgIH1cbiAgfVxuXG4gIC8vIEZpbmQgdGhlIGxlbmd0aFxuICB2YXIgbGVuZ3RoXG4gIGlmICh0eXBlID09PSAnbnVtYmVyJylcbiAgICBsZW5ndGggPSBjb2VyY2Uoc3ViamVjdClcbiAgZWxzZSBpZiAodHlwZSA9PT0gJ3N0cmluZycpXG4gICAgbGVuZ3RoID0gQnVmZmVyLmJ5dGVMZW5ndGgoc3ViamVjdCwgZW5jb2RpbmcpXG4gIGVsc2UgaWYgKHR5cGUgPT09ICdvYmplY3QnKVxuICAgIGxlbmd0aCA9IGNvZXJjZShzdWJqZWN0Lmxlbmd0aCkgLy8gYXNzdW1lIHRoYXQgb2JqZWN0IGlzIGFycmF5LWxpa2VcbiAgZWxzZVxuICAgIHRocm93IG5ldyBFcnJvcignRmlyc3QgYXJndW1lbnQgbmVlZHMgdG8gYmUgYSBudW1iZXIsIGFycmF5IG9yIHN0cmluZy4nKVxuXG4gIHZhciBidWZcbiAgaWYgKEJ1ZmZlci5fdXNlVHlwZWRBcnJheXMpIHtcbiAgICAvLyBQcmVmZXJyZWQ6IFJldHVybiBhbiBhdWdtZW50ZWQgYFVpbnQ4QXJyYXlgIGluc3RhbmNlIGZvciBiZXN0IHBlcmZvcm1hbmNlXG4gICAgYnVmID0gQnVmZmVyLl9hdWdtZW50KG5ldyBVaW50OEFycmF5KGxlbmd0aCkpXG4gIH0gZWxzZSB7XG4gICAgLy8gRmFsbGJhY2s6IFJldHVybiBUSElTIGluc3RhbmNlIG9mIEJ1ZmZlciAoY3JlYXRlZCBieSBgbmV3YClcbiAgICBidWYgPSB0aGlzXG4gICAgYnVmLmxlbmd0aCA9IGxlbmd0aFxuICAgIGJ1Zi5faXNCdWZmZXIgPSB0cnVlXG4gIH1cblxuICB2YXIgaVxuICBpZiAoQnVmZmVyLl91c2VUeXBlZEFycmF5cyAmJiB0eXBlb2Ygc3ViamVjdC5ieXRlTGVuZ3RoID09PSAnbnVtYmVyJykge1xuICAgIC8vIFNwZWVkIG9wdGltaXphdGlvbiAtLSB1c2Ugc2V0IGlmIHdlJ3JlIGNvcHlpbmcgZnJvbSBhIHR5cGVkIGFycmF5XG4gICAgYnVmLl9zZXQoc3ViamVjdClcbiAgfSBlbHNlIGlmIChpc0FycmF5aXNoKHN1YmplY3QpKSB7XG4gICAgLy8gVHJlYXQgYXJyYXktaXNoIG9iamVjdHMgYXMgYSBieXRlIGFycmF5XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoQnVmZmVyLmlzQnVmZmVyKHN1YmplY3QpKVxuICAgICAgICBidWZbaV0gPSBzdWJqZWN0LnJlYWRVSW50OChpKVxuICAgICAgZWxzZVxuICAgICAgICBidWZbaV0gPSBzdWJqZWN0W2ldXG4gICAgfVxuICB9IGVsc2UgaWYgKHR5cGUgPT09ICdzdHJpbmcnKSB7XG4gICAgYnVmLndyaXRlKHN1YmplY3QsIDAsIGVuY29kaW5nKVxuICB9IGVsc2UgaWYgKHR5cGUgPT09ICdudW1iZXInICYmICFCdWZmZXIuX3VzZVR5cGVkQXJyYXlzICYmICFub1plcm8pIHtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgIGJ1ZltpXSA9IDBcbiAgICB9XG4gIH1cblxuICByZXR1cm4gYnVmXG59XG5cbi8vIFNUQVRJQyBNRVRIT0RTXG4vLyA9PT09PT09PT09PT09PVxuXG5CdWZmZXIuaXNFbmNvZGluZyA9IGZ1bmN0aW9uIChlbmNvZGluZykge1xuICBzd2l0Y2ggKFN0cmluZyhlbmNvZGluZykudG9Mb3dlckNhc2UoKSkge1xuICAgIGNhc2UgJ2hleCc6XG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgIGNhc2UgJ2FzY2lpJzpcbiAgICBjYXNlICdiaW5hcnknOlxuICAgIGNhc2UgJ2Jhc2U2NCc6XG4gICAgY2FzZSAncmF3JzpcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0dXJuIHRydWVcbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuIGZhbHNlXG4gIH1cbn1cblxuQnVmZmVyLmlzQnVmZmVyID0gZnVuY3Rpb24gKGIpIHtcbiAgcmV0dXJuICEhKGIgIT09IG51bGwgJiYgYiAhPT0gdW5kZWZpbmVkICYmIGIuX2lzQnVmZmVyKVxufVxuXG5CdWZmZXIuYnl0ZUxlbmd0aCA9IGZ1bmN0aW9uIChzdHIsIGVuY29kaW5nKSB7XG4gIHZhciByZXRcbiAgc3RyID0gc3RyICsgJydcbiAgc3dpdGNoIChlbmNvZGluZyB8fCAndXRmOCcpIHtcbiAgICBjYXNlICdoZXgnOlxuICAgICAgcmV0ID0gc3RyLmxlbmd0aCAvIDJcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndXRmOCc6XG4gICAgY2FzZSAndXRmLTgnOlxuICAgICAgcmV0ID0gdXRmOFRvQnl0ZXMoc3RyKS5sZW5ndGhcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYXNjaWknOlxuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgY2FzZSAncmF3JzpcbiAgICAgIHJldCA9IHN0ci5sZW5ndGhcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgIHJldCA9IGJhc2U2NFRvQnl0ZXMoc3RyKS5sZW5ndGhcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndWNzMic6XG4gICAgY2FzZSAndWNzLTInOlxuICAgIGNhc2UgJ3V0ZjE2bGUnOlxuICAgIGNhc2UgJ3V0Zi0xNmxlJzpcbiAgICAgIHJldCA9IHN0ci5sZW5ndGggKiAyXG4gICAgICBicmVha1xuICAgIGRlZmF1bHQ6XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Vua25vd24gZW5jb2RpbmcnKVxuICB9XG4gIHJldHVybiByZXRcbn1cblxuQnVmZmVyLmNvbmNhdCA9IGZ1bmN0aW9uIChsaXN0LCB0b3RhbExlbmd0aCkge1xuICBhc3NlcnQoaXNBcnJheShsaXN0KSwgJ1VzYWdlOiBCdWZmZXIuY29uY2F0KGxpc3QsIFt0b3RhbExlbmd0aF0pXFxuJyArXG4gICAgICAnbGlzdCBzaG91bGQgYmUgYW4gQXJyYXkuJylcblxuICBpZiAobGlzdC5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gbmV3IEJ1ZmZlcigwKVxuICB9IGVsc2UgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgcmV0dXJuIGxpc3RbMF1cbiAgfVxuXG4gIHZhciBpXG4gIGlmICh0eXBlb2YgdG90YWxMZW5ndGggIT09ICdudW1iZXInKSB7XG4gICAgdG90YWxMZW5ndGggPSAwXG4gICAgZm9yIChpID0gMDsgaSA8IGxpc3QubGVuZ3RoOyBpKyspIHtcbiAgICAgIHRvdGFsTGVuZ3RoICs9IGxpc3RbaV0ubGVuZ3RoXG4gICAgfVxuICB9XG5cbiAgdmFyIGJ1ZiA9IG5ldyBCdWZmZXIodG90YWxMZW5ndGgpXG4gIHZhciBwb3MgPSAwXG4gIGZvciAoaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGl0ZW0gPSBsaXN0W2ldXG4gICAgaXRlbS5jb3B5KGJ1ZiwgcG9zKVxuICAgIHBvcyArPSBpdGVtLmxlbmd0aFxuICB9XG4gIHJldHVybiBidWZcbn1cblxuLy8gQlVGRkVSIElOU1RBTkNFIE1FVEhPRFNcbi8vID09PT09PT09PT09PT09PT09PT09PT09XG5cbmZ1bmN0aW9uIF9oZXhXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIG9mZnNldCA9IE51bWJlcihvZmZzZXQpIHx8IDBcbiAgdmFyIHJlbWFpbmluZyA9IGJ1Zi5sZW5ndGggLSBvZmZzZXRcbiAgaWYgKCFsZW5ndGgpIHtcbiAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgfSBlbHNlIHtcbiAgICBsZW5ndGggPSBOdW1iZXIobGVuZ3RoKVxuICAgIGlmIChsZW5ndGggPiByZW1haW5pbmcpIHtcbiAgICAgIGxlbmd0aCA9IHJlbWFpbmluZ1xuICAgIH1cbiAgfVxuXG4gIC8vIG11c3QgYmUgYW4gZXZlbiBudW1iZXIgb2YgZGlnaXRzXG4gIHZhciBzdHJMZW4gPSBzdHJpbmcubGVuZ3RoXG4gIGFzc2VydChzdHJMZW4gJSAyID09PSAwLCAnSW52YWxpZCBoZXggc3RyaW5nJylcblxuICBpZiAobGVuZ3RoID4gc3RyTGVuIC8gMikge1xuICAgIGxlbmd0aCA9IHN0ckxlbiAvIDJcbiAgfVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGJ5dGUgPSBwYXJzZUludChzdHJpbmcuc3Vic3RyKGkgKiAyLCAyKSwgMTYpXG4gICAgYXNzZXJ0KCFpc05hTihieXRlKSwgJ0ludmFsaWQgaGV4IHN0cmluZycpXG4gICAgYnVmW29mZnNldCArIGldID0gYnl0ZVxuICB9XG4gIEJ1ZmZlci5fY2hhcnNXcml0dGVuID0gaSAqIDJcbiAgcmV0dXJuIGlcbn1cblxuZnVuY3Rpb24gX3V0ZjhXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBjaGFyc1dyaXR0ZW4gPSBCdWZmZXIuX2NoYXJzV3JpdHRlbiA9XG4gICAgYmxpdEJ1ZmZlcih1dGY4VG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxuICByZXR1cm4gY2hhcnNXcml0dGVuXG59XG5cbmZ1bmN0aW9uIF9hc2NpaVdyaXRlIChidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgdmFyIGNoYXJzV3JpdHRlbiA9IEJ1ZmZlci5fY2hhcnNXcml0dGVuID1cbiAgICBibGl0QnVmZmVyKGFzY2lpVG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxuICByZXR1cm4gY2hhcnNXcml0dGVuXG59XG5cbmZ1bmN0aW9uIF9iaW5hcnlXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHJldHVybiBfYXNjaWlXcml0ZShidWYsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG59XG5cbmZ1bmN0aW9uIF9iYXNlNjRXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBjaGFyc1dyaXR0ZW4gPSBCdWZmZXIuX2NoYXJzV3JpdHRlbiA9XG4gICAgYmxpdEJ1ZmZlcihiYXNlNjRUb0J5dGVzKHN0cmluZyksIGJ1Ziwgb2Zmc2V0LCBsZW5ndGgpXG4gIHJldHVybiBjaGFyc1dyaXR0ZW5cbn1cblxuZnVuY3Rpb24gX3V0ZjE2bGVXcml0ZSAoYnVmLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKSB7XG4gIHZhciBjaGFyc1dyaXR0ZW4gPSBCdWZmZXIuX2NoYXJzV3JpdHRlbiA9XG4gICAgYmxpdEJ1ZmZlcih1dGYxNmxlVG9CeXRlcyhzdHJpbmcpLCBidWYsIG9mZnNldCwgbGVuZ3RoKVxuICByZXR1cm4gY2hhcnNXcml0dGVuXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGUgPSBmdW5jdGlvbiAoc3RyaW5nLCBvZmZzZXQsIGxlbmd0aCwgZW5jb2RpbmcpIHtcbiAgLy8gU3VwcG9ydCBib3RoIChzdHJpbmcsIG9mZnNldCwgbGVuZ3RoLCBlbmNvZGluZylcbiAgLy8gYW5kIHRoZSBsZWdhY3kgKHN0cmluZywgZW5jb2RpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICBpZiAoaXNGaW5pdGUob2Zmc2V0KSkge1xuICAgIGlmICghaXNGaW5pdGUobGVuZ3RoKSkge1xuICAgICAgZW5jb2RpbmcgPSBsZW5ndGhcbiAgICAgIGxlbmd0aCA9IHVuZGVmaW5lZFxuICAgIH1cbiAgfSBlbHNlIHsgIC8vIGxlZ2FjeVxuICAgIHZhciBzd2FwID0gZW5jb2RpbmdcbiAgICBlbmNvZGluZyA9IG9mZnNldFxuICAgIG9mZnNldCA9IGxlbmd0aFxuICAgIGxlbmd0aCA9IHN3YXBcbiAgfVxuXG4gIG9mZnNldCA9IE51bWJlcihvZmZzZXQpIHx8IDBcbiAgdmFyIHJlbWFpbmluZyA9IHRoaXMubGVuZ3RoIC0gb2Zmc2V0XG4gIGlmICghbGVuZ3RoKSB7XG4gICAgbGVuZ3RoID0gcmVtYWluaW5nXG4gIH0gZWxzZSB7XG4gICAgbGVuZ3RoID0gTnVtYmVyKGxlbmd0aClcbiAgICBpZiAobGVuZ3RoID4gcmVtYWluaW5nKSB7XG4gICAgICBsZW5ndGggPSByZW1haW5pbmdcbiAgICB9XG4gIH1cbiAgZW5jb2RpbmcgPSBTdHJpbmcoZW5jb2RpbmcgfHwgJ3V0ZjgnKS50b0xvd2VyQ2FzZSgpXG5cbiAgdmFyIHJldFxuICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICAgIHJldCA9IF9oZXhXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICd1dGY4JzpcbiAgICBjYXNlICd1dGYtOCc6XG4gICAgICByZXQgPSBfdXRmOFdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgIHJldCA9IF9hc2NpaVdyaXRlKHRoaXMsIHN0cmluZywgb2Zmc2V0LCBsZW5ndGgpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICByZXQgPSBfYmluYXJ5V3JpdGUodGhpcywgc3RyaW5nLCBvZmZzZXQsIGxlbmd0aClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgIHJldCA9IF9iYXNlNjRXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0ID0gX3V0ZjE2bGVXcml0ZSh0aGlzLCBzdHJpbmcsIG9mZnNldCwgbGVuZ3RoKVxuICAgICAgYnJlYWtcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGVuY29kaW5nJylcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiAoZW5jb2RpbmcsIHN0YXJ0LCBlbmQpIHtcbiAgdmFyIHNlbGYgPSB0aGlzXG5cbiAgZW5jb2RpbmcgPSBTdHJpbmcoZW5jb2RpbmcgfHwgJ3V0ZjgnKS50b0xvd2VyQ2FzZSgpXG4gIHN0YXJ0ID0gTnVtYmVyKHN0YXJ0KSB8fCAwXG4gIGVuZCA9IChlbmQgIT09IHVuZGVmaW5lZClcbiAgICA/IE51bWJlcihlbmQpXG4gICAgOiBlbmQgPSBzZWxmLmxlbmd0aFxuXG4gIC8vIEZhc3RwYXRoIGVtcHR5IHN0cmluZ3NcbiAgaWYgKGVuZCA9PT0gc3RhcnQpXG4gICAgcmV0dXJuICcnXG5cbiAgdmFyIHJldFxuICBzd2l0Y2ggKGVuY29kaW5nKSB7XG4gICAgY2FzZSAnaGV4JzpcbiAgICAgIHJldCA9IF9oZXhTbGljZShzZWxmLCBzdGFydCwgZW5kKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICd1dGY4JzpcbiAgICBjYXNlICd1dGYtOCc6XG4gICAgICByZXQgPSBfdXRmOFNsaWNlKHNlbGYsIHN0YXJ0LCBlbmQpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2FzY2lpJzpcbiAgICAgIHJldCA9IF9hc2NpaVNsaWNlKHNlbGYsIHN0YXJ0LCBlbmQpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ2JpbmFyeSc6XG4gICAgICByZXQgPSBfYmluYXJ5U2xpY2Uoc2VsZiwgc3RhcnQsIGVuZClcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnYmFzZTY0JzpcbiAgICAgIHJldCA9IF9iYXNlNjRTbGljZShzZWxmLCBzdGFydCwgZW5kKVxuICAgICAgYnJlYWtcbiAgICBjYXNlICd1Y3MyJzpcbiAgICBjYXNlICd1Y3MtMic6XG4gICAgY2FzZSAndXRmMTZsZSc6XG4gICAgY2FzZSAndXRmLTE2bGUnOlxuICAgICAgcmV0ID0gX3V0ZjE2bGVTbGljZShzZWxmLCBzdGFydCwgZW5kKVxuICAgICAgYnJlYWtcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVbmtub3duIGVuY29kaW5nJylcbiAgfVxuICByZXR1cm4gcmV0XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4ge1xuICAgIHR5cGU6ICdCdWZmZXInLFxuICAgIGRhdGE6IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKHRoaXMuX2FyciB8fCB0aGlzLCAwKVxuICB9XG59XG5cbi8vIGNvcHkodGFyZ2V0QnVmZmVyLCB0YXJnZXRTdGFydD0wLCBzb3VyY2VTdGFydD0wLCBzb3VyY2VFbmQ9YnVmZmVyLmxlbmd0aClcbkJ1ZmZlci5wcm90b3R5cGUuY29weSA9IGZ1bmN0aW9uICh0YXJnZXQsIHRhcmdldF9zdGFydCwgc3RhcnQsIGVuZCkge1xuICB2YXIgc291cmNlID0gdGhpc1xuXG4gIGlmICghc3RhcnQpIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCAmJiBlbmQgIT09IDApIGVuZCA9IHRoaXMubGVuZ3RoXG4gIGlmICghdGFyZ2V0X3N0YXJ0KSB0YXJnZXRfc3RhcnQgPSAwXG5cbiAgLy8gQ29weSAwIGJ5dGVzOyB3ZSdyZSBkb25lXG4gIGlmIChlbmQgPT09IHN0YXJ0KSByZXR1cm5cbiAgaWYgKHRhcmdldC5sZW5ndGggPT09IDAgfHwgc291cmNlLmxlbmd0aCA9PT0gMCkgcmV0dXJuXG5cbiAgLy8gRmF0YWwgZXJyb3IgY29uZGl0aW9uc1xuICBhc3NlcnQoZW5kID49IHN0YXJ0LCAnc291cmNlRW5kIDwgc291cmNlU3RhcnQnKVxuICBhc3NlcnQodGFyZ2V0X3N0YXJ0ID49IDAgJiYgdGFyZ2V0X3N0YXJ0IDwgdGFyZ2V0Lmxlbmd0aCxcbiAgICAgICd0YXJnZXRTdGFydCBvdXQgb2YgYm91bmRzJylcbiAgYXNzZXJ0KHN0YXJ0ID49IDAgJiYgc3RhcnQgPCBzb3VyY2UubGVuZ3RoLCAnc291cmNlU3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIGFzc2VydChlbmQgPj0gMCAmJiBlbmQgPD0gc291cmNlLmxlbmd0aCwgJ3NvdXJjZUVuZCBvdXQgb2YgYm91bmRzJylcblxuICAvLyBBcmUgd2Ugb29iP1xuICBpZiAoZW5kID4gdGhpcy5sZW5ndGgpXG4gICAgZW5kID0gdGhpcy5sZW5ndGhcbiAgaWYgKHRhcmdldC5sZW5ndGggLSB0YXJnZXRfc3RhcnQgPCBlbmQgLSBzdGFydClcbiAgICBlbmQgPSB0YXJnZXQubGVuZ3RoIC0gdGFyZ2V0X3N0YXJ0ICsgc3RhcnRcblxuICB2YXIgbGVuID0gZW5kIC0gc3RhcnRcblxuICBpZiAobGVuIDwgMTAwIHx8ICFCdWZmZXIuX3VzZVR5cGVkQXJyYXlzKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIHRhcmdldFtpICsgdGFyZ2V0X3N0YXJ0XSA9IHRoaXNbaSArIHN0YXJ0XVxuICB9IGVsc2Uge1xuICAgIHRhcmdldC5fc2V0KHRoaXMuc3ViYXJyYXkoc3RhcnQsIHN0YXJ0ICsgbGVuKSwgdGFyZ2V0X3N0YXJ0KVxuICB9XG59XG5cbmZ1bmN0aW9uIF9iYXNlNjRTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIGlmIChzdGFydCA9PT0gMCAmJiBlbmQgPT09IGJ1Zi5sZW5ndGgpIHtcbiAgICByZXR1cm4gYmFzZTY0LmZyb21CeXRlQXJyYXkoYnVmKVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBiYXNlNjQuZnJvbUJ5dGVBcnJheShidWYuc2xpY2Uoc3RhcnQsIGVuZCkpXG4gIH1cbn1cblxuZnVuY3Rpb24gX3V0ZjhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciByZXMgPSAnJ1xuICB2YXIgdG1wID0gJydcbiAgZW5kID0gTWF0aC5taW4oYnVmLmxlbmd0aCwgZW5kKVxuXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgaWYgKGJ1ZltpXSA8PSAweDdGKSB7XG4gICAgICByZXMgKz0gZGVjb2RlVXRmOENoYXIodG1wKSArIFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldKVxuICAgICAgdG1wID0gJydcbiAgICB9IGVsc2Uge1xuICAgICAgdG1wICs9ICclJyArIGJ1ZltpXS50b1N0cmluZygxNilcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzICsgZGVjb2RlVXRmOENoYXIodG1wKVxufVxuXG5mdW5jdGlvbiBfYXNjaWlTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciByZXQgPSAnJ1xuICBlbmQgPSBNYXRoLm1pbihidWYubGVuZ3RoLCBlbmQpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspXG4gICAgcmV0ICs9IFN0cmluZy5mcm9tQ2hhckNvZGUoYnVmW2ldKVxuICByZXR1cm4gcmV0XG59XG5cbmZ1bmN0aW9uIF9iaW5hcnlTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHJldHVybiBfYXNjaWlTbGljZShidWYsIHN0YXJ0LCBlbmQpXG59XG5cbmZ1bmN0aW9uIF9oZXhTbGljZSAoYnVmLCBzdGFydCwgZW5kKSB7XG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG5cbiAgaWYgKCFzdGFydCB8fCBzdGFydCA8IDApIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCB8fCBlbmQgPCAwIHx8IGVuZCA+IGxlbikgZW5kID0gbGVuXG5cbiAgdmFyIG91dCA9ICcnXG4gIGZvciAodmFyIGkgPSBzdGFydDsgaSA8IGVuZDsgaSsrKSB7XG4gICAgb3V0ICs9IHRvSGV4KGJ1ZltpXSlcbiAgfVxuICByZXR1cm4gb3V0XG59XG5cbmZ1bmN0aW9uIF91dGYxNmxlU2xpY2UgKGJ1Ziwgc3RhcnQsIGVuZCkge1xuICB2YXIgYnl0ZXMgPSBidWYuc2xpY2Uoc3RhcnQsIGVuZClcbiAgdmFyIHJlcyA9ICcnXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYnl0ZXMubGVuZ3RoOyBpICs9IDIpIHtcbiAgICByZXMgKz0gU3RyaW5nLmZyb21DaGFyQ29kZShieXRlc1tpXSArIGJ5dGVzW2krMV0gKiAyNTYpXG4gIH1cbiAgcmV0dXJuIHJlc1xufVxuXG5CdWZmZXIucHJvdG90eXBlLnNsaWNlID0gZnVuY3Rpb24gKHN0YXJ0LCBlbmQpIHtcbiAgdmFyIGxlbiA9IHRoaXMubGVuZ3RoXG4gIHN0YXJ0ID0gY2xhbXAoc3RhcnQsIGxlbiwgMClcbiAgZW5kID0gY2xhbXAoZW5kLCBsZW4sIGxlbilcblxuICBpZiAoQnVmZmVyLl91c2VUeXBlZEFycmF5cykge1xuICAgIHJldHVybiBCdWZmZXIuX2F1Z21lbnQodGhpcy5zdWJhcnJheShzdGFydCwgZW5kKSlcbiAgfSBlbHNlIHtcbiAgICB2YXIgc2xpY2VMZW4gPSBlbmQgLSBzdGFydFxuICAgIHZhciBuZXdCdWYgPSBuZXcgQnVmZmVyKHNsaWNlTGVuLCB1bmRlZmluZWQsIHRydWUpXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzbGljZUxlbjsgaSsrKSB7XG4gICAgICBuZXdCdWZbaV0gPSB0aGlzW2kgKyBzdGFydF1cbiAgICB9XG4gICAgcmV0dXJuIG5ld0J1ZlxuICB9XG59XG5cbi8vIGBnZXRgIHdpbGwgYmUgcmVtb3ZlZCBpbiBOb2RlIDAuMTMrXG5CdWZmZXIucHJvdG90eXBlLmdldCA9IGZ1bmN0aW9uIChvZmZzZXQpIHtcbiAgY29uc29sZS5sb2coJy5nZXQoKSBpcyBkZXByZWNhdGVkLiBBY2Nlc3MgdXNpbmcgYXJyYXkgaW5kZXhlcyBpbnN0ZWFkLicpXG4gIHJldHVybiB0aGlzLnJlYWRVSW50OChvZmZzZXQpXG59XG5cbi8vIGBzZXRgIHdpbGwgYmUgcmVtb3ZlZCBpbiBOb2RlIDAuMTMrXG5CdWZmZXIucHJvdG90eXBlLnNldCA9IGZ1bmN0aW9uICh2LCBvZmZzZXQpIHtcbiAgY29uc29sZS5sb2coJy5zZXQoKSBpcyBkZXByZWNhdGVkLiBBY2Nlc3MgdXNpbmcgYXJyYXkgaW5kZXhlcyBpbnN0ZWFkLicpXG4gIHJldHVybiB0aGlzLndyaXRlVUludDgodiwgb2Zmc2V0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50OCA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgPCB0aGlzLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIGlmIChvZmZzZXQgPj0gdGhpcy5sZW5ndGgpXG4gICAgcmV0dXJuXG5cbiAgcmV0dXJuIHRoaXNbb2Zmc2V0XVxufVxuXG5mdW5jdGlvbiBfcmVhZFVJbnQxNiAoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAxIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIHZhciB2YWxcbiAgaWYgKGxpdHRsZUVuZGlhbikge1xuICAgIHZhbCA9IGJ1ZltvZmZzZXRdXG4gICAgaWYgKG9mZnNldCArIDEgPCBsZW4pXG4gICAgICB2YWwgfD0gYnVmW29mZnNldCArIDFdIDw8IDhcbiAgfSBlbHNlIHtcbiAgICB2YWwgPSBidWZbb2Zmc2V0XSA8PCA4XG4gICAgaWYgKG9mZnNldCArIDEgPCBsZW4pXG4gICAgICB2YWwgfD0gYnVmW29mZnNldCArIDFdXG4gIH1cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZFVJbnQxNih0aGlzLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MTZCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZFVJbnQxNih0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3JlYWRVSW50MzIgKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMyA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICB2YXIgdmFsXG4gIGlmIChsaXR0bGVFbmRpYW4pIHtcbiAgICBpZiAob2Zmc2V0ICsgMiA8IGxlbilcbiAgICAgIHZhbCA9IGJ1ZltvZmZzZXQgKyAyXSA8PCAxNlxuICAgIGlmIChvZmZzZXQgKyAxIDwgbGVuKVxuICAgICAgdmFsIHw9IGJ1ZltvZmZzZXQgKyAxXSA8PCA4XG4gICAgdmFsIHw9IGJ1ZltvZmZzZXRdXG4gICAgaWYgKG9mZnNldCArIDMgPCBsZW4pXG4gICAgICB2YWwgPSB2YWwgKyAoYnVmW29mZnNldCArIDNdIDw8IDI0ID4+PiAwKVxuICB9IGVsc2Uge1xuICAgIGlmIChvZmZzZXQgKyAxIDwgbGVuKVxuICAgICAgdmFsID0gYnVmW29mZnNldCArIDFdIDw8IDE2XG4gICAgaWYgKG9mZnNldCArIDIgPCBsZW4pXG4gICAgICB2YWwgfD0gYnVmW29mZnNldCArIDJdIDw8IDhcbiAgICBpZiAob2Zmc2V0ICsgMyA8IGxlbilcbiAgICAgIHZhbCB8PSBidWZbb2Zmc2V0ICsgM11cbiAgICB2YWwgPSB2YWwgKyAoYnVmW29mZnNldF0gPDwgMjQgPj4+IDApXG4gIH1cbiAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJMRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZFVJbnQzMih0aGlzLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRVSW50MzJCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZFVJbnQzMih0aGlzLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50OCA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLFxuICAgICAgICAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgPCB0aGlzLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIGlmIChvZmZzZXQgPj0gdGhpcy5sZW5ndGgpXG4gICAgcmV0dXJuXG5cbiAgdmFyIG5lZyA9IHRoaXNbb2Zmc2V0XSAmIDB4ODBcbiAgaWYgKG5lZylcbiAgICByZXR1cm4gKDB4ZmYgLSB0aGlzW29mZnNldF0gKyAxKSAqIC0xXG4gIGVsc2VcbiAgICByZXR1cm4gdGhpc1tvZmZzZXRdXG59XG5cbmZ1bmN0aW9uIF9yZWFkSW50MTYgKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMSA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gcmVhZCBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICB2YXIgdmFsID0gX3JlYWRVSW50MTYoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgdHJ1ZSlcbiAgdmFyIG5lZyA9IHZhbCAmIDB4ODAwMFxuICBpZiAobmVnKVxuICAgIHJldHVybiAoMHhmZmZmIC0gdmFsICsgMSkgKiAtMVxuICBlbHNlXG4gICAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQxNkxFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkSW50MTYodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MTZCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZEludDE2KHRoaXMsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfcmVhZEludDMyIChidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDMgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHJlYWQgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgdmFyIHZhbCA9IF9yZWFkVUludDMyKGJ1Ziwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIHRydWUpXG4gIHZhciBuZWcgPSB2YWwgJiAweDgwMDAwMDAwXG4gIGlmIChuZWcpXG4gICAgcmV0dXJuICgweGZmZmZmZmZmIC0gdmFsICsgMSkgKiAtMVxuICBlbHNlXG4gICAgcmV0dXJuIHZhbFxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRJbnQzMkxFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkSW50MzIodGhpcywgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS5yZWFkSW50MzJCRSA9IGZ1bmN0aW9uIChvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIHJldHVybiBfcmVhZEludDMyKHRoaXMsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfcmVhZEZsb2F0IChidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgKyAzIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIHJldHVybiBpZWVlNzU0LnJlYWQoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgMjMsIDQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZEZsb2F0TEUgPSBmdW5jdGlvbiAob2Zmc2V0LCBub0Fzc2VydCkge1xuICByZXR1cm4gX3JlYWRGbG9hdCh0aGlzLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLnJlYWRGbG9hdEJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkRmxvYXQodGhpcywgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF9yZWFkRG91YmxlIChidWYsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgKyA3IDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byByZWFkIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgfVxuXG4gIHJldHVybiBpZWVlNzU0LnJlYWQoYnVmLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgNTIsIDgpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUxFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkRG91YmxlKHRoaXMsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUucmVhZERvdWJsZUJFID0gZnVuY3Rpb24gKG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgcmV0dXJuIF9yZWFkRG91YmxlKHRoaXMsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlVUludDggPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0IDwgdGhpcy5sZW5ndGgsICd0cnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmdWludCh2YWx1ZSwgMHhmZilcbiAgfVxuXG4gIGlmIChvZmZzZXQgPj0gdGhpcy5sZW5ndGgpIHJldHVyblxuXG4gIHRoaXNbb2Zmc2V0XSA9IHZhbHVlXG59XG5cbmZ1bmN0aW9uIF93cml0ZVVJbnQxNiAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAxIDwgYnVmLmxlbmd0aCwgJ3RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gICAgdmVyaWZ1aW50KHZhbHVlLCAweGZmZmYpXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICBmb3IgKHZhciBpID0gMCwgaiA9IE1hdGgubWluKGxlbiAtIG9mZnNldCwgMik7IGkgPCBqOyBpKyspIHtcbiAgICBidWZbb2Zmc2V0ICsgaV0gPVxuICAgICAgICAodmFsdWUgJiAoMHhmZiA8PCAoOCAqIChsaXR0bGVFbmRpYW4gPyBpIDogMSAtIGkpKSkpID4+PlxuICAgICAgICAgICAgKGxpdHRsZUVuZGlhbiA/IGkgOiAxIC0gaSkgKiA4XG4gIH1cbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQxNkxFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZVVJbnQxNkJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZVVJbnQxNih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCBmYWxzZSwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF93cml0ZVVJbnQzMiAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAzIDwgYnVmLmxlbmd0aCwgJ3RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gICAgdmVyaWZ1aW50KHZhbHVlLCAweGZmZmZmZmZmKVxuICB9XG5cbiAgdmFyIGxlbiA9IGJ1Zi5sZW5ndGhcbiAgaWYgKG9mZnNldCA+PSBsZW4pXG4gICAgcmV0dXJuXG5cbiAgZm9yICh2YXIgaSA9IDAsIGogPSBNYXRoLm1pbihsZW4gLSBvZmZzZXQsIDQpOyBpIDwgajsgaSsrKSB7XG4gICAgYnVmW29mZnNldCArIGldID1cbiAgICAgICAgKHZhbHVlID4+PiAobGl0dGxlRW5kaWFuID8gaSA6IDMgLSBpKSAqIDgpICYgMHhmZlxuICB9XG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVVSW50MzJCRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVVSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50OCA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgPCB0aGlzLmxlbmd0aCwgJ1RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gICAgdmVyaWZzaW50KHZhbHVlLCAweDdmLCAtMHg4MClcbiAgfVxuXG4gIGlmIChvZmZzZXQgPj0gdGhpcy5sZW5ndGgpXG4gICAgcmV0dXJuXG5cbiAgaWYgKHZhbHVlID49IDApXG4gICAgdGhpcy53cml0ZVVJbnQ4KHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KVxuICBlbHNlXG4gICAgdGhpcy53cml0ZVVJbnQ4KDB4ZmYgKyB2YWx1ZSArIDEsIG9mZnNldCwgbm9Bc3NlcnQpXG59XG5cbmZ1bmN0aW9uIF93cml0ZUludDE2IChidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpIHtcbiAgaWYgKCFub0Fzc2VydCkge1xuICAgIGFzc2VydCh2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsLCAnbWlzc2luZyB2YWx1ZScpXG4gICAgYXNzZXJ0KHR5cGVvZiBsaXR0bGVFbmRpYW4gPT09ICdib29sZWFuJywgJ21pc3Npbmcgb3IgaW52YWxpZCBlbmRpYW4nKVxuICAgIGFzc2VydChvZmZzZXQgIT09IHVuZGVmaW5lZCAmJiBvZmZzZXQgIT09IG51bGwsICdtaXNzaW5nIG9mZnNldCcpXG4gICAgYXNzZXJ0KG9mZnNldCArIDEgPCBidWYubGVuZ3RoLCAnVHJ5aW5nIHRvIHdyaXRlIGJleW9uZCBidWZmZXIgbGVuZ3RoJylcbiAgICB2ZXJpZnNpbnQodmFsdWUsIDB4N2ZmZiwgLTB4ODAwMClcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIGlmICh2YWx1ZSA+PSAwKVxuICAgIF93cml0ZVVJbnQxNihidWYsIHZhbHVlLCBvZmZzZXQsIGxpdHRsZUVuZGlhbiwgbm9Bc3NlcnQpXG4gIGVsc2VcbiAgICBfd3JpdGVVSW50MTYoYnVmLCAweGZmZmYgKyB2YWx1ZSArIDEsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDE2TEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlSW50MTYodGhpcywgdmFsdWUsIG9mZnNldCwgdHJ1ZSwgbm9Bc3NlcnQpXG59XG5cbkJ1ZmZlci5wcm90b3R5cGUud3JpdGVJbnQxNkJFID0gZnVuY3Rpb24gKHZhbHVlLCBvZmZzZXQsIG5vQXNzZXJ0KSB7XG4gIF93cml0ZUludDE2KHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuZnVuY3Rpb24gX3dyaXRlSW50MzIgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgMyA8IGJ1Zi5sZW5ndGgsICdUcnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmc2ludCh2YWx1ZSwgMHg3ZmZmZmZmZiwgLTB4ODAwMDAwMDApXG4gIH1cblxuICB2YXIgbGVuID0gYnVmLmxlbmd0aFxuICBpZiAob2Zmc2V0ID49IGxlbilcbiAgICByZXR1cm5cblxuICBpZiAodmFsdWUgPj0gMClcbiAgICBfd3JpdGVVSW50MzIoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KVxuICBlbHNlXG4gICAgX3dyaXRlVUludDMyKGJ1ZiwgMHhmZmZmZmZmZiArIHZhbHVlICsgMSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlSW50MzJMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVJbnQzMih0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUludDMyQkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlSW50MzIodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfd3JpdGVGbG9hdCAoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIG5vQXNzZXJ0KSB7XG4gIGlmICghbm9Bc3NlcnQpIHtcbiAgICBhc3NlcnQodmFsdWUgIT09IHVuZGVmaW5lZCAmJiB2YWx1ZSAhPT0gbnVsbCwgJ21pc3NpbmcgdmFsdWUnKVxuICAgIGFzc2VydCh0eXBlb2YgbGl0dGxlRW5kaWFuID09PSAnYm9vbGVhbicsICdtaXNzaW5nIG9yIGludmFsaWQgZW5kaWFuJylcbiAgICBhc3NlcnQob2Zmc2V0ICE9PSB1bmRlZmluZWQgJiYgb2Zmc2V0ICE9PSBudWxsLCAnbWlzc2luZyBvZmZzZXQnKVxuICAgIGFzc2VydChvZmZzZXQgKyAzIDwgYnVmLmxlbmd0aCwgJ1RyeWluZyB0byB3cml0ZSBiZXlvbmQgYnVmZmVyIGxlbmd0aCcpXG4gICAgdmVyaWZJRUVFNzU0KHZhbHVlLCAzLjQwMjgyMzQ2NjM4NTI4ODZlKzM4LCAtMy40MDI4MjM0NjYzODUyODg2ZSszOClcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIGllZWU3NTQud3JpdGUoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDIzLCA0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRmxvYXRMRSA9IGZ1bmN0aW9uICh2YWx1ZSwgb2Zmc2V0LCBub0Fzc2VydCkge1xuICBfd3JpdGVGbG9hdCh0aGlzLCB2YWx1ZSwgb2Zmc2V0LCB0cnVlLCBub0Fzc2VydClcbn1cblxuQnVmZmVyLnByb3RvdHlwZS53cml0ZUZsb2F0QkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlRmxvYXQodGhpcywgdmFsdWUsIG9mZnNldCwgZmFsc2UsIG5vQXNzZXJ0KVxufVxuXG5mdW5jdGlvbiBfd3JpdGVEb3VibGUgKGJ1ZiwgdmFsdWUsIG9mZnNldCwgbGl0dGxlRW5kaWFuLCBub0Fzc2VydCkge1xuICBpZiAoIW5vQXNzZXJ0KSB7XG4gICAgYXNzZXJ0KHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGwsICdtaXNzaW5nIHZhbHVlJylcbiAgICBhc3NlcnQodHlwZW9mIGxpdHRsZUVuZGlhbiA9PT0gJ2Jvb2xlYW4nLCAnbWlzc2luZyBvciBpbnZhbGlkIGVuZGlhbicpXG4gICAgYXNzZXJ0KG9mZnNldCAhPT0gdW5kZWZpbmVkICYmIG9mZnNldCAhPT0gbnVsbCwgJ21pc3Npbmcgb2Zmc2V0JylcbiAgICBhc3NlcnQob2Zmc2V0ICsgNyA8IGJ1Zi5sZW5ndGgsXG4gICAgICAgICdUcnlpbmcgdG8gd3JpdGUgYmV5b25kIGJ1ZmZlciBsZW5ndGgnKVxuICAgIHZlcmlmSUVFRTc1NCh2YWx1ZSwgMS43OTc2OTMxMzQ4NjIzMTU3RSszMDgsIC0xLjc5NzY5MzEzNDg2MjMxNTdFKzMwOClcbiAgfVxuXG4gIHZhciBsZW4gPSBidWYubGVuZ3RoXG4gIGlmIChvZmZzZXQgPj0gbGVuKVxuICAgIHJldHVyblxuXG4gIGllZWU3NTQud3JpdGUoYnVmLCB2YWx1ZSwgb2Zmc2V0LCBsaXR0bGVFbmRpYW4sIDUyLCA4KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRG91YmxlTEUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlRG91YmxlKHRoaXMsIHZhbHVlLCBvZmZzZXQsIHRydWUsIG5vQXNzZXJ0KVxufVxuXG5CdWZmZXIucHJvdG90eXBlLndyaXRlRG91YmxlQkUgPSBmdW5jdGlvbiAodmFsdWUsIG9mZnNldCwgbm9Bc3NlcnQpIHtcbiAgX3dyaXRlRG91YmxlKHRoaXMsIHZhbHVlLCBvZmZzZXQsIGZhbHNlLCBub0Fzc2VydClcbn1cblxuLy8gZmlsbCh2YWx1ZSwgc3RhcnQ9MCwgZW5kPWJ1ZmZlci5sZW5ndGgpXG5CdWZmZXIucHJvdG90eXBlLmZpbGwgPSBmdW5jdGlvbiAodmFsdWUsIHN0YXJ0LCBlbmQpIHtcbiAgaWYgKCF2YWx1ZSkgdmFsdWUgPSAwXG4gIGlmICghc3RhcnQpIHN0YXJ0ID0gMFxuICBpZiAoIWVuZCkgZW5kID0gdGhpcy5sZW5ndGhcblxuICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgIHZhbHVlID0gdmFsdWUuY2hhckNvZGVBdCgwKVxuICB9XG5cbiAgYXNzZXJ0KHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicgJiYgIWlzTmFOKHZhbHVlKSwgJ3ZhbHVlIGlzIG5vdCBhIG51bWJlcicpXG4gIGFzc2VydChlbmQgPj0gc3RhcnQsICdlbmQgPCBzdGFydCcpXG5cbiAgLy8gRmlsbCAwIGJ5dGVzOyB3ZSdyZSBkb25lXG4gIGlmIChlbmQgPT09IHN0YXJ0KSByZXR1cm5cbiAgaWYgKHRoaXMubGVuZ3RoID09PSAwKSByZXR1cm5cblxuICBhc3NlcnQoc3RhcnQgPj0gMCAmJiBzdGFydCA8IHRoaXMubGVuZ3RoLCAnc3RhcnQgb3V0IG9mIGJvdW5kcycpXG4gIGFzc2VydChlbmQgPj0gMCAmJiBlbmQgPD0gdGhpcy5sZW5ndGgsICdlbmQgb3V0IG9mIGJvdW5kcycpXG5cbiAgZm9yICh2YXIgaSA9IHN0YXJ0OyBpIDwgZW5kOyBpKyspIHtcbiAgICB0aGlzW2ldID0gdmFsdWVcbiAgfVxufVxuXG5CdWZmZXIucHJvdG90eXBlLmluc3BlY3QgPSBmdW5jdGlvbiAoKSB7XG4gIHZhciBvdXQgPSBbXVxuICB2YXIgbGVuID0gdGhpcy5sZW5ndGhcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgIG91dFtpXSA9IHRvSGV4KHRoaXNbaV0pXG4gICAgaWYgKGkgPT09IGV4cG9ydHMuSU5TUEVDVF9NQVhfQllURVMpIHtcbiAgICAgIG91dFtpICsgMV0gPSAnLi4uJ1xuICAgICAgYnJlYWtcbiAgICB9XG4gIH1cbiAgcmV0dXJuICc8QnVmZmVyICcgKyBvdXQuam9pbignICcpICsgJz4nXG59XG5cbi8qKlxuICogQ3JlYXRlcyBhIG5ldyBgQXJyYXlCdWZmZXJgIHdpdGggdGhlICpjb3BpZWQqIG1lbW9yeSBvZiB0aGUgYnVmZmVyIGluc3RhbmNlLlxuICogQWRkZWQgaW4gTm9kZSAwLjEyLiBPbmx5IGF2YWlsYWJsZSBpbiBicm93c2VycyB0aGF0IHN1cHBvcnQgQXJyYXlCdWZmZXIuXG4gKi9cbkJ1ZmZlci5wcm90b3R5cGUudG9BcnJheUJ1ZmZlciA9IGZ1bmN0aW9uICgpIHtcbiAgaWYgKHR5cGVvZiBVaW50OEFycmF5ICE9PSAndW5kZWZpbmVkJykge1xuICAgIGlmIChCdWZmZXIuX3VzZVR5cGVkQXJyYXlzKSB7XG4gICAgICByZXR1cm4gKG5ldyBCdWZmZXIodGhpcykpLmJ1ZmZlclxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgYnVmID0gbmV3IFVpbnQ4QXJyYXkodGhpcy5sZW5ndGgpXG4gICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gYnVmLmxlbmd0aDsgaSA8IGxlbjsgaSArPSAxKVxuICAgICAgICBidWZbaV0gPSB0aGlzW2ldXG4gICAgICByZXR1cm4gYnVmLmJ1ZmZlclxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0J1ZmZlci50b0FycmF5QnVmZmVyIG5vdCBzdXBwb3J0ZWQgaW4gdGhpcyBicm93c2VyJylcbiAgfVxufVxuXG4vLyBIRUxQRVIgRlVOQ1RJT05TXG4vLyA9PT09PT09PT09PT09PT09XG5cbmZ1bmN0aW9uIHN0cmluZ3RyaW0gKHN0cikge1xuICBpZiAoc3RyLnRyaW0pIHJldHVybiBzdHIudHJpbSgpXG4gIHJldHVybiBzdHIucmVwbGFjZSgvXlxccyt8XFxzKyQvZywgJycpXG59XG5cbnZhciBCUCA9IEJ1ZmZlci5wcm90b3R5cGVcblxuLyoqXG4gKiBBdWdtZW50IGEgVWludDhBcnJheSAqaW5zdGFuY2UqIChub3QgdGhlIFVpbnQ4QXJyYXkgY2xhc3MhKSB3aXRoIEJ1ZmZlciBtZXRob2RzXG4gKi9cbkJ1ZmZlci5fYXVnbWVudCA9IGZ1bmN0aW9uIChhcnIpIHtcbiAgYXJyLl9pc0J1ZmZlciA9IHRydWVcblxuICAvLyBzYXZlIHJlZmVyZW5jZSB0byBvcmlnaW5hbCBVaW50OEFycmF5IGdldC9zZXQgbWV0aG9kcyBiZWZvcmUgb3ZlcndyaXRpbmdcbiAgYXJyLl9nZXQgPSBhcnIuZ2V0XG4gIGFyci5fc2V0ID0gYXJyLnNldFxuXG4gIC8vIGRlcHJlY2F0ZWQsIHdpbGwgYmUgcmVtb3ZlZCBpbiBub2RlIDAuMTMrXG4gIGFyci5nZXQgPSBCUC5nZXRcbiAgYXJyLnNldCA9IEJQLnNldFxuXG4gIGFyci53cml0ZSA9IEJQLndyaXRlXG4gIGFyci50b1N0cmluZyA9IEJQLnRvU3RyaW5nXG4gIGFyci50b0xvY2FsZVN0cmluZyA9IEJQLnRvU3RyaW5nXG4gIGFyci50b0pTT04gPSBCUC50b0pTT05cbiAgYXJyLmNvcHkgPSBCUC5jb3B5XG4gIGFyci5zbGljZSA9IEJQLnNsaWNlXG4gIGFyci5yZWFkVUludDggPSBCUC5yZWFkVUludDhcbiAgYXJyLnJlYWRVSW50MTZMRSA9IEJQLnJlYWRVSW50MTZMRVxuICBhcnIucmVhZFVJbnQxNkJFID0gQlAucmVhZFVJbnQxNkJFXG4gIGFyci5yZWFkVUludDMyTEUgPSBCUC5yZWFkVUludDMyTEVcbiAgYXJyLnJlYWRVSW50MzJCRSA9IEJQLnJlYWRVSW50MzJCRVxuICBhcnIucmVhZEludDggPSBCUC5yZWFkSW50OFxuICBhcnIucmVhZEludDE2TEUgPSBCUC5yZWFkSW50MTZMRVxuICBhcnIucmVhZEludDE2QkUgPSBCUC5yZWFkSW50MTZCRVxuICBhcnIucmVhZEludDMyTEUgPSBCUC5yZWFkSW50MzJMRVxuICBhcnIucmVhZEludDMyQkUgPSBCUC5yZWFkSW50MzJCRVxuICBhcnIucmVhZEZsb2F0TEUgPSBCUC5yZWFkRmxvYXRMRVxuICBhcnIucmVhZEZsb2F0QkUgPSBCUC5yZWFkRmxvYXRCRVxuICBhcnIucmVhZERvdWJsZUxFID0gQlAucmVhZERvdWJsZUxFXG4gIGFyci5yZWFkRG91YmxlQkUgPSBCUC5yZWFkRG91YmxlQkVcbiAgYXJyLndyaXRlVUludDggPSBCUC53cml0ZVVJbnQ4XG4gIGFyci53cml0ZVVJbnQxNkxFID0gQlAud3JpdGVVSW50MTZMRVxuICBhcnIud3JpdGVVSW50MTZCRSA9IEJQLndyaXRlVUludDE2QkVcbiAgYXJyLndyaXRlVUludDMyTEUgPSBCUC53cml0ZVVJbnQzMkxFXG4gIGFyci53cml0ZVVJbnQzMkJFID0gQlAud3JpdGVVSW50MzJCRVxuICBhcnIud3JpdGVJbnQ4ID0gQlAud3JpdGVJbnQ4XG4gIGFyci53cml0ZUludDE2TEUgPSBCUC53cml0ZUludDE2TEVcbiAgYXJyLndyaXRlSW50MTZCRSA9IEJQLndyaXRlSW50MTZCRVxuICBhcnIud3JpdGVJbnQzMkxFID0gQlAud3JpdGVJbnQzMkxFXG4gIGFyci53cml0ZUludDMyQkUgPSBCUC53cml0ZUludDMyQkVcbiAgYXJyLndyaXRlRmxvYXRMRSA9IEJQLndyaXRlRmxvYXRMRVxuICBhcnIud3JpdGVGbG9hdEJFID0gQlAud3JpdGVGbG9hdEJFXG4gIGFyci53cml0ZURvdWJsZUxFID0gQlAud3JpdGVEb3VibGVMRVxuICBhcnIud3JpdGVEb3VibGVCRSA9IEJQLndyaXRlRG91YmxlQkVcbiAgYXJyLmZpbGwgPSBCUC5maWxsXG4gIGFyci5pbnNwZWN0ID0gQlAuaW5zcGVjdFxuICBhcnIudG9BcnJheUJ1ZmZlciA9IEJQLnRvQXJyYXlCdWZmZXJcblxuICByZXR1cm4gYXJyXG59XG5cbi8vIHNsaWNlKHN0YXJ0LCBlbmQpXG5mdW5jdGlvbiBjbGFtcCAoaW5kZXgsIGxlbiwgZGVmYXVsdFZhbHVlKSB7XG4gIGlmICh0eXBlb2YgaW5kZXggIT09ICdudW1iZXInKSByZXR1cm4gZGVmYXVsdFZhbHVlXG4gIGluZGV4ID0gfn5pbmRleDsgIC8vIENvZXJjZSB0byBpbnRlZ2VyLlxuICBpZiAoaW5kZXggPj0gbGVuKSByZXR1cm4gbGVuXG4gIGlmIChpbmRleCA+PSAwKSByZXR1cm4gaW5kZXhcbiAgaW5kZXggKz0gbGVuXG4gIGlmIChpbmRleCA+PSAwKSByZXR1cm4gaW5kZXhcbiAgcmV0dXJuIDBcbn1cblxuZnVuY3Rpb24gY29lcmNlIChsZW5ndGgpIHtcbiAgLy8gQ29lcmNlIGxlbmd0aCB0byBhIG51bWJlciAocG9zc2libHkgTmFOKSwgcm91bmQgdXBcbiAgLy8gaW4gY2FzZSBpdCdzIGZyYWN0aW9uYWwgKGUuZy4gMTIzLjQ1NikgdGhlbiBkbyBhXG4gIC8vIGRvdWJsZSBuZWdhdGUgdG8gY29lcmNlIGEgTmFOIHRvIDAuIEVhc3ksIHJpZ2h0P1xuICBsZW5ndGggPSB+fk1hdGguY2VpbCgrbGVuZ3RoKVxuICByZXR1cm4gbGVuZ3RoIDwgMCA/IDAgOiBsZW5ndGhcbn1cblxuZnVuY3Rpb24gaXNBcnJheSAoc3ViamVjdCkge1xuICByZXR1cm4gKEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24gKHN1YmplY3QpIHtcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHN1YmplY3QpID09PSAnW29iamVjdCBBcnJheV0nXG4gIH0pKHN1YmplY3QpXG59XG5cbmZ1bmN0aW9uIGlzQXJyYXlpc2ggKHN1YmplY3QpIHtcbiAgcmV0dXJuIGlzQXJyYXkoc3ViamVjdCkgfHwgQnVmZmVyLmlzQnVmZmVyKHN1YmplY3QpIHx8XG4gICAgICBzdWJqZWN0ICYmIHR5cGVvZiBzdWJqZWN0ID09PSAnb2JqZWN0JyAmJlxuICAgICAgdHlwZW9mIHN1YmplY3QubGVuZ3RoID09PSAnbnVtYmVyJ1xufVxuXG5mdW5jdGlvbiB0b0hleCAobikge1xuICBpZiAobiA8IDE2KSByZXR1cm4gJzAnICsgbi50b1N0cmluZygxNilcbiAgcmV0dXJuIG4udG9TdHJpbmcoMTYpXG59XG5cbmZ1bmN0aW9uIHV0ZjhUb0J5dGVzIChzdHIpIHtcbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGIgPSBzdHIuY2hhckNvZGVBdChpKVxuICAgIGlmIChiIDw9IDB4N0YpXG4gICAgICBieXRlQXJyYXkucHVzaChzdHIuY2hhckNvZGVBdChpKSlcbiAgICBlbHNlIHtcbiAgICAgIHZhciBzdGFydCA9IGlcbiAgICAgIGlmIChiID49IDB4RDgwMCAmJiBiIDw9IDB4REZGRikgaSsrXG4gICAgICB2YXIgaCA9IGVuY29kZVVSSUNvbXBvbmVudChzdHIuc2xpY2Uoc3RhcnQsIGkrMSkpLnN1YnN0cigxKS5zcGxpdCgnJScpXG4gICAgICBmb3IgKHZhciBqID0gMDsgaiA8IGgubGVuZ3RoOyBqKyspXG4gICAgICAgIGJ5dGVBcnJheS5wdXNoKHBhcnNlSW50KGhbal0sIDE2KSlcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGJ5dGVBcnJheVxufVxuXG5mdW5jdGlvbiBhc2NpaVRvQnl0ZXMgKHN0cikge1xuICB2YXIgYnl0ZUFycmF5ID0gW11cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICAvLyBOb2RlJ3MgY29kZSBzZWVtcyB0byBiZSBkb2luZyB0aGlzIGFuZCBub3QgJiAweDdGLi5cbiAgICBieXRlQXJyYXkucHVzaChzdHIuY2hhckNvZGVBdChpKSAmIDB4RkYpXG4gIH1cbiAgcmV0dXJuIGJ5dGVBcnJheVxufVxuXG5mdW5jdGlvbiB1dGYxNmxlVG9CeXRlcyAoc3RyKSB7XG4gIHZhciBjLCBoaSwgbG9cbiAgdmFyIGJ5dGVBcnJheSA9IFtdXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgYyA9IHN0ci5jaGFyQ29kZUF0KGkpXG4gICAgaGkgPSBjID4+IDhcbiAgICBsbyA9IGMgJSAyNTZcbiAgICBieXRlQXJyYXkucHVzaChsbylcbiAgICBieXRlQXJyYXkucHVzaChoaSlcbiAgfVxuXG4gIHJldHVybiBieXRlQXJyYXlcbn1cblxuZnVuY3Rpb24gYmFzZTY0VG9CeXRlcyAoc3RyKSB7XG4gIHJldHVybiBiYXNlNjQudG9CeXRlQXJyYXkoc3RyKVxufVxuXG5mdW5jdGlvbiBibGl0QnVmZmVyIChzcmMsIGRzdCwgb2Zmc2V0LCBsZW5ndGgpIHtcbiAgdmFyIHBvc1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKChpICsgb2Zmc2V0ID49IGRzdC5sZW5ndGgpIHx8IChpID49IHNyYy5sZW5ndGgpKVxuICAgICAgYnJlYWtcbiAgICBkc3RbaSArIG9mZnNldF0gPSBzcmNbaV1cbiAgfVxuICByZXR1cm4gaVxufVxuXG5mdW5jdGlvbiBkZWNvZGVVdGY4Q2hhciAoc3RyKSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChzdHIpXG4gIH0gY2F0Y2ggKGVycikge1xuICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlKDB4RkZGRCkgLy8gVVRGIDggaW52YWxpZCBjaGFyXG4gIH1cbn1cblxuLypcbiAqIFdlIGhhdmUgdG8gbWFrZSBzdXJlIHRoYXQgdGhlIHZhbHVlIGlzIGEgdmFsaWQgaW50ZWdlci4gVGhpcyBtZWFucyB0aGF0IGl0XG4gKiBpcyBub24tbmVnYXRpdmUuIEl0IGhhcyBubyBmcmFjdGlvbmFsIGNvbXBvbmVudCBhbmQgdGhhdCBpdCBkb2VzIG5vdFxuICogZXhjZWVkIHRoZSBtYXhpbXVtIGFsbG93ZWQgdmFsdWUuXG4gKi9cbmZ1bmN0aW9uIHZlcmlmdWludCAodmFsdWUsIG1heCkge1xuICBhc3NlcnQodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJywgJ2Nhbm5vdCB3cml0ZSBhIG5vbi1udW1iZXIgYXMgYSBudW1iZXInKVxuICBhc3NlcnQodmFsdWUgPj0gMCwgJ3NwZWNpZmllZCBhIG5lZ2F0aXZlIHZhbHVlIGZvciB3cml0aW5nIGFuIHVuc2lnbmVkIHZhbHVlJylcbiAgYXNzZXJ0KHZhbHVlIDw9IG1heCwgJ3ZhbHVlIGlzIGxhcmdlciB0aGFuIG1heGltdW0gdmFsdWUgZm9yIHR5cGUnKVxuICBhc3NlcnQoTWF0aC5mbG9vcih2YWx1ZSkgPT09IHZhbHVlLCAndmFsdWUgaGFzIGEgZnJhY3Rpb25hbCBjb21wb25lbnQnKVxufVxuXG5mdW5jdGlvbiB2ZXJpZnNpbnQgKHZhbHVlLCBtYXgsIG1pbikge1xuICBhc3NlcnQodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJywgJ2Nhbm5vdCB3cml0ZSBhIG5vbi1udW1iZXIgYXMgYSBudW1iZXInKVxuICBhc3NlcnQodmFsdWUgPD0gbWF4LCAndmFsdWUgbGFyZ2VyIHRoYW4gbWF4aW11bSBhbGxvd2VkIHZhbHVlJylcbiAgYXNzZXJ0KHZhbHVlID49IG1pbiwgJ3ZhbHVlIHNtYWxsZXIgdGhhbiBtaW5pbXVtIGFsbG93ZWQgdmFsdWUnKVxuICBhc3NlcnQoTWF0aC5mbG9vcih2YWx1ZSkgPT09IHZhbHVlLCAndmFsdWUgaGFzIGEgZnJhY3Rpb25hbCBjb21wb25lbnQnKVxufVxuXG5mdW5jdGlvbiB2ZXJpZklFRUU3NTQgKHZhbHVlLCBtYXgsIG1pbikge1xuICBhc3NlcnQodHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJywgJ2Nhbm5vdCB3cml0ZSBhIG5vbi1udW1iZXIgYXMgYSBudW1iZXInKVxuICBhc3NlcnQodmFsdWUgPD0gbWF4LCAndmFsdWUgbGFyZ2VyIHRoYW4gbWF4aW11bSBhbGxvd2VkIHZhbHVlJylcbiAgYXNzZXJ0KHZhbHVlID49IG1pbiwgJ3ZhbHVlIHNtYWxsZXIgdGhhbiBtaW5pbXVtIGFsbG93ZWQgdmFsdWUnKVxufVxuXG5mdW5jdGlvbiBhc3NlcnQgKHRlc3QsIG1lc3NhZ2UpIHtcbiAgaWYgKCF0ZXN0KSB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZSB8fCAnRmFpbGVkIGFzc2VydGlvbicpXG59XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwickgxSlBHXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vLi4vbm9kZV9tb2R1bGVzL2J1ZmZlci9pbmRleC5qc1wiLFwiLy4uLy4uL25vZGVfbW9kdWxlcy9idWZmZXJcIikiLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsLEJ1ZmZlcixfX2FyZ3VtZW50MCxfX2FyZ3VtZW50MSxfX2FyZ3VtZW50MixfX2FyZ3VtZW50MyxfX2ZpbGVuYW1lLF9fZGlybmFtZSl7XG5leHBvcnRzLnJlYWQgPSBmdW5jdGlvbiAoYnVmZmVyLCBvZmZzZXQsIGlzTEUsIG1MZW4sIG5CeXRlcykge1xuICB2YXIgZSwgbVxuICB2YXIgZUxlbiA9IG5CeXRlcyAqIDggLSBtTGVuIC0gMVxuICB2YXIgZU1heCA9ICgxIDw8IGVMZW4pIC0gMVxuICB2YXIgZUJpYXMgPSBlTWF4ID4+IDFcbiAgdmFyIG5CaXRzID0gLTdcbiAgdmFyIGkgPSBpc0xFID8gKG5CeXRlcyAtIDEpIDogMFxuICB2YXIgZCA9IGlzTEUgPyAtMSA6IDFcbiAgdmFyIHMgPSBidWZmZXJbb2Zmc2V0ICsgaV1cblxuICBpICs9IGRcblxuICBlID0gcyAmICgoMSA8PCAoLW5CaXRzKSkgLSAxKVxuICBzID4+PSAoLW5CaXRzKVxuICBuQml0cyArPSBlTGVuXG4gIGZvciAoOyBuQml0cyA+IDA7IGUgPSBlICogMjU2ICsgYnVmZmVyW29mZnNldCArIGldLCBpICs9IGQsIG5CaXRzIC09IDgpIHt9XG5cbiAgbSA9IGUgJiAoKDEgPDwgKC1uQml0cykpIC0gMSlcbiAgZSA+Pj0gKC1uQml0cylcbiAgbkJpdHMgKz0gbUxlblxuICBmb3IgKDsgbkJpdHMgPiAwOyBtID0gbSAqIDI1NiArIGJ1ZmZlcltvZmZzZXQgKyBpXSwgaSArPSBkLCBuQml0cyAtPSA4KSB7fVxuXG4gIGlmIChlID09PSAwKSB7XG4gICAgZSA9IDEgLSBlQmlhc1xuICB9IGVsc2UgaWYgKGUgPT09IGVNYXgpIHtcbiAgICByZXR1cm4gbSA/IE5hTiA6ICgocyA/IC0xIDogMSkgKiBJbmZpbml0eSlcbiAgfSBlbHNlIHtcbiAgICBtID0gbSArIE1hdGgucG93KDIsIG1MZW4pXG4gICAgZSA9IGUgLSBlQmlhc1xuICB9XG4gIHJldHVybiAocyA/IC0xIDogMSkgKiBtICogTWF0aC5wb3coMiwgZSAtIG1MZW4pXG59XG5cbmV4cG9ydHMud3JpdGUgPSBmdW5jdGlvbiAoYnVmZmVyLCB2YWx1ZSwgb2Zmc2V0LCBpc0xFLCBtTGVuLCBuQnl0ZXMpIHtcbiAgdmFyIGUsIG0sIGNcbiAgdmFyIGVMZW4gPSBuQnl0ZXMgKiA4IC0gbUxlbiAtIDFcbiAgdmFyIGVNYXggPSAoMSA8PCBlTGVuKSAtIDFcbiAgdmFyIGVCaWFzID0gZU1heCA+PiAxXG4gIHZhciBydCA9IChtTGVuID09PSAyMyA/IE1hdGgucG93KDIsIC0yNCkgLSBNYXRoLnBvdygyLCAtNzcpIDogMClcbiAgdmFyIGkgPSBpc0xFID8gMCA6IChuQnl0ZXMgLSAxKVxuICB2YXIgZCA9IGlzTEUgPyAxIDogLTFcbiAgdmFyIHMgPSB2YWx1ZSA8IDAgfHwgKHZhbHVlID09PSAwICYmIDEgLyB2YWx1ZSA8IDApID8gMSA6IDBcblxuICB2YWx1ZSA9IE1hdGguYWJzKHZhbHVlKVxuXG4gIGlmIChpc05hTih2YWx1ZSkgfHwgdmFsdWUgPT09IEluZmluaXR5KSB7XG4gICAgbSA9IGlzTmFOKHZhbHVlKSA/IDEgOiAwXG4gICAgZSA9IGVNYXhcbiAgfSBlbHNlIHtcbiAgICBlID0gTWF0aC5mbG9vcihNYXRoLmxvZyh2YWx1ZSkgLyBNYXRoLkxOMilcbiAgICBpZiAodmFsdWUgKiAoYyA9IE1hdGgucG93KDIsIC1lKSkgPCAxKSB7XG4gICAgICBlLS1cbiAgICAgIGMgKj0gMlxuICAgIH1cbiAgICBpZiAoZSArIGVCaWFzID49IDEpIHtcbiAgICAgIHZhbHVlICs9IHJ0IC8gY1xuICAgIH0gZWxzZSB7XG4gICAgICB2YWx1ZSArPSBydCAqIE1hdGgucG93KDIsIDEgLSBlQmlhcylcbiAgICB9XG4gICAgaWYgKHZhbHVlICogYyA+PSAyKSB7XG4gICAgICBlKytcbiAgICAgIGMgLz0gMlxuICAgIH1cblxuICAgIGlmIChlICsgZUJpYXMgPj0gZU1heCkge1xuICAgICAgbSA9IDBcbiAgICAgIGUgPSBlTWF4XG4gICAgfSBlbHNlIGlmIChlICsgZUJpYXMgPj0gMSkge1xuICAgICAgbSA9ICh2YWx1ZSAqIGMgLSAxKSAqIE1hdGgucG93KDIsIG1MZW4pXG4gICAgICBlID0gZSArIGVCaWFzXG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSB2YWx1ZSAqIE1hdGgucG93KDIsIGVCaWFzIC0gMSkgKiBNYXRoLnBvdygyLCBtTGVuKVxuICAgICAgZSA9IDBcbiAgICB9XG4gIH1cblxuICBmb3IgKDsgbUxlbiA+PSA4OyBidWZmZXJbb2Zmc2V0ICsgaV0gPSBtICYgMHhmZiwgaSArPSBkLCBtIC89IDI1NiwgbUxlbiAtPSA4KSB7fVxuXG4gIGUgPSAoZSA8PCBtTGVuKSB8IG1cbiAgZUxlbiArPSBtTGVuXG4gIGZvciAoOyBlTGVuID4gMDsgYnVmZmVyW29mZnNldCArIGldID0gZSAmIDB4ZmYsIGkgKz0gZCwgZSAvPSAyNTYsIGVMZW4gLT0gOCkge31cblxuICBidWZmZXJbb2Zmc2V0ICsgaSAtIGRdIHw9IHMgKiAxMjhcbn1cblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoXCJySDFKUEdcIiksdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9LHJlcXVpcmUoXCJidWZmZXJcIikuQnVmZmVyLGFyZ3VtZW50c1szXSxhcmd1bWVudHNbNF0sYXJndW1lbnRzWzVdLGFyZ3VtZW50c1s2XSxcIi8uLi8uLi9ub2RlX21vZHVsZXMvaWVlZTc1NC9pbmRleC5qc1wiLFwiLy4uLy4uL25vZGVfbW9kdWxlcy9pZWVlNzU0XCIpIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCxCdWZmZXIsX19hcmd1bWVudDAsX19hcmd1bWVudDEsX19hcmd1bWVudDIsX19hcmd1bWVudDMsX19maWxlbmFtZSxfX2Rpcm5hbWUpe1xuLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxucHJvY2Vzcy5uZXh0VGljayA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNhblNldEltbWVkaWF0ZSA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnNldEltbWVkaWF0ZTtcbiAgICB2YXIgY2FuUG9zdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnBvc3RNZXNzYWdlICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyXG4gICAgO1xuXG4gICAgaWYgKGNhblNldEltbWVkaWF0ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGYpIHsgcmV0dXJuIHdpbmRvdy5zZXRJbW1lZGlhdGUoZikgfTtcbiAgICB9XG5cbiAgICBpZiAoY2FuUG9zdCkge1xuICAgICAgICB2YXIgcXVldWUgPSBbXTtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSBldi5zb3VyY2U7XG4gICAgICAgICAgICBpZiAoKHNvdXJjZSA9PT0gd2luZG93IHx8IHNvdXJjZSA9PT0gbnVsbCkgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufVxuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKFwickgxSlBHXCIpLHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSxyZXF1aXJlKFwiYnVmZmVyXCIpLkJ1ZmZlcixhcmd1bWVudHNbM10sYXJndW1lbnRzWzRdLGFyZ3VtZW50c1s1XSxhcmd1bWVudHNbNl0sXCIvLi4vLi4vbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qc1wiLFwiLy4uLy4uL25vZGVfbW9kdWxlcy9wcm9jZXNzXCIpIl19
