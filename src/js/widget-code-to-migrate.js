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
    /*
      Samsung mobile browser (called "Internet") has a weird bug that appears sometimes (?) when an input field
      already has a value and is edited. The new value YYYY-MM-DD prepends old or replaces the year of the old value and first hyphen. E.g.
      existing: 2010-01-01, new value entered: 2012-12-12 => input field shows: 2012-12-1201-01.
      This doesn't seem to effect the actual value of the input, just the way it is displayed. But if the incorrectly displayed date is then 
      attempted to be edited again, it does get the incorrect value and it's impossible to clear this and create a valid date.
    */
    //browser: "Mozilla/5.0 (Linux; U; Android 4.1.1; en-us; GT-P3113 Build/JRO03C) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Safari/534.30";
    //webview: "Mozilla/5.0 (Linux; U; Android 4.1.2; en-us; GT-P3100 Build/JZO54K) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Safari/534.30"
    var badSamsung = /GT-P31[0-9]{2}.+AppleWebKit\/534\.30/;
    if ( !modernizr.touch || !modernizr.inputtypes.date || badSamsung.test( navigator.userAgent ) ) {
      this.dateWidget( );
    }
    if ( !modernizr.touch || !modernizr.inputtypes.time ) {
      this.timeWidget( );
    }
    if ( !modernizr.touch || !modernizr.inputtypes.datetime ) {
      this.dateTimeWidget( );
    }
    if ( !modernizr.touch ) {
      this.selectWidget( );
    } else {
      this.mobileSelectWidget( );
      this.touchRadioCheckWidget( );
    }
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

  dateWidget: function( ) {
    this.$group.find( 'input[type="date"]' ).each( function( ) {
      var $dateI = $( this ),
        $p = $( this ).parent( 'label' ),
        startView = ( $p.hasClass( 'jr-appearance-month-year' ) ) ? 'year' :
          ( $p.hasClass( 'jr-appearance-year' ) ) ? 'decade' : 'month',
        targetEvent = ( $p.hasClass( 'jr-appearance-month-year' ) ) ? 'changeMonth' :
          ( $p.hasClass( 'jr-appearance-year' ) ) ? 'changeYear' : 'changeDate',
        format = ( startView === 'year' ) ? 'yyyy-mm' :
          ( startView === 'decade' ) ? 'yyyy' : 'yyyy-mm-dd',
        $fakeDate = $( '<div class="widget date"><input class="ignore input-small" readonly="readonly" type="text" value="' + $( this ).val( ) + '" placeholder="' + format + '" />' +
          '<button class="btn-reset"><i class="icon icon-trash"></i></button></div>' ),
        $fakeDateReset = $fakeDate.find( '.btn-reset' ),
        $fakeDateI = $fakeDate.find( 'input' );
      $dateI.next( '.widget.date' ).remove( );
      $dateI.hide( ).after( $fakeDate );
      //copy manual changes to original date input field
      $fakeDateI.on( 'change', function( ) {
        var date,
          value = $( this ).val( );
        if ( value.length > 0 ) {
          value = ( format === 'yyyy-mm' ) ? value + '-01' : ( format === 'yyyy' ) ? value + '-01-01' : value;
          value = data.node( ).convert( value, 'date' );
        }
        if ( $dateI.val( ) !== value ) {
          $dateI.val( value ).trigger( 'change' ).blur( );
        }
        return false;
      } );
      //focus and blur events are used to check whether to display the 'required' message 
      $fakeDateI.on( 'focus blur', function( event ) {
        $dateI.trigger( event.type );
      } );
      //reset button
      $fakeDateReset.on( 'click', function( event ) {
        $fakeDateI.val( '' ).trigger( 'change' ).datepicker( 'update' );
      } );
      $fakeDateI.datepicker( {
        format: format,
        autoclose: true,
        todayHighlight: true,
        startView: startView,
        orientation: 'top'
      } )
      // copy changes made by datepicker to original input field
      .on( 'changeDate', function( e ) {
        var value = $( this ).val( );
        $dateI.val( value ).trigger( 'change' ).blur( );
      } );
    } );
  },
  timeWidget: function( ) {
    this.$group.find( 'input[type="time"]' ).each( function( ) {
      var $timeI = $( this ),
        $p = $( this ).parent( 'label' ),
        timeVal = $( this ).val( ),
        $fakeTime = $( '<div class="widget bootstrap-timepicker">' +
          '<input class="ignore timepicker-default input-small" readonly="readonly" type="text" value="' + timeVal + '" placeholder="hh:mm" />' +
          '<button class="btn-reset"><i class="icon icon-trash"></i></button></div>' ),
        $fakeTimeReset = $fakeTime.find( '.btn-reset' ),
        $fakeTimeI = $fakeTime.find( 'input' );
      $timeI.next( '.widget.bootstrap-timepicker-component' ).remove( );
      $timeI.hide( ).after( $fakeTime );
      $fakeTimeI.timepicker( {
        defaultTime: ( timeVal.length > 0 ) ? timeVal : 'current',
        showMeridian: false
      } ).val( timeVal );
      //the time picker itself has input elements
      $fakeTime.find( 'input' ).addClass( 'ignore' );
      $fakeTimeI.on( 'change', function( ) {
        $timeI.val( $( this ).val( ) ).trigger( 'change' ).blur( );
        return false;
      } );
      //reset button
      $fakeTimeReset.on( 'click', function( event ) {
        $fakeTimeI.val( '' ).trigger( 'change' );
      } );
      $fakeTimeI.on( 'focus blur', function( event ) {
        $timeI.trigger( event.type );
      } );
    } );
  },
  //Note: this widget doesn't offer a way to reset a datetime value in the instance to empty
  dateTimeWidget: function( ) {
    this.$group.find( 'input[type="datetime"]' ).each( function( ) {
      var $dateTimeI = $( this ),
        /*
          Loaded or default datetime values remain untouched until they are edited. This is done to preserve 
          the timezone information (especially for instances-to-edit) if the values are not edited (the
          original entry may have been done in a different time zone than the edit). However, 
          values shown in the widget should reflect the local time representation of that value.
         */
        val = ( $( this ).val( ).length > 0 ) ? new Date( $( this ).val( ) ).toISOLocalString( ) : '',
        vals = val.split( 'T' ),
        dateVal = vals[ 0 ],
        timeVal = ( vals[ 1 ] && vals[ 1 ].length > 4 ) ? vals[ 1 ].substring( 0, 5 ) : '',
        $fakeDate = $( '<div class="date" >' +
          '<input class="ignore input-small" type="text" readonly="readonly" value="' + dateVal + '" placeholder="yyyy-mm-dd"/>' +
          '</div>' ),
        $fakeTime = $( '<div class="bootstrap-timepicker">' +
          '<input class="ignore timepicker-default input-small" readonly="readonly" type="text" value="' + timeVal + '" placeholder="hh:mm"/>' +
          '<button class="btn-reset"><i class="icon icon-trash"></i></button></div>' ),
        $fakeDateTimeReset = $fakeTime.find( '.btn-reset' ),
        $fakeDateI = $fakeDate.find( 'input' ),
        $fakeTimeI = $fakeTime.find( 'input' );
      $dateTimeI.next( '.widget.datetimepicker' ).remove( );
      $dateTimeI.hide( ).after( '<div class="datetimepicker widget" />' );
      $dateTimeI.siblings( '.datetimepicker' ).append( $fakeDate ).append( $fakeTime );
      $fakeDateI.datepicker( {
        format: 'yyyy-mm-dd',
        autoclose: true,
        todayHighlight: true
      } );
      $fakeTimeI.timepicker( {
        defaultTime: ( timeVal.length > 0 ) ? 'value' : 'current',
        showMeridian: false
      } ).val( timeVal );
      //the time picker itself has input elements
      $fakeTime.find( 'input' ).addClass( 'ignore' );
      $fakeDateI.on( 'change changeDate', function( ) {
        changeVal( );
        return false;
      } );
      $fakeTimeI.on( 'change', function( ) {
        changeVal( );
        return false;
      } );
      $fakeDateI.add( $fakeTimeI ).on( 'focus blur', function( event ) {
        $dateTimeI.trigger( event.type );
      } );
      //reset button
      $fakeDateTimeReset.on( 'click', function( event ) {
        $fakeDateI.val( '' ).trigger( 'change' ).datepicker( 'update' );
        $fakeTimeI.val( '' ).trigger( 'change' );
      } );

      function changeVal( ) {
        if ( $fakeDateI.val( ).length > 0 && $fakeTimeI.val( ).length > 0 ) {
          var d = $fakeDateI.val( ).split( '-' ),
            t = $fakeTimeI.val( ).split( ':' );
          $dateTimeI.val( new Date( d[ 0 ], d[ 1 ] - 1, d[ 2 ], t[ 0 ], t[ 1 ] ).toISOLocalString( ) ).trigger( 'change' ).blur( );
        } else {
          $dateTimeI.val( '' ).trigger( 'change' ).blur( );
        }
      }
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