'use strict';

var Widget = require( '../../js/Widget' );
var $ = require( 'jquery' );
var pluginName = 'imageViewer';

/**
 * Viewer for image labels that have set a big-image version.
 *
 * @constructor
 * @param {Element}                       element   Element to apply widget to.
 * @param {(boolean|{touch: boolean})}    options   options
 * @param {*=}                            event     event
 */
function ImageViewer( element, options, event ) {
    this.namespace = pluginName;
    Widget.call( this, element, options );
    this._init();
}

ImageViewer.prototype = Object.create( Widget.prototype );
ImageViewer.prototype.constructor = ImageViewer;

// add your widget functions
ImageViewer.prototype._init = function() {
    $( this.element ).on( 'click', function() {
        var $link = $( this );
        var href = $link.attr( 'href' );
        var $img = $link.find( 'img' );
        var src = $img.attr( 'src' );

        $link.attr( 'href', src );
        $img.attr( 'src', href );
        $link.toggleClass( 'open' );

        return false;
    } );
};

$.fn[ pluginName ] = function( options, event ) {

    options = options || {};

    return this.each( function() {
        var $this = $( this );
        var data = $this.data( pluginName );

        if ( !data && typeof options === 'object' ) {
            $this.data( pluginName, new ImageViewer( this, options, event ) );
        } else if ( data && typeof options == 'string' ) {
            data[ options ]( this );
        }
    } );
};

module.exports = {
    'name': pluginName,
    'selector': 'a.or-big-image'
};
