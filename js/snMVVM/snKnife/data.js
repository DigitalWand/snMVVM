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