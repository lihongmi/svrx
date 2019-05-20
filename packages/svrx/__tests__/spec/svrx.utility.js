const semver = require('../../lib/util/semver');
const consts = require('../../lib/constant');
const _ = require('../../lib/util/helper');
const im = require('../../lib/util/im');
const expect = require('expect.js');

const util = require('util');
const setImmediatePromise = util.promisify(setImmediate);

describe('Svrx Utility', () => {
    describe('helper.semver', () => {
        it('satisfies', () => {
            expect(semver.satisfies('^0.0.5', '0.0.1')).to.equal(false);
            expect(semver.satisfies('~0.0.1', '0.0.1')).to.equal(true);
            expect(semver.satisfies('~0.1.1', '0.1.9')).to.equal(true);
        });
        it('getClosetPackages', () => {
            const PRE_VERSION = consts.VERSION;
            consts.VERSION = '0.0.2';

            expect(
                semver.getClosestPackage([
                    { version: '0.0.1', pattern: '0.0.2' },
                    { version: '0.0.3', pattern: '~0.0.2' },
                    { version: '0.0.6', pattern: '~0.0.2' },
                    { version: '0.0.9', pattern: '^0.0.4' }
                ]).version
            ).to.equal('0.0.6');

            consts.VERSION = PRE_VERSION;
        });
    });
    describe('helper.im', () => {
        it('im#set basic', () => {
            const obj1 = { a: { b: 1 } };
            const obj2 = im.set(obj1, 'a.b', 3);
            expect(obj1).to.not.equal(obj2);
            expect(obj2.a.b).to.equal(3);
        });

        it('im#set autoCreaete', () => {
            const obj1 = { a: { b: 1 } };
            const obj2 = im.set(obj1, 'a.c.d', 4);
            expect(obj2.a.c.d).to.equal(4);
        });

        it('im#set replace', () => {
            const obj1 = { a: { b: 1 } };
            const replaced = { d: 'd' };
            const obj2 = im.set(obj1, 'a', replaced);
            expect(obj2.a.d).to.equal('d');
            expect(obj2.a).to.not.equal(replaced);
            const obj3 = im.set(obj1, 'a', replaced, true);
            expect(obj3.a).to.equal(replaced);
        });

        it('im#set noCreate', () => {
            const obj1 = { a: 1 };
            expect(() => {
                im.set(obj1, 'a.c.d', 4, {
                    noCreate: true
                });
            }).to.throwError();
        });

        it('im#set nothing happen when target === origin', () => {
            const obj1 = { a: 1 };
            expect(im.set(obj1, 'a', 1)).to.equal(obj1);
        });

        it('im#get basic', () => {
            const obj1 = { a: { b: 1 } };
            expect(im.get(obj1, 'a.b')).to.equal(1);
            expect(im.get(obj1, 'a.b.c')).to.equal(undefined);
        });

        it('im#get Array', () => {
            const obj1 = { a: [{ b: 1 }] };
            expect(im.get(obj1, 'a.0.b')).to.equal(1);
            expect(im.get(obj1, 'a.1.c')).to.equal(undefined);
        });

        it('im#del Basic', () => {
            const obj1 = { a: [{ b: 1 }] };
            expect('b' in im.del(obj1, 'a.0.b').a[0]).to.equal(false);

            const obj2 = { a: [{ b: 1 }] };

            expect('b' in im.del(obj1, 'a.b').a).to.equal(false);
        });

        it('im#del #set #get Number', () => {
            const obj1 = { '1': [{ b: 1 }] };

            expect(im.get(obj1, 1)).to.equal(obj1['1']);
            const obj2 = im.set(obj1, 1, 'hello');
            expect(obj2[1]).to.equal('hello');
            const obj3 = im.del(obj1, 1);

            expect('1' in obj3).to.equal(false);
        });

        it('im#splice basic', () => {
            const obj1 = { a: [{ b: 1 }] };
            const obj2 = im.splice(obj1, 'a', 0, 1, { c: 2 });

            expect(obj1).to.not.equal(obj2);

            expect(obj2.a).to.eql([{ c: 2 }]);
        });
    });

    describe('Imodel', () => {
        const Imodel = require('../../lib/model');

        it('model.produce()', () => {
            const model = new Imodel({
                a: {
                    b: {
                        c: 2,
                        d: 3,
                        e: [1, 2, 3]
                    }
                }
            });
            model.produce((draft) => {
                draft.a.b.c = 3;
                draft.a.b.e.push(4);
            });
            expect(model.get('a.b.c')).to.equal(3);
            expect(model.get('a.b.e')).to.eql([1, 2, 3, 4]);
        });

        it('model.watch() + set', (done) => {
            const model = new Imodel({
                a: {
                    b: {
                        c: 2,
                        d: 3
                    }
                }
            })
            model.watch((evt)=>{
                expect(evt.affect('a')).to.equal(true)
                expect(evt.affect('a.b')).to.equal(true)
                expect(evt.affect('a.b.c')).to.equal(true)
                expect(evt.affect('a.b.d')).to.equal(false)
                done()
            })

            model.set('a.b.c', 4)
        })

        it('model.watch(path) + set', (done)=>{
            const model = new Imodel({
                a: {
                    b: {
                        c: 2,
                        d: 3
                    }
                }
            })
            model.watch('a', (evt)=>{
                expect(evt.affect('b')).to.equal(true)
                expect(evt.affect('b.c')).to.equal(true)
                expect(evt.affect('b.d')).to.equal(false)
                done()
            })

            model.set('a.b.c', 4)
        })


        it('splice/del/produce can also trigger watcher', (done)=>{
            const model = new Imodel({
                a: {
                    b: {
                        c: 2,
                        d: 3,
                        e: [1, 2, 3]
                    }
                }
            })
            model.watch('a', (evt)=>{
                expect(evt.affect('b')).to.equal(true)
                expect(evt.affect('b.c')).to.equal(true)
                expect(evt.affect('b.d')).to.equal(false)
                expect(evt.affect('b.e')).to.equal(true)
                done()
            })
            model.splice('a.b.e', 0, 1)
            model.del('a.b.c')
        })
        it('one event loop only trigger once', (done)=>{
            const model = new Imodel({
                a: {
                    b: {
                        c: 2,
                        d: 3,
                        e: [1, 2, 3]
                    }
                }
            });

            let called = 0;
            model.watch('a', (evt) => {
                called++;
            });

            model.splice('a.b.e', 0, 1);
            model.del('a.b.c');
            model.del('a.f', 2);

            setImmediatePromise().then(()=>{
                expect(called).to.equal(1)
                model.watch('a.b', (evt)=>{
                    expect(evt.affect('d')).to.equal(true)
                    done();
                });
                model.produce((draf) => {
                    draf.a.b.d = 4;
                });
            });
        });
    });
});