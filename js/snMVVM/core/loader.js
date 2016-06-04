/**
 * Created by snatvb on 04.06.16.
 */

var snKnife = require('../snKnife/index');

module.exports = function (ns) {

    if (!ns) return console.warn('MVVM not found');

    /**
     * Расширительный модуль загрузки сторонних модулей
     * @type {Object|Function|*}
     */

    var nsp = ns.prototype;
    /**
     * Загрузка модулей
     * @returns {Array}
     * @private
     */
    nsp.__loaderModules = function () {
        /// <reference path="./core.js"/>
        var defaultModulesLoaded = this.__loaderModulesArr(this.DEFAULT_MODULE);
        var userModulesLoaded = this.__loaderModulesArr(this.USER_MODULE);

        return defaultModulesLoaded.concat(userModulesLoaded);
    };
    nsp.__loaderModulesArr = function (modules) {
        var loadedModules = [];
        for (var i = 0; i < modules.length; i++) {
            var module = modules[i];
            var loadModule = this.__loadModule(module);
            if (loadModule) loadedModules.push(loadModule.className);
        }
        return loadedModules;
    };

    /**
     * Есть ли такой модуль
     * @param moduleName
     * @returns {boolean}
     * @private
     */
    nsp.__moduleExist = function (moduleName) {
        return typeof this[moduleName] != 'undefined';
    };

    /**
     * Загрузка одного модуля
     * @param module
     * @returns {*}
     * @private
     */
    nsp.__loadModule = function (module) {
        var newModule = new module(this);
        if (newModule.className) {
            if (this.__moduleExist(newModule.className) && this.stgs.replaceModule) {
                if(this.stgs.replaceModuleMsg)
                    console.warn('Module "' + newModule.className + '" exist, it will be replaced');
                this[newModule.className] = newModule;
                return newModule;
            }
            if (!this.__moduleExist(newModule.className)) {
                this[newModule.className] = newModule;
                return newModule;
            }
        }
        return false;
    };

    return ns;
};