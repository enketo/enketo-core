import CommentWidget from '../../src/widget/comment/commentwidget';
import { testStaticProperties } from '../helpers/test-widget';
import input from '../../src/js/input';

const FORM =
    `<form class="or">
        <label class="question non-select ">
            <span lang="" class="question-label active">Enter number</span>
            <input type="number" name="/data/a" data-type-xml="int">
        </label>
        <label class="question non-select or-appearance-multiline or-appearance-comment hide" role="comment">
            <span lang="" class="question-label active">Enter a comment</span>
            <textarea name="/data/a_comment" data-for="/data/a" data-type-xml="string"> </textarea>
        </label>
    </form>
    `;

const options = {
    helpers: {
        input: input,
        pathToAbsolute: a => a
    }
};

testStaticProperties( CommentWidget );
//testBasicInstantiation( CommentWidget, FORM, options );

describe( 'CommentWidget', () => {
    /** @type {import('sinon').SinonSandbox} */
    let sandbox;

    let widget;

    beforeEach( () => {
        const fragment = document.createRange().createContextualFragment( FORM );
        const el = fragment.querySelector( CommentWidget.selector );

        sandbox = sinon.createSandbox();
        widget = new CommentWidget( el, options );

        sandbox.stub( input, 'validate' ).callsFake( () => Promise.resolve( true ) );
    } );

    afterEach( () => {
        sandbox.restore();
    } );

    it( 'hides comment question', () => {
        expect( widget.question.matches( '.hide' ) ).to.equal( true );
    } );

    it( 'adds comment button to linkedQuestion', () => {
        expect( widget.linkedQuestion.querySelector( '.btn-comment' ) ).not.to.equal( null );
    } );

    it( 'shows a comment dialog when comment button is clicked', () => {
        widget.linkedQuestion.querySelector( '.btn-comment' ).click();
        expect( widget.linkedQuestion.querySelector( '.or-comment-widget textarea' ) ).not.to.equal( null );
    } );

    it( 'closes a comment dialog when update button is clicked', () => {
        widget.linkedQuestion.querySelector( '.btn-comment' ).click();
        const w = widget.linkedQuestion.querySelector( '.or-comment-widget' );
        w.querySelector( 'textarea' ).textContent = 'a comment';
        w.querySelector( '.or-comment-widget__content__btn-update' ).click();
        expect( widget.linkedQuestion.querySelector( '.or-comment-widget' ) ).to.equal( null );
    } );

} );
