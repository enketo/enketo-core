import Widget from '../../js/widget';
import $ from 'jquery';
import support from '../../js/support';
import fileManager from 'enketo/file-manager';
import SignaturePad from 'signature_pad';
import { t } from 'enketo/translator';
import dialog from 'enketo/dialog';
import { updateDownloadLink, dataUriToBlobSync, getFilename } from '../../js/utils';

/**
 * SignaturePad.prototype.fromDataURL is asynchronous and does not return a 
 * Promise. This is a rewrite returning a promise and the objectUrl.
 * In addition it also fixes a bug where a loaded image is stretched to fit
 * the canvas.
 * 
 * @param {*} objectUrl 
 * @param {*} options 
 */
SignaturePad.prototype.fromObjectURL = function( objectUrl, options ) {
    const image = new Image();
    options = options || {};
    const deviceRatio = options.ratio || window.devicePixelRatio || 1;
    const width = options.width || ( this._canvas.width / deviceRatio );
    const height = options.height || ( this._canvas.height / deviceRatio );
    const that = this;

    this._reset();

    return new Promise( resolve => {
        image.src = objectUrl;
        image.onload = () => {
            const imgWidth = image.width;
            const imgHeight = image.height;
            const hRatio = width / imgWidth;
            const vRatio = height / imgHeight;
            let left;
            let top;

            if ( hRatio < 1 || vRatio < 1 ) { //if image is bigger than canvas then fit within the canvas
                const ratio = Math.min( hRatio, vRatio );
                left = ( width - imgWidth * ratio ) / 2;
                top = ( height - imgHeight * ratio ) / 2;
                that._ctx.drawImage( image, 0, 0, imgWidth, imgHeight, left, top, imgWidth * ratio, imgHeight * ratio );
            } else { // if image is smaller than canvas then show it in the center and don't stretch it
                left = ( width - imgWidth ) / 2;
                top = ( height - imgHeight ) / 2;
                that._ctx.drawImage( image, left, top, imgWidth, imgHeight );
            }
            resolve( objectUrl );
        };
        that._isEmpty = false;
    } );
};

/**
 * Similar to SignaturePad.prototype.fromData except that it doesn't clear the canvas.
 * This is to facilitate undoing a drawing stroke over a background (bitmap) image.
 * 
 * @param {*} pointGroups 
 */
SignaturePad.prototype.updateData = function( pointGroups ) {
    const that = this;
    this._fromData(
        pointGroups,
        ( curve, widths ) => { that._drawCurve( curve, widths.start, widths.end ); },
        rawPoint => { that._drawDot( rawPoint ); }
    );

    this._data = pointGroups;
};



/**
 * Widget to obtain user-provided drawings or signature.
 */
class DrawWidget extends Widget {
    static get selector() {
        // note that the selector needs to match both the pre-instantiated form and the post-instantiated form (type attribute changes)
        return '.or-appearance-draw input[data-type-xml="binary"][accept^="image"], .or-appearance-signature input[data-type-xml="binary"][accept^="image"], .or-appearance-annotate input[data-type-xml="binary"][accept^="image"]';
    }

    _init() {
        let canvas;
        const that = this;
        const existingFilename = this.element.dataset.loadedFileName;

        this.element.type = 'text';
        this.element.dataset.drawing = true;

        this.element.after( this._getMarkup() );
        const question = this.question;

        question.classList.add( `or-${this.props.type}-initialized` );

        this.$widget = $( question.querySelector( '.widget' ) );

        canvas = this.$widget[ 0 ].querySelector( '.draw-widget__body__canvas' );
        this._handleResize( canvas );
        this._resizeCanvas( canvas );

        if ( this.props.load ) {
            this._handleFiles( existingFilename );
        }

        this.initialize = fileManager.init()
            .then( () => {
                that.pad = new SignaturePad( canvas, {
                    onEnd: that._updateValue.bind( that ),
                    penColor: that.props.colors[ 0 ] || 'black'
                } );
                that.pad.off();
                if ( existingFilename ) {
                    that.element.value = existingFilename;
                    return that._loadFileIntoPad( existingFilename )
                        .then( that._updateDownloadLink.bind( that ) );
                }
                return true;
            } );
        this.disable();
        this.initialize
            .then( () => {
                that.$widget
                    .find( '.btn-reset' ).on( 'click', that._reset.bind( that ) )
                    .end().find( '.draw-widget__colorpicker' )
                    .on( 'click', '.current', function() {
                        $( this ).parent().toggleClass( 'reveal' );
                    } )
                    .on( 'click', '[data-color]:not(.current)', function() {
                        $( this ).siblings().removeClass( 'current' ).end().addClass( 'current' )
                            .parent().removeClass( 'reveal' );
                        that.pad.penColor = this.dataset.color;
                    } )
                    .end().find( '.draw-widget__undo' ).on( 'click', () => {
                        const data = that.pad.toData();
                        that.pad.clear();
                        const fileInput = that.$widget[ 0 ].querySelector( 'input[type=file]' );
                        // that.element.dataset.loadedFileName will have been removed only after resetting 
                        const fileToLoad = fileInput && fileInput.files[ 0 ] ? fileInput.files[ 0 ] : that.element.dataset.loadedFileName;
                        that._loadFileIntoPad( fileToLoad )
                            .then( () => {
                                that.pad.updateData( data.slice( 0, -1 ) );
                                that._updateValue();
                                that.pad.penColor = that.$widget.find( '.draw-widget__colorpicker .current' )[ 0 ].dataset.color;
                            } );
                    } )
                    .end().find( '.show-canvas-btn' ).on( 'click', () => {
                        that.$widget.addClass( 'full-screen' );
                        that._resizeCanvas( canvas );
                        that.enable();
                        return false;
                    } )
                    .end().find( '.hide-canvas-btn' ).on( 'click', () => {
                        that.$widget.removeClass( 'full-screen' );
                        that.pad.off();
                        that._resizeCanvas( canvas );
                        return false;
                    } ).click();

                $( canvas )
                    .on( `canvasreload.${that.namespace}`, () => {
                        if ( that.cache ) {
                            that.pad.fromObjectURL( that.cache );
                        }
                    } );
                that.enable();
            } )
            .catch( error => {
                that._showFeedback( error.message );
            } );

        $( this.element )
            .on( 'applyfocus', () => {
                canvas.focus();
            } )
            .closest( '[role="page"]' ).on( 'pageflip', () => {
                // When an existing value is loaded into the canvas and is not 
                // the first page, it won't become visible until the canvas is clicked
                // or the window is resized:
                // https://github.com/kobotoolbox/enketo-express/issues/895
                // This also fixes a similar issue with an empty canvas:
                // https://github.com/kobotoolbox/enketo-express/issues/844
                that._resizeCanvas( canvas );
            } );
    }

    // All this is copied from the file-picker widget
    _handleFiles( loadedFileName ) {
        // Monitor maxSize changes to update placeholder text in annotate widget. This facilitates asynchronous 
        // obtaining of max size from server without slowing down form loading.
        this._updatePlaceholder();
        this.$widget.closest( 'form.or' ).on( 'updateMaxSize', this._updatePlaceholder.bind( this ) );

        const that = this;

        const $input = this.$widget.find( 'input[type=file]' );
        const $fakeInput = this.$widget.find( '.fake-file-input' );

        // show loaded file name or placeholder regardless of whether widget is supported
        this._showFileName( loadedFileName );

        $input
            .on( `click.${this.namespace}`, event => {
                // The purpose of this handler is to block the filepicker window
                // when the label is clicked outside of the input.
                if ( that.props.readonly || event.namespace !== 'propagate' ) {
                    that.$fakeInput.focus();
                    event.stopImmediatePropagation();
                    return false;
                }
            } )
            .on( `change.${this.namespace}`, function() {
                // Get the file
                const file = this.files[ 0 ];

                if ( file ) {
                    // Process the file
                    if ( !fileManager.isTooLarge( file ) ) {
                        // Update UI
                        that.pad.clear();
                        that._loadFileIntoPad( this.files[ 0 ] )
                            .then( () => {
                                that._updateValue.call( that );
                                that._showFileName( file.name );
                                that.enable();
                            } );
                    } else {
                        that._showFeedback( t( 'filepicker.toolargeerror', { maxSize: fileManager.getMaxSizeReadable() } ) );
                    }
                } else {
                    that._showFileName( null );
                }
            } );

        $fakeInput
            .on( `click.${this.namespace}`, function( event ) {
                /* 
                    The purpose of this handler is to selectively propagate clicks on the fake
                    input to the underlying file input (to show the file picker window).
                    It blocks propagation if the filepicker has a value to avoid accidentally
                    clearing files in a loaded record, hereby blocking native browser file input behavior
                    to clear values. Instead the reset button is the only way to clear a value.
                */
                if ( that.props.readonly || $input[ 0 ].value || $fakeInput[ 0 ].value ) {
                    $( this ).focus();
                    event.stopImmediatePropagation();
                    return false;
                }
                event.preventDefault();
                $input.trigger( 'click.propagate' );
            } )
            .on( `change.${this.namespace}`, () => // For robustness, avoid any editing of filenames by user.
                false );
    }

    _showFileName( fileName ) {
        this.$widget.find( '.fake-file-input' ).val( fileName ).prop( 'readonly', !!fileName );
    }

    _updatePlaceholder() {
        this.$widget.find( '.fake-file-input' ).attr( 'placeholder', t( 'filepicker.placeholder', { maxSize: fileManager.getMaxSizeReadable() || '?MB' } ) );
    }

    _getMarkup() {
        // HTML syntax copied from filepicker widget
        const load = this.props.load ? `<input type="file" class="ignore draw-widget__load"${this.props.capture !== null ? ` capture="${this.props.capture}"` : ''} accept="${this.props.accept}"/><div class="widget file-picker"><input class="ignore fake-file-input"/><div class="file-feedback"></div></div>` : '';
        const fullscreenBtns = this.props.touch ? '<button type="button" class="show-canvas-btn btn btn-default">Draw/Sign</button>' +
            '<button type="button" class="hide-canvas-btn btn btn-default"><span class="icon icon-arrow-left"> </span></button>' : '';
        const fragment = document.createRange().createContextualFragment(
            `<div class="widget draw-widget">
                <div class="draw-widget__body">
                    ${fullscreenBtns}
                    ${load}
                    <canvas class="draw-widget__body__canvas noSwipe disabled" tabindex="0"></canvas>
                    <div class="draw-widget__colorpicker"></div>
                    ${this.props.type === 'signature' ? '' : '<button class="btn-icon-only draw-widget__undo" aria-label="undo" type=button><i class="icon icon-undo"> </i></button>'}
                </div>
                <div class="draw-widget__footer">
                    <div class="draw-widget__feedback"></div>
                </div>
            </div>`
        );
        fragment.querySelector( '.draw-widget__footer' ).prepend( this.downloadButtonHtml );
        fragment.querySelector( '.draw-widget__footer' ).prepend( this.resetButtonHtml );

        const colorpicker = fragment.querySelector( '.draw-widget__colorpicker' );

        this.props.colors.forEach( ( color, index ) => {
            const current = index === 0 ? ' current' : '';
            const colorDiv = document.createRange().createContextualFragment( `<div class="${current}"data-color="${color}" style="background: ${color};" />` );
            colorpicker.append( colorDiv );
        } );

        return fragment;
    }

    _updateValue() {
        const now = new Date();
        const postfix = `-${now.getHours()}_${now.getMinutes()}_${now.getSeconds()}`;
        this.element.dataset.filenamePostfix = postfix;
        // Note that this.element has become a text input.
        this.originalInputValue = this.props.filename;
        // pad.toData() doesn't seem to work when redrawing on a smaller canvas. Doesn't scale.
        // pad.toDataURL() is crude and memory-heavy but the advantage is that it will also work for appearance=annotate
        this.value = this.pad.toDataURL();
        this._updateDownloadLink( this.value );
    }

    _reset() {
        const that = this;

        if ( this.element.value ) {
            // This discombulated line is to help the i18next parser pick up all 3 keys.
            const item = this.props.type === 'signature' ?
                t( 'drawwidget.signature' ) : ( this.props.type === 'drawing' ? t( 'drawwidget.drawing' ) : t( 'drawwidget.annotation' ) );
            dialog.confirm( t( 'filepicker.resetWarning', { item } ) )
                .then( confirmed => {
                    if ( !confirmed ) {
                        return;
                    }
                    that.pad.clear();
                    that.cache = null;
                    // Only upon reset is loadedFileName removed, so that "undo" will work
                    // for drawings loaded from storage.
                    delete that.element.dataset.loadedFileName;
                    that.element.dataset.filenamePostfix = '';
                    $( that.element ).val( '' ).trigger( 'change' );
                    // Annotate file input
                    that.$widget.find( 'input[type=file]' ).val( '' ).trigger( 'change' );
                    that._updateDownloadLink( '' );
                    that.disable();
                    that.enable();
                } );
        }
    }

    /**
     * 
     * @param {*} file Either a filename or a file.
     */
    _loadFileIntoPad( file ) {
        const that = this;
        if ( !file ) {
            return Promise.resolve( '' );
        }
        return fileManager.getObjectUrl( file )
            .then( that.pad.fromObjectURL.bind( that.pad ) )
            .then( objectUrl => {
                that.cache = objectUrl;
                return objectUrl;
            } )
            .catch( () => {
                that._showFeedback( 'File could not be loaded (leave unchanged if already submitted and you want to preserve it).', 'error' );
            } );
    }

    _showFeedback( message ) {
        message = message || '';

        // replace text and replace all existing classes with the new status class
        this.$widget.find( '.draw-widget__feedback' ).text( message );
    }

    _updateDownloadLink( url ) {
        if ( url && url.indexOf( 'data:' ) === 0 ) {
            url = URL.createObjectURL( dataUriToBlobSync( url ) );
        }
        const fileName = url ? getFilename( { name: this.element.value }, this.element.dataset.filenamePostfix ) : '';
        updateDownloadLink( this.$widget.find( '.btn-download' )[ 0 ], url, fileName );
    }

    _handleResize( canvas ) {
        const that = this;
        $( window ).on( 'resize', () => {
            that._resizeCanvas( canvas );
        } );
    }

    // Adjust canvas coordinate space taking into account pixel ratio,
    // to make it look crisp on mobile devices.
    // This also causes canvas to be cleared.
    _resizeCanvas( canvas ) {
        // When zoomed out to less than 100%, for some very strange reason,
        // some browsers report devicePixelRatio as less than 1
        // and only part of the canvas is cleared then.
        const ratio = Math.max( window.devicePixelRatio || 1, 1 );
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        canvas.getContext( '2d' ).scale( ratio, ratio );
        $( canvas ).trigger( `canvasreload.${this.namespace}` );
    }

    disable() {
        const that = this;
        const canvas = this.$widget.find( '.draw-widget__body__canvas' )[ 0 ];

        this.initialize
            .then( () => {
                that.pad.off();
                canvas.classList.add( 'disabled' );
                that.$widget
                    .find( '.btn-reset' )
                    .prop( 'disabled', true );
            } );
    }

    enable() {
        const that = this;
        const canvas = this.$widget.find( '.draw-widget__body__canvas' )[ 0 ];
        const touchNotFull = this.props.touch && !this.$widget.is( '.full-screen' );
        const needFile = this.props.load && !this.element.value;

        this.initialize
            .then( () => {
                if ( !that.props.readonly && !needFile && !touchNotFull ) {
                    that.pad.on();
                    canvas.classList.remove( 'disabled' );
                    that.$widget
                        .find( '.btn-reset' )
                        .prop( 'disabled', false );
                }
                // https://github.com/enketo/enketo-core/issues/450
                // When loading a question with a relevant, it is invisible 
                // until branch.js removes the "pre-init" class. The rendering of the 
                // canvas may therefore still be ongoing when this widget is instantiated.
                // For that reason we call _resizeCanvas when enable is called to make
                // sure the canvas is rendered properly.
                that._resizeCanvas( canvas );
            } );
    }

    /** 
     * Updates value when it is programmatically cleared.
     * There is no way to programmatically update a file input other than clearing it, so that's all
     * we need to do.
     * 
     * @param  {[type]} element [description]
     * @return {[type]}         [description]
     */
    update() {
        if ( this.originalInputValue === '' ) {
            this._reset();
        }
    }

    get props() {
        const props = this._props;

        props.type = props.appearances.includes( 'draw' ) ? 'drawing' : ( props.appearances.includes( 'signature' ) ? 'signature' : 'annotation' );
        props.filename = `${props.type}.png`;
        props.load = props.type === 'annotation';
        props.colors = props.type === 'signature' ? [] : [ 'black', 'lightblue', 'blue', 'red', 'orange', 'cyan', 'yellow', 'lightgreen', 'green', 'pink', 'purple', 'lightgray', 'darkgray' ];
        props.touch = support.touch;
        props.accept = this.element.getAttribute( 'accept' );
        props.capture = this.element.getAttribute( 'capture' );

        return props;
    }

    get value() {
        return this.cache ? this.props.filename : '';
    }

    set value( dataUrl ) {
        this.cache = dataUrl;
    }

}

export default DrawWidget;
