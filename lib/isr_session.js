/**
 * Created by nicholas on 17-2-15.
 */
const {EventEmitter} = require('events');
const util = require('util');
const _ = require('lodash');
const ref = require('ref');

const MSP_AUDIO_SAMPLE_INIT = 0x00;
const MSP_AUDIO_SAMPLE_FIRST = 0x01;
const MSP_AUDIO_SAMPLE_CONTINUE = 0x02;
const MSP_AUDIO_SAMPLE_LAST = 0x04;

const MSP_REC_STATUS_SUCCESS = 0;
const MSP_REC_STATUS_COMPLETE = 5;

function IsrSession(iflyLib, options) {
    EventEmitter.call(this);
    let defaults = {
        sub: 'iat',
        domain: 'iat',
        language: 'zh_cn',
        accent: 'mandarin',
        sample_rate: '16000',
        result_type: 'plain',
        result_encoding: 'utf8'
    };
    options = _.defaultsDeep(options, defaults);
    let params = [];
    for (let key in options) {
        params.push(key + '=' + options[key]);
    }
    let session_params = params.join(',');
    let errcodePointer = ref.alloc(ref.types.int);
    this._ifly = iflyLib;
    this.sessionId = this._ifly.QISRSessionBegin(null, session_params, errcodePointer);
    let errcode = errcodePointer.deref();
    if (errcode !== 0) {
        throw new Error('Failed to create ISR Session. errcode ' + errcode);
    }
    this._written = false;
    this.result = '';
}

util.inherits(IsrSession, EventEmitter);

IsrSession.prototype.writeAudio = function (buffer, callback) {
    if (!callback) {
        callback = function () {};
    }
    var that = this;
    let epStatPointer = ref.alloc(ref.types.int);
    let recStatPointer = ref.alloc(ref.types.int);
    this._ifly.QISRAudioWrite.async(this.sessionId, buffer, buffer.length, this._written ? MSP_AUDIO_SAMPLE_CONTINUE : MSP_AUDIO_SAMPLE_FIRST, epStatPointer, recStatPointer, (err, errcode) => {
        if (err) {
            return callback(err);
        }
        if (errcode !== 0) {
            return callback(new Error('Failed to write audio. errcode ' + errcode))
        }
        that._written = true;
        if (recStatPointer.deref() === MSP_REC_STATUS_SUCCESS) {
            let resultStatusPointer = ref.alloc(ref.types.int);
            let errcodePointer = ref.alloc(ref.types.int);
            let result = that._ifly.QISRGetResult(that.sessionId, resultStatusPointer, 0, errcodePointer);
            errcode = errcodePointer.deref();
            if (errcode !== 0) {
                that.emit('error', new Error('QISRGetResult failed. errcode ' + errcode));
                return;
            }
            if (result != null) {
                that.result += result;
                that.emit('data', result);
            }
        }
    });

};

IsrSession.prototype.close = function (reason) {
    var that = this;
    if (!reason) {
        reason = 'Closed';
    }
    let epStatPointer = ref.alloc(ref.types.int);
    let recStatPointer = ref.alloc(ref.types.int);
    let errcode = this._ifly.QISRAudioWrite(this.sessionId, null, 0, MSP_AUDIO_SAMPLE_LAST, epStatPointer, recStatPointer);
    if (errcode !== 0) {
        throw new Error('QISRAudioWrite failed when closing session. errcode ' + errcode);
    }
    let errcodePointer = ref.alloc(ref.types.int);
    while (recStatPointer.deref() !== MSP_REC_STATUS_COMPLETE) {
        let result = this._ifly.QISRGetResult(this.sessionId, recStatPointer, 0, errcodePointer);
        errcode = errcodePointer.deref();
        if (errcode !== 0) {
            throw new Error('QISRGetResult failed when closing session. errcode ' + errcode);
        }
        if (result != null) {
            this.result += result;
        }
    }

    errcode = this._ifly.QISRSessionEnd(this.sessionId, reason);
    if (errcode !== 0) {
        throw new Error('Failed to close ISR Session. errcode ' + errcode);
    }
    that.emit('result', that.result);
};

module.exports = IsrSession;