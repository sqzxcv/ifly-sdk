/**
 * Created by nicholas on 17-2-15.
 */
const {expect} = require('chai');
const path = require('path');
const fs = require('fs');

const IFly = require('../');
const iFly = new IFly('58a3f86f', path.join(__dirname, '..', 'libmsc.so'));

describe('Base tests', function () {
    it('Recognize example wav.', function (done) {
        let session = iFly.createIsrSession();
        session.on('data', (data) => {
            console.log(data);
        });
        session.on('result', (result) => {
            console.log('Result:', result);
            expect(result).to.contain('中美');
            done();
        });
        let stream = fs.createReadStream(path.join(__dirname, '..', 'iflytek02.wav'));
        stream.on('data', (chunk) => {
            session.writeAudio(chunk);
        });
        stream.on('end', () => {
            session.close();
        });
    });

    it('Recognize another example wav.', function (done) {
        let session = iFly.createIsrSession();
        session.on('data', (data) => {
            console.log(data);
        });
        session.on('result', (result) => {
            console.log('Result:', result);
            expect(result).to.be.equal('18012345678。');
            done();
        });
        let stream = fs.createReadStream(path.join(__dirname, '..', 'iflytek01.wav'));
        stream.on('data', (chunk) => {
            session.writeAudio(chunk);
        });
        stream.on('end', () => {
            session.close();
        });
    });
});