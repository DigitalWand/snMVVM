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