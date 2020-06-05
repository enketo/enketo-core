import $ from 'jquery';
import Widget from '../../js/widget';
import support from '../../js/support';
import events from '../../js/event';
import sortable from 'html5sortable/dist/html5sortable.cjs';
import { t } from 'enketo/translator';

/**
 * @augments Widget
 */
class RankWidget extends Widget {
    /**
     * @type {string}
     */
    static get selector() {
        return '.question input.rank';
    }

    /**
     * @type {boolean}
     */
    static get list() {
        return true;
    }

    _init() {
        const that = this;
        const loadedValue = this.originalInputValue;
        const startTextKey = support.touch ? 'rankwidget.tapstart' : 'rankwidget.clickstart';

        this.itemSelector = 'label:not(.itemset-template)';
        this.list = $( this.element ).next( '.option-wrapper' ).addClass( 'widget rank-widget' )[ 0 ];

        $( this.list )
            .toggleClass( 'rank-widget--empty', !loadedValue )
            .append( this.resetButtonHtml )
            .append( `<div class="rank-widget__overlay"><span class="rank-widget__overlay__content" data-i18n="${startTextKey}">${support.touch ? t( 'rankwidget.tapstart' ) : t( 'rankwidget.clickstart' )}</span></div>` )
            .on( 'click', function() {
                if ( !that.element.disabled ) {
                    this.classList.remove( 'rank-widget--empty' );
                    that.originalInputValue = that.value;
                    that.element.dispatchEvent( events.FakeFocus() );
                }
            } );

        this.list.querySelector( '.btn-reset' ).addEventListener( 'click', ( evt ) => {
            this._reset();
            evt.stopPropagation();
        } );

        this.element.classList.add( 'hide' );

        this.value = loadedValue;

        // Create the sortable drag-and-drop functionality
        sortable( this.list, {
            items: this.itemSelector,
            //hoverClass: 'rank-widget__item--hover',
            containerSerializer( container ) {
                return {
                    value: [].slice.call( container.node.querySelectorAll( `${that.itemSelector} input` ) ).map( input => input.value ).join( ' ' )
                };
            }
        } )[ 0 ].addEventListener( 'sortupdate', () => {
            this.originalInputValue = this.value;
            this.element.dispatchEvent( events.FakeFocus() );
        } );

        if ( this.props.readonly ) {
            this.disable();
        }
    }

    /**
     * Resets widget
     */
    _reset() {
        this.originalInputValue = '';
    }

    /**
     * @type {string}
     */
    get value() {
        const result = sortable( this.list, 'serialize' );

        return result[ 0 ].container.value;
    }

    set value( value ) {
        if ( !value ) {
            this._reset();
        } else {
            const that = this;
            const values = value.split( ' ' );
            const items = [ ...this.list.querySelectorAll( `${this.itemSelector} input` ) ];

            // Basic error check
            if ( values.length !== items.length ) {
                throw new Error( 'Could not load rank widget value. Number of items mismatch.' );
            }

            // Don't even attempt to rectify a mismatch between the value and the available items.
            items.sort( ( a, b ) => {
                const aIndex = values.indexOf( a.value );
                const bIndex = values.indexOf( b.value );
                if ( aIndex === -1 || bIndex === -1 ) {
                    throw new Error( 'Could not load rank widget value. Mismatch in item values.' );
                }

                return aIndex - bIndex;
            } );

            items.forEach( item => {
                $( that.list ).find( '.btn-reset' ).before( $( item.parentNode ).detach() );
            } );
        }
    }

    /**
     * Disables widget
     */
    disable() {
        $( this.element )
            .prop( 'disabled', true )
            .next( '.widget' )
            .find( 'input, button' )
            .prop( 'disabled', true );

        sortable( this.list, 'disable' );
    }

    /**
     * Enables widget
     */
    enable() {
        $( this.element )
            .prop( 'disabled', false )
            .next( '.widget' )
            .find( 'input, button' )
            .prop( 'disabled', false );

        sortable( this.list, 'enable' );
    }

    /**
     * Updates widget
     */
    update() {
        const value = this.element.value;
        // re-initalize sortable because the options may have changed
        sortable( this.list );

        if ( value ) {
            this.value = value;
            this.originalInputValue = value;
        } else {
            this._reset();
        }
    }

    // Since we're overriding the setter we also have to overwrite the getter
    // https://stackoverflow.com/questions/28950760/override-a-setter-and-the-getter-must-also-be-overridden
    /**
     * @type {string}
     */
    get originalInputValue() {
        return super.originalInputValue;
    }

    /**
     * This is the input that Enketo's engine listens on.
     *
     * @type {string}
     */
    set originalInputValue( value ) {
        super.originalInputValue = value;
        this.list.classList.toggle( 'rank-widget--empty', !value );
    }

}

export default RankWidget;
