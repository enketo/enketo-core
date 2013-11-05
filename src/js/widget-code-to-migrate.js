//transforms triggers to page-break elements //REMOVE WHEN NIGERIA FORMS NO LONGER USE THIS
var pageBreakWidget = function() {
    if ( !this.repeat ) {
        $form.find( '.or-appearance-page-break input[readonly]' ).parent( 'label' ).each( function() {
            var name = 'name="' + $( this ).find( 'input' ).attr( 'name' ) + '"';
            $( '<hr class="manual page-break" ' + name + '></hr>' ) //ui-corner-all
            .insertBefore( $( this ) ).find( 'input' ).remove();
            $( this ).remove();
        } );
    }
};
