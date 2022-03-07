import loadForm from '../../helpers/load-form';
import config from '../../../config';
import dialog from '../../../src/js/fake-dialog';
import events from '../../../src/js/event';

describe('Evaluation Cascade', () => {
    /** @type {import('sinon').SinonSandbox} */
    let sandbox;

    /** @type {boolean} */
    let excludeNonRelevant;

    /** @type {boolean} */
    let computeAsync;

    beforeEach(() => {
        sandbox = sinon.createSandbox();

        sandbox.stub(dialog, 'confirm').resolves(true);

        excludeNonRelevant = false;

        sandbox
            .stub(config, 'excludeNonRelevant')
            .get(() => excludeNonRelevant);

        computeAsync = false;

        sandbox
            .stub(config.experimentalOptimizations, 'computeAsync')
            .get(() => computeAsync);
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('Computing relevance changes asynchronously', () => {
        /** @type {SinonFakeTimers} */
        let timers;

        beforeEach(() => {
            computeAsync = true;
            excludeNonRelevant = true;

            timers = sandbox.useFakeTimers();
        });

        afterEach(() => {
            timers.runAll();

            timers.clearTimeout();
            timers.clearInterval();
            timers.restore();
            sandbox.restore();
        });

        it('clears non-relevant values asynchronously', () => {
            const form = loadForm('va_who_v1_5_3.xml');

            form.init();
            timers.runAll();

            const didConsent = form.view.html.querySelector(
                '[name="/data/respondent_backgr/Id10013"][value="yes"]'
            );

            const consentedGroup = form.view.html.querySelector(
                '.or-group[name="/data/consented"]'
            );

            // Per `Form#grosslyViolateStandardComplianceByIgnoringCertainCalcs`, calculations
            // are removed from preload nodes.
            const consentedQuestions = consentedGroup.querySelectorAll(
                '.question input:not(.ignore, [data-preload])'
            );

            for (const node of consentedQuestions) {
                if (node.type === 'checkbox' || node.type === 'radio') {
                    expect(node.checked).to.equal(false);
                } else {
                    expect(node.value).to.equal('');
                }
            }

            didConsent.checked = true;
            didConsent.dispatchEvent(events.Change());

            timers.runAll();

            const isDateOfBirthKnown = form.view.html.querySelector(
                '[name="/data/consented/deceased_CRVS/info_on_deceased/Id10020"][value="yes"]'
            );

            isDateOfBirthKnown.checked = true;
            isDateOfBirthKnown.dispatchEvent(events.Change());

            timers.runAll();

            const dateOfBirth = form.view.html.querySelector(
                '[name="/data/consented/deceased_CRVS/info_on_deceased/Id10021"]'
            );

            const adultDateOfBirth = new Date();

            adultDateOfBirth.setFullYear(adultDateOfBirth.getFullYear() - 18);

            const adultDateOfBirthValue = adultDateOfBirth
                .toISOString()
                .replace(/T.*$/, '');

            dateOfBirth.value = adultDateOfBirthValue;
            dateOfBirth.dispatchEvent(events.Change());

            timers.runAll();

            const isDateOfDeathKnown = form.view.html.querySelector(
                '[name="/data/consented/deceased_CRVS/info_on_deceased/Id10022"][value="no"]'
            );

            isDateOfDeathKnown.checked = true;
            isDateOfDeathKnown.dispatchEvent(events.Change());

            timers.runAll();

            const yearOfDeath = form.view.html.querySelector(
                '[name="/data/consented/deceased_CRVS/info_on_deceased/Id10024"]'
            );
            const yearOfDeathValue = new Date()
                .toISOString()
                .replace(/T.*$/, '');

            yearOfDeath.value = yearOfDeathValue;
            yearOfDeath.dispatchEvent(events.Change());

            timers.runAll();

            const ageGroup = form.view.html.querySelector(
                '[name="/data/consented/deceased_CRVS/info_on_deceased/age_group"][value="adult"]'
            );

            ageGroup.checked = true;
            ageGroup.dispatchEvent(events.Change());

            timers.runAll();

            const didHaveFever = form.view.html.querySelector(
                '[name="/data/consented/illhistory/signs_symptoms_final_illness/Id10147"][value="yes"]'
            );

            didHaveFever.checked = true;
            didHaveFever.dispatchEvent(events.Change());

            timers.runAll();

            const feverDurationDayUnit = form.view.html.querySelector(
                '[name="/data/consented/illhistory/signs_symptoms_final_illness/Id10148_units"][value="days"]'
            );

            feverDurationDayUnit.checked = true;
            feverDurationDayUnit.dispatchEvent(events.Change());

            timers.runAll();

            const feverDurationDays = form.view.html.querySelector(
                '[name="/data/consented/illhistory/signs_symptoms_final_illness/Id10148_b"]'
            );

            feverDurationDays.value = '36';
            feverDurationDays.dispatchEvent(events.Change());

            timers.runAll();

            const isDateOfBirthKnownModelNode = form.model
                .node(isDateOfBirthKnown.name)
                .getElement();
            const dateOfBirthModelNode = form.model
                .node(dateOfBirth.name)
                .getElement();
            const isDateOfDeathKnownModelNode = form.model
                .node(isDateOfDeathKnown.name)
                .getElement();
            const yearOfDeathModelNode = form.model
                .node(yearOfDeath.name)
                .getElement();
            const ageGroupModelNode = form.model
                .node(ageGroup.name)
                .getElement();
            const didHaveFeverModelNode = form.model
                .node(didHaveFever.name)
                .getElement();
            const feverDurationDayUnitModelNode = form.model
                .node(feverDurationDayUnit.name)
                .getElement();
            const feverDurationDaysModelNode = form.model
                .node(feverDurationDays.name)
                .getElement();

            expect(isDateOfBirthKnownModelNode.textContent).to.equal('yes');
            expect(dateOfBirthModelNode.textContent).to.equal(
                adultDateOfBirthValue
            );
            expect(isDateOfDeathKnownModelNode.textContent).to.equal('no');
            expect(yearOfDeathModelNode.textContent).to.equal(yearOfDeathValue);
            expect(ageGroupModelNode.textContent).to.equal('adult');
            expect(didHaveFeverModelNode.textContent).to.equal('yes');
            expect(feverDurationDayUnitModelNode.textContent).to.equal('days');
            expect(feverDurationDaysModelNode.textContent).to.equal('36');

            didHaveFever.checked = false;
            didHaveFever.dispatchEvent(events.Change());

            expect(feverDurationDayUnitModelNode.textContent).to.equal('days');
            expect(feverDurationDaysModelNode.textContent).to.equal('36');

            timers.runAll();

            expect(feverDurationDayUnitModelNode.textContent).to.equal('');
            expect(feverDurationDaysModelNode.textContent).to.equal('');
        }, 1000000);
    });
});
