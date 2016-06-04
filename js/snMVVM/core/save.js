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