/**
 * Form control (input, select, textarea) helper functions.
 */

import types from './types';
import events from './event';
import { closestAncestorUntil } from './dom-utils';

export default {
    getWrapNode( control ) {
        return control.closest( '.question, .calculation' );
    },
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
    /** very inefficient, should actually not be used **/
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
    getInputType( control ) {
        const nodeName = control.nodeName.toLowerCase();
        if ( nodeName === 'input' ) {
            if ( control.dataset.drawing ) {
                return 'drawing';
            }
            if ( control.type ) {
                return control.type.toLowerCase();
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
    getConstraint( control ) {
        return control.dataset.constraint;
    },
    getRequired( control ) {
        // only return value if input is not a table heading input
        if ( !closestAncestorUntil( control, '.or-appearance-label', '.or' ) ) {
            return control.dataset.required;
        }
    },
    getRelevant( control ) {
        return control.dataset.relevant;
    },
    getReadonly( control ) {
        return control.matches( '[readonly]' );
    },
    getCalculation( control ) {
        return control.dataset.calculate;
    },
    getXmlType( control ) {
        return control.dataset.typeXml;
    },
    getName( control ) {
        const name = control.dataset.name || control.getAttribute( 'name' );
        if ( !name ) {
            console.error( 'input node has no name' );
        }
        return name;
    },
    getIndex( control ) {
        return this.form.repeats.getIndex( control.closest( '.or-repeat' ) );
    },
    isMultiple( control ) {
        return this.getInputType( control ) === 'checkbox' || control.multiple;
    },
    isEnabled( control ) {
        return !( control.disabled || closestAncestorUntil( control, '.disabled', '.or' ) );
    },
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
            default: {
                value = control.value;
            }
        }

        return value || '';
    },
    find( name, index ) {
        let attr = 'name';
        if ( this.form.view.html.querySelector( `input[type="radio"][data-name="${name}"]:not(.ignore)` ) ) {
            attr = 'data-name';
        }
        const question = this.getWrapNodes( this.form.view.html.querySelectorAll( `[${attr}="${name}"]` ) )[ index ];

        return question ? question.querySelector( `[${attr}="${name}"]:not(.ignore)` ) : null;
    },
    setVal( control, value, event = events.InputUpdate() ) {
        let inputs;
        const type = this.getInputType( control );
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

            if ( type === 'date' || type === 'datetime' ) {
                // convert current value (loaded from instance) to a value that a native datepicker understands
                // TODO: test for IE, FF, Safari when those browsers start including native datepickers
                value = types[ type ].convert( value );
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

        // Trigger an 'inputupdate' event which can be used in widgets to update the widget when the value of its 
        // original input element has changed **programmatically**.
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
    validate( control ) {
        return this.form.validateInput( control );
    }
};
