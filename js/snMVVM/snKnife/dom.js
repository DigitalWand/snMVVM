/**
 * Created by snatvb on 31.05.16.
 */



module.exports = {
    DIV: document.createElement("div"),
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
    createElement: function (html) {
        var res = [];
        this.DIV.innerHTML = html;
        while (this.DIV.firstChild) {
            res[res.length] = this.DIV.removeChild(this.DIV.firstChild);
        }
        return res;
    }
};