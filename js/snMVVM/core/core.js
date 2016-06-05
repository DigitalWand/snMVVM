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