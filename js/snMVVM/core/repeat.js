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
                if(parentRepeat) {
                    element.parentRepeat = parentRepeat;
                    if (parentRepeat.childRepeat) parentRepeat.childRepeat.push();
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

    nsp.__getChildRepeat = function (repeat) {
        for (var i = 0; i < this.__REPEAT_DOM.length; i++) {
            var repeatItem = this.__REPEAT_DOM[i];
            if (repeat == repeatItem.parentRepeat) return repeatItem;
        }
    };


    nsp.__applyRepeat = function (REPEAT_DOM, scope) {
        REPEAT_DOM = REPEAT_DOM || this.__REPEAT_DOM;
//        console.log(REPEAT_DOM == this.__REPEAT_DOM);
        scope = scope || this.scope;
        for (var i = 0; i < REPEAT_DOM.length; i++) {
            var repeatItem = REPEAT_DOM[i];
            if (REPEAT_DOM == this.__REPEAT_DOM && repeatItem.parentRepeat) continue;
//            console.log(repeatItem, repeatItem.htmlInner);
            var domCreatedFromHtml = snKnife.dom.createElement(repeatItem.htmlInner);
            var data = repeatItem.getAttribute(this.stgs.attrRepeat);
            data = data.split(' in ');
            if (data.length != 2) return;
            var dataScope = this.getData(data[1], scope);
//            console.log(data[1], dataScope);
            var textInner = '';
            if (!dataScope) return;
            for (var j = 0; j < dataScope.length; j++) {
                var itemScope = dataScope[j];
                var newScope = {};
                newScope[data[0]] = itemScope;
//                console.log(repeatItem.htmlInner);
                var rdyDOM = this.__setScopeDOM(domCreatedFromHtml, newScope);
                textInner += snKnife.dom.getTextFromHtml(rdyDOM);
            }

//            console.log(repeatItem.childRepeat);
            if (repeatItem.childRepeat) {
                var renderChildRepeat = this.__applyRepeat(repeatItem.childRepeat, newScope);
                var repeatNewDom = this.__getRepeatDOM(domCreatedFromHtml, repeatItem);
                repeatNewDom[0].innerHTML = snKnife.dom.getTextFromHtml(renderChildRepeat);
                console.log(repeatNewDom[0].outerHTML);
            }
//            if (repeatNewDom.length) {
////                this.__cutRepeat(repeatNewDom);
//                console.log(snKnife.dom.getTextFromHtml(this.__applyRepeat(repeatNewDom, newScope)));
//            }
//            console.log(textInner);
            repeatItem.innerHTML = textInner;

//            repeatItem.appendChild(rdyDOM);

        }
        return REPEAT_DOM;
    };

    return ns;
};