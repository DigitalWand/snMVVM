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
require('./core/save')(snMVVM);
require('./core/loader')(snMVVM);
/**
 * End Build
 */

(function () {
    var mvvm = new snMVVM({name: 'snatvb', phone: '+7 (800) 000 00 00'});

    console.log(mvvm.version.getFull());
})();