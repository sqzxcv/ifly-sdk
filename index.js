/**
 * Created by nicholas on 17-2-15.
 */
'use strict';
const _ = require('lodash');
const ffi = require('ffi');
const ref = require('ref');

var ifly;

const IsrSession = require('./lib/isr_session');

function IFly(appId, libPath) {
    this._ifly = ffi.Library(libPath, {
        'MSPLogin': ['int', ['string', 'string', 'string']],
        'QISRSessionBegin': ['string', ['pointer', 'string', 'int *']],
        'QISRSessionEnd': ['int', ['string', 'string']],
        'QISRAudioWrite': ['int', ['string', 'pointer', 'int', 'int', 'int *', 'int *']],
        'QISRGetResult': ['string', ['string', 'int *', 'int', 'int *']]
    });
    let errcode = this._ifly.MSPLogin(null, null, 'appid = ' + appId + ', work_dir = .');
    if (errcode !== 0) {
        throw new Error('Failed to login. errcode ' + errcode);
    }
}

IFly.prototype.createIsrSession = function (options) {
    return new IsrSession(this._ifly, options);
};

module.exports = IFly;