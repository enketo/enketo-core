'use strict';

/**
 * Pages module.
 */

var $ = require( 'jquery' );
var Promise = require( 'lie' );
var config = require( 'enketo-config' );

require( 'jquery-touchswipe' );

module.exports = {
    active: false,
    $current: [],
    $activePages: $(),
    init: function() {
        if ( !this.form ) {
            throw new Error( 'Repeats module not correclty instantiated with form property.' );
        }
        if ( this.form.view.$.hasClass( 'pages' ) ) {
            var $allPages = this.form.view.$.find( ' .question:not([role="comment"]), .or-appearance-field-list' )
                .filter( function() {
                    // something tells me there is a more efficient way to doing this
                    // e.g. by selecting the descendants of the .or-appearance-field-list and removing those
                    return $( this ).parent().closest( '.or-appearance-field-list' ).length === 0;
                } )
                .attr( 'role', 'page' );

            if ( $allPages.length > 1 || $allPages.eq( 0 ).hasClass( 'or-repeat' ) ) {
                this.$formFooter = $( '.form-footer' );
                this.$btnFirst = this.$formFooter.find( '.first-page' );
                this.$btnPrev = this.$formFooter.find( '.previous-page' );
                this.$btnNext = this.$formFooter.find( '.next-page' );
                this.$btnLast = this.$formFooter.find( '.last-page' );

                this.updateAllActive( $allPages );
                this.toggleButtons( 0 );
                this.setButtonHandlers();
                this.setRepeatHandlers();
                this.setBranchHandlers();
                this.setSwipeHandlers();
                this.active = true;
                this.flipToFirst();
            }
            /*else {
                form.view.$.removeClass( 'pages' );
            }*/
        }
    },
    setButtonHandlers: function() {
        var that = this;
        // Make sure eventhandlers are not duplicated after resetting form.
        this.$btnFirst.off( '.pagemode' ).on( 'click.pagemode', function() {
            if ( !that.form.pageNavigationBlocked ) {
                that.flipToFirst();
            }
            return false;
        } );
        this.$btnPrev.off( '.pagemode' ).on( 'click.pagemode', function() {
            if ( !that.form.pageNavigationBlocked ) {
                that.prev();
            }
            return false;
        } );
        this.$btnNext.off( '.pagemode' ).on( 'click.pagemode', function() {
            if ( !that.form.pageNavigationBlocked ) {
                that.next();
            }
            return false;
        } );
        this.$btnLast.off( '.pagemode' ).on( 'click.pagemode', function() {
            if ( !that.form.pageNavigationBlocked ) {
                that.flipToLast();
            }
            return false;
        } );
    },
    setSwipeHandlers: function() {
        var that = this;
        var $main = $( '.main' );

        $main.swipe( 'destroy' );
        $main.swipe( {
            allowPageScroll: 'vertical',
            threshold: 150,
            swipeLeft: function() {
                that.next();
            },
            swipeRight: function() {
                that.prev();
            }
        } );
    },
    setRepeatHandlers: function() {
        var that = this;
        // TODO: can be optimized by smartly updating the active pages
        this.form.view.$
            .off( 'addrepeat.pagemode' )
            .on( 'addrepeat.pagemode', function( event, index, byCountUpdate ) {
                that.updateAllActive();
                // Removing the class in effect avoids the animation
                // It also prevents multiple .or-repeat[role="page"] to be shown on the same page
                $( event.target ).removeClass( 'current contains-current' ).find( '.current' ).removeClass( 'current' );
                // Don't flip if the user didn't create the repeat with the + button.
                if ( !byCountUpdate ) {
                    that.flipToPageContaining( $( event.target ) );
                }
            } )
            .off( 'removerepeat.pagemode' )
            .on( 'removerepeat.pagemode', function( event ) {
                // if the current page is removed
                // note that that.$current will have length 1 even if it was removed from DOM!
                if ( that.$current.closest( 'html' ).length === 0 ) {
                    that.updateAllActive();
                    // is it best to go to previous page always?
                    that.flipToPageContaining( $( event.target ) );
                }
            } );
    },
    setBranchHandlers: function() {
        var that = this;
        // TODO: can be optimized by smartly updating the active pages
        this.form.view.$
            .off( 'changebranch.pagemode' )
            .on( 'changebranch.pagemode', function() {
                that.updateAllActive();
                that.toggleButtons();
            } );
    },
    getCurrent: function() {
        return this.$current;
    },
    updateAllActive: function( $all ) {
        $all = $all || $( '.or [role="page"]' );
        this.$activePages = $all.filter( function() {
            return $( this ).closest( '.disabled' ).length === 0 &&
                ( $( this ).is( '.question' ) || $( this ).find( '.question:not(.disabled)' ).length > 0 );
        } );
    },
    getAllActive: function() {
        return this.$activePages;
    },
    getPrev: function( currentIndex ) {
        return this.$activePages[ currentIndex - 1 ];
    },
    getNext: function( currentIndex ) {
        return this.$activePages[ currentIndex + 1 ];
    },
    getCurrentIndex: function() {
        return this.$activePages.index( this.$current );
    },
    /**
     * Changes the `pages.next()` function to return a `Promise`, wrapping one of the following values:
     *
     * @return {Promise} wrapping {boolean} or {number}.  If a {number}, this is the index into
     *         `$activePages` of the new current page; if a {boolean}, {false} means that validation
     *         failed, and {true} that validation passed, but the page did not change.
     */
    next: function() {
        var that = this;
        var currentIndex;
        var validate;
        this.updateAllActive();
        currentIndex = this.getCurrentIndex();
        validate = ( config.validatePage === false ) ? Promise.resolve( true ) : this.form.validateContent( this.$current );

        return validate
            .then( function( valid ) {
                var next, newIndex;

                if ( !valid ) {
                    return false;
                }

                next = that.getNext( currentIndex );

                if ( next ) {
                    newIndex = currentIndex + 1;
                    that.flipTo( next, newIndex );
                    return newIndex;
                }

                return true;
            } );
    },
    prev: function() {
        var prev;
        var currentIndex;
        this.updateAllActive();
        currentIndex = this.getCurrentIndex();
        prev = this.getPrev( currentIndex );

        if ( prev ) {
            this.flipTo( prev, currentIndex - 1 );
        }
    },
    setToCurrent: function( pageEl ) {
        var $n = $( pageEl );
        $n.addClass( 'current hidden' );
        this.$current = $n.removeClass( 'hidden' )
            .parentsUntil( '.or', '.or-group, .or-group-data, .or-repeat' ).addClass( 'contains-current' ).end();
    },
    flipTo: function( pageEl, newIndex ) {
        // if there is a current page
        if ( this.$current.length > 0 && this.$current.closest( 'html' ).length === 1 ) {
            // if current page is not same as pageEl
            if ( this.$current[ 0 ] !== pageEl ) {
                this.$current.removeClass( 'current fade-out' ).parentsUntil( '.or', '.or-group, .or-group-data, .or-repeat' ).removeClass( 'contains-current' );
                this.setToCurrent( pageEl );
                this.focusOnFirstQuestion( pageEl );
                this.toggleButtons( newIndex );
                $( pageEl ).trigger( 'pageflip.enketo' );
            }
        } else {
            this.setToCurrent( pageEl );
            this.focusOnFirstQuestion( pageEl );
            this.toggleButtons( newIndex );
            $( pageEl ).trigger( 'pageflip.enketo' );
        }
    },
    flipToFirst: function() {
        this.updateAllActive();
        this.flipTo( this.$activePages[ 0 ] );
    },
    flipToLast: function() {
        this.updateAllActive();
        this.flipTo( this.$activePages.last()[ 0 ] );
    },
    // flips to the page provided as jQueried parameter or the page containing
    // the jQueried element provided as parameter
    // alternatively, (e.g. if a top level repeat without field-list appearance is provided as parameter)
    // it flips to the page contained with the jQueried parameter;
    flipToPageContaining: function( $e ) {
        var $closest;
        $closest = $e.closest( '[role="page"]' );
        $closest = ( $closest.length === 0 ) ? $e.find( '[role="page"]' ) : $closest;

        //this.updateAllActive();
        this.flipTo( $closest[ 0 ] );
    },
    focusOnFirstQuestion: function( pageEl ) {
        //triggering fake focus in case element cannot be focused (if hidden by widget)
        $( pageEl )
            .find( '.question:not(.disabled)' )
            .addBack( '.question:not(.disabled)' )
            .filter( function() {
                return $( this ).parentsUntil( '.or', '.disabled' ).length === 0;
            } )
            .eq( 0 )
            .find( 'input, select, textarea' )
            .eq( 0 )
            .trigger( 'fakefocus' );

        pageEl.scrollIntoView();
    },
    toggleButtons: function( index ) {
        var i = index || this.getCurrentIndex(),
            next = this.getNext( i ),
            prev = this.getPrev( i );
        this.$btnNext.add( this.$btnLast ).toggleClass( 'disabled', !next );
        this.$btnPrev.add( this.$btnFirst ).toggleClass( 'disabled', !prev );
        this.$formFooter.toggleClass( 'end', !next );
    }
};
