/**
 * @preserve Copyright 2012 Silvio Moreto, Martijn van de Rijdt & Modilabs
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

define( [ 'enketo-js/Widget', 'jquery', 'bootstrap' ], function( Widget, $ ) {
    "use strict";

    var pluginName = 'desktopSelectpicker';

    /**
     * Bootstrap Select picker that supports single and multiple selects
     * A port of https://github.com/silviomoreto/bootstrap-select
     *
     * @constructor
     * @param {Element} element [description]
     * @param {(boolean|{touch: boolean, btnStyle: string, noneSelectedText: string, maxlength:number})} options options
     * @param {*=} e     event
     */

    function DesktopSelectpicker( element, options, e ) {
        this.namespace = pluginName;
        Widget.call( this, element, options );
        if ( e ) {
            e.stopPropagation();
            e.preventDefault();
        }

        this.$picker = null;
        this.noneSelectedText = options.noneSelectedText || 'none selected';
        this.lengthmax = options.maxlength || 15;
        this.multiple = ( typeof $( element ).attr( 'multiple' ) !== 'undefined' && $( element ).attr( 'multiple' ) !== false );
        this._init();
    }

    //copy the prototype functions from the Widget super class
    DesktopSelectpicker.prototype = Object.create( Widget.prototype );

    //ensure the constructor is the new one
    DesktopSelectpicker.prototype.constructor = DesktopSelectpicker;

    DesktopSelectpicker.prototype._init = function() {
        var $template = this._getTemplate(),
            $select = $( this.element );
        $select.css( 'display', 'none' );
        $template = this._createLi( $template );
        this.$picker = $template.insertAfter( $select );
        this.$picker.find( '> a' ).addClass( this.selectClass );
        this._clickListener();
        this._focusListener();
    };

    DesktopSelectpicker.prototype._getTemplate = function() {
        var template =
            '<div class="btn-group bootstrap-select widget clearfix">' +
            '<button type="button" class="btn btn-default dropdown-toggle clearfix" data-toggle="dropdown">' +
            '<span class="selected">__SELECTED_OPTIONS</span><span class="caret"></span>' +
            '</button>' +
            '<ul class="dropdown-menu" role="menu">' +
            '__ADD_LI' +
            '</ul>' +
            '</div>';

        return template;
    };

    DesktopSelectpicker.prototype._createLi = function( template ) {

        var li = [];
        var liHtml = '';
        var inputAttr = ( this.multiple ) ? "type='checkbox'" : "type='radio' name='" + Math.random() * 100000 + "'";
        var _this = this;
        var checkedInputAttr,
            checkedLiAttr;

        $( this.element ).find( 'option' ).each( function() {
            li.push( {
                label: $( this ).text(),
                selected: $( this ).is( ':selected' ),
                value: $( this ).attr( 'value' )
            } );
        } );

        if ( li.length > 0 ) {
            template = template.replace( '__SELECTED_OPTIONS', this._createSelectedStr() );
            for ( var i = 0; i < li.length; i++ ) {
                if ( li[ i ].value ) {
                    checkedInputAttr = ( li[ i ].selected ) ? " checked='checked'" : '';
                    checkedLiAttr = ( li[ i ].selected && !_this.multiple ) ? "class='active'" : '';
                    /**
                     * e.g.:
                     * <li checked="checked">
                     *   <a class="option-wrapper" tabindex="-1" href="#">
                     *         <label>
                     *           <input class="ignore" type="checkbox" checked="checked" value="a"/>
                     *         </label>
                     *       </a>
                     *    </li>
                     */
                    liHtml +=
                        "<li " + checkedLiAttr + ">" +
                        "<a class='option-wrapper' tabindex='-1' href='#'>" +
                        "<label>" +
                        "<input class='ignore' " + inputAttr + checkedInputAttr + "value='" + li[ i ].value + "' />" +
                        "<span class='option-label'>" + li[ i ].label + "</span></label>" +
                        "</a>" +
                        "</li>";
                }
            }
        }

        template = template.replace( '__ADD_LI', liHtml );

        return $( template );
    };


    /**
     * create text to show in closed picker
     * @param  {jQuery=} $select  jQuery-wrapped select element
     * @return {string}
     */
    DesktopSelectpicker.prototype._createSelectedStr = function() {
        var textToShow,
            selectedLabels = [],
            $select = $( this.element );
        $select.find( 'option:selected' ).each( function() {
            if ( $( this ).attr( 'value' ).length > 0 ) {
                selectedLabels.push( $( this ).text() );
            }
        } );

        if ( selectedLabels.length === 0 ) {
            return this.noneSelectedText;
        }
        textToShow = selectedLabels.join( ', ' );
        return ( textToShow.length > this.lengthmax ) ? selectedLabels.length + ' selected' : textToShow;
    };

    DesktopSelectpicker.prototype._clickListener = function() {
        var _this = this;

        this.$picker.on( 'click', 'li:not(.disabled)', function( e ) {
            e.preventDefault();
            var $li = $( this ),
                $input = $li.find( 'input' ),
                $select = $( _this.element ),
                $option = $select.find( 'option[value="' + $input.val() + '"]' ),
                selectedBefore = $option.is( ':selected' );

            if ( !_this.multiple ) {
                _this.$picker.find( 'li' ).removeClass( 'active' );
                $option.siblings( 'option' ).prop( 'selected', false );
                _this.$picker.find( 'input' ).prop( 'checked', false );
            } else {
                //don't close dropdown for multiple select
                e.stopPropagation();
            }

            if ( selectedBefore ) {
                $li.removeClass( 'active' );
                $input.prop( 'checked', false );
                $option.prop( 'selected', false );
            } else {
                if ( !_this.multiple ) {
                    $li.addClass( 'active' );
                }
                $input.prop( 'checked', true );
                $option.prop( 'selected', true );
            }

            _this.$picker.find( '.selected' ).html( _this._createSelectedStr() );

            $select.trigger( 'change' );
        } );
    };

    DesktopSelectpicker.prototype._focusListener = function() {
        var _this = this;

        this.$picker.on( 'shown.bs.dropdown', function() {
            $( _this.element ).trigger( 'fakefocus' );
            return true;
        } ).on( 'hidden.bs.dropdown', function() {
            $( _this.element ).trigger( 'fakeblur' );
            return true;
        } );
    };

    //override super method
    DesktopSelectpicker.prototype.disable = function() {
        this.$picker.find( 'li' ).addClass( 'disabled' );
    };

    //override super method
    DesktopSelectpicker.prototype.enable = function() {
        this.$picker.find( 'li' ).removeClass( 'disabled' );
    };

    //override super method
    DesktopSelectpicker.prototype.update = function() {
        this.$picker.remove();
        this._init();
    };

    /**
     * [selectpicker description]
     * @param {({btnStyle: string, noneSelectedText: string, maxlength:number}|string)=} option options
     * @param {*=} event       [description]
     */
    $.fn[ pluginName ] = function( options, event ) {

        options = options || {};

        return this.each( function() {

            var $this = $( this ),
                data = $this.data( pluginName );

            //only instantiate if options is an object AND if options.touch is falsy
            if ( !data && typeof options == 'object' && !options.touch ) {
                $this.data( pluginName, ( data = new DesktopSelectpicker( this, options, event ) ) );
            } else if ( data && typeof options == 'string' ) {
                data[ options ]( this );
            }
        } );
    };

} );
