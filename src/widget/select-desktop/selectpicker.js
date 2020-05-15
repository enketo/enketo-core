/**
 * This widget is one gigantic mess. It should be replaced entirely.
 * The replacement should have and use getters and setters for `value` and `originalInputValue`
 */

/**
 * Copyright 2012 Silvio Moreto, Martijn van de Rijdt & Modilabs
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
import $ from 'jquery';
import Widget from '../../js/widget';
import support from '../../js/support';
import events from '../../js/event';
import { getSiblingElementsAndSelf } from '../../js/dom-utils';
import event from '../../js/event';
import { t } from 'enketo/translator';
import '../../js/dropdown.jquery';

/**
 * Bootstrap Select picker that supports single and multiple selects
 * A port of https://github.com/silviomoreto/bootstrap-select
 *
 * @augments Widget
 */
class DesktopSelectpicker extends Widget {
    /**
     * @type {string}
     */
    static get selector() {
        return '.question select';
    }

    /**
     * @type {boolean}
     */
    static get list() {
        return true;
    }

    /**
     * @return {boolean} Whether additional condition to instantiate the widget is met.
     */
    static condition() {
        return !support.touch;
    }

    _init() {
        const $select = $( this.element );
        $select.css( 'display', 'none' );
        const $template = this._createLi( this._getTemplate() );
        this.$picker = $template.insertAfter( $select );
        if ( this.props.readonly ) {
            this.disable();
        }
        this._clickListener();
        this._focusListener();
    }

    /**
     * @return {string} HTML string
     */
    _getTemplate() {
        return `
        <div class="btn-group bootstrap-select widget clearfix">
            <button type="button" class="btn btn-default dropdown-toggle clearfix" data-toggle="dropdown">
                <span class="selected">__SELECTED_OPTIONS</span><span class="caret"></span>
            </button>
            <ul class="dropdown-menu" role="menu">__ADD_LI</ul>
        </div>`;
    }

    /**
     * @param {string} template - The select template to use.
     * @return {jQuery} - The jQuery-wrapped template.
     */
    _createLi( template ) {
        const li = [];
        let liHtml = '';
        const inputAttr = this.props.multiple ? 'type="checkbox"' : `type="radio" name="${Math.random() * 100000}"`;

        $( this.element ).find( 'option' ).each( function() {
            li.push( {
                label: $( this ).text(),
                selected: $( this ).is( ':selected' ),
                value: $( this ).attr( 'value' )
            } );
        } );

        if ( li.length > 0 ) {
            template = template.replace( '__SELECTED_OPTIONS', this._createSelectedStr() );
            for ( let i = 0; i < li.length; i++ ) {
                if ( li[ i ].value ) {
                    const checkedInputAttr = li[ i ].selected ? ' checked="checked"' : '';
                    const checkedLiAttr = li[ i ].selected ? 'class="active"' : '';
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
                    liHtml += `
                    <li ${checkedLiAttr}>
                        <a class="option-wrapper" tabindex="-1" href="#">
                            <label>
                                <input class="ignore" ${inputAttr}${checkedInputAttr} value="${li[ i ].value}" />
                                <span class="option-label">${li[ i ].label}</span>
                            </label>
                        </a>
                    </li>`;
                }
            }
        }

        template = template.replace( '__ADD_LI', liHtml );

        return $( template );
    }


    /**
     * Create text to show in closed picker
     *
     * @return {string} - text to show in closed picker
     */
    _createSelectedStr() {
        const selectedLabels = [];
        const $select = $( this.element );
        $select.find( 'option:selected' ).each( function() {
            if ( $( this ).attr( 'value' ).length > 0 ) {
                selectedLabels.push( $( this ).text() );
            }
        } );

        if ( selectedLabels.length === 0 ) {
            return t( 'selectpicker.noneselected' );
        } else if ( selectedLabels.length === 1 ) {
            return selectedLabels[ 0 ];
        } else {
            return t( 'selectpicker.numberselected', {
                number: selectedLabels.length
            } );
        }
    }

    /**
     * Handles click listener
     */
    _clickListener() {
        const _this = this;

        this.$picker
            .on( 'click', 'li:not(.disabled)', function( e ) {
                const li = this;
                const input = li.querySelector( 'input' );
                const select = _this.element;
                const option = select.querySelector( `option[value="${input.value}"]` );
                const selectedBefore = option.matches( ':checked' );

                // We need to prevent default unless click was on an input
                // Without this 'fix', clicks on radiobuttons/checkboxes themselves will update the value
                // but will not show checked status.
                if ( e.target.nodeName.toLowerCase() !== 'input' ) {
                    e.preventDefault();
                }

                if ( !_this.props.multiple ) {
                    _this.$picker.find( 'li' ).removeClass( 'active' );
                    getSiblingElementsAndSelf( option, 'option' ).forEach( el => { el.selected = false; } );
                    _this.$picker.find( 'input' ).prop( 'checked', false );
                } else {
                    //don't close dropdown for multiple select
                    e.stopPropagation();
                }

                // For issue https://github.com/kobotoolbox/enketo-express/issues/1122 in FF,
                // we had to use event.preventDefault() on <a> tag click events.
                // This broke view updates when clicking on the radiobuttons and checkboxes directly
                // although the underlying values did change correctly.
                //
                // It has to do with event propagation. I could not figure out how to fix it.
                // Therefore I used a workaround by slightly delaying the status changes.
                setTimeout( () => {
                    if ( selectedBefore ) {
                        li.classList.remove( 'active' );
                        input.checked = false;
                        option.selected = false;
                    } else {
                        li.classList.add( 'active' );
                        option.selected = true;
                        input.checked = true;
                    }

                    _this.$picker.find( '.selected' ).html( _this._createSelectedStr() );
                    select.dispatchEvent( new event.Change() );
                }, 10 );

            } )
            .on( 'keydown', 'li:not(.disabled)', e => {
                const keyCode = e.keyCode.toString( 10 );
                // Enter/Space keys
                if ( /(13|32)/.test( keyCode ) ) {
                    if ( !/(32)/.test( keyCode ) ) {
                        e.preventDefault();
                    }
                    const elem = $( ':focus' );
                    elem.click();
                    // Bring back focus for multiselects
                    elem.focus();
                    // Prevent screen from scrolling if the user hit the spacebar
                    e.preventDefault();
                }
            } )
            .on( 'click', 'li.disabled', e => {
                e.stopPropagation();

                return false;
            } )
            .on( 'click', 'a', e => {
                // Prevent FF from adding empty anchor to URL if checkbox or radiobutton is clicked.
                // https://github.com/kobotoolbox/enketo-express/issues/1122
                e.preventDefault();
            } );
    }

    /**
     * Handles focus listener
     */
    _focusListener() {
        const _this = this;

        // Focus on original element (form.goTo functionality)
        this.element.addEventListener( events.ApplyFocus().type, () => {
            _this.$picker.find( '.dropdown-toggle' ).focus();
        } );
    }

    /**
     * Disables widget
     */
    disable() {
        this.$picker[ 0 ].querySelectorAll( 'li' ).forEach( el => {
            el.classList.add( 'disabled' );
            const input = el.querySelector( 'input' );
            // are both below necessary?
            input.disabled = true;
            input.readOnly = true;
        } );
    }

    /**
     * Enables widget
     */
    enable() {
        this.$picker[ 0 ].querySelectorAll( 'li' ).forEach( el => {
            el.classList.remove( 'disabled' );
            const input = el.querySelector( 'input' );
            input.disabled = false;
            input.readOnly = false;
        } );
    }

    /**
     * Updates widget
     */
    update() {
        this.$picker.remove();
        this._init();
    }
}

export default DesktopSelectpicker;
