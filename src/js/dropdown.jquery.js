// Copied from Bootstrap

// DROPDOWN CLASS DEFINITION
// =========================
import $ from 'jquery';

const backdrop = '.dropdown-backdrop';
const toggle = '[data-toggle=dropdown]';
const Dropdown = function( element ) {
    $( element ).on( 'click.bs.dropdown', this.toggle );
};

Dropdown.prototype.toggle = function( e ) {
    const $this = $( this );

    if ( $this.is( '.disabled, :disabled' ) ) {
        return;
    }

    const $parent = getParent( $this );
    const isActive = $parent.hasClass( 'open' );

    clearMenus();

    if ( !isActive ) {
        if ( 'ontouchstart' in document.documentElement && !$parent.closest( '.navbar-nav' ).length ) {
            // if mobile we use a backdrop because click events don't delegate
            $( '<div class="dropdown-backdrop"/>' ).insertAfter( $( this ) ).on( 'click', clearMenus );
        }

        const relatedTarget = {
            relatedTarget: this
        };
        $parent.trigger( e = $.Event( 'show.bs.dropdown', relatedTarget ) );

        if ( e.isDefaultPrevented() ) {
            return;
        }

        $parent
            .toggleClass( 'open' )
            .trigger( 'shown.bs.dropdown', relatedTarget );

        $this.focus();
    }

    return false;
};

Dropdown.prototype.keydown = function( e ) {
    if ( !/^(38|40|27)$/.test( e.keyCode ) ) {
        return;
    }

    const $this = $( this );

    e.preventDefault();
    e.stopPropagation();

    if ( $this.is( '.disabled, :disabled' ) ) {
        return;
    }

    const $parent = getParent( $this );
    const isActive = $parent.hasClass( 'open' );

    if ( !isActive || ( isActive && e.keyCode === 27 ) ) {
        if ( e.which === 27 ) {
            $parent.find( toggle ).focus();
        }

        return $this.click();
    }

    const desc = ' li:not(.divider):visible a';
    const $items = $parent.find( `[role=menu]${desc}, [role=listbox]${desc}` );

    if ( !$items.length ) {
        return;
    }

    let index = $items.index( $items.filter( ':focus' ) );

    if ( e.keyCode === 38 && index > 0 ) {
        index--; // up
    }
    if ( e.keyCode === 40 && index < $items.length - 1 ) {
        index++; // down
    }
    if ( !~index ) {
        index = 0;
    }

    $items.eq( index ).focus();
};

function clearMenus( e ) {
    $( backdrop ).remove();
    $( toggle ).each( function() {
        const $parent = getParent( $( this ) );
        const relatedTarget = {
            relatedTarget: this
        };
        if ( !$parent.hasClass( 'open' ) ) {
            return;
        }
        $parent.trigger( e = $.Event( 'hide.bs.dropdown', relatedTarget ) );
        if ( e.isDefaultPrevented() ) {
            return;
        }
        $parent.removeClass( 'open' ).trigger( 'hidden.bs.dropdown', relatedTarget );
    } );
}

function getParent( $this ) {
    let selector = $this.attr( 'data-target' );

    if ( !selector ) {
        selector = $this.attr( 'href' );
        selector = selector && /#[A-Za-z]/.test( selector ) && selector.replace( /.*(?=#[^\s]*$)/, '' ); //strip for ie7
    }

    const $parent = selector && $( selector );

    return $parent && $parent.length ? $parent : $this.parent();
}


// DROPDOWN PLUGIN DEFINITION
// ==========================

const old = $.fn.dropdown;

$.fn.dropdown = function( option ) {
    return this.each( function() {
        const $this = $( this );
        const data = $this.data( 'bs.dropdown' );

        if ( !data ) {
            $this.data( 'bs.dropdown', new Dropdown( this ) );
        }
        if ( typeof option === 'string' ) {
            data[ option ].call( $this );
        }
    } );
};

$.fn.dropdown.Constructor = Dropdown;


// DROPDOWN NO CONFLICT
// ====================

$.fn.dropdown.noConflict = function() {
    $.fn.dropdown = old;

    return this;
};


// APPLY TO STANDARD DROPDOWN ELEMENTS
// ===================================

$( document )
    .on( 'click.bs.dropdown.data-api', clearMenus )
    .on( 'click.bs.dropdown.data-api', '.dropdown form', e => {
        e.stopPropagation();
    } )
    .on( 'click.bs.dropdown.data-api', toggle, Dropdown.prototype.toggle )
    .on( 'keydown.bs.dropdown.data-api', `${toggle}, [role=menu], [role=listbox]`, Dropdown.prototype.keydown );
