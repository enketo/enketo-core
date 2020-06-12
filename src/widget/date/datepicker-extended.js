import Widget from '../../js/widget';
import support from '../../js/support';
import $ from 'jquery';
import types from '../../js/types';
import { isNumber, getPasteData } from '../../js/utils';
import 'bootstrap-datepicker';
import '../../js/dropdown.jquery';

/**
 * Extends eternicode's bootstrap-datepicker without changing the original.
 * https://github.com/eternicode/bootstrap-datepicker
 *
 * @augments Widget
 */
class DatepickerExtended extends Widget {
    /**
     * @type {string}
     */
    static get selector() {
        return '.question input[type="date"]';
    }

    /**
     * @type {boolean}
     */
    static condition() {
        return !support.touch || !support.inputTypes.date;
    }

    _init() {
        this.settings = ( this.props.appearances.includes( 'year' ) ) ? {
            format: 'yyyy',
            startView: 'decade',
            minViewMode: 'years'
        } : ( this.props.appearances.includes( 'month-year' ) ) ? {
            format: 'yyyy-mm',
            startView: 'year',
            minViewMode: 'months'
        } : {
            format: 'yyyy-mm-dd',
            startView: 'month',
            minViewMode: 'days'
        };

        this.$fakeDateI = this._createFakeDateInput( this.settings.format );

        this._setChangeHandler( this.$fakeDateI );
        this._setFocusHandler( this.$fakeDateI );
        this._setResetHandler( this.$fakeDateI );

        this.enable();
        this.value = this.element.value;

        // It is much easier to first enable and disable, and not as bad it seems, since readonly will become dynamic eventually.
        if ( this.props.readonly ) {
            this.disable();
        }
    }

    /**
     * Creates fake date input elements
     *
     * @param {string} format - The date format
     * @return {jQuery} The jQuery-wrapped fake date input element
     */
    _createFakeDateInput( format ) {
        const $dateI = $( this.element );
        const $fakeDate = $( `<div class="widget date"><input class="ignore input-small" type="text" placeholder="${format}" /></div>` )
            .append( this.resetButtonHtml );
        const $fakeDateI = $fakeDate.find( 'input' );

        $dateI.hide().after( $fakeDate );

        return $fakeDateI;
    }

    /**
     * Copy manual changes that were not detected by bootstrap-datepicker (one without pressing Enter) to original date input field
     *
     * @param {jQuery} $fakeDateI - Fake date input element
     */
    _setChangeHandler( $fakeDateI ) {
        const settings = this.settings;

        $fakeDateI.on( 'change paste', e => {
            let convertedValue = '';
            let value = e.type === 'paste' ? getPasteData( e ) : this.value;

            if ( value.length > 0 ) {
                // Note: types.date.convert considers numbers to be a number of days since the epoch
                // as this is what the XPath evaluator may return.
                // For user-entered input, we want to consider a Number value to be incorrect, expect for year input.
                if ( isNumber( value ) && settings.format !== 'yyyy' ) {
                    convertedValue = '';
                } else {
                    value = this._toActualDate( value );
                    convertedValue = types.date.convert( value );
                }
            }

            $fakeDateI.val( this._toDisplayDate( convertedValue ) ).datepicker( 'update' );

            // Here we have to do something unusual to prevent native inputs from automatically
            // changing 2012-12-32 into 2013-01-01
            // convertedValue is '' for invalid 2012-12-32
            if ( convertedValue === '' && e.type === 'paste' ) {
                e.stopImmediatePropagation();
            }

            // Avoid triggering unnecessary change events as they mess up sensitive custom applications (OC)
            if ( this.originalInputValue !== convertedValue ) {
                this.originalInputValue = convertedValue;
            }

            return false;
        } );
    }

    /**
     * Reset button handler
     *
     * @param {jQuery} $fakeDateI - Fake date input element
     */
    _setResetHandler( $fakeDateI ) {
        $fakeDateI.next( '.btn-reset' ).on( 'click', () => {
            if ( this.originalInputValue ) {
                this.value = '';
            }
        } );
    }

    /**
     * Handler for focus events.
     * These events on the original input are used to check whether to display the 'required' message
     *
     * @param {jQuery} $fakeDateI - Fake date input element
     */
    _setFocusHandler( $fakeDateI ) {
        // Handle focus on original input (goTo functionality)
        $( this.element ).on( 'applyfocus', () => {
            $fakeDateI[ 0 ].focus();
        } );
    }

    /**
     * @param {string} [date] - date
     * @return {string} the actual date
     */
    _toActualDate( date = '' ) {
        date = date.trim();

        return date && this.settings.format === 'yyyy' && date.length < 5 ? `${date}-01-01` : ( date && this.settings.format === 'yyyy-mm' && date.length < 8 ? `${date}-01` : date );
    }

    /**
     * @param {string} [date] - date
     * @return {string} the display date
     */
    _toDisplayDate( date = '' ) {
        date = date.trim();

        return date && this.settings.format === 'yyyy' ? date.substring( 0, 4 ) : ( this.settings.format === 'yyyy-mm' ? date.substring( 0, 7 ) : date );
    }

    disable() {
        this.$fakeDateI.datepicker( 'destroy' );
        this.$fakeDateI.prop( 'disabled', true );
        this.$fakeDateI.next( '.btn-reset' ).prop( 'disabled', true );
    }

    enable() {
        this.$fakeDateI.datepicker( {
            format: this.settings.format,
            autoclose: true,
            todayHighlight: true,
            startView: this.settings.startView,
            minViewMode: this.settings.minViewMode,
            forceParse: false
        } );
        this.$fakeDateI.prop( 'disabled', false );
        this.$fakeDateI.next( '.btn-reset' ).prop( 'disabled', false );
    }

    update() {
        this.value = this.element.value;
    }

    /**
     * @type {string}
     */
    get displayedValue() {
        return this.question.querySelector( '.widget input' ).value;
    }

    /**
     * @type {string}
     */
    get value() {
        return this._toActualDate( this.displayedValue );
    }

    set value( date ) {
        if ( this.$fakeDateI[ 0 ].disabled ) {
            this.$fakeDateI[ 0 ].value = this._toDisplayDate( date );
        } else {
            this.$fakeDateI.datepicker( 'setDate', this._toDisplayDate( date ) );
        }
    }

}

export default DatepickerExtended;
