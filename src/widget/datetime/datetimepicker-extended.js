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

define( [ 'enketo-js/Widget', 'enketo-js/support', 'jquery', 'enketo-js/extend',
        'enketo-widget/date/bootstrap3-datepicker/js/bootstrap-datepicker',
        'enketo-widget/time/bootstrap3-timepicker/js/bootstrap-timepicker'
    ],

    function( Widget, support, $ ) {
        'use strict';

        var pluginName = 'datetimepickerExtended';

        /**
         * This thing is hacked together with little love, because nobody used datetime inputs. Needs to be rewritten.
         *
         * Extends eternicode's bootstrap-datepicker without changing the original.
         * https://github.com/eternicode/bootstrap-datepicker
         *
         * Extends jdewit's bootstrap-timepicker without changing the original
         * https://github.com/jdewit/bootstrap-timepicker
         *
         * @constructor
         * @param {Element}                       element   Element to apply widget to.
         * @param {(boolean|{touch: boolean})}    options   options
         * @param {*=}                            event     event
         */

        function DatetimepickerExtended( element, options ) {
            this.namespace = pluginName;
            //call the Super constructor
            Widget.call( this, element, options );
            this._init();
        }

        //copy the prototype functions from the Widget super class
        DatetimepickerExtended.prototype = Object.create( Widget.prototype );

        //ensure the constructor is the new one
        DatetimepickerExtended.prototype.constructor = DatetimepickerExtended;

        /**
         * Initialize timepicker widget
         */
        DatetimepickerExtended.prototype._init = function() {
            var $dateTimeI = $( this.element ),
                /*
          Loaded or default datetime values remain untouched until they are edited. This is done to preserve 
          the timezone information (especially for instances-to-edit) if the values are not edited (the
          original entry may have been done in a different time zone than the edit). However, 
          values shown in the widget should reflect the local time representation of that value.
         */
                val = ( $dateTimeI.val().length > 0 ) ? new Date( $dateTimeI.val() ).toISOLocalString() : '',
                vals = val.split( 'T' ),
                dateVal = vals[ 0 ],
                timeVal = ( vals[ 1 ] && vals[ 1 ].length > 4 ) ? vals[ 1 ].substring( 0, 5 ) : '',
                $fakeDateI = this._createFakeDateInput( dateVal ),
                $fakeTimeI = this._createFakeTimeInput( timeVal );

            $dateTimeI.hide().after( '<div class="datetimepicker widget" />' );
            $dateTimeI.siblings( '.datetimepicker' ).append( $fakeDateI.closest( '.date' ) ).append( $fakeTimeI.closest( '.bootstrap-timepicker' ) );

            $fakeDateI.datepicker( {
                format: 'yyyy-mm-dd',
                autoclose: true,
                todayHighlight: true
            } );

            $fakeTimeI
                .timepicker( {
                    defaultTime: ( timeVal.length > 0 ) ? 'value' : 'current',
                    showMeridian: false
                } )
                .val( timeVal )
                //the time picker itself has input elements
                .closest( '.widget' ).find( 'input' ).addClass( 'ignore' );

            this._setManualHandler( $fakeDateI );
            this._setFocusHandler( $fakeDateI.add( $fakeTimeI ) );

            $fakeDateI.on( 'change changeDate', function() {
                changeVal();
                return false;
            } );

            $fakeTimeI.on( 'change', function() {
                changeVal();
                return false;
            } );

            //reset button
            $fakeTimeI.next( '.btn-reset' ).on( 'click', function() {
                $fakeDateI.val( '' ).trigger( 'change' ).datepicker( 'update' );
                $fakeTimeI.val( '' ).trigger( 'change' );
            } );

            function changeVal() {
                if ( $fakeDateI.val().length > 0 && $fakeTimeI.val().length > 0 ) {
                    var d = $fakeDateI.val().split( '-' ),
                        t = $fakeTimeI.val().split( ':' );
                    $dateTimeI.val( new Date( d[ 0 ], d[ 1 ] - 1, d[ 2 ], t[ 0 ], t[ 1 ] ).toISOLocalString() ).trigger( 'change' ).blur();
                } else {
                    $dateTimeI.val( '' ).trigger( 'change' ).blur();
                }
            }
        };

        /**
         * Creates fake date input elements
         * @param  {string} format the date format
         * @return {jQuery}        the jQuery-wrapped fake date input element
         */
        DatetimepickerExtended.prototype._createFakeDateInput = function( dateVal ) {
            var $fakeDate = $(
                    '<div class="date">' +
                    '<input class="ignore input-small" type="text" readonly="readonly" value="' + dateVal + '" placeholder="yyyy-mm-dd"/>' +
                    '</div>' ),
                $fakeDateI = $fakeDate.find( 'input' );

            return $fakeDateI;
        };

        /**
         * Creates fake time input elements
         * @param  {string} format the date format
         * @return {jQuery}        the jQuery-wrapped fake date input element
         */
        DatetimepickerExtended.prototype._createFakeTimeInput = function( timeVal ) {
            var $fakeTime = $(
                    '<div class="bootstrap-timepicker">' +
                    '<input class="ignore timepicker-default input-small" readonly="readonly" type="text" value="' +
                    timeVal + '" placeholder="hh:mm"/>' +
                    '<button class="btn-icon-only btn-reset" type="button"><i class="icon icon-refresh"> </i></button>' +
                    '</div>' ),
                $fakeTimeI = $fakeTime.find( 'input' );

            return $fakeTimeI;
        };

        /**
         * copy manual changes to original date input field
         *
         * @param { jQuery } $fakeDateI Fake date input element
         */
        DatetimepickerExtended.prototype._setManualHandler = function() {};

        /**
         * Handler for focus and blur events.
         * These events on the original input are used to check whether to display the 'required' message
         *
         * @param { jQuery } $fakeDateI Fake date input element
         */
        DatetimepickerExtended.prototype._setFocusHandler = function( $els ) {
            var that = this;
            $els.on( 'focus blur', function( event ) {
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
                Samsung mobile browser (called "Internet") has a weird bug that appears sometimes (?) when an input field
                already has a value and is edited. The new value YYYY-MM-DD prepends old or replaces the year of the old value and first hyphen. E.g.
                existing: 2010-01-01, new value entered: 2012-12-12 => input field shows: 2012-12-1201-01.
                This doesn't seem to effect the actual value of the input, just the way it is displayed. But if the incorrectly displayed date is then 
                attempted to be edited again, it does get the incorrect value and it's impossible to clear this and create a valid date.
              
                browser: "Mozilla/5.0 (Linux; U; Android 4.1.1; en-us; GT-P3113 Build/JRO03C) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Safari/534.30";
                webview: "Mozilla/5.0 (Linux; U; Android 4.1.2; en-us; GT-P3100 Build/JZO54K) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Safari/534.30" 
                */
                if ( !data && typeof options === 'object' && ( !options.touch || !support.inputtypes.datetime || badSamsung.test( navigator.userAgent ) ) ) {
                    $this.data( pluginName, ( data = new DatetimepickerExtended( this, options, event ) ) );
                }
                //only call method if widget was instantiated before
                else if ( data && typeof options === 'string' ) {
                    //pass the element as a parameter as this is used in fix()
                    data[ options ]( this );
                }
            } );
        };

        return pluginName;
    } );
