/**
 * @preserve Copyright 2012 Martijn van de Rijdt & Modi Labs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

define( [ 'enketo-js/Widget', 'Modernizr', 'jquery', 'enketo-widget/date/bootstrap3-datepicker/js/bootstrap-datepicker' ],
    function( Widget, Modernizr, $ ) {
        "use strict";

        //It is very helpful to make this the same as widget class, except for converting the first character to lowercase.
        var pluginName = 'datepickerExtended';

        /**
         * Extends eternicode's bootstrap-datepicker without changing the original.
         * https://github.com/eternicode/bootstrap-datepicker
         *
         * @constructor
         * @param {Element}                       element   Element to apply widget to.
         * @param {(boolean|{touch: boolean})}    options   options
         * @param {*=}                            event     event
         */

        function DatepickerExtended( element, options, event ) {
            this.namespace = pluginName;
            //call the Super constructor
            Widget.call( this, element, options );
            this._init();
        }

        //copy the prototype functions from the Widget super class
        DatepickerExtended.prototype = Object.create( Widget.prototype );

        //ensure the constructor is the new one
        DatepickerExtended.prototype.constructor = DatepickerExtended;

        /**
         * Initialize timepicker widget
         */
        DatepickerExtended.prototype._init = function() {
            var that = this,
                $p = $( this.element ).parent( 'label' ),
                settings = ( $p.hasClass( 'or-appearance-year' ) ) ? {
                    format: 'yyyy',
                    startView: 'decade',
                    minViewMode: 'years'
                } : ( $p.hasClass( 'or-appearance-month-year' ) ) ? {
                    format: 'yyyy-mm',
                    startView: 'year',
                    minViewMode: 'months'
                } : {
                    format: 'yyyy-mm-dd',
                    startView: 'month',
                    minViewMode: 'day'
                },
                $fakeDateI = this._createFakeDateInput( settings.format );

            this._setManualHandler( $fakeDateI );
            this._setFocusHandler( $fakeDateI );
            this._setResetHandler( $fakeDateI );

            $fakeDateI.datepicker( {
                format: settings.format,
                autoclose: true,
                todayHighlight: true,
                startView: settings.startView,
                minViewMode: settings.minViewMode,
                orientation: 'top'
            } ).on( 'changeDate', function( e ) {
                // copy changes made by datepicker to original input field
                var value = $( this ).val();
                if ( settings.startView === 'decade' && value.length === 4 ) {
                    value += '-01-01';
                } else if ( settings.startView === 'year' && value.length < 8 ) {
                    value += '-01';
                }
                $( that.element ).val( value ).trigger( 'change' ).blur();
            } );
        };

        /**
         * Creates fake date input elements
         * @param  {string} format the date format
         * @return {jQuery}        the jQuery-wrapped fake date input element
         */
        DatepickerExtended.prototype._createFakeDateInput = function( format ) {
            var $dateI = $( this.element ),
                $fakeDate = $(
                    '<div class="widget date"><input class="ignore input-small" readonly="readonly" type="text" value="' +
                    $dateI.val() + '" placeholder="' + format + '" />' +
                    '<button class="btn-icon-only btn-reset" type="button"><i class="icon icon-refresh"> </i></button></div>' ),
                //$fakeDateReset = $fakeDate.find( '.btn-reset' ),
                $fakeDateI = $fakeDate.find( 'input' );

            //$dateI.next( '.widget.date' ).remove( );
            $dateI.hide().after( $fakeDate );

            return $fakeDateI;
        };

        /**
         * copy manual changes to original date input field
         *
         * @param { jQuery } $fakeDateI Fake date input element
         */
        DatepickerExtended.prototype._setManualHandler = function( $fakeDateI ) {
            //$fakeDateI.on( 'change', function( ) {
            //  var date,
            //    value = $dateI.val( );
            //  if ( value.length > 0 ) {
            //    value = ( format === 'yyyy-mm' ) ? value + '-01' : ( format === 'yyyy' ) ? value + '-01-01' : value;
            //    value = data.node( ).convert( value, 'date' );
            //  }
            //  if ( $dateI.val( ) !== value ) {
            //    $dateI.val( value ).trigger( 'change' ).blur( );
            //  }
            //  return false;
            //} );
        };

        /**
         * Reset button handler
         *
         * @param { jQuery } $fakeDateI Fake date input element
         */
        DatepickerExtended.prototype._setResetHandler = function( $fakeDateI ) {
            $fakeDateI.next( '.btn-reset' ).on( 'click', function( event ) {
                $fakeDateI.val( '' ).trigger( 'changeDate' ).datepicker( 'update' );
            } );
        };

        /**
         * Handler for focus and blur events.
         * These events on the original input are used to check whether to display the 'required' message
         *
         * @param { jQuery } $fakeDateI Fake date input element
         */
        DatepickerExtended.prototype._setFocusHandler = function( $fakeDateI ) {
            var that = this;
            $fakeDateI.on( 'focus blur', function( event ) {
                $( that.element ).trigger( 'fake' + event.type );
            } );
        };

        $.fn[ pluginName ] = function( options, event ) {

            options = options || {};

            return this.each( function() {
                var $this = $( this ),
                    data = $this.data( pluginName ),
                    badSamsung = /GT-P31[0-9]{2}.+AppleWebKit\/534\.30/;

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

                if ( !data && typeof options === 'object' && ( !options.touch || !Modernizr.inputtypes.date || badSamsung.test( navigator.userAgent ) ) ) {
                    $this.data( pluginName, ( data = new DatepickerExtended( this, options, event ) ) );
                }
                //only call method if widget was instantiated before
                else if ( data && typeof options == 'string' ) {
                    //pass the element as a parameter as this is used in fix()
                    data[ options ]( this );
                }
            } );
        };

    } );
