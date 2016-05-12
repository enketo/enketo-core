if ( typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function' ) {
    var define = function( factory ) {
        factory( require, exports, module );
    };
}

define( function( require, exports, module ) {
    'use strict';

    var Widget = require( '../../js/Widget' );
    var $ = require( 'jquery' );
    var pluginName = 'comment';
    var t = require( 'translator' ).t;

    /**
     * Visually transforms a question into a comment modal that can be shown on its linked question.
     *
     * @constructor
     * @param {Element}                       element   Element to apply widget to.
     * @param {(boolean|{touch: boolean})}    options   options
     * @param {*=}                            event     event
     */
    function Comment( element, options, event ) {
        this.namespace = pluginName;
        Widget.call( this, element, options );
        this._init();
    }

    Comment.prototype = Object.create( Widget.prototype );
    Comment.prototype.constructor = Comment;

    Comment.prototype._init = function() {
        this.$linkedQuestion = this._getLinkedQuestion( this.element );
        this.$commentQuestion = $( this.element ).closest( '.question' );

        if ( this.$linkedQuestion.length === 1 ) {
            this.$commentQuestion.addClass( 'hide' );
            this.$commentButton = $( '<button class="btn-icon-only btn-comment" type="button"><i class="icon icon-sticky-note-o"> </i></button>' );
            this._setCommentButtonState( this.element.value );
            this.$linkedQuestion.append( this.$commentButton );
            this._setCommentButtonHandler();
            this._setValidationHandler();
        }
    };

    Comment.prototype._getLinkedQuestion = function( element ) {
        var $input = $( element );
        var contextPath = this.options.helpers.input.getName( $input );
        var targetPath = element.dataset.for.trim();
        var absoluteTargetPath = this.options.helpers.pathToAbsolute( targetPath, contextPath );
        // The root is nearest repeat or otherwise nearest form. This avoids having to calculate indices, without
        // diminishing the flexibility in any meaningful way, 
        // as it e.g. wouldn't make sense to place a comment node for a top-level question, inside a repeat.
        var $root = $( element ).closest( 'form.or, .or-repeat' );

        return this.options.helpers.input
            .getWrapNodes( $root.find( '[name="' + absoluteTargetPath + '"], [data-name="' + absoluteTargetPath + '"]' ) )
            .eq( 0 );
    };

    Comment.prototype._setCommentButtonState = function( value ) {
        value = ( typeof value === 'string' ) ? value.trim() : value;
        this.$commentButton.toggleClass( 'empty', !value );
    }

    Comment.prototype._setCommentButtonHandler = function() {
        var that = this;
        this.$commentButton.click( function() {
            if ( that._isCommentModalShown( this ) ) {
                that._hideCommentModal( that.$linkedQuestion );
            } else {
                var value = that._getCurrentValue();
                var label = that._getCurrentLabel();
                that._showCommentModal( label, value );
            }
        } );
    };

    Comment.prototype._isCommentModalShown = function( button ) {
        return $( button ).next( '.widget' ).length === 1;
    };

    Comment.prototype._showCommentModal = function( linkedQuestionLabel, linkedQuestionValue, linkedQuestionErrorMsg ) {
        var $widget;
        var $content;
        var $input;
        var $overlay;
        var that = this;
        var $comment = $( this.element ).closest( '.question' ).clone( false );
        var closeText = t( 'alert.default.button' ) || 'Close';
        var $closeButtons = $( '<button class="btn btn-primary or-comment-widget__content__btn-close">' + closeText + '</button>' +
            '<button class="btn btn-icon-only or-comment-widget__content__btn-close-x">&times;</button>' );

        $input = $comment
            .removeClass( 'or-appearance-comment hide' )
            .find( 'input, textarea' )
            .addClass( 'ignore' )
            .removeAttr( 'name data-for data-type-xml' )
            .removeData();
        $overlay = $( '<div class="or-comment-widget__overlay"></div>' );
        $content = $(
            '<div class="or-comment-widget__content">' +
            '<div class="or-comment-widget__question"><span class="or-comment-widget__question__icon">Q</span>' +
            '<span class="or-comment-widget__question__text">' + linkedQuestionLabel + '</span></div>' +
            '<div class="or-comment-widget__question"><span class="or-comment-widget__question__icon">A</span>' +
            '<span class="or-comment-widget__question__text">' + linkedQuestionValue + '</span></div>' +
            '<hr /></div>'
        ).append( $comment ).append( $closeButtons );

        $widget = $(
            '<section class="widget or-comment-widget"></section>'
        ).append( $overlay ).append( $content );

        this.$linkedQuestion.find( '.or-comment-widget' ).remove();
        this.$linkedQuestion.prepend( $widget );

        $input.on( 'change', function() {
            var value = this.value;
            $( that.element ).val( value ).trigger( 'change' );
            that._setCommentButtonState( value );
            return false;
        } );

        $closeButtons.add( $overlay ).on( 'click', function() {
            that._hideCommentModal( that.$linkedQuestion );
        } );
    };

    Comment.prototype._hideCommentModal = function( $linkedQuestion ) {
        $linkedQuestion.find( '.or-comment-widget' ).remove();
    };

    Comment.prototype._getCurrentValue = function() {
        var $input = this.$linkedQuestion.find( 'input:not(.ignore), select:not(.ignore), textarea:not(.ignore)' ).eq( 0 );
        var value = this.options.helpers.input.getVal( $input );
        return Array.isArray( value ) ? value.join( ' ' ) : value;
    };

    Comment.prototype._getCurrentLabel = function() {
        return this.$linkedQuestion.find( '.question-label.active' ).text();
    };

    Comment.prototype.destroy = function( element ) {
        var $linkedQuestion = this._getLinkedQuestion( element );
        var $commentButton = $linkedQuestion.find( '.btn-comment' );

        this._hideCommentModal( $linkedQuestion );
        $commentButton.remove();

        $( element )
            .removeData( this.namespace )
            .off( '.' + this.namespace )
            .closest( '.question' ).removeClass( 'hide' );
    };

    $.fn[ pluginName ] = function( options, event ) {

        options = options || {};

        return this.each( function() {
            var $this = $( this );
            var data = $this.data( pluginName );

            if ( !data && typeof options === 'object' ) {
                $this.data( pluginName, new Comment( this, options, event ) );
            } else if ( data && typeof options == 'string' ) {
                data[ options ]( this );
            }
        } );
    };

    module.exports = {
        'name': pluginName,
        'selector': '.or-appearance-comment input[type="text"][data-for], .or-appearance-comment textarea[data-for]',
        'helpersRequired': [ 'input', 'pathToAbsolute' ]
    };
} );
