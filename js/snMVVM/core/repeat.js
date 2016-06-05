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

    /**
     * Вырезаем innerHTML
     * @param REPEAT_DOM
     * @private
     */
    nsp.__cutRepeat = function (REPEAT_DOM) {
        REPEAT_DOM = REPEAT_DOM || this.__REPEAT_DOM;
        for (var i = REPEAT_DOM.length - 1; i >= 0; i--) {
            var repeatItem = REPEAT_DOM[i];
            repeatItem.htmlInner = repeatItem.innerHTML;
//            repeatItem.innerHTML = ' ';
        }
    };

    /**
     * Получаем repeat из переданного dom
     * @param dom
     * @param item
     * @returns {*}
     * @private
     */
    nsp.__getChildRepeat = function (dom, item) {
        for (var i = 0; i < dom.length; i++) {
            var repeatItem = dom[i];
            if (!repeatItem.outerHTML || !item.outerHTML) continue;
            if (item.outerHTML == repeatItem.outerHTML) return repeatItem;
        }
    };


    /**
     * Применение самого repeat
     * @param REPEAT_DOM
     * @param scope
     * @returns {*|Array}
     * @private
     */
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

    /**
     * Рендерим Repeat
     * @param element
     * @param scope
     * @param data
     * @param repeatItem
     * @returns {string}
     * @private
     */
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

    /**
     * Отрисовываем вложенности
     * @param rdyDOM
     * @param scope
     * @param data
     * @param repeatItem
     * @returns {*}
     * @private
     */
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