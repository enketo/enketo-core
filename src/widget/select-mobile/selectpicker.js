import $ from 'jquery';
import Widget from '../../js/Widget';
import support from '../../js/support';
const pluginName = 'mobileSelectpicker';

/**
 * An enhancement for the native multi-selectpicker found on most mobile devices,
 * that shows the selected values next to the select box
 *
 * @constructor
 * @param {Element} element Element to apply widget to.
 * @param {(boolean|{touch: boolean})} options options
 * @param {*=} e     event
 */

function MobileSelectpicker( element, options /*, e*/ ) {
    this.namespace = pluginName;
    Widget.call( this, element, options );
    this._init();
}

//copy the prototype functions from the Widget super class
MobileSelectpicker.prototype = Object.create( Widget.prototype );

//ensure the constructor is the new one
MobileSelectpicker.prototype.constructor = MobileSelectpicker;

/**
 * initialize
 */
MobileSelectpicker.prototype._init = function() {
    const that = this;

    //show values on change
    $( this.element ).on( `change.${pluginName}`, () => {
        that._showSelectedValues();
        return true;
    } );

    //show defaults
    this._showSelectedValues();
};

/**
 * display the selected values
 */
MobileSelectpicker.prototype._showSelectedValues = function() {
    let i;
    const valueText = [];
    const template = '<span class="widget mobileselect"></span>';
    const $select = $( this.element );
    const $widget = ( $select.next( '.widget' ).length > 0 ) ? $select.next( '.widget' ) : $( template ).insertAfter( $select );
    const values = ( $.isArray( $select.val() ) ) ? $select.val() : [ $select.val() ];

    for ( i = 0; i < values.length; i++ ) {
        valueText.push( $( this ).find( `option[value="${values[ i ]}"]` ).text() );
    }

    $widget.text( values.join( ', ' ) );
};

MobileSelectpicker.prototype.update = function() {
    this._showSelectedValues();
};

$.fn[ pluginName ] = function( options, event ) {

    options = options || {};

    return this.each( function() {
        const $this = $( this ),
            data = $this.data( pluginName );

        //only instantiate if options is an object AND if options.touch is truthy
        if ( !data && typeof options === 'object' && support.touch ) {
            $this.data( pluginName, new MobileSelectpicker( this, options, event ) );
        }
        if ( data && typeof options === 'string' ) {
            data[ options ]( this );
        }
    } );
};

export default {
    'name': pluginName,
    'selector': 'select[multiple]'
};
