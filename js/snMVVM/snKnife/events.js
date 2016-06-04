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