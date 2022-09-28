import { initTimeLocalization, time } from '../../src/js/format';

describe('Format', () => {
    /** @type {import('sinon').SinonSandbox} */
    let sandbox;

    [
        {
            locale: 'en-US',
            hour12: true,
            am: 'AM',
            pm: 'PM',
        },

        /**
         * Note (2022-01-31) — This fixture previously used the `zh` locale.
         * Tests for this fixture pass in Chrome 97 (current) and Firefox 95
         * (current - 1), but fail in Firefox 96 producing English-language
         * 24-hour time. The expected behavior is produced for `zh-hk`.
         */
        {
            locale: 'zh-HK',
            hour12: true,
            am: '上午',
            pm: '下午',
        },

        {
            locale: 'ar-EG',
            hour12: true,
            am: 'ص',
            pm: 'م',
        },
        {
            locale: 'ko-KR',
            hour12: true,
            am: '오전',
            pm: '오후',
        },
        {
            locale: 'nl',
            hour12: false,
            am: null,
            pm: null,
        },
        {
            locale: 'he',
            hour12: false,
            am: null,
            pm: null,
        },
        {
            locale: 'fi',
            hour12: false,
            am: null,
            pm: null,
        },
    ].forEach(({ locale, hour12, am, pm }) => {
        describe(`time determination for ${locale}`, () => {
            /** @type {Function} */
            let teardownTimeLocalization;

            beforeEach(() => {
                sandbox = sinon.createSandbox();

                sandbox.stub(navigator, 'languages').get(() => [locale]);

                teardownTimeLocalization = initTimeLocalization();
            });

            afterEach(() => {
                sandbox.restore();
                teardownTimeLocalization();
            });

            it(`identifies ${locale} time meridian notation as ${hour12}`, () => {
                expect(time.hour12).to.equal(hour12, locale);
            });

            it(`extracts the AM and PM notation for as: ${am}, ${pm}`, () => {
                expect(time.amNotation).to.equal(am, locale);
                expect(time.pmNotation).to.equal(pm);
            });

            it('determines whether a localized time string has a meridian', () => {
                const date = new Date(2022, 8, 27, 1, 2, 3, 4);
                const timeStr = date.toLocaleTimeString([locale]);
                const expected = am != null;

                expect(time.hasMeridian(timeStr)).to.equal(
                    expected,
                    `${locale}, ${timeStr}, ${date.toLocaleString([locale])}`
                );
            });
        });
    });
});
