var obj = {
  /**
   * Initializes widgets.
   * (Important:  Widgets should be initalized after instance values have been loaded in $data as well as in input fields)
   * @param  {jQuery=} $group optionally only initialize widgets inside a group (default is inside whole form)
   */
  init: function( ) {
    /* 
      For the sake of convenience it is assumed that the $group parameter is only provided when initiating
      widgets inside newly cloned repeats and that this function has been called before for the whole form.
    */
    this.repeat = ( $group ) ? true : false;
    this.$group = $group || $form;
    this.readonlyWidget( ); //call before other widgets
    this.pageBreakWidget( );

    this.touchRadioCheckWidget( );

    this.geopointWidget( );
    this.tableWidget( );
    this.spinnerWidget( );
    this.sliderWidget( );
    this.barcodeWidget( );
    this.offlineFileWidget( );
  },

  //Note: this widget doesn't offer a way to reset a datetime value in the instance to empty
  dateTimeWidget: function( ) {
    this.$group.find( 'input[type="datetime"]' ).each( function( ) {

    } );
  },

  //transforms triggers to page-break elements //REMOVE WHEN NIGERIA FORMS NO LONGER USE THIS
  pageBreakWidget: function( ) {
    if ( !this.repeat ) {
      $form.find( '.jr-appearance-page-break input[readonly]' ).parent( 'label' ).each( function( ) {
        var name = 'name="' + $( this ).find( 'input' ).attr( 'name' ) + '"';
        $( '<hr class="manual page-break" ' + name + '></hr>' ) //ui-corner-all
        .insertBefore( $( this ) ).find( 'input' ).remove( );
        $( this ).remove( );
      } );
    }
  },

  offlineFileWidget: function( ) {

  },

  destroy: function( $group ) {
    console.log( 'destroy everything' );
  }
};