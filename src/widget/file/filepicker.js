import $ from 'jquery';
import Widget from '../../js/Widget';
import fileManager from 'enketo/file-manager';
import { getFilename, updateDownloadLink } from '../../js/utils';
const pluginName = 'filepicker';
import { t } from 'enketo/translator';
import TranslatedError from '../../js/translated-error';
import dialog from 'enketo/dialog';

/**
 * FilePicker that works both offline and online. It abstracts the file storage/cache away
 * with the injected fileManager.
 *
 * @constructor
 * @param {Element} element [description]
 * @param {*} options options
 * @param {*=} e     event
 */

function Filepicker( element, options, e ) {
    if ( e ) {
        e.stopPropagation();
        e.preventDefault();
    }
    this.namespace = pluginName;
    Widget.call( this, element, options );
    this._init();
}

// copy the prototype functions from the Widget super class
Filepicker.prototype = Object.create( Widget.prototype );

// ensure the constructor is the new one
Filepicker.prototype.constructor = Filepicker;

/**
 * Initialize
 */
Filepicker.prototype._init = function() {
    const $input = $( this.element );
    const existingFileName = $input.attr( 'data-loaded-file-name' );
    const that = this;

    this.props = this._getProps();

    $input
        .prop( 'disabled', true )
        .addClass( 'hide' )
        .parent().addClass( 'with-media clearfix' );

    this.$widget = $(
            `<div class="widget file-picker"><input class="ignore fake-file-input"/>${this.props.readonly ? '' : this.resetButtonHtml}${this.downloadButtonHtml}<div class="file-feedback"></div><div class="file-preview"></div></div>` )
        .insertAfter( $input );
    this.$feedback = this.$widget.find( '.file-feedback' );
    this.$preview = this.$widget.find( '.file-preview' );
    this.$fakeInput = this.$widget.find( '.fake-file-input' );
    this.$downloadLink = this.$widget.find( '.btn-download' );

    this.$widget
        .find( '.btn-reset' ).on( 'click', () => {
            if ( ( $input.val() || that.$fakeInput.val() ) ) {
                dialog.confirm( t( 'filepicker.resetWarning', { item: t( 'filepicker.file' ) } ) )
                    .then( confirmed => {
                        if ( confirmed ) {
                            $input.val( '' ).trigger( 'change' );
                        }
                    } )
                    .catch( () => {} );
            }
        } )
        .end();

    // Focus listener needs to be added synchronously
    that._focusListener();

    // show loaded file name or placeholder regardless of whether widget is supported
    this._showFileName( existingFileName );

    if ( fileManager.isWaitingForPermissions() ) {
        this._showFeedback( t( 'filepicker.waitingForPermissions' ), 'warning' );
    }

    // Monitor maxSize changes to update placeholder text. This facilitates asynchronous 
    // obtaining of max size from server without slowing down form loading.
    this._updatePlaceholder();
    $input.closest( 'form.or' ).on( 'updateMaxSize', this._updatePlaceholder.bind( this ) );

    fileManager.init()
        .then( () => {
            that._showFeedback();
            that._changeListener();
            $input.prop( 'disabled', false );
            if ( existingFileName ) {
                fileManager.getFileUrl( existingFileName )
                    .then( url => {
                        that._showPreview( url, that.props.mediaType );
                        that._updateDownloadLink( url, existingFileName );
                    } )
                    .catch( () => {
                        that._showFeedback( t( 'filepicker.notFound', {
                            existing: existingFileName
                        } ), 'error' );
                    } );
            }
        } )
        .catch( error => {
            that._showFeedback( error, 'error' );
        } );
};

Filepicker.prototype._getProps = function() {
    return {
        mediaType: this.element.getAttribute( 'accept' ),
        readonly: this.element.readOnly,
    };
};

Filepicker.prototype._updatePlaceholder = function() {
    this.$fakeInput.attr( 'placeholder', t( 'filepicker.placeholder', { maxSize: fileManager.getMaxSizeReadable() || '?MB' } ) );
};

Filepicker.prototype._changeListener = function() {
    const that = this;

    $( this.element )
        .on( 'click', event => {
            // The purpose of this handler is to block the filepicker window
            // when the label is clicked outside of the input.
            if ( that.props.readonly || event.namespace !== 'propagate' ) {
                that.$fakeInput.focus();
                event.stopImmediatePropagation();
                return false;
            }
        } )
        .on( `change.propagate.${this.namespace}`, function( event ) {
            let file;
            let fileName;
            let postfix;
            const $input = $( this );
            const loadedFileName = $input.attr( 'data-loaded-file-name' );
            const now = new Date();

            if ( event.namespace === 'propagate' ) {
                // Trigger eventhandler to update instance value
                $input.trigger( 'change.file' );
                return false;
            } else {
                event.stopImmediatePropagation();
            }

            // Get the file
            file = this.files[ 0 ];
            postfix = `-${now.getHours()}_${now.getMinutes()}_${now.getSeconds()}`;
            this.dataset.filenamePostfix = postfix;
            fileName = getFilename( file, postfix );

            // Process the file
            fileManager.getFileUrl( file, fileName )
                .then( url => {
                    // Update UI
                    that._showPreview( url, that.props.mediaType );
                    that._showFeedback();
                    that._showFileName( fileName );
                    if ( loadedFileName && loadedFileName !== fileName ) {
                        $input.removeAttr( 'data-loaded-file-name' );
                    }
                    that._updateDownloadLink( url, fileName );
                    // Update record
                    $input.trigger( 'change.propagate' );
                } )
                .catch( error => {
                    // Update record to clear any existing valid value
                    $input.val( '' ).trigger( 'change.propagate' );
                    // Update UI
                    that._showFileName( '' );
                    that._showPreview( null );
                    that._showFeedback( error, 'error' );
                    that._updateDownloadLink( '', '' );
                } );
        } );

    this.$fakeInput
        .on( 'click', function( event ) {
            /* 
                The purpose of this handler is to selectively propagate clicks on the fake
                input to the underlying file input (to show the file picker window).
                It blocks propagation if the filepicker has a value to avoid accidentally
                clearing files in a loaded record, hereby blocking native browser file input behavior
                to clear values. Instead the reset button is the only way to clear a value.
            */
            if ( that.props.readonly || that.element.value || that.$fakeInput[ 0 ].value ) {
                $( this ).focus();
                event.stopImmediatePropagation();
                return false;
            }
            event.preventDefault();
            $( that.element ).trigger( 'click.propagate' );
        } )
        .on( 'change', () => // For robustness, avoid any editing of filenames by user.
            false );
};

Filepicker.prototype._focusListener = function() {
    const that = this;

    // Handle focus on widget input
    this.$fakeInput.on( 'focus', () => {
        $( that.element ).trigger( 'fakefocus' );
    } );

    // Handle focus on original input (goTo functionality)
    $( this.element ).on( 'applyfocus', () => {
        that.$fakeInput.focus();
    } );
};

Filepicker.prototype._showFileName = function( fileName ) {
    this.$fakeInput.val( fileName ).prop( 'readonly', !!fileName );
};

Filepicker.prototype._showFeedback = function( fb, status ) {
    const message = fb instanceof TranslatedError ? t( fb.translationKey, fb.translationOptions ) :
        fb instanceof Error ? fb.message :
        fb || '';
    status = status || '';
    // replace text and replace all existing classes with the new status class
    this.$feedback.text( message ).attr( 'class', `file-feedback ${status}` );
};

Filepicker.prototype._showPreview = function( url, mediaType ) {
    let $el;

    this.$widget.find( '.file-preview' ).empty();

    switch ( mediaType ) {
        case 'image/*':
            $el = $( '<img />' );
            break;
        case 'audio/*':
            $el = $( '<audio controls="controls"/>' );
            break;
        case 'video/*':
            $el = $( '<video controls="controls"/>' );
            break;
        default:
            $el = $( '' );
            break;
    }

    if ( url ) {
        this.$preview.append( $el.attr( 'src', url ) );
    }
};

Filepicker.prototype._updateDownloadLink = function( objectUrl, fileName ) {
    updateDownloadLink( this.$downloadLink[ 0 ], objectUrl, fileName );
};

$.fn[ pluginName ] = function( options, event ) {

    options = options || {};

    return this.each( function() {
        const $this = $( this ),
            data = $this.data( pluginName );

        //only instantiate if options is an object (i.e. not a string) and if it doesn't exist already
        if ( !data && typeof options === 'object' ) {
            $this.data( pluginName, new Filepicker( this, options, event ) );
        }
        //only call method if widget was instantiated before
        else if ( data && typeof options === 'string' ) {
            //pass the element as a parameter as this is used in fix()
            data[ options ]( this );
        }
    } );
};

export default {
    'name': pluginName,
    // If this selector becomes too complex we can create a 'filepicker' class with XSL
    'selector': '.question:not(.or-appearance-draw):not(.or-appearance-signature):not(.or-appearance-annotate) input[type="file"]'
};
