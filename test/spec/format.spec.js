import { format, time } from '../../src/js/format';

describe('Format', () => {
    /** @type {import('sinon').SinonSandbox} */
    let sandbox;

    /** @type {string} */
    let localeOverride;

    beforeEach(() => {
        sandbox = sinon.createSandbox();

        sandbox.stub(format, 'locale').get(() => localeOverride);
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('for time determination', () => {
        const t = [
            ['en-US', true, 'AM', 'PM'],

            /**
             * Note (2022-01-31) — This fixture previously used the `zh` locale.
             * Tests for this fixture pass in Chrome 97 (current) and Firefox 95
             * (current - 1), but fail in Firefox 96 producing English-language
             * 24-hour time. The expected behavior is produced for `zh-hk`.
             */
            ['zh-hk', true, '上午', '下午'],

            ['ar-EG', true, 'ص', 'م'],
            ['ko-KR', true, '오전', '오후'],
            ['nl', false, null, null],
            ['he', false, null, null],
        ];

        function testMeridian(locale, expected) {
            it(`correctly identifies ${locale} time meridian notation as ${expected}`, () => {
                localeOverride = locale;
                expect(format.locale).to.equal(locale);
                expect(time.hour12).to.equal(expected);
            });
        }

        for (let i = 0; i < t.length; i += 1) {
            testMeridian(t[i][0], t[i][1]);
        }

        function testPm(locale, am, pm) {
            it(`correctly extracts the AM and PM notation for ${locale} as: ${am},${pm}`, () => {
                localeOverride = locale;
                expect(time.amNotation).to.equal(am);
                expect(time.pmNotation).to.equal(pm);
            });
        }

        for (let i = 0; i < t.length; i += 1) {
            testPm(t[i][0], t[i][2], t[i][3]);
        }
    });
});
