'use strict';

/**
 * Pages module.
 */

var $ = require( 'jquery' );
var config = require( 'enketo/config' );

require( 'jquery-touchswipe' );

module.exports = {
    active: false,
    $current: [],
    $activePages: $(),
    init: function() {
        if ( !this.form ) {
            throw new Error( 'Repeats module not correctly instantiated with form property.' );
        }
        if ( this.form.view.$.hasClass( 'pages' ) ) {
            var $allPages = this.form.view.$.find( ' .question:not([role="comment"]), .or-appearance-field-list' )
                .add( '.or-repeat.or-appearance-field-list + .or-repeat-info' )
                .filter( function() {
                    // something tells me there is a more efficient way to doing this
                    // e.g. by selecting the descendants of the .or-appearance-field-list and removing those
                    return $( this ).parent().closest( '.or-appearance-field-list' ).length === 0;
                } )
                .attr( 'role', 'page' );

            if ( $allPages.length > 0 || $allPages.eq( 0 ).hasClass( 'or-repeat' ) ) {
                var formWrapper = this.form.view.html.parentNode;
                this.$formFooter = $( formWrapper.querySelector( '.form-footer' ) );
                this.$btnFirst = this.$formFooter.find( '.first-page' );
                this.$btnPrev = this.$formFooter.find( '.previous-page' );
                this.$btnNext = this.$formFooter.find( '.next-page' );
                this.$btnLast = this.$formFooter.find( '.last-page' );
                this.$toc = $( formWrapper.querySelector( '.page-toc' ) );
                this._updateAllActive( $allPages );
                this._updateToc();
                this._toggleButtons( 0 );
                this._setButtonHandlers();
                this._setRepeatHandlers();
                this._setBranchHandlers();
                this._setSwipeHandlers();
                this._setLangChangeHandlers();
                this.active = true;
                this._flipToFirst();
            }
            /*else {
                form.view.$.removeClass( 'pages' );
            }*/
        }
    },
    // flips to the page provided as jQueried parameter or the page containing
    // the jQueried element provided as parameter
    // alternatively, (e.g. if a top level repeat without field-list appearance is provided as parameter)
    // it flips to the page contained with the jQueried parameter;
    flipToPageContaining: function( $e ) {
        var $closest;

        $closest = $e.closest( '[role="page"]' );
        $closest = ( $closest.length === 0 ) ? $e.find( '[role="page"]' ) : $closest;

        // If $e is a comment question, and it is not inside a group, there may be no $closest.
        if ( $closest.length ) {
            this._flipTo( $closest[ 0 ] );
        }
    },
    _setButtonHandlers: function() {
        var that = this;
        // Make sure eventhandlers are not duplicated after resetting form.
        this.$btnFirst.off( '.pagemode' ).on( 'click.pagemode', function() {
            if ( !that.form.pageNavigationBlocked ) {
                that._flipToFirst();
            }
            return false;
        } );
        this.$btnPrev.off( '.pagemode' ).on( 'click.pagemode', function() {
            if ( !that.form.pageNavigationBlocked ) {
                that._prev();
            }
            return false;
        } );
        this.$btnNext.off( '.pagemode' ).on( 'click.pagemode', function() {
            if ( !that.form.pageNavigationBlocked ) {
                that._next();
            }
            return false;
        } );
        this.$btnLast.off( '.pagemode' ).on( 'click.pagemode', function() {
            if ( !that.form.pageNavigationBlocked ) {
                that._flipToLast();
            }
            return false;
        } );
    },
    _setSwipeHandlers: function() {
        if ( config.swipePage === false ) {
            return;
        }
        var that = this;
        var $main = this.form.view.$.closest( '.main' );

        $main.swipe( 'destroy' );
        $main.swipe( {
            allowPageScroll: 'vertical',
            threshold: 250,
            preventDefaultEvents: false,
            swipeLeft: function() {
                that.$btnNext.click();
            },
            swipeRight: function() {
                that.$btnPrev.click();
            },
            swipeStatus: function( evt, phase ) {
                if ( phase === 'start' ) {
                    /*
                     * Triggering blur will fire a change event on the currently focused form control
                     * This will trigger validation and is required to block page navigation on swipe 
                     * with form.pageNavigationBlocked
                     * The only potential problem with this approach is that the threshold (250ms)
                     * may theoretically not be sufficient to ensure validation is completed to 
                     * set form.pageNavigationBlocked to true. The edge case will be very slow devices
                     * and/or amazingly complex constraint expressions.
                     */
                    that._getCurrent().find( ':focus' ).blur();
                }
            }
        } );
    },
    _setRepeatHandlers: function() {
        var that = this;
        // TODO: can be optimized by smartly updating the active pages
        this.form.view.$
            //.off( 'addrepeat.pagemode' )
            .on( 'addrepeat.pagemode', function( event, index, byCountUpdate ) {
                that._updateAllActive();
                // Removing the class in effect avoids the animation
                // It also prevents multiple .or-repeat[role="page"] to be shown on the same page
                $( event.target ).removeClass( 'current contains-current' ).find( '.current' ).removeClass( 'current' );
                // Don't flip if the user didn't create the repeat with the + button.
                // or if is the default first instance created during loading.
                if ( !byCountUpdate ) {
                    that.flipToPageContaining( $( event.target ) );
                }
            } )
            //.off( 'removerepeat.pagemode' )
            .on( 'removerepeat.pagemode', function( event ) {
                // if the current page is removed
                // note that that.$current will have length 1 even if it was removed from DOM!
                if ( that.$current.closest( 'html' ).length === 0 ) {
                    that._updateAllActive();
                    var $target = $( event.target ).prev();
                    if ( $target.length === 0 ) {
                        $target = $( event.target );
                    }
                    // is it best to go to previous page always?
                    that.flipToPageContaining( $target );
                }
            } );
    },
    _setBranchHandlers: function() {
        var that = this;
        // TODO: can be optimized by smartly updating the active pages
        this.form.view.$
            //.off( 'changebranch.pagemode' )
            .on( 'changebranch.pagemode', function() {
                that._updateAllActive();
                that._toggleButtons();
            } );
    },
    _setLangChangeHandlers: function() {
        var that = this;
        this.form.view.$
            .on( 'changelanguage.pagemode', function() {
                that._updateToc();
            } );
    },
    _getCurrent: function() {
        return this.$current;
    },
    _updateAllActive: function( $all ) {
        $all = $all || this.form.view.$.find( '[role="page"]' );
        this.$activePages = $all.filter( function() {
            var $this = $( this );
            return $this.closest( '.disabled' ).length === 0 &&
                ( $this.is( '.question' ) || $this.find( '.question:not(.disabled)' ).length > 0 ||
                    // or-repeat-info is only considered a page by itself if it has no sibling repeats
                    // When there are siblings repeats, we use CSS trickery to show the + button underneath the last 
                    // repeat.
                    ( $this.is( '.or-repeat-info' ) && $this.siblings( '.or-repeat' ).length === 0 ) );
        } );
        this._updateToc();
    },
    _getPrev: function( currentIndex ) {
        return this.$activePages[ currentIndex - 1 ];
    },
    _getNext: function( currentIndex ) {
        return this.$activePages[ currentIndex + 1 ];
    },
    _getCurrentIndex: function() {
        return this.$activePages.index( this.$current );
    },
    /**
     * Changes the `pages.next()` function to return a `Promise`, wrapping one of the following values:
     *
     * @return {Promise} wrapping {boolean} or {number}.  If a {number}, this is the index into
     *         `$activePages` of the new current page; if a {boolean}, {false} means that validation
     *         failed, and {true} that validation passed, but the page did not change.
     */
    _next: function() {
        var that = this;
        var currentIndex;
        var validate;

        currentIndex = this._getCurrentIndex();
        validate = ( config.validatePage === false ) ? Promise.resolve( true ) : this.form.validateContent( this.$current );

        return validate
            .then( function( valid ) {
                var next, newIndex;

                if ( !valid ) {
                    return false;
                }

                next = that._getNext( currentIndex );

                if ( next ) {
                    newIndex = currentIndex + 1;
                    that._flipTo( next, newIndex );
                    return newIndex;
                }

                return true;
            } );
    },
    _prev: function() {
        var prev;
        var currentIndex;

        currentIndex = this._getCurrentIndex();
        prev = this._getPrev( currentIndex );

        if ( prev ) {
            this._flipTo( prev, currentIndex - 1 );
        }
    },
    _setToCurrent: function( pageEl ) {
        var $n = $( pageEl );
        $n.addClass( 'current hidden' );
        this.$current = $n.removeClass( 'hidden' )
            .parentsUntil( '.or', '.or-group, .or-group-data, .or-repeat' ).addClass( 'contains-current' ).end();
    },
    _flipTo: function( pageEl, newIndex ) {
        // if there is a current page
        if ( this.$current.length > 0 && this.$current.closest( 'html' ).length === 1 ) {
            // if current page is not same as pageEl
            if ( this.$current[ 0 ] !== pageEl ) {
                this.$current.removeClass( 'current fade-out' ).parentsUntil( '.or', '.or-group, .or-group-data, .or-repeat' ).removeClass( 'contains-current' );
                this._setToCurrent( pageEl );
                this._focusOnFirstQuestion( pageEl );
                this._toggleButtons( newIndex );
                $( pageEl ).trigger( 'pageflip.enketo' );
            }
        } else {
            this._setToCurrent( pageEl );
            this._focusOnFirstQuestion( pageEl );
            this._toggleButtons( newIndex );
            $( pageEl ).trigger( 'pageflip.enketo' );
        }
    },
    _flipToFirst: function() {
        this._flipTo( this.$activePages[ 0 ] );
    },
    _flipToLast: function() {
        this._flipTo( this.$activePages.last()[ 0 ] );
    },

    _focusOnFirstQuestion: function( pageEl ) {
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
    _toggleButtons: function( index ) {
        var i = index || this._getCurrentIndex(),
            next = this._getNext( i ),
            prev = this._getPrev( i );
        this.$btnNext.add( this.$btnLast ).toggleClass( 'disabled', !next );
        this.$btnPrev.add( this.$btnFirst ).toggleClass( 'disabled', !prev );
        this.$formFooter.toggleClass( 'end', !next );
    },
    _updateToc: function() {
        if ( this.$toc.length ) {
            // regenerate complete ToC from first enabled question/group label of each page
            var tocItems = this.$activePages.get()
                .filter( function( pageEl ) {
                    return !pageEl.classList.contains( 'or-repeat-info' );
                } ).map( function( pageEl ) {
                    var labelEl = pageEl.querySelector( '.question-label.active' );
                    if ( !labelEl ) {
                        console.error( 'active page without label?', pageEl );
                        return false;
                    }
                    var label = labelEl.textContent;
                    return { pageEl: pageEl, label: label };
                } );
            this.$toc.empty()[ 0 ].append( this._getTocHtmlFragment( tocItems ) );
        }
    },
    _getTocHtmlFragment: function( tocItems ) {
        var items = document.createDocumentFragment();
        tocItems.forEach( function( item ) {
            var li = document.createElement( 'li' );
            li.textContent = item.label.substr( 0, 20 );
            items.appendChild( li );
        } );
        return items;
    }
};
