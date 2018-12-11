import Widget from '../../js/widget';
import support from '../../js/support';
import $ from 'jquery';
import { time as timeFormat } from '../../js/format';
import types from '../../js/types';
import '../../js/extend';
import 'bootstrap-datepicker';
import '../time/timepicker';
import '../../js/dropdown.jquery';


class DatetimepickerExtended extends Widget {

    static get selector() {
        return 'input[type="datetime"]:not([readonly])';
    }

    static condition() {
        const badSamsung = /GT-P31[0-9]{2}.+AppleWebKit\/534\.30/;

        /*
         * Samsung mobile browser (called "Internet") has a weird bug that appears sometimes (?) when an input field
         * already has a value and is edited. The new value YYYY-MM-DD prepends old or replaces the year of the old value and first hyphen. E.g.
         * existing: 2010-01-01, new value entered: 2012-12-12 => input field shows: 2012-12-1201-01.
         * This doesn't seem to effect the actual value of the input, just the way it is displayed. But if the incorrectly displayed date is then
         * attempted to be edited again, it does get the incorrect value and it's impossible to clear this and create a valid date.
         *
         * browser: "Mozilla/5.0 (Linux; U; Android 4.1.1; en-us; GT-P3113 Build/JRO03C) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Safari/534.30";
         * webview: "Mozilla/5.0 (Linux; U; Android 4.1.2; en-us; GT-P3100 Build/JZO54K) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Safari/534.30"
         */

        return !support.touch || !support.inputTypes.datetime || badSamsung.test( navigator.userAgent );
    }

    _init() {
        this.$fakeDateI = this._createFakeDateInput();
        this.$fakeTimeI = this._createFakeTimeInput();

        this.element.classList.add( 'hide' );
        this.element.after( document.createRange().createContextualFragment( '<div class="datetimepicker widget" />' ) );
        const widget = this.question.querySelector( '.widget' );
        widget.append( this.$fakeDateI[ 0 ].closest( '.date' ) );
        widget.append( this.$fakeTimeI[ 0 ].closest( '.timepicker' ) );

        this.$fakeDateI
            .datepicker( {
                format: 'yyyy-mm-dd',
                autoclose: true,
                todayHighlight: true,
                forceParse: false
            } );

        this.$fakeTimeI
            .timepicker( {
                showMeridian: timeFormat.hour12,
                meridianNotation: {
                    am: timeFormat.amNotation,
                    pm: timeFormat.pmNotation
                }
            } );

        this.value = this.originalInputValue;

        this._setFocusHandler( this.$fakeDateI.add( this.$fakeTimeI ) );

        this.$fakeDateI
            .on( 'change changeDate', () => {
                if ( !types.date.validate( this.$fakeDateI[ 0 ].value ) ) {
                    this.$fakeDateI.val( '' ).datepicker( 'update' );
                }
                this.originalInputValue = this.value;
                return false;
            } );

        this.$fakeTimeI
            .on( 'change', () => {
                this.originalInputValue = this.value;
                return false;
            } );

        //reset button
        this.question.querySelector( '.btn-reset' ).addEventListener( 'click', () => {
            const event = this.originalInputValue ? 'change' : '';
            if ( event || this.$fakeDateI.val() || this.$fakeTimeI.val() ) {
                this.$fakeDateI.val( '' ).trigger( event ).datepicker( 'update' );
                this.$fakeTimeI.val( '' ).trigger( event );
            }
        } );

    }

    _createFakeDateInput() {
        const $fakeDate = $(
            '<div class="date">' +
            '<input class="ignore" type="text" placeholder="yyyy-mm-dd"/>' +
            '</div>' );

        return $fakeDate.find( 'input' );
    }

    _createFakeTimeInput() {
        const $fakeTime = $(
                `<div class="timepicker">
                    <input class="ignore timepicker-default" type="text" placeholder="hh:mm"/>
                </div>` )
            .append( this.resetButtonHtml );

        return $fakeTime.find( 'input' );
    }

    _setFocusHandler( $els ) {
        const that = this;
        // Handle focus on widget.
        $els.on( 'focus', () => {
            $( that.element ).trigger( 'fakefocus' );
        } );
        // Handle focus on original input (goTo functionality)
        $( this.element ).on( 'applyfocus', () => {
            $els.eq( 0 ).focus();
        } );
    }

    update() {
        const $dateTimeI = $( this.element );
        const val = ( $dateTimeI.val().length > 0 ) ? new Date( $dateTimeI.val() ).toISOLocalString() : '';
        const vals = val.split( 'T' );
        const dateVal = vals[ 0 ];
        const timeVal = ( vals[ 1 ] && vals[ 1 ].length > 4 ) ? vals[ 1 ].substring( 0, 5 ) : '';

        this.$fakeDateI.datepicker( 'setDate', dateVal );
        this.$fakeTimeI.timepicker( 'setTime', timeVal );
    }

    get value() {
        if ( this.$fakeDateI.val().length > 0 && this.$fakeTimeI.val().length > 3 ) {
            const d = this.$fakeDateI.val().split( '-' );
            const timeModified = timeFormat.hour12 ? types.time.convertMeridian( this.$fakeTimeI.val() ) : this.$fakeTimeI.val();
            const t = timeModified.split( ':' );
            return new Date( d[ 0 ], d[ 1 ] - 1, d[ 2 ], t[ 0 ], t[ 1 ] ).toISOLocalString();
        } else {
            return '';
        }
    }

    set value( value ) {
        /*
          Loaded or default datetime values remain untouched until they are edited. This is done to preserve 
          the timezone information (especially for instances-to-edit) if the values are not edited (the
          original entry may have been done in a different time zone than the edit). However, 
          values shown in the widget should reflect the local time representation of that value.
         */
        const val = value ? new Date( value ).toISOLocalString() : '';
        const vals = val.split( 'T' );
        const dateVal = vals[ 0 ];
        const timeVal = ( vals[ 1 ] && vals[ 1 ].length > 4 ) ? vals[ 1 ].substring( 0, 5 ) : '';
        this.$fakeDateI.datepicker( 'setDate', dateVal );
        this.$fakeTimeI.timepicker( 'setTime', timeVal );
    }
}

export default DatetimepickerExtended;
