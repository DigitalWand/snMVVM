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