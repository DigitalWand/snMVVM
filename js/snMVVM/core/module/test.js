/**
 * Created by snatvb on 04.06.16.
 */


var testModule = function (core) {
    this.className = 'testModule';
    this.core = core;
    this.init();
};

testModule.prototype = {
    init: function () {
//        console.log(this.className + ' is loaded.');
    }
};

module.exports = testModule;