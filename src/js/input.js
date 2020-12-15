/**
 * Form control (input, select, textarea) helper functions.
 *
 * @module input
 */

import types from './types';
import events from './event';
import { closestAncestorUntil } from './dom-utils';

export default {
    /**
     * @param {Element} control - form control HTML element
     * @return {Element} Wrap node
     */
    getWrapNode( control ) {
        return control.closest( '.question, .calculation, .setvalue' );
    },
    /**
     * @param {Array<Element>} controls - form controls HTML elements
     * @return {Array<Element>} Wrap nodes
     */
    getWrapNodes( controls ) {
        const result = [];
        controls.forEach( control => {
            const question = this.getWrapNode( control );
            if ( !result.includes( question ) ) {
                result.push( question );
            }
        } );

        return result;
    },
    /**
     * @param {Element} control - form control HTML element
     * @return {object} control element properties
     */
    getProps( control ) {
        return {
            path: this.getName( control ),
            ind: this.getIndex( control ),
            inputType: this.getInputType( control ),
            xmlType: this.getXmlType( control ),
            constraint: this.getConstraint( control ),
            calculation: this.getCalculation( control ),
            relevant: this.getRelevant( control ),
            readonly: this.getReadonly( control ),
            val: this.getVal( control ),
            required: this.getRequired( control ),
            enabled: this.isEnabled( control ),
            multiple: this.isMultiple( control )
        };
    },
    /**
     * @param {Element} control - form control HTML element
     * @return {string} input type
     */
    getInputType( control ) {
        const nodeName = control.nodeName.toLowerCase();
        if ( nodeName === 'input' ) {
            if ( control.dataset.drawing ) {
                return 'drawing';
            }
            if ( control.type ) {
                if ( control.type === 'text' && this.getXmlType( control ) === 'date' ) {
                    // for browsers that don't support type='date' and return 'text' (e.g. Safari Desktop)
                    return 'date';
                } else if ( control.type === 'text' && this.getXmlType( control ) === 'datetime' ) {
                    // for browsers that don't support type='datetime-local' and return 'text' (e.g. Safari and Firefox Desktop)
                    return 'datetime-local';
                } else {
                    return control.type.toLowerCase();
                }
            }

            return console.error( '<input> node has no type' );

        } else if ( nodeName === 'select' ) {
            return 'select';
        } else if ( nodeName === 'textarea' ) {
            return 'textarea';
        } else if ( nodeName === 'fieldset' || nodeName === 'section' ) {
            return 'fieldset';
        } else {
            return console.error( 'unexpected input node type provided' );
        }
    },
    /**
     * @param {Element} control - form control HTML element
     * @return {string} constraint expression
     */
    getConstraint( control ) {
        return control.dataset.constraint;
    },
    /**
     * @param {Element} control - form control HTML element
     * @return {string|undefined} required expression
     */
    getRequired( control ) {
        // only return value if input is not a table heading input
        if ( !closestAncestorUntil( control, '.or-appearance-label', '.or' ) ) {
            return control.dataset.required;
        }
    },
    /**
     * @param {Element} control - form control HTML element
     * @return {string} relevant expression
     */
    getRelevant( control ) {
        return control.dataset.relevant;
    },
    /**
     * @param {Element} control - form control HTML element
     * @return {boolean} whether element is read only
     */
    getReadonly( control ) {
        return control.matches( '[readonly]' );
    },
    /**
     * @param {Element} control - form control HTML element
     * @return {string} calculate expression
     */
    getCalculation( control ) {
        return control.dataset.calculate;
    },
    /**
     * @param {Element} control - form control HTML element
     * @return {string} XML type
     */
    getXmlType( control ) {
        return ( control.dataset.typeXml || 'string' ).toLowerCase();
    },
    /**
     * @param {Element} control - form control HTML element
     * @return {string} name
     */
    getName( control ) {
        const name = control.dataset.name || control.getAttribute( 'name' );
        if ( !name ) {
            console.error( 'input node has no name' );
        }

        return name;
    },
    /**
     * @param {Element} control - form control HTML element
     * @return {number} - the repeat index of the form control
     */
    getIndex( control ) {
        return this.form.repeats.getIndex( control.closest( '.or-repeat' ) );
    },
    /**
     * @param {Element} control - form control HTML element
     * @return {boolean} whether element is multiple
     */
    isMultiple( control ) {
        return this.getInputType( control ) === 'checkbox' || control.multiple;
    },
    /**
     * @param {Element} control - form control HTML element
     * @return {boolean} whether element is enabled
     */
    isEnabled( control ) {
        return !( control.disabled || closestAncestorUntil( control, '.disabled', '.or' ) );
    },
    /**
     * @param {Element} control - form control HTML element
     * @return {string} element value
     */
    getVal( control ) {
        let value = '';
        const inputType = this.getInputType( control );
        const name = this.getName( control );

        switch ( inputType ) {
            case 'radio': {
                const checked = this.getWrapNode( control ).querySelector( `input[type="radio"][data-name="${name}"]:checked` );
                value = checked ? checked.value : '';
                break;
            }
            case 'checkbox': {
                value = [ ...this.getWrapNode( control ).querySelectorAll( `input[type="checkbox"][name="${name}"]:checked` ) ].map( input => input.value );
                break;
            }
            case 'select': {
                if ( this.isMultiple( control ) ) {
                    value = [ ...control.querySelectorAll( 'option:checked' ) ].map( option => option.value );
                } else {
                    const selected = control.querySelector( 'option:checked' );
                    value = selected ? selected.value : '';
                }
                break;
            }
            case 'datetime-local': {
                if ( control.value ) {
                    const dt = control.value.split( 'T' )[ 1 ].length === 5 ? control.value + ':00' : control.value;
                    // Add local timezone offset
                    // do not use .toISOLocalString() because new Date("2019-10-17T16:34:23.048") works differently in iOS/Safari
                    // Take care to get DST offsets right for the date value.
                    value = dt + new Date( dt ).getTimezoneOffsetAsTime();
                }
                break;
            }
            default: {
                value = control.value;
            }
        }

        return value || '';
    },
    /**
     * Finds a form control that is not a nested setvalue/xforms-value-changed directive
     *
     * @param {string} name - name attribute value
     * @param {number} index - repeat index
     * @return {Element} found element
     */
    find( name, index = 0 ) {
        let attr = 'name';
        if ( this.form.view.html.querySelector( `input[type="radio"][data-name="${name}"]:not(.ignore)` ) ) {
            attr = 'data-name';
        }
        const selector = `[${attr}="${name}"]:not([data-event="xforms-value-changed"])`;
        const question = this.getWrapNodes( this.form.view.html.querySelectorAll( selector ) )[ index ];

        return question ? question.querySelector( `[${attr}="${name}"]:not(.ignore)` ) : null;
    },
    /**
     * Sets the value of a form control (or group like radiobuttons)
     *
     * @param {Element} control - form control HTML element
     * @param {string|number} value - value to set
     * @param {Event} [event] - event to fire after setting value
     * @return {Element} first control whose value was set
     */
    setVal( control, value, event = events.InputUpdate() ) {
        let inputs;
        const type = this.getInputType( control );
        const xmlType = this.getXmlType( control );
        const question = this.getWrapNode( control );
        const name = this.getName( control );

        if ( type === 'radio' ) {
            // data-name is always present on radiobuttons
            inputs = question.querySelectorAll( `[data-name="${name}"]:not(.ignore)` );
        } else {
            // why not use this.getIndex?
            inputs = question.querySelectorAll( `[name="${name}"]:not(.ignore)` );

            if ( type === 'file' ) {
                // value of file input can be reset to empty but not to a non-empty value
                if ( value ) {
                    control.setAttribute( 'data-loaded-file-name', value );

                    // console.error('Cannot set value of file input field (value: '+value+'). If trying to load '+
                    //  'this record for editing this file input field will remain unchanged.');
                    return false;
                }
            }

            if ( xmlType === 'date' || xmlType === 'datetime' ) {
                if ( value ) {
                    // convert current value (loaded from instance) to a value that a native datepicker understands
                    // TODO: test for IE, FF, Safari when those browsers start including native datepickers
                    value = types[ xmlType.toLowerCase() ].convert( value );

                    if ( xmlType === 'datetime' ) {
                        // convert to local time zone
                        value = new Date( value ).toISOLocalString();
                        // chop off local timezone offset to display properly in (native datetime-local) widget
                        const parts = value.split( 'T' );
                        const date = parts[ 0 ];
                        const time = ( parts && parts[ 1 ] ) ? parts[ 1 ].split( /[Z\-+]/ )[ 0 ] : '00:00';
                        value = `${date}T${time}`;
                    }
                }
            }

            if ( type === 'time' ) {
                // convert to a local time value that HTML time inputs and the JS widget understand (01:02)
                if ( /(\+|-)/.test( value ) ) {
                    // Use today's date to incorporate daylight savings changes,
                    // Strip the thousands of a second, because most browsers fail to parse such a time.
                    // Add a space before the timezone offset to satisfy some browsers.
                    // For IE11, we also need to strip the Left-to-Right marks \u200E...
                    const ds = `${new Date().toLocaleDateString( 'en', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    } ).replace( /\u200E/g, '' )} ${value.replace( /(\d\d:\d\d:\d\d)(\.\d{1,3})(\s?((\+|-)\d\d))(:)?(\d\d)?/, '$1 GMT$3$7' )}`;
                    const d = new Date( ds );
                    if ( d.toString() !== 'Invalid Date' ) {
                        value = `${d.getHours().toString().pad( 2 )}:${d.getMinutes().toString().pad( 2 )}`;
                    } else {
                        console.error( 'could not parse time:', value );
                    }
                }
            }
        }

        if ( this.isMultiple( control ) === true ) {
            // TODO: It's weird that setVal does not take an array value but getVal returns an array value for multiple selects!
            value = value.split( ' ' );
        } else if ( type === 'radio' ) {
            value = [ value ];
        }

        if ( inputs.length ) {
            const curVal = this.getVal( control );
            if ( curVal === undefined || curVal.toString() !== value.toString() ) {
                switch ( type ) {
                    case 'radio': {
                        const input = this.getWrapNode( control ).querySelector( `input[type="radio"][data-name="${name}"][value="${value}"]` );
                        if ( input ) {
                            input.checked = true;
                        }
                        break;
                    }
                    case 'checkbox': {
                        this.getWrapNode( control ).querySelectorAll( `input[type="checkbox"][name="${name}"]` )
                            .forEach( input => input.checked = value.includes( input.value ) );
                        break;
                    }
                    case 'select': {
                        if ( this.isMultiple( control ) ) {
                            control.querySelectorAll( 'option' ).forEach( option => option.selected = value.includes( option.value ) );
                        } else {
                            const option = control.querySelector( `option[value="${value}"]` );
                            if ( option ) {
                                option.selected = true;
                            } else {
                                control.querySelectorAll( 'option' ).forEach( option => option.selected = false );
                            }
                        }
                        break;
                    }
                    default: {
                        control.value = value;
                    }
                }

                // don't trigger on all radiobuttons/checkboxes
                if ( event ) {
                    inputs[ 0 ].dispatchEvent( event );
                }
            }
        }

        return inputs[ 0 ];
    },
    /**
     * Clears form input fields and triggers events when doing this.
     *
     * @param grp - Element whose DESCENDANT form controls to clear
     * @param event1 - first event to trigger
     * @param event2 - second event to trigger
     */
    clear( grp, event1, event2 ){
        // See original pre-December 2020 plugin.js for some additional stuff with file-preview, loadedFileName and selectedIndex
        // which I think was no longer necessary, or should be moved to the widgets instead
        grp.querySelectorAll( 'input:not(.ignore), select:not(.ignore), textarea:not(.ignore)' ).forEach( control => {
            this.setVal( control, '', event1 );
            if ( event2 ){
                control.dispatchEvent( event2 );
            }
        } );
    },
    /**
     * @param {Element} control - form control HTML element
     * @return {Promise<undefined|ValidateInputResolution>} Promise that resolves
     */
    validate( control ) {
        return this.form.validateInput( control );
    }
};
