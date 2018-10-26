import $ from 'jquery';
import Widget from '../../js/Widget';
const pluginName = 'urlWidget';


/*
 * @constructor
 * @param {Element}                       element   Element to apply widget to.
 * @param {{}|{helpers: *}}                             options   options
 */
function UrlWidget( element, options ) {
    this.namespace = pluginName;
    Widget.call( this, element, options );
    this._init();
}

UrlWidget.prototype = Object.create( Widget.prototype );
UrlWidget.prototype.constructor = UrlWidget;

UrlWidget.prototype._init = function() {
    this.$link = $( '<a class="widget url-widget" target="_blank"/>' );

    $( this.element )
        .addClass( 'hide' )
        .after( this.$link );

    this._setValueInWidget( this.element.value );
};

UrlWidget.prototype._setValueInWidget = function( value ) {
    value = value || '';
    this.$link
        .prop( { href: value, title: value } )
        .text( value );
};

UrlWidget.prototype.disable = () => {};

UrlWidget.prototype.enable = () => {};

UrlWidget.prototype.update = function() {
    this._setValueInWidget( this.element.value );
};

$.fn[ pluginName ] = function( options, event ) {

    options = options || {};

    return this.each( function() {
        const $this = $( this );
        const data = $this.data( pluginName );

        if ( !data && typeof options === 'object' ) {
            $this.data( pluginName, new UrlWidget( this, options, event ) );
        } else if ( data && typeof options == 'string' ) {
            data[ options ]( this );
        }
    } );
};

export default {
    'name': pluginName,
    'selector': '.or-appearance-url input[type="text"]'
};
