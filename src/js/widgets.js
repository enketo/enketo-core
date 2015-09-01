if ( typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function' ) {
    var define = function( factory ) {
        factory( require, exports, module );
    };
}

define( function( require, exports, module ) {
    widgets = [
        require( '../widget/note/notewidget' ),
        require( '../widget/select-mobile/selectpicker' ),
        require( '../widget/table/tablewidget' ),
        require( '../widget/radio/radiopicker' ),
        require( '../widget/date/datepicker-extended' ),
        require( '../widget/time/timepicker-extended' ),
        require( '../widget/datetime/datetimepicker-extended' ),
    ];

    module.exports = widgets;
} );
