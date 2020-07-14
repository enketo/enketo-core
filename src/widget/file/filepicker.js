import $ from 'jquery';
import Widget from '../../js/widget';
import fileManager from 'enketo/file-manager';
import { getFilename, resizeImage, isNumber } from '../../js/utils';
import downloadUtils from '../../js/download-utils';
import events from '../../js/event';
import { t } from 'enketo/translator';
import TranslatedError from '../../js/translated-error';
import dialog from 'enketo/dialog';
import { empty } from '../../js/dom-utils';

// TODO: remove remaining jquery (events, namespaces)
// TODO: run (some) standard widget tests

/**
 * FilePicker that works both offline and online. It abstracts the file storage/cache away
 * with the injected fileManager.
 *
 * @augments Widget
 */
class Filepicker extends Widget {
    /**
     * @type {string}
     */
    static get selector() {
        return '.question:not(.or-appearance-draw):not(.or-appearance-signature):not(.or-appearance-annotate) input[type="file"]';
    }

    _init() {
        const existingFileName = this.element.getAttribute( 'data-loaded-file-name' );
        const that = this;

        this.element.classList.add( 'hide' );
        this.question.classList.add( 'with-media', 'clearfix' );

        const fragment = document.createRange().createContextualFragment(
            `<div class="widget file-picker">
                    <input class="ignore fake-file-input"/>
                    <div class="file-feedback"></div>
                    <div class="file-preview"></div>
                </div>` );

        fragment.querySelector( 'input' ).after( this.downloadButtonHtml );
        fragment.querySelector( 'input' ).after( this.resetButtonHtml );

        this.element.after( fragment );

        this.disable();

        const widget = this.question.querySelector( '.widget' );
        this.feedback = widget.querySelector( '.file-feedback' );
        this.preview = widget.querySelector( '.file-preview' );
        this.fakeInput = widget.querySelector( '.fake-file-input' );
        this.downloadLink = widget.querySelector( '.btn-download' );

        that._setResetButtonListener( widget.querySelector( '.btn-reset' ) );

        // Focus listener needs to be added synchronously
        that._setFocusListener();

        // show loaded file name or placeholder regardless of whether widget is supported
        this._showFileName( existingFileName );

        if ( fileManager.isWaitingForPermissions() ) {
            this._showFeedback( t( 'filepicker.waitingForPermissions' ), 'warning' );
        }

        // Monitor maxSize changes to update placeholder text. This facilitates asynchronous
        // obtaining of max size from server without slowing down form loading.
        this._updatePlaceholder();
        this.element.closest( 'form.or' ).addEventListener( events.UpdateMaxSize().type, this._updatePlaceholder.bind( this ) );

        fileManager.init()
            .then( () => {
                that._showFeedback();
                that._setChangeListener();
                if ( !that.props.readonly ) {
                    that.enable();
                }
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
    }

    /**
     * Updates placeholder
     */
    _updatePlaceholder() {
        this.fakeInput.setAttribute( 'placeholder', t( 'filepicker.placeholder', { maxSize: fileManager.getMaxSizeReadable() || '?MB' } ) );
    }

    /**
     * Click action of reset button
     *
     * @param {Element} resetButton - reset button HTML element
     */
    _setResetButtonListener( resetButton ) {
        if ( resetButton ) {
            resetButton.addEventListener( 'click', () => {
                if ( ( this.originalInputValue || this.value ) ) {
                    dialog.confirm( t( 'filepicker.resetWarning', { item: t( 'filepicker.file' ) } ) )
                        .then( confirmed => {
                            if ( confirmed ) {
                                this.originalInputValue = '';
                            }
                        } )
                        .catch( () => {} );
                }
            } );
        }
    }

    /**
     * Handles change listener
     */
    _setChangeListener() {
        const that = this;

        $( this.element )
            .on( 'click', event => {
                // The purpose of this handler is to block the filepicker window
                // when the label is clicked outside of the input.
                if ( that.props.readonly || event.namespace !== 'propagate' ) {
                    that.fakeInput.focus();
                    event.stopImmediatePropagation();

                    return false;
                }
            } )
            .on( 'change.propagate', event => {
                let file;
                let fileName;
                let postfix;
                const loadedFileName = this.element.getAttribute( 'data-loaded-file-name' );
                const now = new Date();

                if ( event.namespace === 'propagate' ) {
                    // Trigger eventhandler to update instance value
                    $( this.element ).trigger( 'change.file' );

                    return false;
                } else {
                    event.stopImmediatePropagation();
                }

                // Get the file
                file = event.target.files[ 0 ];
                postfix = `-${now.getHours()}_${now.getMinutes()}_${now.getSeconds()}`;
                event.target.dataset.filenamePostfix = postfix;
                fileName = getFilename( file, postfix );

                // Process the file
                // Resize the file. Currently will resize an image.
                this._resizeFile( file, that.props.mediaType )
                    .then( resizedFile => {
                        // Put information in file element that file is resized
                        // Put resizedDataURI that will be used by fileManager.getCurrentFiles to get blob synchronously
                        event.target.dataset.resized = true;
                        event.target.dataset.resizedDataURI = resizedFile.dataURI;
                        file = resizedFile.blob;
                    } )
                    .catch( () => {} )
                    .finally( () => {
                        fileManager.getFileUrl( file, fileName )
                            .then( url => {
                                // Update UI
                                that._showPreview( url, that.props.mediaType );
                                that._showFeedback();
                                that._showFileName( fileName );
                                if ( loadedFileName && loadedFileName !== fileName ) {
                                    that.element.removeAttribute( 'data-loaded-file-name' );
                                }
                                that._updateDownloadLink( url, fileName );
                                // Update record
                                $( that.element ).trigger( 'change.propagate' );
                            } )
                            .catch( error => {
                                // Update record to clear any existing valid value
                                $( that.element ).val( '' ).trigger( 'change.propagate' );
                                // Update UI
                                that._showFileName( '' );
                                that._showPreview( null );
                                that._showFeedback( error, 'error' );
                                that._updateDownloadLink( '', '' );
                            } );
                    } );
            } );

        this.fakeInput.addEventListener( 'click', event => {
            /*
                The purpose of this handler is to selectively propagate clicks on the fake
                input to the underlying file input (to show the file picker window).
                It blocks propagation if the filepicker has a value to avoid accidentally
                clearing files in a loaded record, hereby blocking native browser file input behavior
                to clear values. Instead the reset button is the only way to clear a value.
            */
            event.preventDefault();
            if ( this.props.readonly || this.originalInputValue || this.value ) {
                this.fakeInput.focus();
                event.stopImmediatePropagation();

                return;
            }
            $( that.element ).trigger( 'click.propagate' );
        } );

        // For robustness, avoid any editing of filenames by user.
        this.fakeInput.addEventListener( 'change', event => {
            event.preventDefault();
            event.stopPropagation();
        } );
    }

    /**
     * Handle focus listener
     */
    _setFocusListener() {
        // Handle focus on original input (goTo functionality)
        this.element.addEventListener( events.ApplyFocus().type, () => {
            this.fakeInput.focus();
        } );
    }

    /**
     * Sets file name as value
     *
     * @param {string} fileName - filename
     */
    _showFileName( fileName ) {
        this.value = fileName;
        this.fakeInput.readOnly = !!fileName;
    }

    /**
     * @param {TranslatedError|Error} fb - Error instance
     * @param {string} [status] - status
     */
    _showFeedback( fb, status ) {
        const message = fb instanceof TranslatedError ? t( fb.translationKey, fb.translationOptions ) :
            fb instanceof Error ? fb.message :
                fb || '';
        status = status || '';
        // replace text and replace all existing classes with the new status class
        this.feedback.textContent = message;
        this.feedback.setAttribute( 'class', `file-feedback ${status}` );
    }

    /**
     * @param {string} url - URL
     * @param {string} mediaType - media type
     */
    _showPreview( url, mediaType ) {
        let htmlStr;

        empty( this.preview );

        switch ( mediaType ) {
            case 'image/*':
                htmlStr = '<img />';
                break;
            case 'audio/*':
                htmlStr = '<audio controls="controls"/>';
                break;
            case 'video/*':
                htmlStr = '<video controls="controls"/>';
                break;
        }

        if ( url && htmlStr ) {
            const fragment = document.createRange().createContextualFragment( htmlStr );
            fragment.querySelector( '*' ).src = url;
            this.preview.append( fragment );
        }
    }

    /**
     * @param {File} file - image file to be resized
     * @param {string} mediaType - media type
     * @return {Promise<Blob|File>} resolves with blob, rejects with input file
     */
    _resizeFile( file, mediaType ) {
        return new Promise( ( resolve, reject ) => {
            if ( mediaType !== 'image/*' ) {
                reject( file );
            }

            // file is image, resize it
            if ( this.props && this.props.maxPixels ) {
                resizeImage( file, this.props.maxPixels )
                    .then( blob => {
                        const reader = new FileReader();
                        reader.addEventListener( 'load', function() {
                            resolve( { blob, 'dataURI': reader.result } );
                        }, false );
                        reader.readAsDataURL( blob );
                    } )
                    .catch( () => {
                        reject( file );
                    } );
            } else {
                reject( file );
            }
        } );
    }

    /**
     * @param {string} objectUrl - ObjectURL
     * @param {string} fileName - filename
     */
    _updateDownloadLink( objectUrl, fileName ) {
        downloadUtils.updateDownloadLink( this.downloadLink, objectUrl, fileName );
    }

    /**
     * Disables widget
     */
    disable() {
        this.element.disabled = true;
        this.question.querySelector( '.btn-reset' ).disabled = true;
    }

    /**
     * Enables widget
     */
    enable() {
        this.element.disabled = false;
        this.question.querySelector( '.btn-reset' ).disabled = false;
    }

    /**
     * @type {object}
     */
    get props() {
        const props = this._props;
        props.mediaType = this.element.getAttribute( 'accept' );

        if ( this.element.dataset.maxPixels && isNumber( this.element.dataset.maxPixels ) ) {
            props.maxPixels = parseInt( this.element.dataset.maxPixels, 10 );
        }

        return props;
    }

    /**
     * @type {string}
     */
    get value() {
        return this.fakeInput.value;
    }

    set value( value ) {
        this.fakeInput.value = value;
    }

}

export default Filepicker;
