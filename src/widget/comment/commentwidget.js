import $ from 'jquery';
import Widget from '../../js/widget';
import { t } from 'enketo/translator';
import events from '../../js/event';

/**
 * Visually transforms a question into a comment modal that can be shown on its linked question.
 *
 * @augments Widget
 */
class Comment extends Widget {
    /**
     * @type {string}
     */
    static get selector() {
        return '.or-appearance-comment input[type="text"][data-for], .or-appearance-comment textarea[data-for]';
    }

    /**
     * @type {string}
     */
    static get helpersRequired() {
        return [ 'input', 'pathToAbsolute' ];
    }

    _init() {
        this.linkedQuestion = this._getLinkedQuestion( this.element );
        this.commentQuestion = this.question;

        if ( this.linkedQuestion ) {
            // Adding role='comment' is for now only used to make sure that role is not 'page' as that messes things up
            this.commentQuestion.classList.add( 'hide' );
            this.commentQuestion.setAttribute( 'role', 'comment' );

            // Any <button> inside a <label> receives click events if the <label> is clicked!
            // See http://codepen.io/MartijnR/pen/rWJeOG?editors=1111
            const fragment = document.createRange().createContextualFragment( '<a class="btn-icon-only btn-comment aria-label="comment" type="button" href="#"><i class="icon"> </i></a>' );
            const labels = this.linkedQuestion.querySelectorAll( '.question-label' );
            labels[ labels.length - 1 ].after( fragment );

            this.commentButton = this.linkedQuestion.querySelector( '.btn-comment' );
            this._setCommentButtonState( this.originalInputValue );
            this._setCommentButtonHandler();
            this._setValidationHandler();
            this._setFocusHandler();
        }
    }

    /**
     * @param {Element} input - form control HTML element
     * @return {Element} the HTML question the widget is linked with
     */
    _getLinkedQuestion( input ) {
        const contextPath = this.options.helpers.input.getName( input );
        const targetPath = this.element.dataset.for.trim();
        const absoluteTargetPath = this.options.helpers.pathToAbsolute( targetPath, contextPath );
        // The root is nearest repeat or otherwise nearest form. This avoids having to calculate indices, without
        // diminishing the flexibility in any meaningful way,
        // as it e.g. wouldn't make sense to place a comment node for a top-level question, inside a repeat.
        const root = input.closest( 'form.or, .or-repeat' );

        return this.options.helpers.input
            .getWrapNode( root.querySelector( `[name="${absoluteTargetPath}"], [data-name="${absoluteTargetPath}"]` ) );
    }

    /**
     * @return {boolean} whether comment has error
     */
    _commentHasError() {
        return this.commentQuestion.classList.contains( 'invalid-required' ) || this.commentQuestion.classList.contains( 'invalid-constraint' );
    }

    /**
     * @param {*} value - comment value
     * @param {Error} error - error instance
     */
    _setCommentButtonState( value, error ) {
        value = typeof value === 'string' ? value.trim() : value;
        this.commentButton.classList.toggle( 'empty', !value );
        this.commentButton.classList.toggle( 'invalid', !!error );
    }

    /**
     * Sets comment button handler
     */
    _setCommentButtonHandler() {
        this.commentButton.addEventListener( 'click', ev => {
            if ( this._isCommentModalShown( this.linkedQuestion ) ) {
                this._hideCommentModal( this.linkedQuestion );
            } else {
                this._showCommentModal();
            }
            ev.preventDefault();
            ev.stopPropagation();
        } );
    }

    /**
     * Sets validation handler
     */
    _setValidationHandler() {
        this.element.closest( 'form.or' ).addEventListener( events.ValidationComplete().type, () => {
            const error = this._commentHasError();
            const value = this.originalInputValue;
            this._setCommentButtonState( value, error );
        } );
    }

    /**
     * Sets focus handler
     */
    _setFocusHandler() {
        $( this.element ).on( 'applyfocus', () => {
            if ( this.commentButton.matches( ':visible' ) ) {
                this.commentButton.click();
            } else {
                console.warn( `The linked question is not visible. Cannot apply focus to ${this.element.getAttribute( 'name' )}` );
            }
        } );
    }

    /**
     * @param {Element} linkedQuestion - the HTML question the widget is linked with
     * @return {boolean} whether comment modal is currently shown
     */
    _isCommentModalShown( linkedQuestion ) {
        return !!linkedQuestion.querySelector( '.or-comment-widget' );
    }

    /**
     * Shows comment modal
     */
    _showCommentModal() {
        const comment = this.question.cloneNode( true );
        const updateText = t( 'widget.comment.update' ) || 'Update';
        const input = comment.querySelector( 'input, textarea' );

        comment.classList.remove( 'hide' );
        input.classList.add( 'ignore' );
        input.removeAttribute( 'name data-for data-type-xml' );

        const fragment = document.createRange().createContextualFragment(
            `<section class="widget or-comment-widget">
                <div class="or-comment-widget__content">
                    <button class="btn btn-primary or-comment-widget__content__btn-update" type="button">${updateText}</button>
                    <button class="btn-icon-only or-comment-widget__content__btn-close-x" type="button">&times;</button>
                </div>
            </section>
            `
        );
        fragment.querySelector( '.or-comment-widget__content' ).prepend( comment );

        const overlayFrag = document.createRange().createContextualFragment( '<div class="or-comment-widget__overlay"></div>' );

        this.linkedQuestion.prepend( fragment );
        //.find( '.or-comment-widget' ).remove().end()

        this.linkedQuestion.before( overlayFrag );

        const overlay = this.linkedQuestion.previousElementSibling;
        const widget = this.linkedQuestion.querySelector( '.or-comment-widget' );
        const updateButton = widget.querySelector( '.or-comment-widget__content__btn-update' );
        const closeButton = widget.querySelector( '.or-comment-widget__content__btn-close-x' );

        input.focus();
        widget.scrollIntoView( false );

        updateButton.addEventListener( 'click', ev => {
            const value = input.value;
            this.originalInputValue = value;
            this.element.dispatchEvent( events.Change() );
            const error = this._commentHasError();
            this._setCommentButtonState( value, error );
            this._hideCommentModal( this.linkedQuestion );
            /*
             * Any current error state shown in the linked question will not automatically update.
             * It only updates when its **own** value changes.
             * See https://github.com/kobotoolbox/enketo-express/issues/608
             * Since a linked question and a comment belong so closely together, and likely have
             * a `required` or `constraint` dependency, it makes sense to
             * separately call a validate method on the linked question to update the error state if necessary.
             *
             * Note that with setting "validateContinously" set to "true" this means it will be validated twice.
             */
            this.options.helpers.input.validate( $( this.linkedQuestion.querySelector( 'input, select, textarea' ) ) );
            ev.preventDefault();
            ev.stopPropagation();
        } );

        closeButton.addEventListener( 'click', ev => {
            this._hideCommentModal( this.linkedQuestion );
            ev.stopPropagation();
            ev.preventDefault();
        } );

        overlay.addEventListener( 'click', ev => {
            this._hideCommentModal( this.linkedQuestion );
            ev.stopPropagation();
            ev.preventDefault();
        } );
    }

    /**
     * Hides comment modal
     *
     * @param {Element} linkedQuestion - the HTML question the widget is linked with
     */
    _hideCommentModal( linkedQuestion ) {
        linkedQuestion.querySelector( '.or-comment-widget' ).remove();
        const overlay = linkedQuestion.previousElementSibling;
        if ( overlay && overlay.matches( '.or-comment-widget__overlay' ) ) {
            overlay.remove();
        }
    }
}

export default Comment;
