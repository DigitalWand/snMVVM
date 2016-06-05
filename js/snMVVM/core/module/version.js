/**
 * Created by snatvb on 04.06.16.
 */

var Version = function (core) {
    this.core = core;
    this.className = 'version';
    this.init();
};

Version.prototype = {
    init: function () {
        this.major = 0;
        this.minor = 3;
        this.dot = 1;
        this.build = 'alpha';
    },
    getWithoutBuild: function () {
        return [this.major, this.minor, this.dot].join('.');
    },
    getFull: function () {
        return this.getWithoutBuild() + ' ' + this.build;
    },
    getObject: function () {
        return {
            full: this.getFull(),
            withoutBuild: this.getWithoutBuild(),
            major: this.major,
            minor: this.minor,
            dot: this.dot,
            build: this.build
        };
    }
};

module.exports = Version;