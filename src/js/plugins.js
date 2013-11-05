define( [ 'jquery' ], function( $ ) {

    /**
     * Update number of repeated elements (with class or-repeat)
     *
     * @return {jQuery} [description]
     */
    $.fn.numberRepeats = function() {

        return this.each( function() {

            $( this ).find( 'fieldset.or-repeat' ).each( function() {
                var repSiblings, qtyRepeats, i;
                // if it is the first-of-type (not that ':first-of-type' does not have cross-browser support)
                if ( $( this ).prev( 'fieldset.or-repeat' ).length === 0 ) {
                    repSiblings = $( this ).siblings( 'fieldset.or-repeat' );
                    qtyRepeats = repSiblings.length + 1;
                    if ( qtyRepeats > 1 ) {
                        $( this ).find( 'span.repeat-number' ).text( '1' );
                        i = 2;
                        repSiblings.each( function() {
                            $( this ).find( 'span.repeat-number' ).text( i );
                            i++;
                        } );
                    } else {
                        $( this ).find( 'span.repeat-number' ).empty();
                    }
                }
            } );
        } );
    };

    /**
     * Clears form input fields and triggers events when doing this. If formelement is cloned but not yet added to DOM
     * (and not synchronized with data object), the desired event is probably 'edit' (default). If it is already added
     * to the DOM (and synchronized with data object) a regular change event should be fired
     *
     * @param  {string=} ev event to be triggered when a value is cleared
     * @return { jQuery} [description]
     */
    $.fn.clearInputs = function( ev ) {
        ev = ev || 'edit';
        return this.each( function() {
            //remove media previews
            $( this ).find( '.file-preview' ).remove();
            //remove input values
            $( this ).find( 'input, select, textarea' ).each( function() {
                var type = $( this ).attr( 'type' );
                if ( $( this ).prop( 'nodeName' ).toUpperCase() === 'SELECT' ) {
                    type = 'select';
                }
                if ( $( this ).prop( 'nodeName' ).toUpperCase() === 'TEXTAREA' ) {
                    type = 'textarea';
                }
                switch ( type ) {
                    case 'date':
                    case 'datetime':
                    case 'time':
                    case 'number':
                    case 'search':
                    case 'color':
                    case 'range':
                    case 'url':
                    case 'email':
                    case 'password':
                    case 'text':
                    case 'file':
                        $( this ).removeAttr( 'data-previous-file-name data-loaded-file-name' );
                        /* falls through */
                    case 'hidden':
                    case 'textarea':
                        if ( $( this ).val() !== '' ) {
                            $( this ).val( '' ).trigger( ev );
                        }
                        break;
                    case 'radio':
                    case 'checkbox':
                        if ( $( this ).prop( 'checked' ) ) {
                            $( this ).prop( 'checked', false );
                            $( this ).trigger( ev );
                        }
                        break;
                    case 'select':
                        if ( $( this )[ 0 ].selectedIndex >= 0 ) {
                            $( this )[ 0 ].selectedIndex = -1;
                            $( this ).trigger( ev );
                        }
                        break;
                    default:
                        console.error( 'Unrecognized input type found when trying to reset: ' + type );
                        console.error( $( this ) );
                }
            } );
        } );
    };


    /**
     * Simple XPath Compatibility Plugin for jQuery 1.1
     * By John Resig
     * Dual licensed under MIT and GPL.
     * Original plugin code here: http://code.google.com/p/jqueryjs/source/browse/trunk/plugins/xpath/jquery.xpath.js?spec=svn3167&r=3167
     * some changes made by Martijn van de Rijdt (not replacing $.find(), removed context, dot escaping)
     *
     * @param  {string} selector [description]
     * @return {?(Array.<(Element|null)>|Element)}          [description]
     */
    $.fn.xfind = function( selector ) {
        var parts, cur, i;

        // Convert the root / into a different context
        //if ( !selector.indexOf("/") ) {
        //  context = this.context.documentElement;
        //  selector = selector.replace(/^\/\w*/, "");
        //  if ( !selector ){
        //      return [ context ];
        //  }
        //}

        // Convert // to " "
        selector = selector.replace( /\/\//g, " " );

        //added by Martijn
        selector = selector.replace( /^\//, "" );
        selector = selector.replace( /\/\.$/, '' );

        // Convert / to >
        selector = selector.replace( /\//g, ">" );

        // Naively convert [elem] into :has(elem)
        selector = selector.replace( /\[([^@].*?)\]/g, function( m, selector ) {
            return ":has(" + selector + ")";
        } );

        // Naively convert /.. into a new set of expressions
        // Martijn: I just don't see this except if this always occurs as nodea/../../parentofnodea/../../grandparentofnodea
        if ( selector.indexOf( ">.." ) >= 0 ) {
            parts = selector.split( />\.\.>?/g );
            //var cur = jQuery(parts[0], context);
            cur = jQuery( parts[ 0 ], this );
            for ( i = 1; i < parts.length; i++ )
                cur = cur.parent( parts[ i ] );
            return cur.get();
        }

        // any remaining dots inside node names need to be escaped (added by Martijn)
        selector = selector.replace( /\./gi, '\\.' );

        //if performance becomes an issue, it's worthwhile implementing this with native XPath instead.
        return this.find( selector );
    };

    /**
     * Supports a small subset of MarkDown and converts this to HTML: _, __, *, **, []()
     * Also converts newline characters
     *
     * Not supported: escaping and other MarkDown syntax
     */
    $.fn.markdownToHtml = function() {
        return this.each( function() {
            var html,
                $childStore = $( '<div/>' );
            $( this ).children().each( function( index ) {
                var name = '$$$' + index;
                $( this ).clone().markdownToHtml().appendTo( $childStore );
                $( this ).replaceWith( name );
            } );
            html = $( this ).html();
            html = html.replace( /__([^\s][^_]*[^\s])__/gm, "<strong>$1</strong>" );
            html = html.replace( /\*\*([^\s][^\*]*[^\s])\*\*/gm, "<strong>$1</strong>" );
            html = html.replace( /_([^\s][^_]*[^\s])_/gm, '<em>$1</em>' );
            html = html.replace( /\*([^\s][^\*]*[^\s])\*/gm, '<em>$1</em>' );
            //only replaces if url is valid (worthwhile feature?)
            html = html.replace( /\[(.*)\]\(((https?:\/\/)(([\da-z\.\-]+)\.([a-z\.]{2,6})|(([0-9]{1,3}\.){3}[0-9]{1,3}))([\/\w \.\-]*)*\/?[\/\w \.\-\=\&\?]*)\)/gm, '<a href="$2">$1</a>' );
            html = html.replace( /\n/gm, '<br />' );
            $childStore.children().each( function( i ) {
                var regex = new RegExp( '\\$\\$\\$' + i );
                html = html.replace( regex, $( this )[ 0 ].outerHTML );
            } );
            $( this ).text( '' ).append( html );
        } );
    };

    /**
     * Gives a set of elements the same (shortest) width
     *
     * @return {jQuery} [description]
     */
    $.fn.toSmallestWidth = function() {
        var smallestWidth = 2000;
        return this.each( function() {
            if ( $( this ).width() < smallestWidth ) {
                smallestWidth = $( this ).width();
            }
        } ).each( function() {
            $( this ).width( smallestWidth );
        } );
    };


    /**
     * give a set of elements the same (longest) width
     * @param  {number=} plus optional additional pixels to add to width
     * @return {jQuery}       [description]
     */
    $.fn.toLargestWidth = function( plus ) {
        var largestWidth = 0;
        plus = plus || 0;
        return this.each( function() {
            if ( $( this ).width() > largestWidth ) {
                largestWidth = $( this ).width();
            }
        } ).each( function() {
            $( this ).width( largestWidth + plus );
        } );
    };

    /**
     * Creates an XPath from a node
     * @param  {string=} rootNodeName   if absent the root is #document
     * @return {string}                 XPath
     */
    $.fn.getXPath = function( rootNodeName ) {
        //other nodes may have the same XPath but because this function is used to determine the corresponding input name of a data node, index is not included 
        var position,
            $node = this.first(),
            nodeName = $node.prop( 'nodeName' ),
            //$sibSameNameAndSelf = $node.siblings(nodeName).addBack(),
            steps = [ nodeName ],
            $parent = $node.parent(),
            parentName = $parent.prop( 'nodeName' );

        //position = ($sibSameNameAndSelf.length > 1) ? '['+($sibSameNameAndSelf.index($node)+1)+']' : '';
        //steps.push(nodeName+position);

        while ( $parent.length == 1 && parentName !== rootNodeName && parentName !== '#document' ) {
            //$sibSameNameAndSelf = $parent.siblings(parentName).addBack();
            //position = ($sibSameNameAndSelf.length > 1) ? '['+($sibSameNameAndSelf.index($parent)+1)+']' : '';
            //steps.push(parentName+position);
            steps.push( parentName );
            $parent = $parent.parent();
            parentName = $parent.prop( 'nodeName' );
        }
        return '/' + steps.reverse().join( '/' );
    };


    /**
     * Reverses a jQuery collection
     * @type {Array}
     */
    $.fn.reverse = [].reverse;


    /** MOVE THESE PLUGINS TO PHP WRAPPER, THEY ARE NOT USED IN CORE 
  *********************************************************************

  // Alphanumeric plugin for form input elements see http://www.itgroup.com.ph/alphanumeric/
  $.fn.alphanumeric = function( p ) {

    p = $.extend( {
      ichars: "!@#$%^&*()+=[]\\\';,/{}|\":<>?~`.- ",
      nchars: "",
      allow: ""
    }, p );

    return this.each( function() {

      if ( p.nocaps ) p.nchars += "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      if ( p.allcaps ) p.nchars += "abcdefghijklmnopqrstuvwxyz";

      var s = p.allow.split( '' );
      for ( var i = 0; i < s.length; i++ )
        if ( p.ichars.indexOf( s[ i ] ) != -1 ) s[ i ] = "\\" + s[ i ];
      p.allow = s.join( '|' );

      var reg = new RegExp( p.allow, 'gi' );
      var ch = p.ichars + p.nchars;
      ch = ch.replace( reg, '' );

      $( this ).keypress(
        function( e ) {
          var k;
          if ( !e.charCode ) k = String.fromCharCode( e.which );
          else k = String.fromCharCode( e.charCode );

          if ( ch.indexOf( k ) != -1 ) e.preventDefault();
          if ( e.ctrlKey && k == 'v' ) e.preventDefault();

        }

      );

      $( this ).bind( 'contextmenu', function() {
        return false;
      } );
    } );
  };

  $.fn.numeric = function( p ) {

    var az = "abcdefghijklmnopqrstuvwxyz";
    az += az.toUpperCase();

    p = $.extend( {
      nchars: az
    }, p );

    return this.each( function() {
      $( this ).alphanumeric( p );
    } );

  };

  $.fn.alpha = function( p ) {

    var nm = "1234567890";

    p = $.extend( {
      nchars: nm
    }, p );

    return this.each( function() {
      $( this ).alphanumeric( p );
    } );

  };

  $.fn.btnBusyState = function( busy ) {
    var $button, btnContent;
    return this.each( function() {
      $button = $( this );
      btnContent = $button.data( 'btnContent' );

      if ( busy && !btnContent ) {
        btnContent = $button.html();
        $button.data( 'btnContent', btnContent );
        $button
          .empty()
          .append( '<progress></progress>' )
          .attr( 'disabled', true );
      } else if ( !busy && btnContent ) {
        $button.data( 'btnContent', null );
        $button
          .empty()
          .append( btnContent )
          .removeAttr( 'disabled' );
      }
    } );
  };

  // plugin to select the first word(s) of a string and capitalize it
  $.fn.capitalizeStart = function( numWords ) {
    if ( !numWords ) {
      numWords = 1;
    }
    var node = this.contents().filter( function() {
      return this.nodeType == 3;
    } ).first(),
      text = node.text(),
      first = text.split( " ", numWords ).join( " " );

    if ( !node.length )
      return;

    node[ 0 ].nodeValue = text.slice( first.length );
    node.before( '<span class="capitalize">' + first + '</span>' );
  };

  */
} );
