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

const range = document.createRange();

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
        const select =  this.element;
        select.style.display = 'none';
        const template = this._getTemplate();
        select.after( template );
        this.picker = this.question.querySelector( '.bootstrap-select' );
        if ( this.props.readonly ) {
            this.disable();
        }
        this._clickListener();
        this._focusListener();
    }

    /**
     * @return {Element} HTML fragment
     */
    _getTemplate() {
        const template = range.createContextualFragment( `
        <div class="btn-group bootstrap-select widget clearfix">
            <button type="button" class="btn btn-default dropdown-toggle clearfix" data-toggle="dropdown">
                <span class="selected"></span><span class="caret"></span>
            </button>
            <ul class="dropdown-menu" role="menu">${this._getLisHtml()}</ul>
        </div>` );
        this._showSelected( template.querySelector( '.selected' ) );

        return template;
    }

    /**
     * Generates HTML text for <li> elements
     */
    _getLisHtml( ) {
        const inputAttr = this.props.multiple ? 'type="checkbox"' : `type="radio" name="${Math.random() * 100000}"`;

        return [ ...this.element.querySelectorAll( 'option' ) ]
            .map( option => {
                const label = option.textContent;
                const selected = option.matches( ':checked' );
                const value = option.value;
                if ( value ) {
                    const checkedInputAttr = selected ? ' checked="checked"' : '';
                    const checkedLiAttr = selected ? 'class="active"' : '';

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
                    return `
                        <li ${checkedLiAttr}>
                            <a class="option-wrapper" tabindex="-1" href="#">
                                <label>
                                    <input class="ignore" ${inputAttr}${checkedInputAttr} value="${value}" />
                                    <span class="option-label">${label}</span>
                                </label>
                            </a>
                        </li>`;
                } else {
                    return '';
                }
            } ).join( '' );
    }

    /**
     * Update text to show in closed picker
     *
     * @param {Element} el - HTML element to show text in
     */
    _showSelected( el ) {
        const selectedLabels = [ ...this.element.querySelectorAll( 'option:checked' ) ]
            .filter( option =>  option.getAttribute( 'value' ).length )
            .map( option => option.textContent );

        // keys for i18next parser to pick up:
        // t( 'selectpicker.numberselected' );

        if ( selectedLabels.length === 0 ) {
            // do not use variable for translation key to not confuse i18next-parser
            el.textContent = t( 'selectpicker.noneselected' );
            el.dataset.i18n =  'selectpicker.noneselected';
            delete el.dataset.i18nNumber;

        } else if ( selectedLabels.length === 1 ) {
            el.textContent = selectedLabels[ 0 ];
            delete el.dataset.i18n;
            delete el.dataset.i18nNumber;
        } else {
            const number = selectedLabels.length;
            // do not use variable for translation key to not confuse i18next-parser
            el.textContent = t( 'selectpicker.numberselected', { number } );
            el.dataset.i18n = 'selectpicker.numberselected';
            el.dataset.i18nNumber = number ;
        }
    }

    /**
     * Handles click listener
     */
    _clickListener() {
        const _this = this;

        $( this.picker )
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
                    _this.picker.querySelectorAll( 'li' ).forEach( li=> li.classList.remove( 'active' ) );
                    getSiblingElementsAndSelf( option, 'option' ).forEach( option => { option.selected = false; } );
                    _this.picker.querySelectorAll( 'input' ).forEach( input  => input.checked = false );
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

                    const showSelectedEl = _this.picker.querySelector( '.selected' );
                    _this._showSelected( showSelectedEl );

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
            _this.picker.querySelector( '.dropdown-toggle' ).focus();
        } );
    }

    /**
     * Disables widget
     */
    disable() {
        this.picker.querySelectorAll( 'li' ).forEach( el => {
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
        this.picker.querySelectorAll( 'li' ).forEach( el => {
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
        this.picker.remove();
        this._init();
    }
}

export default DesktopSelectpicker;
