// from: https://github.com/CSS-Tricks/Relevant-Dropdowns/blob/master/js/jquery.relevant-dropdown.js

var $ = require( 'jquery' );
var pluginName = 'relevantDropdown';

// Make jQuery's :contains case insensitive (like HTML5 datalist)
// Changed the name to prevent overriding original functionality
$.expr[ ':' ].RD_contains = $.expr.createPseudo( function( arg ) {
    return function( elem ) {
        return $( elem ).text().toUpperCase().indexOf( arg.toUpperCase() ) >= 0;
    };
} );

function RelevantDropdown( element, options, e ) {
    this.namespace = pluginName;
    //Widget.call( this, element, options );
    this.element = element;
    this.options = $.extend( {
        fadeOutSpeed: 'normal', // speed to fade out the dataList Popup
        change: null
    }, options );
    if ( e ) {
        e.stopPropagation();
        e.preventDefault();
    }
    this._init();
}

RelevantDropdown.prototype._init = function() {
    var $input = $( this.element );
    this.listId = $input.attr( 'list' );

    // Insert home for new fake datalist
    this.$fakeDatalist = $( '<ul />', {
        'class': 'datalist widget',
        'id': this.listId
    } ).appendTo( $input.parent() );

    this._updateFakeDatalist();
    this._setEventListeners();
};

RelevantDropdown.prototype._updateFakeDatalist = function() {
    //console.log( 'changing options' );
    var $datalist = $( '#' + this.listId );
    // Used to prevent reflow
    var tempItems = document.createDocumentFragment();
    var tempitem = null;

    this.$fakeDatalist.empty();

    // Fill empty fake datalist
    $datalist.find( 'option' ).each( function() {
        tempItem = $( '<li />', {
            // .val is required here, not .text or .html
            // HTML *needs* to be <option value='xxx'> not <option>xxx</option>  (IE)
            'text': $( this ).val()
        } )[ 0 ];
        tempItems.appendChild( tempItem );
    } );
    this.$fakeDatalist.append( tempItems );

    // Update pointer
    this.$fakeDatalistItems = this.$fakeDatalist.find( 'li' );

    // console.debug( 'new items', this.$fakeDatalistItems.get() );
};

RelevantDropdown.prototype._setEventListeners = function() {
    var that = this;
    var $input = $( this.element );

    var searchPosition;
    var scrollValue = 0;
    // Typey type type
    $input
        .on( 'focus', function() {
            //console.debug( 'focus', this );
            // Reset scroll
            that.$fakeDatalist.scrollTop( 0 );
            scrollValue = 0;
        } )
        .on( 'blur', function() {
            //console.debug( 'blur', this );
            // If this fires immediately, it prevents click-to-select from working
            setTimeout( function() {
                that.$fakeDatalist.fadeOut( that.options.fadeOutSpeed );
                that.$fakeDatalistItems.removeClass( 'active' );
            }, 500 );
        } )
        .on( 'keyup', function( e ) {
            searchPosition = $input.position();
            //console.log( 'keyup or focus', searchPosition );
            // Build datalist
            that.$fakeDatalist
                .show()
                .css( {
                    top: searchPosition.top + $( this ).outerHeight(),
                    left: searchPosition.left,
                    width: $input.outerWidth()
                } );

            that.$fakeDatalistItems.hide();
            // console.log( 'finding items containing', $input.val() ) );
            that.$fakeDatalist.find( 'li:RD_contains("' + $input.val() + '")' ).show();
        } );

    // Don't want to use :hover in CSS so doing this instead
    // really helps with arrow key navigation
    this.$fakeDatalist
        .on( 'mouseenter', 'li', function() {
            // console.debug( 'mouseenter', this );
            $( this ).addClass( 'active' ).siblings().removeClass( 'active' );
        } )
        .on( 'mouseleave', 'li', function() {
            // console.debug( 'mouseleave', this );
            $( this ).removeClass( 'active' );
        } );

    // Window resize
    $( window ).resize( function() {
        // console.debug( 'resize' );
        searchPosition = $input.position();
        that.$fakeDatalist
            .css( {
                top: searchPosition.top + $( this ).outerHeight(),
                left: searchPosition.left,
                width: $input.outerWidth()
            } );
    } );

    // Watch arrow keys for up and down
    $input.on( 'keydown', function( e ) {
        // console.debug( 'keydown' );
        var active = that.$fakeDatalist.find( 'li.active' );
        var datalistHeight = that.$fakeDatalist.outerHeight();
        var datalistItemsHeight = that.$fakeDatalistItems.outerHeight();

        // up arrow
        if ( e.keyCode == 38 ) {
            if ( active.length ) {
                prevAll = active.prevAll( 'li:visible' );
                if ( prevAll.length > 0 ) {
                    active.removeClass( 'active' );
                    prevAll.eq( 0 ).addClass( 'active' );
                }

                if ( prevAll.length && prevAll.position().top < 0 && scrollValue > 0 ) {
                    that.$fakeDatalist.scrollTop( scrollValue -= datalistItemsHeight );
                }
            }
        }

        // down arrow
        if ( e.keyCode == 40 ) {
            if ( active.length ) {
                var nextAll = active.nextAll( 'li:visible' );
                if ( nextAll.length > 0 ) {
                    active.removeClass( 'active' );
                    nextAll.eq( 0 ).addClass( 'active' );
                }

                if ( nextAll.length && ( nextAll.position().top + datalistItemsHeight ) >= datalistHeight ) {
                    that.$fakeDatalist.stop().animate( {
                        scrollTop: scrollValue += datalistItemsHeight
                    }, 200 );
                }
            } else {
                that.$fakeDatalistItems.removeClass( 'active' );
                that.$fakeDatalist.find( 'li:visible:first' ).addClass( 'active' );
            }
        }

        // return or tab key
        if ( e.keyCode == 13 || e.keyCode == 9 ) {
            if ( active.length ) {
                $input.val( active.text() ).trigger( 'input' );
            }
            that.$fakeDatalist.fadeOut( that.options.fadeOutSpeed );
            that.$fakeDatalistItems.removeClass( 'active' );
        }

        // keys
        if ( e.keyCode != 13 && e.keyCode != 38 && e.keyCode != 40 ) {
            // Reset active class
            that.$fakeDatalistItems.removeClass( 'active' );
            that.$fakeDatalist.find( 'li:visible:first' ).addClass( 'active' );

            // Reset scroll
            that.$fakeDatalist.scrollTop( 0 );
            scrollValue = 0;
        }

    } );

    // When choosing from dropdown
    this.$fakeDatalist.on( 'click', 'li', function() {
        // console.debug( 'click', this );
        var active = $( 'li.active' );
        if ( active.length ) {
            $input.val( $( this ).text() ).trigger( 'input' );
        }
        that.$fakeDatalist.fadeOut( that.options.fadeOutSpeed );
        that.$fakeDatalistItems.removeClass( 'active' );
    } );

};

RelevantDropdown.prototype.update = function() {
    this._updateFakeDatalist();
};

$.fn[ pluginName ] = function( options, event ) {

    options = options || {};

    return this.each( function() {
        var $this = $( this );
        var data = $this.data( pluginName );

        //only instantiate if options is an object
        if ( !data && typeof options === 'object' ) {
            $this.data( pluginName, ( data = new RelevantDropdown( this, options, event ) ) );
        } else if ( data && typeof options === 'string' ) {
            data[ options ]( this );
        }
    } );
};
