if ( typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function' ) {
    var define = function( factory ) {
        factory( require, exports, module );
    };
}

define( function( require, exports, module ) {
    var widgets = [
        require( '../widget/note/notewidget' ),
        require( '../widget/select-desktop/selectpicker' ),
        require( '../widget/select-mobile/selectpicker' ),
        require( '../widget/geo/geopicker' ),
        require( '../widget/table/tablewidget' ),
        require( '../widget/radio/radiopicker' ),
        require( '../widget/date/datepicker-extended' ),
        require( '../widget/time/timepicker-extended' ),
        require( '../widget/datetime/datetimepicker-extended' ),
        require( '../widget/mediagrid/mediagridpicker' ),
        require( '../widget/file/filepicker' ),
        require( '../widget/select-likert/likertitem' ),
        require( '../widget/distress/distresspicker' ),
        require( '../widget/horizontal-choices/horizontalchoices' ),
        require( '../widget/analog-scale/analog-scalepicker' ),
        require( '../widget/big-image/image-viewer' ),
    ];

    module.exports = widgets;
} );
