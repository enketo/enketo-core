import config from 'enketo/config';
import $ from 'jquery';
import loadForm from '../helpers/load-form';
import forms from '../mock/forms';
import event from '../../src/js/event';
import dialog from '../../src/js/fake-dialog';

describe('repeat functionality', () => {
    /** @type {import('sinon').SinonSandbox} */
    let sandbox;

    /** @type {boolean} */
    let excludeNonRelevant;

    let timers;

    // turn jQuery animations off
    $.fx.off = true;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
        timers = sandbox.useFakeTimers();
        excludeNonRelevant = false;

        sandbox
            .stub(config, 'excludeNonRelevant')
            .get(() => excludeNonRelevant);

        sandbox.stub(dialog, 'confirm').resolves(true);
    });

    afterEach(() => {
        timers.runAll();

        timers.clearTimeout();
        timers.clearInterval();
        timers.restore();
        sandbox.restore();
    });

    describe('cloning', () => {
        it('removes the correct instance and HTML node when the "-" button is clicked (issue 170)', async () => {
            const form = loadForm('thedata.xml');
            form.init();
            const repeatSelector = '.or-repeat[name="/thedata/repeatGroup"]';
            const nodePath = '/thedata/repeatGroup/nodeC';
            const nodeSelector = `input[name="${nodePath}"]`;
            const index = 2;

            expect(
                form.view.html.querySelectorAll(repeatSelector).length
            ).to.equal(3);
            expect(
                form.view.html
                    .querySelectorAll(repeatSelector)
                    [index].querySelector('button.remove')
            ).not.to.equal(null);
            expect(
                form.view.html.querySelectorAll(nodeSelector)[index].value
            ).to.equal('c3');
            expect(form.model.node(nodePath, index).getVal()).to.equal('c3');

            form.view.html
                .querySelectorAll(repeatSelector)
                [index].querySelector('button.remove')
                .click();

            await timers.runAllAsync();

            expect(form.model.node(nodePath, index).getVal()).to.equal(
                undefined
            );
            // check if it removed the correct data node
            expect(form.model.node(nodePath, index - 1).getVal()).to.equal(
                'c2'
            );
            // check if it removed the correct html node
            expect(
                form.view.html.querySelectorAll(repeatSelector).length
            ).to.equal(2);
            expect(
                form.view.html.querySelectorAll(nodeSelector)[index - 1].value
            ).to.equal('c2');
        });

        it('marks cloned invalid fields as valid', () => {
            const form = loadForm('thedata.xml');
            form.init();
            const repeatSelector = '.or-repeat[name="/thedata/repeatGroup"]';
            const repeatButton = '.add-repeat-btn';
            const nodeSelector = 'input[name="/thedata/repeatGroup/nodeC"]';
            const node3 = form.view.html.querySelectorAll(nodeSelector)[2];

            form.setInvalid(node3);

            expect(
                form.view.html.querySelectorAll(repeatSelector).length
            ).to.equal(3);
            expect(
                node3.parentElement.classList.contains('invalid-constraint')
            ).to.equal(true);
            expect(form.view.html.querySelectorAll(nodeSelector)[3]).to.equal(
                undefined
            );

            form.view.html.querySelector(repeatButton).click();

            const node4 = form.view.html.querySelectorAll(nodeSelector)[3];
            expect(
                form.view.html.querySelectorAll(repeatSelector).length
            ).to.equal(4);
            expect(node4).not.to.equal(undefined);
            expect(
                node4.parentElement.classList.contains('invalid-constraint')
            ).to.equal(false);
        });

        it('populates default values in new clone', () => {
            const form = loadForm('repeat-default.xml');
            form.init();
            const repeatButton =
                form.view.html.querySelector('.add-repeat-btn');
            repeatButton.click();
            repeatButton.click();
            expect(
                [
                    ...form.view.html.querySelectorAll(
                        '[name="/repdef/rep/num"]'
                    ),
                ].map((i) => i.value)
            ).to.deep.equal(['5', '5', '5']);
        });
    });

    describe('instance removal', () => {
        it('removes an instance that contains a field without a form control', async () => {
            const form = loadForm('repeat-relevant-on-calculate.xml');
            const errors = form.init();

            expect(
                form.view.html.querySelectorAll(
                    '.or-repeat[name="/data/repeat"]'
                ).length
            ).to.equal(1);

            const q1 = form.view.html.querySelector(
                'input[name="/data/repeat/q1"]'
            );
            q1.value = 2;
            q1.dispatchEvent(event.Change());

            expect(form.model.xml.querySelector('q1_x2').textContent).to.equal(
                '4'
            );

            form.view.html
                .querySelector('.or-repeat[name="/data/repeat"]')
                .querySelector('button.remove')
                .click();

            await timers.runAllAsync();

            expect(
                form.view.html.querySelectorAll(
                    '.or-repeat[name="/data/repeat"]'
                ).length
            ).to.equal(0);
            expect(errors.length).to.equal(0);
        });
    });

    describe('fixes unique ids in cloned repeats', () => {
        // Avoiding problems in the autocomplete widget, https://github.com/enketo/enketo-core/issues/521
        it('ensures uniqueness of datalist ids, so cascading selects inside repeats work', () => {
            const form = loadForm('repeat-autocomplete.xml');
            form.init();
            form.view.html.querySelector('.add-repeat-btn').click();
            const id1 = form.view.html
                .querySelectorAll('.or-repeat')[0]
                .querySelector('datalist').id;
            const id2 = form.view.html
                .querySelectorAll('.or-repeat')[1]
                .querySelector('datalist').id;
            const list1 = form.view.html
                .querySelectorAll('.or-repeat')[0]
                .querySelector('input[list]')
                .getAttribute('list');
            const list2 = form.view.html
                .querySelectorAll('.or-repeat')[1]
                .querySelector('input[list]')
                .getAttribute('list');
            expect(id1).to.equal(list1);
            expect(id2).to.equal(list2);
            expect(id1).not.to.equal(id2);
            expect(list1).not.to.equal(list2);
        });
    });

    it('clones a repeat view element on load when repeat has dot in nodeName and has multiple instances in XForm', () => {
        const form = loadForm('repeat-dot.xml');
        form.init();
        expect(
            form.view.html.querySelectorAll(
                'input[name="/repeat-dot/rep.dot/a"]'
            ).length
        ).to.equal(2);
    });

    it('clones nested repeats if they are present in the instance upon initialization (issue #359) ', () => {
        // note that this form contains multiple repeats in the instance
        const form = loadForm('nested_repeats.xml');
        form.init();
        const firstLevelTargetRepeat = form.view.html.querySelectorAll(
            '.or-repeat[name="/nested_repeats/kids/kids_details"]'
        );
        const secondLevelTargetRepeats1 =
            firstLevelTargetRepeat[0].querySelectorAll(
                '.or-repeat[name="/nested_repeats/kids/kids_details/immunization_info"]'
            );
        const secondLevelTargetRepeats2 =
            firstLevelTargetRepeat[1].querySelectorAll(
                '.or-repeat[name="/nested_repeats/kids/kids_details/immunization_info"]'
            );

        expect(firstLevelTargetRepeat.length).to.equal(2);
        expect(secondLevelTargetRepeats1.length).to.equal(2);
        expect(secondLevelTargetRepeats2.length).to.equal(3);
    });

    // https://github.com/kobotoolbox/enketo-express/issues/754
    it('shows the correct number of nested repeats in the view if a record is loaded', () => {
        const instanceStr =
            '<q><PROGRAMME><PROJECT><Partner><INFORMATION><Partner_Name>a</Partner_Name><Camp><P_Camps>a1</P_Camps></Camp><Camp><P_Camps>a2</P_Camps></Camp></INFORMATION></Partner><Partner><INFORMATION><Partner_Name>b</Partner_Name><Camp><P_Camps>b1</P_Camps></Camp><Camp><P_Camps>b2</P_Camps></Camp><Camp><P_Camps>b3</P_Camps></Camp></INFORMATION></Partner></PROJECT></PROGRAMME><meta><instanceID>a</instanceID></meta></q>';
        const a = '.or-repeat[name="/q/PROGRAMME/PROJECT/Partner"]';
        const b =
            '.or-repeat[name="/q/PROGRAMME/PROJECT/Partner/INFORMATION/Camp"]';
        const form = loadForm('nested-repeats-nasty.xml', instanceStr);
        form.init();

        expect(form.view.html.querySelectorAll(a).length).to.equal(2);
        expect(
            form.view.html.querySelectorAll(a)[0].querySelectorAll(b).length
        ).to.equal(2);
        expect(
            form.view.html.querySelectorAll(a)[1].querySelectorAll(b).length
        ).to.equal(3);
    });

    it('ignores the "minimal" appearance when an existing record is loaded (almost same as previous test)', () => {
        const instanceStr =
            '<q><PROGRAMME><PROJECT><Partner><INFORMATION><Partner_Name>a</Partner_Name><Camp><P_Camps>a1</P_Camps></Camp><Camp><P_Camps>a2</P_Camps></Camp></INFORMATION></Partner><Partner><INFORMATION><Partner_Name>b</Partner_Name><Camp><P_Camps>b1</P_Camps></Camp><Camp><P_Camps>b2</P_Camps></Camp><Camp><P_Camps>b3</P_Camps></Camp></INFORMATION></Partner></PROJECT></PROGRAMME><meta><instanceID>a</instanceID></meta></q>';
        const a = '.or-repeat[name="/q/PROGRAMME/PROJECT/Partner"]';
        const b =
            '.or-repeat[name="/q/PROGRAMME/PROJECT/Partner/INFORMATION/Camp"]';
        forms['nested-repeats-nastier'] = {
            xml_model: forms['nested-repeats-nasty.xml'].xml_model,
        };
        // both repeats get the 'minimal appearance'
        forms['nested-repeats-nastier'].html_form = forms[
            'nested-repeats-nasty.xml'
        ].html_form.replace(
            'class="or-repeat ',
            'class="or-repeat or-appearance-minimal '
        );
        const form = loadForm('nested-repeats-nastier', instanceStr);
        form.init();

        expect(form.view.html.querySelectorAll(a).length).to.equal(2);
        expect(
            form.view.html
                .querySelector(a)
                .classList.contains('or-appearance-minimal')
        ).to.equal(true);
        expect(
            form.view.html.querySelectorAll(a)[0].querySelectorAll(b).length
        ).to.equal(2);
        expect(
            form.view.html.querySelectorAll(a)[1].querySelectorAll(b).length
        ).to.equal(3);
    });

    it('uses the "minimal" appearance for an empty form to create 0 repeats', () => {
        const a = '.or-repeat[name="/q/PROGRAMME/PROJECT/Partner"]';
        forms['nested-repeats-nastier'] = {
            xml_model: forms['nested-repeats-nasty.xml'].xml_model,
        };
        // both repeats get the 'minimal appearance'
        forms['nested-repeats-nastier'].html_form = forms[
            'nested-repeats-nasty.xml'
        ].html_form.replace(
            'class="or-repeat ',
            'class="or-repeat or-appearance-minimal '
        );
        const form = loadForm('nested-repeats-nastier');
        form.init();

        expect(form.view.html.querySelectorAll(a).length).to.equal(0);
    });

    it('In an empty form it creates the first repeat instance automatically (almost same as previous test)', () => {
        const form = loadForm('nested-repeats-nasty.xml');
        const a = '.or-repeat[name="/q/PROGRAMME/PROJECT/Partner"]';
        const b =
            '.or-repeat[name="/q/PROGRAMME/PROJECT/Partner/INFORMATION/Camp"]';
        form.init();

        expect(form.view.html.querySelectorAll(a).length).to.equal(1);
        expect(
            form.view.html
                .querySelector(a)
                .classList.contains('or-appearance-minimal')
        ).to.equal(false);
        expect(
            form.view.html.querySelectorAll(a)[0].querySelectorAll(b).length
        ).to.equal(1);
    });

    // https://github.com/enketo/enketo-core/issues/720
    it('adds nested repeats up to three deep', () => {
        const form = loadForm('nested_repeats_triple.xml');
        form.init();

        // add repeats by clicking the add buttons
        form.view.html
            .querySelector(
                '.or-repeat-info[data-name="/data/outer/inner/third"] .add-repeat-btn'
            )
            .click();
        form.view.html
            .querySelector(
                '.or-repeat-info[data-name="/data/outer/inner"] .add-repeat-btn'
            )
            .click();
        // Prior to the fix, adding an instance of the outermost repeat would not add instances of any of the inner repeats
        form.view.html
            .querySelector(
                '.or-repeat-info[data-name="/data/outer"] .add-repeat-btn'
            )
            .click();

        expect(form.getDataStr().replace(/>\s+</g, '><')).to.contain(
            '<outer><inner><third><value/></third><third><value/></third></inner><inner><third><value/></third></inner></outer><outer><inner><third><value/></third></inner></outer>'
        );
    });

    it("doesn't duplicate date widgets in a cloned repeat", () => {
        const form = loadForm('nested_repeats.xml');
        form.init();
        const dates = [
            ...form.view.html.querySelectorAll(
                '[name="/nested_repeats/kids/kids_details/immunization_info/date"]'
            ),
        ];

        expect(dates.length).to.equal(5);
        // for some reason these widgets are not instantiated here
        const dateWidgets = [
            ...form.view.html.querySelectorAll('.widget.date'),
        ];
        expect(dateWidgets.length).to.equal(5);
    });

    describe('ordinals are set for default repeat instances in the default model upon initialization', () => {
        /*
        var config = require( 'enketo/config' );
        var dflt = config.repeatOrdinals;
        before( function() {
            config.repeatOrdinals = true;
        } );

        after( function() {
            config.repeatOrdinals = dflt;
        } );
        */
        // this test is only interested in the model, but adding ordinals to default repeat instances is directed
        // by Form.js
        // Very theoretical. Situation will never occur with OC.
        xit('initialize correctly with ordinals if more than one top-level repeat is included in model', () => {
            const f = loadForm('nested_repeats.xml');
            f.init();
            const { model } = f;
            expect(model.getStr().replace(/>\s+</g, '><')).to.contain(
                '<kids_details enk:last-used-ordinal="2" enk:ordinal="1"><kids_name>Tom</kids_name><kids_age>2</kids_age>' +
                    '<immunization_info enk:last-used-ordinal="2" enk:ordinal="1"><vaccine>Polio</vaccine><date/></immunization_info>' +
                    '<immunization_info enk:ordinal="2"><vaccine>Rickets</vaccine><date/></immunization_info></kids_details>' +
                    '<kids_details enk:ordinal="2"><kids_name>Dick</kids_name><kids_age>5</kids_age>' +
                    '<immunization_info enk:last-used-ordinal="3" enk:ordinal="1"><vaccine>Malaria</vaccine><date/></immunization_info>' +
                    '<immunization_info enk:ordinal="2"><vaccine>Flu</vaccine><date/></immunization_info>' +
                    '<immunization_info enk:ordinal="3"><vaccine>Polio</vaccine><date/></immunization_info>' +
                    '</kids_details>'
            );
        });
    });

    describe('supports repeat count', () => {
        it('to dynamically remove/add repeats', () => {
            const form = loadForm('repeat-count.xml');
            const rep = '.or-repeat[name="/dynamic-repeat-count/rep"]';
            form.init();
            const cntEl = form.view.html.querySelector(
                '[name="/dynamic-repeat-count/count"]'
            );

            // check that repeat count is evaluated upon load for default values
            expect(form.view.html.querySelectorAll(rep).length).to.equal(2);
            expect(form.model.xml.querySelectorAll('rep').length).to.equal(2);
            // increase
            cntEl.value = 10;
            cntEl.dispatchEvent(event.Change());
            expect(form.view.html.querySelectorAll(rep).length).to.equal(10);
            expect(form.model.xml.querySelectorAll('rep').length).to.equal(10);
            // decrease
            cntEl.value = 5;
            cntEl.dispatchEvent(event.Change());
            expect(form.view.html.querySelectorAll(rep).length).to.equal(5);
            expect(form.model.xml.querySelectorAll('rep').length).to.equal(5);
            // decrease too much
            cntEl.value = 0;
            cntEl.dispatchEvent(event.Change());
            expect(form.view.html.querySelectorAll(rep).length).to.equal(0);
            expect(form.model.xml.querySelectorAll('rep').length).to.equal(0);
            // decrease way too much
            cntEl.value = -10;
            cntEl.dispatchEvent(event.Change());
            expect(form.view.html.querySelectorAll(rep).length).to.equal(0);
            expect(form.model.xml.querySelectorAll('rep').length).to.equal(0);
            // go back up after reducing to 0
            cntEl.value = 5;
            cntEl.dispatchEvent(event.Change());
            expect(form.view.html.querySelectorAll(rep).length).to.equal(5);
            expect(form.model.xml.querySelectorAll('rep').length).to.equal(5);
            // empty value should be considered as 0
            cntEl.value = '';
            cntEl.dispatchEvent(event.Change());
            expect(form.view.html.querySelectorAll(rep).length).to.equal(0);
            expect(form.model.xml.querySelectorAll('rep').length).to.equal(0);
        });

        // https://github.com/OpenClinica/enketo-express-oc/issues/308#issuecomment-750382318
        it('correctly loads the required number of repeats in an existing record if the repeat-count has a relevant', () => {
            const form = loadForm(
                'repeat-count.xml',
                `
            <dynamic-repeat-count xmlns:jr="http://openrosa.org/javarosa" xmlns:oc="http://openclinica.org/xforms" xmlns:orx="http://openrosa.org/xforms" id="dynamic-repeat-count">
                <count>4</count>
                <rep_count>4</rep_count>
                <rep>
                    <txt/>
                    <num>5</num>
                </rep>
                <rep>
                    <txt/>
                    <num>5</num>
                </rep>
                <rep>
                    <txt/>
                    <num>5</num>
                </rep>
                <rep>
                    <txt/>
                    <num>5</num>
                </rep>
                <is-repeat-relevant>yes</is-repeat-relevant>
                <sum_note>4</sum_note>
                <txtsum_note>4</txtsum_note>
                <meta>
                    <instanceID>uuid:0afd146a-cdc4-4000-b5f4-3ec0705e85d8</instanceID>
                </meta>
            </dynamic-repeat-count>
            `
            );
            const rep = '.or-repeat[name="/dynamic-repeat-count/rep"]';
            form.init();

            expect(form.view.html.querySelectorAll(rep).length).to.equal(4);
            expect(form.model.xml.querySelectorAll('rep').length).to.equal(4);
        });

        it('and works nicely with relevant even if repeat count is 0 (with relevant on group)', () => {
            // When repeat count is zero there is no context node to pass to evaluator.
            const form = loadForm('repeat-count-relevant.xml');
            const errors = form.init();
            expect(errors.length).to.equal(0);
            expect(
                form.view.html.querySelectorAll('.or-repeat[name="/data/rep"]')
                    .length
            ).to.equal(0);
            expect(
                form.view.html
                    .querySelector('.or-group.or-branch[name="/data/rep"]')
                    .classList.contains('disabled')
            ).to.equal(true);
        });

        it('and works nicely with relevant even if repeat count is 0 (with output in group label)', () => {
            // When repeat count is zero there is no context node to pass to evaluator.
            const f = loadForm('repeat-count-relevant.xml');
            const errors = f.init();
            expect(errors.length).to.equal(0);
            expect(
                f.view.html.querySelectorAll('.or-repeat[name="/data/rep"]')
                    .length
            ).to.equal(0);
            f.view.html.querySelector('input[name="/data/q1"]').value = 2;
            f.view.html
                .querySelector('input[name="/data/q1"]')
                .dispatchEvent(event.Change());
            expect(
                [
                    ...f.view.html.querySelectorAll(
                        '.or-group.or-branch[name="/data/rep"]>h4 .or-output'
                    ),
                ]
                    .map((i) => i.textContent)
                    .join('')
            ).to.equal('2');
        });

        it('and works with relevance on a field without a form control when repeat count is 0', () => {
            const form = loadForm('repeat-count-relevant-on-calculate.xml');
            const errors = form.init();
            expect(errors.length).to.equal(0);

            const count = form.view.html.querySelector(
                'input[name="/data/count'
            );
            count.value = 1;
            count.dispatchEvent(event.Change());

            const q1 = form.view.html.querySelector(
                'input[name="/data/repeat/q1"]'
            );
            q1.value = 2;
            q1.dispatchEvent(event.Change());

            expect(form.model.xml.querySelector('q1_x2').textContent).to.equal(
                '4'
            );
        });

        it('and correctly deals with nested repeats that have a repeat count', () => {
            const form = loadForm('repeat-count-nested-2.xml');
            const a = '.or-repeat[name="/data/repeat_A"]';
            const b = '.or-repeat[name="/data/repeat_A/repeat_B"]';
            form.init();

            const school = form.view.html.querySelectorAll(
                '[name="/data/repeat_A/schools"]'
            )[1];
            school.value = '2';
            school.dispatchEvent(event.Change());

            expect(
                form.view.html.querySelectorAll(a)[1].querySelectorAll(b).length
            ).to.equal(2);
        });

        // https://github.com/enketo/enketo-core/issues/734 => cache contains non-existing nodes
        it('and correctly deals with nested repeats that have empty repeat counts', () => {
            const form = loadForm('repeat-count-nested-3.xml');
            form.init();

            // First test the actual cause of the above-mentioned bug
            const infos = form
                .getRelatedNodes('data-repeat-count', '.or-repeat-info')
                .get();
            const orphans = infos.filter((info) => !info.closest('form.or'));
            expect(orphans.length).to.equal(0);

            // Then test the actually user-visible behavior
            const a = '.or-repeat[name="/data/repeat_A"]';
            const b = '.or-repeat[name="/data/repeat_A/repeat_B"]';

            const members = form.view.html.querySelector(
                '[name="/data/number"]'
            );
            members.value = '1';
            members.dispatchEvent(event.Change());
            expect(form.view.html.querySelectorAll(a).length).to.equal(1);

            const school = form.view.html.querySelector(
                '[name="/data/repeat_A/schools"]'
            );
            school.value = '1';
            school.dispatchEvent(event.Change());
            expect(form.view.html.querySelectorAll(b).length).to.equal(1);
        });

        it('and is able to use a relative repeat count path for top-level repeats', () => {
            const f = loadForm('repeat-count-relative.xml');
            f.init();

            f.view.html.querySelector('input[name="/data/count"]').value = 4;
            f.view.html
                .querySelector('input[name="/data/count"]')
                .dispatchEvent(event.Change());

            expect(f.view.html.querySelectorAll('.or-repeat').length).to.equal(
                8
            ); // 4+4
        });

        it('and is able to use a relative repeat count path for nested repeats', () => {
            const f = loadForm('repeat-count-relative-nested.xml');
            f.init();

            expect(
                f.view.html.querySelectorAll('.or-repeat[name="/data/rep1"]')
                    .length
            ).to.equal(2);

            const count1 = f.view.html.querySelectorAll(
                'input[name="/data/rep1/txt"]'
            )[0];
            count1.value = 6;
            count1.dispatchEvent(event.Change());

            const count2 = f.view.html.querySelectorAll(
                'input[name="/data/rep1/txt"]'
            )[1];
            count2.value = 1;
            count2.dispatchEvent(event.Change());

            expect(
                f.view.html.querySelectorAll(
                    '.or-repeat[name="/data/rep1/rep2"]'
                ).length
            ).to.equal(7); // 6+1
        });
    });

    describe('creates 0 repeats', () => {
        it(' if a record is loaded with 0 repeats (simple)', () => {
            const repeat = '.or-repeat[name="/repeat-required/rep"]';
            const form = loadForm(
                'repeat-required.xml',
                '<repeat-required><d>b</d><meta><instanceID>a</instanceID></meta></repeat-required>'
            );
            form.init();
            expect(form.view.html.querySelectorAll(repeat).length).to.equal(0);
        });

        it(' if a record is loaded with 0 nested repeats (simple)', () => {
            const repeat1 = '.or-repeat[name="/q/PROGRAMME/PROJECT/Partner"]';
            const repeat2 =
                '.or-repeat[name="/q/PROGRAMME/PROJECT/Partner/INFORMATION/Camp"]';
            const form = loadForm(
                'nested-repeats-nasty.xml',
                '<q><PROGRAMME><PROJECT>' +
                    '<Partner><INFORMATION><Partner_Name>MSF</Partner_Name></INFORMATION></Partner>' +
                    '</PROJECT></PROGRAMME><meta><instanceID>a</instanceID></meta></q>'
            );
            form.init();
            expect(form.view.html.querySelectorAll(repeat1).length).to.equal(1);
            expect(form.view.html.querySelectorAll(repeat2).length).to.equal(0);
        });

        it(' if a record is loaded with 0 nested repeats (advanced)', () => {
            const repeat1 = '.or-repeat[name="/q/PROGRAMME/PROJECT/Partner"]';
            const repeat2 =
                '.or-repeat[name="/q/PROGRAMME/PROJECT/Partner/INFORMATION/Camp"]';
            const form = loadForm(
                'nested-repeats-nasty.xml',
                '<q><PROGRAMME><PROJECT>' +
                    '<Partner><INFORMATION><Partner_Name>MSF</Partner_Name></INFORMATION></Partner>' +
                    '<Partner><INFORMATION><Partner_Name>MSF</Partner_Name><Camp><P_Camps/></Camp></INFORMATION></Partner>' +
                    '</PROJECT></PROGRAMME><meta><instanceID>a</instanceID></meta></q>'
            );
            form.init();
            expect(form.view.html.querySelectorAll(repeat1).length).to.equal(2);
            expect(
                form.view.html
                    .querySelectorAll(repeat1)[0]
                    .querySelectorAll(repeat2).length
            ).to.equal(0);
            expect(
                form.view.html
                    .querySelectorAll(repeat1)[1]
                    .querySelectorAll(repeat2).length
            ).to.equal(1);
        });

        // This is a VERY special case, because the form contains a template as well as multiple repeat instances
        xit(' if a record is loaded with 0 repeats (very advanced)', () => {
            const repeat = '.or-repeat[name="/repeat-dot/rep.dot"]';
            const f = loadForm(
                'repeat-dot.xml',
                '<repeat-dot><meta><instanceID>a</instanceID></meta></repeat-dot>'
            );
            f.init();
            expect(f.view.html.querySelectorAll(repeat).length).to.equal(0);
        });
    });

    describe('initializes date widgets', () => {
        it('in a new repeat instance if the date widget is not relevant by default', () => {
            const form = loadForm('repeat-irrelevant-date.xml');
            form.init();
            form.view.html.querySelector('.add-repeat-btn').click();
            // make date field in second repeat relevant
            const el = form.view.html.querySelectorAll(
                '[name="/repeat/rep/a"]'
            )[1];
            el.value = 'a';
            el.dispatchEvent(event.Change());
            expect(
                form.view.html
                    .querySelectorAll('[name="/repeat/rep/b"]')[1]
                    .closest('.question')
                    .querySelectorAll('.widget').length
            ).to.equal(1);
        });
    });

    describe('getIndex() function', () => {
        /** @type {Form} */
        let form;

        /** @type {HTMLCollection} */
        let repeats;

        beforeEach(() => {
            form = loadForm('nested_repeats.xml');
            form.init();
            repeats = form.view.html.querySelectorAll(
                '.or-repeat[name="/nested_repeats/kids/kids_details/immunization_info"]'
            );
        });

        [(0, 1, 2, 3, 4)].forEach((index) => {
            it('works with nested repeats to get the index of a nested repeat in respect to the whole form', () => {
                expect(form.repeats.getIndex(repeats[index])).to.equal(index);
            });
        });
    });

    describe('repeats with repeat-count and only calculations', () => {
        it('loads without errors', () => {
            const form = loadForm('repeat-count-calc-only.xml');
            const errors = form.init();

            expect(errors).to.deep.equal([]);
        });
    });

    describe('radiobuttons', () => {
        it('inside each repeat instance have different name attributes', () => {
            const form = loadForm('repeat-radio.xml');
            const rep = '.or-repeat[name="/data/rep"]';
            const radio = '[data-name="/data/rep/num"]';

            form.init();
            form.view.html.querySelector('.add-repeat-btn').click();

            const repeats = form.view.html.querySelectorAll(rep);
            expect(repeats.length).to.equal(2);

            const names1 = [...repeats[0].querySelectorAll(radio)].map(
                (el) => el.name
            );
            const names2 = [...repeats[1].querySelectorAll(radio)].map(
                (el) => el.name
            );

            expect(names1.length).to.equal(2);
            expect(names1[0]).not.to.equal(undefined);
            expect(names1[0]).to.equal(names1[1]);

            expect(names2.length).to.equal(2);
            expect(names2[0]).not.to.equal(undefined);
            expect(names2[0]).to.equal(names2[1]);

            expect(names1[0]).not.to.equal(names2[0]);
        });
    });

    describe('calculated items inside repeats', () => {
        it('are cached correctly', () => {
            const form = loadForm('repeat-relevant-calculate-single.xml');
            form.init();
            // Issue where a calculation inside a repeat is cached before the repeats are initialized (which removes the first repeat, before adding it)
            // This results in two cached calculations (for the same node) of which one no longer exists.
            expect(form.getRelatedNodes('data-calculate').length).to.equal(1);
        });
    });

    describe('excluding non-relevant values', () => {
        beforeEach(() => {
            excludeNonRelevant = true;
        });

        it('excludes non-relevant values in a repeat instance', () => {
            const form = loadForm('exclude-non-relevant-repeat-count.xml');

            form.init();

            const repeatNums = Array.from(
                form.model.xml.querySelectorAll('num')
            );

            const setRepeatNumNonRelevant = form.view.html.querySelector(
                '.or-repeat:nth-of-type(2) [data-name="/data/rep/is-num-relevant"][value="no"]'
            );

            setRepeatNumNonRelevant.checked = true;
            setRepeatNumNonRelevant.dispatchEvent(event.Change());

            expect(repeatNums.map((node) => node.textContent)).to.deep.equal([
                '5',
                '',
            ]);
        });

        it('restores values in a repeat instance when they become relevant again', () => {
            const form = loadForm('exclude-non-relevant-repeat-count.xml');

            form.init();

            const repeatNums = Array.from(
                form.model.xml.querySelectorAll('num')
            );

            const setRepeatNumNonRelevant = form.view.html.querySelector(
                '.or-repeat:nth-of-type(2) [data-name="/data/rep/is-num-relevant"][value="no"]'
            );

            setRepeatNumNonRelevant.checked = true;
            setRepeatNumNonRelevant.dispatchEvent(event.Change());

            const setRepeatNumRelevant = form.view.html.querySelector(
                '.or-repeat:nth-of-type(2) [data-name="/data/rep/is-num-relevant"][value="yes"]'
            );

            setRepeatNumRelevant.checked = true;
            setRepeatNumRelevant.dispatchEvent(event.Change());

            expect(repeatNums.map((node) => node.textContent)).to.deep.equal([
                '5',
                '5',
            ]);
        });

        it('excludes values in all non-relevant repeat instances', () => {
            const form = loadForm('exclude-non-relevant-repeat-count.xml');

            form.init();

            const repeatNums = Array.from(
                form.model.xml.querySelectorAll('num')
            );

            const setRepeatNumNonRelevant = form.view.html.querySelector(
                '.or-repeat:nth-of-type(2) [data-name="/data/rep/is-num-relevant"][value="no"]'
            );

            setRepeatNumNonRelevant.checked = true;
            setRepeatNumNonRelevant.dispatchEvent(event.Change());

            const setRepeatNumRelevant = form.view.html.querySelector(
                '.or-repeat:nth-of-type(2) [data-name="/data/rep/is-num-relevant"][value="yes"]'
            );

            setRepeatNumRelevant.checked = true;
            setRepeatNumRelevant.dispatchEvent(event.Change());

            const setRepeatNonRelevant = form.view.html.querySelector(
                '[data-name="/data/is-repeat-relevant"][value="no"]'
            );

            setRepeatNonRelevant.checked = true;
            setRepeatNonRelevant.dispatchEvent(event.Change());

            expect(repeatNums.map((node) => node.textContent)).to.deep.equal([
                '',
                '',
            ]);
        });

        it('restores values in all repeat instances when they become relevant again', () => {
            const form = loadForm('exclude-non-relevant-repeat-count.xml');

            form.init();

            const repeatNums = Array.from(
                form.model.xml.querySelectorAll('num')
            );

            const setRepeatNumNonRelevant = form.view.html.querySelector(
                '.or-repeat:nth-of-type(2) [data-name="/data/rep/is-num-relevant"][value="no"]'
            );

            setRepeatNumNonRelevant.checked = true;
            setRepeatNumNonRelevant.dispatchEvent(event.Change());

            const setRepeatNumRelevant = form.view.html.querySelector(
                '.or-repeat:nth-of-type(2) [data-name="/data/rep/is-num-relevant"][value="yes"]'
            );

            setRepeatNumRelevant.checked = true;
            setRepeatNumRelevant.dispatchEvent(event.Change());

            expect(repeatNums.map((node) => node.textContent)).to.deep.equal([
                '5',
                '5',
            ]);

            const setRepeatNonRelevant = form.view.html.querySelector(
                '[data-name="/data/is-repeat-relevant"][value="no"]'
            );

            setRepeatNonRelevant.checked = true;
            setRepeatNonRelevant.dispatchEvent(event.Change());

            const setRepeatRelevant = form.view.html.querySelector(
                '[data-name="/data/is-repeat-relevant"][value="yes"]'
            );

            setRepeatRelevant.checked = true;
            setRepeatRelevant.dispatchEvent(event.Change());

            expect(repeatNums.map((node) => node.textContent)).to.deep.equal([
                '5',
                '5',
            ]);
        });

        it('loads instance data in a relevant repeat', () => {
            const form = loadForm(
                'exclude-non-relevant-repeat-count.xml',
                `
                    <data xmlns:jr="http://openrosa.org/javarosa" xmlns:oc="http://openclinica.org/xforms" xmlns:orx="http://openrosa.org/xforms" id="dynamic-repeat-count">
                        <count>4</count>
                        <rep_count>4</rep_count>
                        <rep>
                            <num>5</num>
                            <is-num-relevant>yes</is-num-relevant>
                        </rep>
                        <rep>
                            <num>6</num>
                            <is-num-relevant>yes</is-num-relevant>
                        </rep>
                        <rep>
                            <num>7</num>
                            <is-num-relevant>yes</is-num-relevant>
                        </rep>
                        <rep>
                            <num>8</num>
                            <is-num-relevant>yes</is-num-relevant>
                        </rep>
                        <is-repeat-relevant>yes</is-repeat-relevant>
                        <meta>
                            <instanceID>uuid:0afd146a-cdc4-4000-b5f4-3ec0705e85d8</instanceID>
                        </meta>
                    </data>
                `
            );

            form.init();

            const repeatNums = Array.from(
                form.model.xml.querySelectorAll('num')
            );

            expect(repeatNums.map((node) => node.textContent)).to.deep.equal([
                '5',
                '6',
                '7',
                '8',
            ]);
        });

        it('loads instance data as blank in a non-relevant repeat', () => {
            const form = loadForm(
                'exclude-non-relevant-repeat-count.xml',
                `
                    <data xmlns:jr="http://openrosa.org/javarosa" xmlns:oc="http://openclinica.org/xforms" xmlns:orx="http://openrosa.org/xforms" id="dynamic-repeat-count">
                        <count>4</count>
                        <rep_count>4</rep_count>
                        <rep>
                            <num>5</num>
                            <is-num-relevant>yes</is-num-relevant>
                        </rep>
                        <rep>
                            <num>6</num>
                            <is-num-relevant>yes</is-num-relevant>
                        </rep>
                        <rep>
                            <num>7</num>
                            <is-num-relevant>yes</is-num-relevant>
                        </rep>
                        <rep>
                            <num>8</num>
                            <is-num-relevant>yes</is-num-relevant>
                        </rep>
                        <is-repeat-relevant>no</is-repeat-relevant>
                        <meta>
                            <instanceID>uuid:0afd146a-cdc4-4000-b5f4-3ec0705e85d8</instanceID>
                        </meta>
                    </data>
                `
            );

            form.init();

            const repeatNums = Array.from(
                form.model.xml.querySelectorAll('num')
            );

            expect(repeatNums.map((node) => node.textContent)).to.deep.equal([
                '',
                '',
                '',
                '',
            ]);
        });

        it('restores instance data when a non-relevant repeat becomes relevant again', () => {
            const form = loadForm(
                'exclude-non-relevant-repeat-count.xml',
                `
                    <data xmlns:jr="http://openrosa.org/javarosa" xmlns:oc="http://openclinica.org/xforms" xmlns:orx="http://openrosa.org/xforms" id="dynamic-repeat-count">
                        <count>4</count>
                        <rep_count>4</rep_count>
                        <rep>
                            <num>5</num>
                            <is-num-relevant>yes</is-num-relevant>
                        </rep>
                        <rep>
                            <num>6</num>
                            <is-num-relevant>yes</is-num-relevant>
                        </rep>
                        <rep>
                            <num>7</num>
                            <is-num-relevant>yes</is-num-relevant>
                        </rep>
                        <rep>
                            <num>8</num>
                            <is-num-relevant>yes</is-num-relevant>
                        </rep>
                        <is-repeat-relevant>no</is-repeat-relevant>
                        <meta>
                            <instanceID>uuid:0afd146a-cdc4-4000-b5f4-3ec0705e85d8</instanceID>
                        </meta>
                    </data>
                `
            );

            form.init();

            const setRepeatRelevant = form.view.html.querySelector(
                '[data-name="/data/is-repeat-relevant"][value="yes"]'
            );

            setRepeatRelevant.checked = true;
            setRepeatRelevant.dispatchEvent(event.Change());

            const repeatNums = Array.from(
                form.model.xml.querySelectorAll('num')
            );

            expect(repeatNums.map((node) => node.textContent)).to.deep.equal([
                '5',
                '6',
                '7',
                '8',
            ]);
        });

        it('does not restore non-relevant nodes when a parent repeat becomes relevant again', () => {
            const form = loadForm('exclude-non-relevant-repeat-count.xml');

            form.init();

            const setRepeatRelevant = form.view.html.querySelector(
                '[data-name="/data/is-repeat-relevant"][value="yes"]'
            );

            setRepeatRelevant.checked = true;
            setRepeatRelevant.dispatchEvent(event.Change());

            const setSecondNumberNonRelevant = form.view.html.querySelector(
                '.or-repeat.clone [data-name="/data/rep/is-num-relevant"][value="no"]'
            );

            setSecondNumberNonRelevant.checked = true;
            setSecondNumberNonRelevant.dispatchEvent(event.Change());

            const repeatNums = Array.from(
                form.model.xml.querySelectorAll('num')
            );

            expect(repeatNums.map((node) => node.textContent)).to.deep.equal([
                '5',
                '',
            ]);

            const setRepeatNonRelevant = form.view.html.querySelector(
                '[data-name="/data/is-repeat-relevant"][value="no"]'
            );

            setRepeatNonRelevant.checked = true;
            setRepeatNonRelevant.dispatchEvent(event.Change());

            expect(repeatNums.map((node) => node.textContent)).to.deep.equal([
                '',
                '',
            ]);

            setRepeatRelevant.checked = true;
            setRepeatRelevant.dispatchEvent(event.Change());

            expect(repeatNums.map((node) => node.textContent)).to.deep.equal([
                '5',
                '',
            ]);
        });

        it('excludes a non-relevant value in a repeat initialized with odk-instance-first-load', () => {
            const form = loadForm(
                'exclude-non-relevant-repeat-irrelevant-date.xml'
            );

            form.init();

            const repeatBNodes = Array.from(
                form.model.xml.querySelectorAll('repeat rep b')
            );

            expect(repeatBNodes.map((node) => node.textContent)).to.deep.equal([
                '',
            ]);
        });

        it('excludes a non-relevant value initialized with odk-new-repeat', () => {
            const form = loadForm(
                'exclude-non-relevant-repeat-irrelevant-date.xml'
            );

            form.init();

            form.view.html.querySelector('.add-repeat-btn').click();

            const repeatBNodes = Array.from(
                form.model.xml.querySelectorAll('repeat rep b')
            );

            expect(repeatBNodes.map((node) => node.textContent)).to.deep.equal([
                '',
                '',
            ]);
        });

        it('restores a value initialized with odk-new-repeat when it becomes relevant', () => {
            const form = loadForm(
                'exclude-non-relevant-repeat-irrelevant-date.xml'
            );

            form.init();

            form.view.html.querySelector('.add-repeat-btn').click();

            const repeatBNodes = Array.from(
                form.model.xml.querySelectorAll('repeat rep b')
            );

            expect(repeatBNodes.map((node) => node.textContent)).to.deep.equal([
                '',
                '',
            ]);

            const el = form.view.html.querySelectorAll(
                '[name="/repeat/rep/a"]'
            )[1];

            el.value = 'a';
            el.dispatchEvent(event.Change());

            expect(repeatBNodes.map((node) => node.textContent)).to.deep.equal([
                '',
                '1',
            ]);
        });

        it('excludes non-relevant values from calculations in repeats when the model node has no associated view input', () => {
            const form = loadForm(
                'exclude-non-relevant-repeat-calculate-single.xml'
            );

            form.init();

            const repeatButton =
                form.view.html.querySelector('.add-repeat-btn');

            let isFirstRowNodes = Array.from(
                form.model.xml.querySelectorAll('data rg is-first-row')
            );

            expect(
                isFirstRowNodes.map((node) => node.textContent)
            ).to.deep.equal(['']);

            const toggleRelevant =
                form.view.html.querySelector('[name="/data/yn"]');

            toggleRelevant.checked = true;
            toggleRelevant.dispatchEvent(event.Change());

            repeatButton.click();

            isFirstRowNodes = Array.from(
                form.model.xml.querySelectorAll('data rg is-first-row')
            );

            expect(
                isFirstRowNodes.map((node) => node.textContent)
            ).to.deep.equal(['1', '']);

            toggleRelevant.checked = false;
            toggleRelevant.dispatchEvent(event.Change());

            expect(
                isFirstRowNodes.map((node) => node.textContent)
            ).to.deep.equal(['', '']);

            toggleRelevant.checked = true;
            toggleRelevant.dispatchEvent(event.Change());

            expect(
                isFirstRowNodes.map((node) => node.textContent)
            ).to.deep.equal(['1', '']);
        });

        it('only excludes non-relevant values on initialization by default', () => {
            excludeNonRelevant = false;

            const form = loadForm(
                'exclude-non-relevant-repeat-calculate-single.xml'
            );

            form.init();

            const repeatButton =
                form.view.html.querySelector('.add-repeat-btn');

            repeatButton.click();

            const isFirstRowNodes = Array.from(
                form.model.xml.querySelectorAll('data rg is-first-row')
            );

            expect(
                isFirstRowNodes.map((node) => node.textContent)
            ).to.deep.equal(['', '']);

            const toggleRelevant =
                form.view.html.querySelector('[name="/data/yn"]');

            toggleRelevant.checked = true;
            toggleRelevant.dispatchEvent(event.Change());

            expect(
                isFirstRowNodes.map((node) => node.textContent)
            ).to.deep.equal(['1', '2']);

            toggleRelevant.checked = false;
            toggleRelevant.dispatchEvent(event.Change());

            expect(
                isFirstRowNodes.map((node) => node.textContent)
            ).to.deep.equal(['1', '2']);

            toggleRelevant.checked = true;
            toggleRelevant.dispatchEvent(event.Change());

            expect(
                isFirstRowNodes.map((node) => node.textContent)
            ).to.deep.equal(['1', '2']);
        });

        it('cascades clearing non-relevant values across repeats', () => {
            const form = loadForm(
                'exclude-non-relevant-cascade-across-repeats.xml'
            );

            form.init();

            const [rgRepeatButton, adjacentRepeatButton] = Array.from(
                form.view.html.querySelectorAll('.add-repeat-btn')
            );

            const toggleRelevant =
                form.view.html.querySelector('[name="/data/yn"]');

            toggleRelevant.checked = true;
            toggleRelevant.dispatchEvent(event.Change());

            rgRepeatButton.click();
            adjacentRepeatButton.click();

            const adjacentRepeatCalculated = Array.from(
                form.model.xml.querySelectorAll(
                    'data adjacent-repeat calculated'
                )
            );
            const adjacentRepeatCalculatedModelOnly = Array.from(
                form.model.xml.querySelectorAll(
                    'data adjacent-repeat calculated-model-only'
                )
            );
            const adjacentRepeatNodes = adjacentRepeatCalculated.concat(
                adjacentRepeatCalculatedModelOnly
            );

            expect(
                adjacentRepeatNodes.map((node) => node.textContent)
            ).to.deep.equal(['1', '2', '3', '4']);

            toggleRelevant.checked = false;
            toggleRelevant.dispatchEvent(event.Change());

            const nestedCalculatedModelNode =
                form.model.xml.querySelector('nested-calculated');
            const nestedCalculatedViewNode = form.view.html.querySelector(
                '[name="/data/always-relevant/nested/nested-calculated"]'
            );

            expect(nestedCalculatedModelNode.textContent).to.equal('');
            expect(nestedCalculatedViewNode.value).to.equal('');

            expect(
                adjacentRepeatNodes.map((node) => node.textContent)
            ).to.deep.equal(['', '', '', '']);

            toggleRelevant.checked = true;
            toggleRelevant.dispatchEvent(event.Change());

            expect(nestedCalculatedModelNode.textContent).to.equal('1');
            expect(nestedCalculatedViewNode.value).to.equal('1');

            expect(
                adjacentRepeatNodes.map((node) => node.textContent)
            ).to.deep.equal(['1', '2', '3', '4']);

            toggleRelevant.checked = false;
            toggleRelevant.dispatchEvent(event.Change());

            expect(nestedCalculatedModelNode.textContent).to.equal('');
            expect(nestedCalculatedViewNode.value).to.equal('');

            expect(
                adjacentRepeatNodes.map((node) => node.textContent)
            ).to.deep.equal(['', '', '', '']);

            toggleRelevant.checked = true;
            toggleRelevant.dispatchEvent(event.Change());

            expect(nestedCalculatedModelNode.textContent).to.equal('1');
            expect(nestedCalculatedViewNode.value).to.equal('1');

            expect(
                adjacentRepeatNodes.map((node) => node.textContent)
            ).to.deep.equal(['1', '2', '3', '4']);
        });

        it('cascades clearing non-relevant values outside of repeats', () => {
            // excludeNonRelevant = false;
            const form = loadForm(
                'exclude-non-relevant-cascade-across-repeats.xml'
            );

            form.init();

            const [rgRepeatButton, adjacentRepeatButton] = Array.from(
                form.view.html.querySelectorAll('.add-repeat-btn')
            );

            const toggleRelevant =
                form.view.html.querySelector('[name="/data/yn"]');

            toggleRelevant.checked = true;
            toggleRelevant.dispatchEvent(event.Change());

            rgRepeatButton.click();
            adjacentRepeatButton.click();

            const outsideRepeatCalculated = form.model.xml.querySelector(
                'data outer-calculated'
            );

            expect(outsideRepeatCalculated.textContent).to.deep.equal('1');

            toggleRelevant.checked = false;
            toggleRelevant.dispatchEvent(event.Change());

            expect(outsideRepeatCalculated.textContent).to.deep.equal('');

            toggleRelevant.checked = true;
            toggleRelevant.dispatchEvent(event.Change());

            expect(outsideRepeatCalculated.textContent).to.deep.equal('1');

            toggleRelevant.checked = false;
            toggleRelevant.dispatchEvent(event.Change());

            expect(outsideRepeatCalculated.textContent).to.deep.equal('');

            toggleRelevant.checked = true;
            toggleRelevant.dispatchEvent(event.Change());

            expect(outsideRepeatCalculated.textContent).to.deep.equal('1');
        });

        // These tests don't check behavior around excluding non-relevant values
        // in repeats, they only check that the behavior is consistent, out of
        // an abundance of caution.
        describe('behavior consistency with zero-count repeats', () => {
            it('sets zero-count repeats to non-relevant', () => {
                const form = loadForm('repeat-count-relevant.xml');
                const errors = form.init();

                expect(errors.length).to.equal(0);
                expect(
                    form.view.html.querySelectorAll(
                        '.or-repeat[name="/data/rep"]'
                    ).length
                ).to.equal(0);
                expect(
                    form.view.html
                        .querySelector('.or-group.or-branch[name="/data/rep"]')
                        .classList.contains('disabled')
                ).to.equal(true);
            });

            it('and works nicely with relevant even if repeat count is 0 (with output in group label)', () => {
                // When repeat count is zero there is no context node to pass to evaluator.
                const f = loadForm('repeat-count-relevant.xml');
                const errors = f.init();

                expect(errors.length).to.equal(0);
                expect(
                    f.view.html.querySelectorAll('.or-repeat[name="/data/rep"]')
                        .length
                ).to.equal(0);

                f.view.html.querySelector('input[name="/data/q1"]').value = 2;
                f.view.html
                    .querySelector('input[name="/data/q1"]')
                    .dispatchEvent(event.Change());

                expect(
                    [
                        ...f.view.html.querySelectorAll(
                            '.or-group.or-branch[name="/data/rep"]>h4 .or-output'
                        ),
                    ]
                        .map((i) => i.textContent)
                        .join('')
                ).to.equal('2');
            });
        });
    });

    describe('unrelated randomize', () => {
        it('does not randomize outside the repeat when adding repeat instances', () => {
            const form = loadForm('randomize-outside-repeat.xml');

            form.init();

            const randomizedFruits =
                form.view.html.querySelector('.option-wrapper');
            const initialText = randomizedFruits.innerText;

            // Sanity check
            expect(initialText).to.include('kiwi');

            const repeatButton =
                form.view.html.querySelector('.add-repeat-btn');

            for (let i = 0; i < 10; i += 1) {
                repeatButton.click();

                expect(randomizedFruits.innerText).to.equal(initialText);
            }
        });

        it('does not randomize outside the repeat when removing repeat instances', () => {
            const form = loadForm('randomize-outside-repeat.xml');

            form.init();

            const randomizedFruits =
                form.view.html.querySelector('.option-wrapper');
            const initialText = randomizedFruits.innerText;

            // Sanity check
            expect(initialText).to.include('kiwi');

            const repeatButton =
                form.view.html.querySelector('.add-repeat-btn');

            for (let i = 0; i < 10; i += 1) {
                repeatButton.click();
            }

            const removeButtons = Array.from(
                form.view.html.querySelectorAll('button.remove')
            ).reverse();

            for (const removeButton of removeButtons) {
                removeButton.click();

                expect(randomizedFruits.innerText).to.equal(initialText);
            }
        });
    });
});
