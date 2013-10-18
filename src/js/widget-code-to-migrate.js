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
    this.mediaLabelWidget( );
    this.radioCheckWidget( );
    this.radioUnselectWidget( );
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
    if ( this.repeat ) {
      return;
    }
    var fileInputHandler,
      feedbackMsg = 'Awaiting user permission to store local data (files)',
      feedbackClass = 'info',
      allClear = false,
      //permissionGranted = false,
      $fileInputs = $form.find( 'input[type="file"]' );
    if ( $fileInputs.length === 0 ) {
      return;
    }
    //TODO: add online file widget in case fileManager is undefined or use file manager with temporary storage?
    if ( typeof fileManager == 'undefined' ) {
      feedbackClass = 'warning';
      feedbackMsg = "File uploads not supported."; //" in previews and iframed views.";
    } else if ( !fileManager.isSupported( ) ) {
      feedbackClass = 'warning';
      feedbackMsg = "File uploads not supported by your browser";
    } else {
      allClear = true;
    }
    $fileInputs
      .prop( 'disabled', true )
      .addClass( 'ignore force-disabled' )
      .after( '<div class="file-feedback text-' + feedbackClass + '">' + feedbackMsg + '</div>' );
    if ( !allClear ) {
      $fileInputs.hide( );
      return;
    }
    /*
      This delegated eventhander should actually be added asynchronously (or not at all if no FS support/permission). However, it
      needs to fired *before* the regular input change event handler for 2 reasons:
      1. If saving the file in the browser's file system fails, the instance should not be updated
      2. The regular eventhandler has event.stopImmediatePropagation which would mean this handler is never called.
      The easiest way to achieve this is to always add it but only let it do something if permission is granted to use FS.
     */
    $form.on( 'change.passthrough', 'input[type="file"]', function( event ) {
      if ( fileManager.getCurrentQuota( ) ) {
        var prevFileName, file, mediaType, $preview,
          $input = $( this );
        //console.debug( 'namespace: ' + event.namespace );
        if ( event.namespace === 'passthrough' ) {
          //console.debug('returning true');
          $input.trigger( 'change.file' );
          return false;
        }
        prevFileName = $input.attr( 'data-previous-file-name' );
        file = $input[ 0 ].files[ 0 ];
        mediaType = $input.attr( 'accept' );
        $preview = ( mediaType && mediaType === 'image/*' ) ? $( '<img />' ) : ( mediaType === 'audio/*' ) ? $( '<audio controls="controls"/>' ) : ( mediaType === 'video/*' ) ? $( '<video controls="controls"/>' ) : $( '<span>No preview (unknown mediatype)</span>' );
        $preview.addClass( 'file-preview' );
        if ( prevFileName && ( !file || prevFileName !== file.name ) ) {
          fileManager.deleteFile( prevFileName );
        }
        $input.siblings( '.file-feedback, .file-preview, .file-loaded' ).remove( );
        console.debug( 'file: ', file );
        if ( file && file.size > 0 && file.size <= connection.maxSubmissionSize( ) ) {
          //console.debug( 'going to save it in filesystem' );
          fileManager.saveFile(
            file, {
              success: function( fsURL ) {
                $preview.attr( 'src', fsURL );
                $input.trigger( 'change.passthrough' ).after( $preview );
              },
              error: function( e ) {
                console.error( 'error: ', e );
                $input.val( '' );
                $input.after( '<div class="file-feedback text-error">' +
                  'Failed to save file</span>' );
              }
            }
          );
          return false;
        }
        //clear instance value by letting it bubble up to normal change handler
        else {
          if ( file.size > connection.maxSubmissionSize( ) ) {
            $input.after( '<div class="file-feedback text-error">' +
              'File too large (max ' +
              ( Math.round( ( connection.maxSubmissionSize( ) * 100 ) / ( 1024 * 1024 ) ) / 100 ) +
              ' Mb)</div>' );
          }
          return true;
        }
      }
    } );
    var callbacks = {
      success: function( ) {
        console.log( 'Whoheee, we have permission to use the file system' );
        $fileInputs.removeClass( 'ignore force-disabled' )
          .prop( 'disabled', false )
          .siblings( '.file-feedback' ).remove( )
          .end( )
          .after( '<div class="file-feedback text-info">' +
            'File inputs are experimental. Use only for testing.' );
      },
      error: function( ) {
        $fileInputs.siblings( '.file-feedback' ).remove( );
        $fileInputs.after( '<div class="file-feedback text-warning">' +
          'No permission given to store local data (or an error occurred).</div>' );
      }
    };
    $fileInputs.each( function( ) {
      var $input = $( this ),
        existingFileName = $input.attr( 'data-loaded-file-name' );
      if ( existingFileName ) {
        $input.after( '<div class="file-loaded text-warning">This form was loaded with "' +
          existingFileName + '". To preserve this file, do not change this input.</div>' );
      }
      //fileName = ($input[0].files.length > 0) ? $input[0].files[0].name : '';
      //is this required at all?
      //$input.attr('data-previous-file-name', fileName);
    } ).parent( ).addClass( 'with-media clearfix' );
    fileManager.setDir( data.getInstanceID( ), callbacks );
    /*
    Some cool code to use for image previews:
    $fileinput = $(this);
    file = $fileinput[0].files[0];
    src = window.URL.createObjectURL(file);
    $img = $('<img src="'+src+'"/>');
    see here a solution for chrome (VERY state of the art)
    http://jsfiddle.net/MartijnR/rtU6f/10/
    Good references:
    http://www.html5rocks.com/en/tutorials/file/filesystem/#toc-filesystemurls
    http://updates.html5rocks.com/2012/08/Integrating-input-type-file-with-the-Filesystem-API
    http://html5-demos.appspot.com/static/filesystem/generatingResourceURIs.html
   */
  },
  mediaLabelWidget: function( ) {
    //improve looks when images, video or audio is used as label
    if ( !this.repeat ) {
      $( 'fieldset:not(.jr-appearance-compact, .jr-appearance-quickcompact)>label, ' +
        'fieldset:not(.jr-appearance-compact, .jr-appearance-quickcompact)>legend' )
        .children( 'img,video,audio' ).parent( ).addClass( 'with-media clearfix' );
    }
  },
  destroy: function( $group ) {
    console.log( 'destroy everything' );
  }
};